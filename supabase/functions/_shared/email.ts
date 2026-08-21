// The one place the app sends email.
//
// This lived inside start-trial, which was the only function that ever sent
// anything. It is shared now because signups, payments and assessments all
// need to reach the coach, and one implementation means one place to fix when
// a provider or a from-address changes.
//
// The missing-key branch is why no email has ever arrived: RESEND_API_KEY was
// never set, so every send returned quietly and logged one line nobody reads.
// It still cannot throw — a failed notification must never break a signup — but
// it now says so at error level and reports back, so a caller can record the
// failure rather than assume delivery.

export const FROM_ADDRESS = Deno.env.get('EMAIL_FROM') || 'Elevate HNF <Lindsay@elevatehnf.com>'
export const COACH_FALLBACK_EMAIL = 'Lindsay@elevatehnf.com'

export function escapeHtml(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options: { replyTo?: string; tag?: string } = {},
): Promise<boolean> {
  const tag = options.tag || 'email'
  const resendKey = Deno.env.get('RESEND_API_KEY')

  if (!resendKey) {
    console.error(
      `[${tag}] RESEND_API_KEY is not set, so this email was NOT sent. ` +
      `Intended recipient: ${to}. Subject: ${subject}`,
    )
    return false
  }
  if (!to) {
    console.error(`[${tag}] No recipient address; email not sent. Subject: ${subject}`)
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], reply_to: options.replyTo, subject, html }),
    })
    if (!res.ok) {
      console.error(`[${tag}] Resend rejected the email`, res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (err) {
    console.error(`[${tag}] Email failed to send to ${to}:`, err)
    return false
  }
}

// The shared table layout used by every coach notification.
export function detailsTable(fields: Record<string, string>) {
  return Object.entries(fields)
    .map(([label, val]) =>
      `<tr><td style="padding:4px 12px 4px 0;font-weight:bold">${escapeHtml(label)}</td>` +
      `<td style="padding:4px 0">${escapeHtml(val || '—')}</td></tr>`)
    .join('')
}
