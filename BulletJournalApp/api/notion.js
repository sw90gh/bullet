export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Notion-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'path parameter required' });
  }

  const notionUrl = `https://api.notion.com/v1/${path}`;
  const authorization = req.headers['authorization'];

  if (!authorization) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': authorization,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    };

    if (req.method !== 'GET' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(notionUrl, fetchOptions);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
