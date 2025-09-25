export default async function handler(req, res) {
  const { url, referer } = req.query;

  if (!url) {
    return res.status(400).send("Kullanım: /api/proxy?url=HLS_URL&referer=REFERER_URL");
  }

  const headers = {};
  if (referer) headers["Referer"] = referer;
  headers["User-Agent"] = req.headers["user-agent"] || "Mozilla/5.0";

  try {
    const response = await fetch(url, { headers });

    // Eğer .m3u8 playlist ise
    if (url.endsWith(".m3u8")) {
      let text = await response.text();

      // İçindeki .ts segmentlerini proxy URL’sine rewrite et
      text = text.replace(/^(?!#)(.*\.ts)$/gm, (match) => {
        const newUrl = new URL(match, url).href;
        const base = req.headers["x-forwarded-proto"] + "://" + req.headers.host;
        return `${base}/api/proxy?url=${encodeURIComponent(newUrl)}${referer ? "&referer=" + encodeURIComponent(referer) : ""}`;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(text);
    }

    // Eğer .ts segmenti ise
    if (url.endsWith(".ts")) {
      res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return response.body.pipe(res);
    }

    return res.status(400).send("Desteklenmeyen format");
  } catch (err) {
    return res.status(500).send("Proxy hatası: " + err.message);
  }
}
