import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { COACH_FALLBACK_EMAIL, detailsTable, escapeHtml, sendEmail } from '../_shared/email.ts'

// Tells the coach that something happened in her business.
//
// Every event here is a database state change, so this is called by triggers
// rather than by the browser: a member closing the tab used to mean the coach
// never found out. Someone signed up on August 5 and she only learned about a
// later signup because a client happened to mention it.
//
// Guarded by a Vault secret rather than a JWT, because the caller is Postgres,
// not a person. Same pattern as the program-jobs sweep.

type EventName = 'signup' | 'payment' | 'assessment'

const SUBJECTS: Record<EventName, (name: string) => string> = {
  signup: (name) => `New signup: ${name}`,
  payment: (name) => `Payment received: ${name}`,
  assessment: (name) => `Assessment completed: ${name}`,
}

const HEADINGS: Record<EventName, string> = {
  signup: 'Someone just created an account',
  assessment: 'A client finished their assessment',
  payment: 'You just got paid',
}

const FOOTERS: Record<EventName, string> = {
  signup: 'Their assessment answers appear in your dashboard once they finish it.',
  assessment: 'Their program is generating now and will appear on their dashboard.',
  payment: 'Stripe has the receipt; the membership is already active.',
}

function supabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase service role environment.')
  return createClient(url, serviceRoleKey)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  try {
    const body = await request.json().catch(() => ({}))
    const supabase = supabaseAdmin()

    const { data: expected } = await supabase.rpc('get_notify_secret')
    if (!expected || body.secret !== expected) {
      return jsonResponse({ error: 'Not authorized.' }, 401)
    }

    const event = String(body.event || '') as EventName
    if (!SUBJECTS[event]) return jsonResponse({ error: 'Unknown event.' }, 400)

    const name = String(body.name || '').trim().slice(0, 120) || 'Unknown'
    const email = String(body.email || '').trim().slice(0, 200)

    const details: Record<string, string> = { Name: name, Email: email }
    for (const [k, v] of Object.entries(body.details || {})) {
      details[String(k).slice(0, 40)] = String(v ?? '').slice(0, 300)
    }
    details['When'] = new Date().toLocaleString('en-US', {
      timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short',
    })

    const { data: settings } = await supabase.from('app_settings').select('contact_email').maybeSingle()
    const coachEmail = (settings?.contact_email || '').trim() || COACH_FALLBACK_EMAIL

    const sent = await sendEmail(
      coachEmail,
      SUBJECTS[event](name),
      `<div style="font-family:sans-serif;color:#111">
        <h2>${escapeHtml(HEADINGS[event])}</h2>
        <table style="border-collapse:collapse">${detailsTable(details)}</table>
        <p style="margin-top:16px;color:#555">${escapeHtml(FOOTERS[event])}</p>
      </div>`,
      { replyTo: email || undefined, tag: 'notify-coach' },
    )

    // 200 either way: a trigger has nothing useful to do with a failure, and the
    // reason is already in the logs at error level.
    return jsonResponse({ sent })
  } catch (err) {
    console.error('[notify-coach]', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Something went wrong.' }, 500)
  }
})
