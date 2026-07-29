import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const TRIAL_DAYS = Number(Deno.env.get('FREE_TRIAL_DAYS') || 7)
// The trial grants the same plan a paying member gets — it is the identical
// product, just time-limited. 'billing' records how they got in.
const TRIAL_PLAN_ID = 'transformation'
const TRIAL_BILLING = 'trial'

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

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.log('[start-trial] RESEND_API_KEY not set — skipping email.')
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], reply_to: replyTo, subject, html }),
    })
    if (!res.ok) {
      console.error('[start-trial] Resend error', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[start-trial] Email failed:', err)
  }
}

// Nothing to click — the account is already active. This exists so the member
// has the details in writing, and so a mistyped address produces a bounce.
async function sendWelcomeEmail(to: string, name: string, endsAt: Date) {
  const firstName = escapeHtml(name.split(' ')[0] || 'there')
  const ends = endsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  await sendEmail(
    to,
    'Your free 7-day Elevate Kickstart has started',
    `<div style="font-family:sans-serif;color:#111">
      <h2>You're in, ${firstName}!</h2>
      <p>Your free 7-day Elevate Kickstart is active right now — no confirmation needed.
      You have full access to your personalised program, macro targets, workout tracking
      and coaching, exactly like a paying member.</p>
      <p>Your trial runs until <strong>${escapeHtml(ends)}</strong>. Nothing is charged
      automatically, and no card is on file.</p>
      <p>Just log back in any time to pick up where you left off.</p>
    </div>`,
  )
}

async function notifyCoach(supabase: SupabaseClient, fields: Record<string, string>) {
  const { data: settings } = await supabase.from('app_settings').select('contact_email').maybeSingle()
  const coachEmail = clean(settings?.contact_email, 200) || COACH_FALLBACK_EMAIL

  const rows = Object.entries(fields)
    .map(([label, val]) =>
      `<tr><td style="padding:4px 12px 4px 0;font-weight:bold">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(val || '—')}</td></tr>`)
    .join('')

  await sendEmail(
    coachEmail,
    `New free trial started: ${fields.Name || 'Unknown'}`,
    `<div style="font-family:sans-serif;color:#111">
      <h2>New Free Kickstart Signup</h2>
      <p>They already have full access — their 7 days started just now.</p>
      <table style="border-collapse:collapse">${rows}</table>
      <p style="margin-top:16px;color:#555">You can see them in the Applications tab of your dashboard.</p>
    </div>`,
    fields.Email || undefined,
  )
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  let createdUserId: string | null = null
  let supabase: SupabaseClient | null = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase function environment.')
    supabase = createClient(supabaseUrl, serviceRoleKey)

    const body = await request.json().catch(() => ({}))

    // Honeypot: real users never fill a hidden "company" field.
    if (clean(body.company, 100)) return jsonResponse({ success: true })

    const name = clean(body.name, 120)
    const email = clean(body.email, 200).toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''
    const phone = clean(body.phone, 60)
    const fitnessGoal = clean(body.fitnessGoal, 500)
    const biggestChallenge = clean(body.biggestChallenge, 1000)
    const trackedMacrosRaw = clean(body.trackedMacros, 10)
    const trackedMacros = /^(yes|true)$/i.test(trackedMacrosRaw)
      ? true
      : /^(no|false)$/i.test(trackedMacrosRaw)
        ? false
        : null

    if (!name) return jsonResponse({ error: 'Please enter your name.' }, 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Please enter a valid email address.' }, 400)
    }
    if (password.length < 8) {
      return jsonResponse({ error: 'Please choose a password of at least 8 characters.' }, 400)
    }

    // email_confirm: true marks the address confirmed on creation, so no
    // confirmation email is sent and the account works immediately. This applies
    // only to the trial funnel — paid signups still use auth.signUp and confirm.
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (createError || !created?.user) {
      const msg = createError?.message || ''
      if (/already|registered|exists/i.test(msg)) {
        return jsonResponse(
          { error: 'You already have an account with this email — log in instead.', existingAccount: true },
          409,
        )
      }
      throw createError || new Error('Could not create the account.')
    }
    createdUserId = created.user.id

    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + TRIAL_DAYS)

    const { error: membershipError } = await supabase.from('user_memberships').insert({
      user_id: createdUserId,
      plan_id: TRIAL_PLAN_ID,
      billing: TRIAL_BILLING,
      status: 'trialing',
      current_period_end: periodEnd.toISOString(),
    })
    if (membershipError) throw membershipError

    // The lead record Lindsay reviews. Non-fatal: the trial itself is what matters.
    const { error: applicationError } = await supabase.from('trial_applications').insert({
      name,
      email,
      phone: phone || null,
      fitness_goal: fitnessGoal || null,
      biggest_challenge: biggestChallenge || null,
      tracked_macros: trackedMacros,
      status: 'enrolled',
    })
    if (applicationError) console.error('[start-trial] Application row failed:', applicationError)

    // Emails are best-effort and run only once the account is safely created.
    await sendWelcomeEmail(email, name, periodEnd)
    await notifyCoach(supabase, {
      Name: name,
      Email: email,
      Phone: phone,
      'Fitness goal': fitnessGoal,
      'Biggest challenge': biggestChallenge,
      'Tracked macros before': trackedMacros === null ? '' : trackedMacros ? 'Yes' : 'No',
      'Trial ends': periodEnd.toDateString(),
    })

    return jsonResponse({ success: true, trialEndsAt: periodEnd.toISOString() })
  } catch (err) {
    // Never strand a half-created account: without the membership they would be
    // permanently blocked by the "already have an account" check on retry.
    if (createdUserId && supabase) {
      await supabase.auth.admin.deleteUser(createdUserId).catch(() => {})
    }
    console.error('[start-trial]', err)
    return jsonResponse({ error: 'Could not start your free trial. Please try again.' }, 500)
  }
})
