export default async function handler(req, res) {
  // CORS headers - OPTIONS isteği için
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  const { url, referer } = req.query;

  if (!url) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ 
      error: "URL parametresi gerekli",
      usage: "/api/proxy?url=HLS_URL&referer=REFERER_URL"
    });
  }

  // URL decode et
  const decodedUrl = decodeURIComponent(url);
  const decodedReferer = referer ? decodeURIComponent(referer) : null;

  console.log('İstenen URL:', decodedUrl);
  console.log('Referer:', decodedReferer);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Accept-Encoding': 'identity',
  };

  if (decodedReferer) {
    headers['Referer'] = decodedReferer;
    try {
      const refererUrl = new URL(decodedReferer);
      headers['Origin'] = refererUrl.origin;
    } catch (e) {
      console.log('Origin ayarlanamadı:', e.message);
    }
  }

  try {
    console.log('Fetch işlemi başlıyor...');
    const response = await fetch(decodedUrl, { 
      headers,
      redirect: 'follow'
    });

    console.log('Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(response.status).json({
        error: `Upstream error: ${response.status} ${response.statusText}`,
        url: decodedUrl
      });
    }

    const contentType = response.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    // Eğer .m3u8 playlist ise
    if (decodedUrl.includes('.m3u8') || contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl')) {
      let text = await response.text();
      
      console.log('M3U8 içeriği alındı, uzunluk:', text.length);

      // İçindeki .ts segmentlerini proxy URL'sine rewrite et
      text = text.replace(/(^[^#][^\n]*\.ts(\?[^\n\s]*)?)/gm, (match) => {
        try {
          let segmentUrl;
          if (match.startsWith('http')) {
            segmentUrl = match;
          } else if (match.startsWith('//')) {
            segmentUrl = 'https:' + match;
          } else {
            segmentUrl = new URL(match, decodedUrl).href;
          }
          
          const base = `https://${req.headers.host}`;
          const proxyUrl = `${base}/api/proxy?url=${encodeURIComponent(segmentUrl)}${decodedReferer ? '&referer=' + encodeURIComponent(decodedReferer) : ''}`;
          return proxyUrl;
        } catch (error) {
          console.log('Segment URL oluşturma hatası:', match, error);
          return match;
        }
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(text);
    }

    // Eğer .ts segmenti ise
    if (decodedUrl.includes('.ts') || contentType.includes('video/mp2t') || contentType.includes('video/MP2T')) {
      const buffer = await response.arrayBuffer();
      
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=7200');
      res.setHeader('Content-Length', buffer.byteLength);
      
      return res.send(Buffer.from(buffer));
    }

    // Diğer içerik türleri
    const text = await response.text();
    res.setHeader('Content-Type', contentType);
    return res.send(text);

  } catch (err) {
    console.error('Proxy hatası:', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      error: 'Proxy hatası',
      message: err.message,
      url: decodedUrl
    });
  }
}
