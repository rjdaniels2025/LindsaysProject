import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return jsonResponse({ error: 'prompt is required.' }, 400)
    }

    const encoded = encodeURIComponent(prompt)
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true`

    return jsonResponse({ url })
  } catch (err) {
    console.error('[generate-image] Unexpected error:', err)
    return jsonResponse({ error: 'Unexpected server error.' }, 500)
  }
})
