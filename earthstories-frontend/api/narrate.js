// Serverless proxy for the Groq narration API.
//
// The API key lives ONLY on the server. It is read from GROQ_API_KEY — note
// the deliberate absence of a VITE_ prefix, which would inline it into the
// client bundle and hand it to every visitor.
//
// Deploy target: Vercel/Netlify functions (root directory = earthstories-frontend).
// Locally, vite.config.js serves this same handler as dev middleware.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: { message: 'GROQ_API_KEY is not configured on the server' } });
    return;
  }

  const { prompt } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: { message: 'A non-empty "prompt" string is required' } });
    return;
  }

  // The client supplies only the prompt text; model and limits are fixed here
  // so a crafted request cannot select a different model or drain the quota.
  try {
    const upstream = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt.slice(0, 8000) }],
        max_tokens: 400,
        temperature: 0.8,
      }),
    });

    const payload = await upstream.json();
    const text = payload?.choices?.[0]?.message?.content;

    if (!upstream.ok || !text) {
      res.status(upstream.status === 200 ? 502 : upstream.status).json({
        error: { message: payload?.error?.message || 'Narration service returned no text' },
      });
      return;
    }

    res.status(200).json({ text });
  } catch (err) {
    res.status(502).json({ error: { message: `Narration service unreachable: ${err.message}` } });
  }
}
