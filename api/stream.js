export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { stream } = req.query;

  if (!stream) {
    return res.status(400).json({ error: 'Stream URL parameter is required' });
  }

  try {
    const response = await fetch(stream, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 OPR/98.0.0.0',
        'Referer': 'https://pulitv18.live/'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const streamData = await response.text();
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.status(200).send(streamData);

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch the stream',
      details: error.message 
    });
  }
}
