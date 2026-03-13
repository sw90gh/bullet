module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Notion-Version, X-Notion-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'path parameter required' });
  }

  // Get token from custom header (avoids proxy header stripping issues)
  const token = req.headers['x-notion-token'];
  const authorization = token ? `Bearer ${token}` : req.headers['authorization'];

  if (!authorization) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const notionUrl = `https://api.notion.com/v1/${path}`;

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
    console.error('Notion proxy error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
