const NEVAGATE_BASE = 'https://nevagate.anext.dev/v1';
const DEFAULT_NEVAGATE_KEY = 'sk-nevagate-f12af45f279ead3d86e6d89df644d053';

module.exports = async function handler(req, res) {
  // Enable CORS for client-side fetches
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed. Use POST.' } });
  }

  try {
    const authHeader = req.headers['authorization'];
    const apiKey = (authHeader && authHeader.replace(/^Bearer\s+/i, '').trim()) || DEFAULT_NEVAGATE_KEY;

    const response = await fetch(`${NEVAGATE_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Nevagate proxy error: ' + err.message } });
  }
};
