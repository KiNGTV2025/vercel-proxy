export default async function handler(req, res) {
  const { url, referer } = req.query;

  if (!url) {
    return res.status(400).send("Kullanım: /api/proxy?url=HLS_URL&referer=REFERER_URL");
  }

  const headers = {};
  if (referer) headers["Referer"] = referer;
  headers["User-Agent"] = req.headers["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      return res.status(response.status).send(`Upstream error: ${response.statusText}`);
    }

    // Eğer .m3u8 playlist ise
    if (url.includes(".m3u8") || response.headers.get("content-type")?.includes("application/vnd.apple.mpegurl")) {
      let text = await response.text();

      // İçindeki .ts segmentlerini proxy URL'sine rewrite et
      text = text.replace(/(^[^#].*\.ts(\?.*)?$)/gm, (match) => {
        const segmentUrl = new URL(match, url).href;
        const base = `https://${req.headers.host}`;
        const proxyUrl = `${base}/api/proxy?url=${encodeURIComponent(segmentUrl)}${referer ? "&referer=" + encodeURIComponent(referer) : ""}`;
        return proxyUrl;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-cache");
      return res.send(text);
    }

    // Eğer .ts segmenti ise
    if (url.includes(".ts") || response.headers.get("content-type")?.includes("video/mp2t")) {
      res.setHeader("Content-Type", "video/mp2t");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=3600"); // TS segmentleri cache'lenebilir
      
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    return res.status(400).send("Desteklenmeyen format");
  } catch (err) {
    console.error("Proxy hatası:", err);
    return res.status(500).send("Proxy hatası: " + err.message);
  }
}
