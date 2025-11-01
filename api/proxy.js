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
    console.log('📡 Fetching stream:', stream);
    
    const response = await fetch(stream, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 OPR/98.0.0.0',
        'Referer': 'https://pulitv18.live/',
        'Accept': '*/*',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin': 'https://pulitv18.live',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      },
      timeout: 10000
    });

    if (!response.ok) {
      console.error('❌ Stream fetch failed:', response.status, response.statusText);
      return res.status(response.status).json({ 
        error: `Stream fetch failed: ${response.status} ${response.statusText}` 
      });
    }

    const streamData = await response.text();
    console.log('✅ Stream data received:', streamData.length, 'chars');
    
    // M3U8 içeriğini düzelt - relative path'leri absolute yap
    const baseUrl = new URL(stream).origin;
    const fixedData = streamData.replace(
      /(\n[^#][^\n]*\.(ts|jpeg|m3u8))/g, 
      (match) => {
        if (match.startsWith('http')) return match;
        return '\n' + baseUrl + match.trim();
      }
    );

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).send(fixedData);

  } catch (error) {
    console.error('❌ Stream proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch the stream',
      details: error.message 
    });
  }
}
