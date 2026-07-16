// Shared Shopify Admin GraphQL client for the Drops endpoints.
// Underscore prefix keeps this out of Vercel's function routes.
const API_VERSION = '2026-04';

async function shopifyGraphql(query, variables) {
  const shop = process.env.SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!shop || !token) {
    const err = new Error('not_configured');
    err.notConfigured = true;
    throw err;
  }
  const r = await fetch('https://' + shop + '/admin/api/' + API_VERSION + '/graphql.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || d.errors) {
    throw new Error('shopify_' + (d && d.errors ? JSON.stringify(d.errors).slice(0, 300) : r.status));
  }
  return d.data;
}

const DROPS_FEED = 'https://raw.githubusercontent.com/eventfulsg/kl-radar-data/main/drops.json';

async function loadDrops() {
  const r = await fetch(DROPS_FEED + '?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('drops_feed_' + r.status);
  return r.json();
}

module.exports = { shopifyGraphql, loadDrops };
