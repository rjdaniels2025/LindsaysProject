const OPENAI_API_URL = 'https://api.openai.com/v1/responses'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return jsonResponse({ error: 'OpenAI API key is not configured.' }, 500)
    }
    const body = await request.json()
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const payload = await openaiResponse.json().catch(() => null)
    if (!openaiResponse.ok) {
      const message = payload?.error?.message || payload?.message || `OpenAI request failed with status ${openaiResponse.status}.`
      return jsonResponse({ error: message }, openaiResponse.status)
    }
    return jsonResponse(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error in generate-program.'
    return jsonResponse({ error: message }, 500)
  }
})
