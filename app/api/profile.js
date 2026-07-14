// Proxies Instagram's public web-profile API (the browser blocks it via CORS,
// and the x-ig-app-id header trick shouldn't live in client code).
module.exports = async (req, res) => {
  const u = String(req.query.u || '').replace(/[^\w.]/g, '');
  if (!u) return res.status(400).json({ error: 'missing u' });
  try {
    const r = await fetch(
      'https://www.instagram.com/api/v1/users/web_profile_info/?username=' + u,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'x-ig-app-id': '936619743392459',
          Accept: '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );
    if (!r.ok) return res.status(502).json({ error: 'ig_status_' + r.status });
    const d = await r.json();
    const user = d && d.data && d.data.user;
    if (!user) return res.status(502).json({ error: 'no_user' });
    const posts = ((user.edge_owner_to_timeline_media || {}).edges || []).map((e) => {
      const n = e.node;
      return {
        sc: n.shortcode,
        t: n.taken_at_timestamp,
        likes: (n.edge_liked_by || {}).count || 0,
        comments: (n.edge_media_to_comment || {}).count || 0,
        views: n.video_view_count || 0,
        video: !!n.is_video,
        cap: (((n.edge_media_to_caption || {}).edges || [])[0] || { node: { text: '' } }).node.text.slice(0, 220),
        co: (n.coauthor_producers || []).map((c) => c.username),
      };
    });
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=600');
    return res.status(200).json({
      username: u,
      followers: (user.edge_followed_by || {}).count || 0,
      posts,
    });
  } catch (e) {
    return res.status(502).json({ error: String((e && e.message) || e) });
  }
};
