export default async function handler(req, res) {
  const { url, referer } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Kullanım: /api/proxy?url=HLS_URL&referer=REFERER_URL" });
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
    'Accept-Encoding': 'identity', // Sıkıştırmayı devre dışı bırak
  };

  if (decodedReferer) {
    headers['Referer'] = decodedReferer;
    try {
      headers['Origin'] = new URL(decodedReferer).origin;
    } catch (e) {
      // Origin eklenemedi
    }
  }

  try {
    const response = await fetch(decodedUrl, { 
      headers,
      redirect: 'follow'
    });

    console.log('Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream error: ${response.status} ${response.statusText}`,
        url: decodedUrl
      });
    }

    const contentType = response.headers.get('content-type') || '';

    // Eğer .m3u8 playlist ise
    if (decodedUrl.includes('.m3u8') || contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl')) {
      let text = await response.text();
      
      console.log('M3U8 içeriği alındı, ilk 500 karakter:', text.substring(0, 500));

      // İçindeki .ts segmentlerini proxy URL'sine rewrite et
      text = text.replace(/(^[^#].*\.ts(\?[^#\s]*)?)/gm, (match, p1) => {
        try {
          let segmentUrl;
          if (p1.startsWith('http')) {
            segmentUrl = p1;
          } else if (p1.startsWith('//')) {
            segmentUrl = 'https:' + p1;
          } else {
            segmentUrl = new URL(p1, decodedUrl).href;
          }
          
          const base = `https://${req.headers.host}`;
          const proxyUrl = `${base}/api/proxy?url=${encodeURIComponent(segmentUrl)}${decodedReferer ? '&referer=' + encodeURIComponent(decodedReferer) : ''}`;
          console.log('TS segment proxy:', p1, '->', proxyUrl);
          return proxyUrl;
        } catch (error) {
          console.log('Segment URL oluşturma hatası:', p1, error);
          return match;
        }
      });

      // Diğer m3u8 referanslarını da proxy'le
      text = text.replace(/(^[^#].*\.m3u8(\?[^#\s]*)?)/gm, (match, p1) => {
        try {
          let nestedM3u8Url;
          if (p1.startsWith('http')) {
            nestedM3u8Url = p1;
          } else if (p1.startsWith('//')) {
            nestedM3u8Url = 'https:' + p1;
          } else {
            nestedM3u8Url = new URL(p1, decodedUrl).href;
          }
          
          const base = `https://${req.headers.host}`;
          const proxyUrl = `${base}/api/proxy?url=${encodeURIComponent(nestedM3u8Url)}${decodedReferer ? '&referer=' + encodeURIComponent(decodedReferer) : ''}`;
          return proxyUrl;
        } catch (error) {
          return match;
        }
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(text);
    }

    // Eğer .ts segmenti ise
    if (decodedUrl.includes('.ts') || contentType.includes('video/mp2t') || contentType.includes('video/MP2T')) {
      const buffer = await response.arrayBuffer();
      
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=7200');
      res.setHeader('Content-Length', buffer.byteLength);
      
      return res.send(Buffer.from(buffer));
    }

    // Diğer içerik türleri
    const text = await response.text();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(text);

  } catch (err) {
    console.error('Proxy hatası:', err);
    return res.status(500).json({
      error: 'Proxy hatası',
      message: err.message,
      url: decodedUrl
    });
  }
        }
