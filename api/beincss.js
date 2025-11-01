export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const beinUrl = 'https://nxn12.xyz/cdn/bein-sports-1.css';

  try {
    const response = await fetch(beinUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 OPR/98.0.0.0',
        'Referer': 'https://pulitv18.live/'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const cssContent = await response.text();
    res.setHeader('Content-Type', 'text/css');
    res.status(200).send(cssContent);

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch Bein Sports CSS',
      details: error.message 
    });
  }
}
