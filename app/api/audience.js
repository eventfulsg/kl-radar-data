// Audience stats over the Shopify customer database.
// Public mode (no token): rounded aggregates only — safe to show advertisers.
// Full mode (?token= matching DASH_TOKEN): exact counts + recent signups for the team.
const { shopifyGraphql, loadDrops } = require('./_shopify');

const COUNT = `query c($q: String) { customersCount(query: $q) { count } }`;
const INVENTORY = `query v($id: ID!) { productVariant(id: $id) { inventoryQuantity } }`;
const RECENT = `query recentSignups($q: String!) {
  customers(first: 50, query: $q, sortKey: CREATED_AT, reverse: true) {
    edges { node {
      id firstName lastName createdAt tags
      defaultEmailAddress { emailAddress marketingState }
      defaultPhoneNumber { phoneNumber marketingState }
    } }
  }
}`;

const count = async (q) => ((await shopifyGraphql(COUNT, { q })).customersCount || {}).count || 0;
const roundDown = (n) => (n < 20 ? n : Math.floor(n / 10) * 10);

module.exports = async (req, res) => {
  const full = !!process.env.DASH_TOKEN && String(req.query.token || '') === process.env.DASH_TOKEN;
  try {
    const feed = await loadDrops();
    const [total, waitlist, buyers] = await Promise.all([
      count(null),
      count('tag:drops-waitlist'),
      count('orders_count:>0'),
    ]);

    const drops = await Promise.all(
      (feed.drops || []).map(async (d) => {
        const signups = await count('tag:' + d.id);
        let left = null;
        if (d.variant_gid) {
          try {
            left = ((await shopifyGraphql(INVENTORY, { id: d.variant_gid })).productVariant || {}).inventoryQuantity;
          } catch (e) { /* inventory read is optional */ }
        }
        return {
          id: d.id, title: d.title, partner: d.partner, status: d.status, supply: d.supply,
          signups: full ? signups : roundDown(signups),
          sold: left != null && d.supply ? d.supply - left : null,
          left,
        };
      })
    );

    const out = {
      generated_at: Math.floor(Date.now() / 1000),
      database_total: full ? total : roundDown(total),
      waitlist_total: full ? waitlist : roundDown(waitlist),
      buyers_total: full ? buyers : roundDown(buyers),
      drops,
    };

    if (full) {
      const r = await shopifyGraphql(RECENT, { q: 'tag:drops-waitlist' });
      const rows = ((r.customers || {}).edges || []).map((e) => {
        const n = e.node;
        return {
          name: [n.firstName, n.lastName].filter(Boolean).join(' '),
          email: (n.defaultEmailAddress || {}).emailAddress || '',
          email_consent: (n.defaultEmailAddress || {}).marketingState || '',
          phone: (n.defaultPhoneNumber || {}).phoneNumber || '',
          sms_consent: (n.defaultPhoneNumber || {}).marketingState || '',
          tags: (n.tags || []).filter((t) => /^drop-\d{3}$/.test(t)),
          created_at: n.createdAt,
        };
      });
      out.recent = rows;
      const consented = rows.filter((x) => x.email_consent === 'SUBSCRIBED').length;
      out.consent_rate_sample = rows.length ? Math.round((100 * consented) / rows.length) : null;
    }

    res.setHeader('Cache-Control', full ? 'no-store' : 's-maxage=120, stale-while-revalidate=600');
    return res.status(200).json(out);
  } catch (e) {
    if (e.notConfigured) return res.status(503).json({ error: 'not_configured' });
    return res.status(502).json({ error: String(e.message || e).slice(0, 200) });
  }
};
