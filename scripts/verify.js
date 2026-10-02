// Usage:  node scripts/verify.js
// Checks that AI service, backend and database all work together.
const AI = process.env.AI_URL || 'http://localhost:8000';
const API = process.env.API_URL || 'http://localhost:4000';
let failed = 0;
const check = async (name, fn) => {
  try { const detail = await fn(); console.log(`PASS  ${name}${detail ? '  -> ' + detail : ''}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}  -> ${e.message}`); }
};
const j = async (url, opt) => {
  const r = await fetch(url, opt);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`HTTP ${r.status} ${body.error || ''}`);
  return body;
};
const post = (u, b) => j(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

(async () => {
  await check('AI service is up (port 8000)', async () => (await j(AI + '/')).status);
  await check('Backend is up (port 4000)', async () => (await j(API + '/health')).status);
  let id;
  await check('Backend can save a document to Postgres', async () => {
    const r = await post(API + '/api/documents/save', {
      filename: 'verify-test.pdf', text: 'verification text electricity bill', summary: 'Test summary',
      tags: ['verify', 'test'], category: 'other', language: 'en', confidence: 0.9 });
    id = r.id; return 'id=' + id;
  });
  await check('Backend lists the saved document', async () => {
    const { documents } = await j(API + '/api/documents?status=processed');
    if (!documents.some(d => d.id === id)) throw new Error('saved document not in list');
    return documents.length + ' document(s)';
  });
  await check('Full-text search finds it', async () => {
    const { results } = await j(API + '/api/documents/search?q=electricity');
    if (!results.some(d => d.id === id)) throw new Error('not found by search');
  });
  await check('Trash works', async () => { await j(API + `/api/documents/${id}/trash`, { method: 'PUT' }); });
  await check('Elasticsearch (optional)', async () => (await j((process.env.ELASTIC_URL || 'http://localhost:9200') + '/')).version.number);
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
