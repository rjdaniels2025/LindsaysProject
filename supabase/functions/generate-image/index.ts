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

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return jsonResponse({ error: 'Image generation is not configured.' }, 503)
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[generate-image] DALL-E error', response.status, data?.error?.message)
      return jsonResponse({ error: data?.error?.message || 'Image generation failed.' }, response.status)
    }

    const url = data?.data?.[0]?.url ?? null
    if (!url) {
      return jsonResponse({ error: 'No image URL returned.' }, 500)
    }

    return jsonResponse({ url })
  } catch (err) {
    console.error('[generate-image] Unexpected error:', err)
    return jsonResponse({ error: 'Unexpected server error.' }, 500)
  }
})
