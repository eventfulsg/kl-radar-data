// Image proxy for Instagram CDN thumbnails — the CDN blocks some direct
// browser hotlinks, but serves plain server-side fetches fine. Locked to
// IG/FB CDN hosts only.
module.exports = async (req, res) => {
  const u = String(req.query.u || '');
  let url;
  try {
    url = new URL(u);
  } catch (e) {
    return res.status(400).send('bad url');
  }
  const root = url.hostname.split('.').slice(-2).join('.');
  if (url.protocol !== 'https:' || (root !== 'cdninstagram.com' && root !== 'fbcdn.net')) {
    return res.status(403).send('host not allowed');
  }
  try {
    const r = await fetch(url.href, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'image/*,*/*;q=0.8',
      },
    });
    if (!r.ok) return res.status(502).send('cdn ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600, immutable');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(502).send('fetch failed');
  }
};
