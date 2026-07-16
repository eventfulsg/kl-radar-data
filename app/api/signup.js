// Drops waitlist signup → Shopify customer (Shopify is the CRM).
// Every signup is tagged per-drop so the audience is segmentable, and
// marketing consent is recorded explicitly (PDPA: no consent, no signup).
const { shopifyGraphql } = require('./_shopify');

const CREATE = `mutation createDropSignup($input: CustomerInput!) {
  customerCreate(input: $input) { customer { id tags } userErrors { field message } }
}`;
const FIND = `query findByEmail($q: String!) {
  customers(first: 1, query: $q) { edges { node { id tags } } }
}`;
const TAG = `mutation addDropTag($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) { node { id } userErrors { field message } }
}`;
const COUNT = `query waitlistCount($q: String) { customersCount(query: $q) { count } }`;

function normalizePhone(raw) {
  const s = String(raw || '').replace(/[\s\-().]/g, '');
  if (!s) return null;
  if (/^\+\d{8,15}$/.test(s)) return s;
  if (/^[89]\d{7}$/.test(s)) return '+65' + s; // SG mobile
  if (/^65[89]\d{7}$/.test(s)) return '+' + s;
  if (/^01\d{8,9}$/.test(s)) return '+6' + s; // MY mobile (01x…)
  if (/^601\d{8,9}$/.test(s)) return '+' + s;
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const b = req.body || {};

  if (b.hp) return res.status(200).json({ ok: true }); // honeypot: pretend success
  const name = String(b.name || '').trim().slice(0, 60);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
  const drop = String(b.drop || '').trim();
  if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(email)) return res.status(400).json({ error: 'bad_email' });
  if (!/^drop-\d{3}$/.test(drop)) return res.status(400).json({ error: 'bad_drop' });
  if (b.consent !== true) return res.status(400).json({ error: 'consent_required' });
  const phone = normalizePhone(b.phone);

  const consentStamp = new Date().toISOString();
  const tags = ['drops-waitlist', drop, 'source-drops-page'];

  try {
    // Existing customer (past buyer or earlier waitlist) → just add this drop's tags.
    const found = await shopifyGraphql(FIND, { q: 'email:"' + email + '"' });
    const existing = ((found.customers || {}).edges || [])[0];
    if (existing) {
      const t = await shopifyGraphql(TAG, { id: existing.node.id, tags });
      const errs = (t.tagsAdd || {}).userErrors || [];
      if (errs.length) throw new Error('tag_' + errs[0].message);
    } else {
      const consent = {
        marketingState: 'SUBSCRIBED',
        marketingOptInLevel: 'SINGLE_OPT_IN',
        consentUpdatedAt: consentStamp,
      };
      const input = {
        firstName: name || undefined,
        email,
        tags,
        note:
          'Drops waitlist signup · ' + drop + ' · consented to Eventful + drop partner marketing · ' +
          consentStamp + ' · source: drops page',
        emailMarketingConsent: consent,
      };
      if (phone) {
        input.phone = phone;
        input.smsMarketingConsent = { marketingState: 'SUBSCRIBED', marketingOptInLevel: 'SINGLE_OPT_IN' };
      }
      let c = await shopifyGraphql(CREATE, { input });
      let errs = (c.customerCreate || {}).userErrors || [];
      // Shopify's phone validation is strict — a rejected/duplicate phone
      // shouldn't cost us the signup, so retry email-only.
      if (errs.length && phone && errs.some((e) => (e.field || []).includes('phone'))) {
        delete input.phone;
        delete input.smsMarketingConsent;
        c = await shopifyGraphql(CREATE, { input });
        errs = (c.customerCreate || {}).userErrors || [];
      }
      if (errs.length) throw new Error('create_' + errs[0].message);
    }

    let position = null;
    try {
      const n = await shopifyGraphql(COUNT, { q: 'tag:drops-waitlist' });
      position = ((n.customersCount || {}).count || 0) || null;
    } catch (e) { /* position is a nicety, not worth failing the signup */ }

    return res.status(200).json({ ok: true, position });
  } catch (e) {
    if (e.notConfigured) return res.status(503).json({ error: 'not_configured' });
    return res.status(502).json({ error: String(e.message || e).slice(0, 200) });
  }
};
