import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const COACH_FALLBACK_EMAIL = 'Lindsay@elevatehnf.com'
const FROM_ADDRESS = 'Elevate HNF <Lindsay@elevatehnf.com>'

function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Best-effort notification to the coach. Never throws — a mail failure must not
// fail the application submission itself.
async function notifyCoach(
  toEmail: string,
  fields: Record<string, string>,
) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.log('[submit-trial-application] RESEND_API_KEY not set — skipping notification email.')
    return
  }

  const rows = Object.entries(fields)
    .map(([label, val]) => `<tr><td style="padding:4px 12px 4px 0;font-weight:bold">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(val || '—')}</td></tr>`)
    .join('')

  const html = `
    <div style="font-family:sans-serif;color:#111">
      <h2>New Free Kickstart Application</h2>
      <table style="border-collapse:collapse">${rows}</table>
      <p style="margin-top:16px;color:#555">Reply to this person to invite them into the 7-day trial.</p>
    </div>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [toEmail],
        reply_to: fields.Email || undefined,
        subject: `New Kickstart application: ${fields.Name || 'Unknown'}`,
        html,
      }),
    })
    if (!res.ok) {
      console.error('[submit-trial-application] Resend error', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[submit-trial-application] Notification email failed:', err)
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const body = await request.json().catch(() => ({}))

    // Honeypot: real users never fill a hidden "company" field. Pretend success.
    if (clean(body.company, 100)) {
      return jsonResponse({ success: true })
    }

    const name = clean(body.name, 120)
    const email = clean(body.email, 200)
    const phone = clean(body.phone, 60)
    const fitnessGoal = clean(body.fitnessGoal, 500)
    const biggestChallenge = clean(body.biggestChallenge, 1000)
    const trackedMacros =
      typeof body.trackedMacros === 'boolean'
        ? body.trackedMacros
        : /^(yes|true)$/i.test(clean(body.trackedMacros, 10))
          ? true
          : /^(no|false)$/i.test(clean(body.trackedMacros, 10))
            ? false
            : null

    if (!name) return jsonResponse({ error: 'Please enter your name.' }, 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Please enter a valid email address.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase function environment.')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { error: insertError } = await supabase.from('trial_applications').insert({
      name,
      email,
      phone: phone || null,
      fitness_goal: fitnessGoal || null,
      biggest_challenge: biggestChallenge || null,
      tracked_macros: trackedMacros,
    })
    if (insertError) throw insertError

    // Email is best-effort and runs after the row is safely stored.
    const { data: settings } = await supabase
      .from('app_settings')
      .select('contact_email')
      .maybeSingle()
    const coachEmail = clean(settings?.contact_email, 200) || COACH_FALLBACK_EMAIL

    await notifyCoach(coachEmail, {
      Name: name,
      Email: email,
      Phone: phone,
      'Fitness goal': fitnessGoal,
      'Biggest challenge': biggestChallenge,
      'Tracked macros before': trackedMacros === null ? '' : trackedMacros ? 'Yes' : 'No',
    })

    return jsonResponse({ success: true })
  } catch (err) {
    console.error('[submit-trial-application]', err)
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
