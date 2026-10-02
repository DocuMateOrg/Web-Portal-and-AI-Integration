const express = require("express");
const router = express.Router();
const db = require("../db");
const { indexDocument } = require('../services/elastic');
const { body, validationResult, query } = require('express-validator');
const slugify = require('slugify');

// Helpers for tags
async function getOrCreateTag(name) {
  const res = await db.query("SELECT id FROM tags WHERE name=$1", [name]);
  if (res.rows.length) return res.rows[0].id;
  const insert = await db.query("INSERT INTO tags(name) VALUES($1) RETURNING id", [name]);
  return insert.rows[0].id;
}

const requirePerm = require('../middleware/permissions');

router.post("/upload", requirePerm('upload'), async (req, res) => {
  const { filename, fileUrl, groupId, uploaderId } = req.body;

  const result = await db.query(
    `INSERT INTO documents(filename,file_url,group_id,uploader_id,status)
     VALUES($1,$2,$3,$4,'uploaded') RETURNING *`,
    [filename, fileUrl, groupId, uploaderId]
  );

  res.json(result.rows[0]);
  // index minimal document in elastic
  try {
    await indexDocument(result.rows[0].id, {
      filename: result.rows[0].filename,
      summary: result.rows[0].summary || null,
      extracted_text: result.rows[0].extracted_text || null,
      tags: []
    });
  } catch (err) {
    console.error('Elastic index error (upload):', err.message || err);
  }
});

router.put("/:id/trash", async (req, res) => {
  await db.query("UPDATE documents SET status='trashed' WHERE id=$1", [
    req.params.id,
  ]);
  res.json({ message: "Trashed" });
});

router.put("/:id/restore", async (req, res) => {
  await db.query("UPDATE documents SET status='processed' WHERE id=$1", [
    req.params.id,
  ]);
  res.json({ message: "Restored" });
});

module.exports = router;

// --- Summaries ---
router.post(`/:id/summary`, async (req, res) => {
  const { summary } = req.body;
  await db.query("UPDATE documents SET summary=$1 WHERE id=$2", [summary, req.params.id]);
  res.json({ message: "Summary saved" });
});

router.get(`/:id/summary`, async (req, res) => {
  const result = await db.query("SELECT summary FROM documents WHERE id=$1", [req.params.id]);
  res.json({ summary: result.rows[0] ? result.rows[0].summary : null });
});

// --- Tags ---
router.post(`/:id/tags`, async (req, res) => {
  const { tags } = req.body; // expect array of tag names
  if (!Array.isArray(tags)) return res.status(400).json({ error: "tags must be an array" });

  const added = [];
  for (const t of tags) {
    const tagId = await getOrCreateTag(t.trim().toLowerCase());
    await db.query(
      "INSERT INTO document_tags(document_id, tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [req.params.id, tagId]
    );
    added.push(t);
  }

  res.json({ added });
});

router.get(`/:id/tags`, async (req, res) => {
  const result = await db.query(
    `SELECT t.name FROM tags t JOIN document_tags dt ON dt.tag_id = t.id WHERE dt.document_id=$1`,
    [req.params.id]
  );
  res.json({ tags: result.rows.map(r => r.name) });
});

router.get('/search/by-tag/:tag', async (req, res) => {
  const tag = req.params.tag;
  const result = await db.query(
    `SELECT d.* FROM documents d
     JOIN document_tags dt ON dt.document_id = d.id
     JOIN tags t ON t.id = dt.tag_id
     WHERE t.name = $1`,
    [tag]
  );
  res.json({ documents: result.rows });
});

// Save extracted text, summary and tags in one request
// Validation middleware for process endpoint
const processValidation = [
  body('extractedText').optional().isString(),
  body('summary').optional().isString(),
  body('tags').optional().isArray(),
  body('tags.*').optional().isString()
];

router.post('/:id/process', requirePerm('process'), processValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { extractedText, summary, tags } = req.body;
  try {
    // Ensure document exists
    const docRes = await db.query('SELECT id, filename, slug FROM documents WHERE id=$1', [req.params.id]);
    if (!docRes.rows.length) return res.status(404).json({ error: 'Document not found' });

    const doc = docRes.rows[0];

    // Generate slug if missing
    let slug = doc.slug;
    if (!slug || slug.trim() === '') {
      const filename = doc.filename || `doc-${req.params.id}`;
      slug = slugify(filename, { lower: true, strict: true });
    }

    // Update extracted text and summary, set slug
    await db.query(
      'UPDATE documents SET extracted_text=$1, summary=$2, status=$3, slug=$4 WHERE id=$5',
      [extractedText || null, summary || null, 'processed', slug, req.params.id]
    );

    // Handle tags (optional)
    if (Array.isArray(tags) && tags.length) {
      for (const t of tags) {
        const tagId = await getOrCreateTag(t.trim().toLowerCase());
        await db.query(
          'INSERT INTO document_tags(document_id, tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [req.params.id, tagId]
        );
      }
    }

    // index the updated document in elastic
    try {
      // fetch latest tags
      const tagsRes = await db.query(
        `SELECT t.name FROM tags t JOIN document_tags dt ON dt.tag_id = t.id WHERE dt.document_id=$1`,
        [req.params.id]
      );
      const tagNames = tagsRes.rows.map(r => r.name);
      await indexDocument(req.params.id, {
        filename: doc.filename,
        summary: summary || null,
        extracted_text: extractedText || null,
        tags: tagNames
      });
    } catch (err) {
      console.error('Elastic index error (process):', err.message || err);
    }

    res.json({ message: 'Document processed', id: req.params.id, slug });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

// Full-text search endpoint
router.get('/search', [ query('q').isString().notEmpty() ], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const q = req.query.q;
  try {
    // Use plainto_tsquery for safer input
    const result = await db.query(
      `SELECT id, filename, summary, ts_rank_cd(search_vector, plainto_tsquery('english', $1)) AS rank
       FROM documents WHERE search_vector @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC LIMIT 50`,
      [q]
    );
    res.json({ results: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Elastic search endpoints (top-level, not nested)
function esHits(esRes){ return (esRes.hits&&esRes.hits.hits)?esRes.hits.hits.map(h=>({id:h._id,score:h._score,...h._source})):[]; }
const INDEX = () => process.env.ELASTIC_INDEX || 'documents';

router.get('/es-search', [ query('q').isString().notEmpty() ], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { client } = require('../services/elastic');
    const esRes = await client.search({ index: INDEX(), body: { query: { multi_match: { query: req.query.q, fields: ['summary^2','extracted_text'] } } } });
    res.json({ results: esHits(esRes) });
  } catch (err) { console.error('Elastic search error', err.message); res.status(500).json({ error: 'Search failed' }); }
});

router.get('/es-keyword', [ query('term').isString().notEmpty() ], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { client } = require('../services/elastic');
    const term = req.query.term;
    const esRes = await client.search({ index: INDEX(), body: { query: { bool: { should: [
      { term: { tags: { value: term } } }, { term: { filename: { value: term } } }, { match_phrase: { summary: { query: term } } } ] } } } });
    res.json({ results: esHits(esRes) });
  } catch (err) { console.error('Elastic keyword search error', err.message); res.status(500).json({ error: 'Search failed' }); }
});

router.get('/es-fuzzy', [ query('q').isString().notEmpty(), query('fuzziness').optional() ], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { client } = require('../services/elastic');
    const esRes = await client.search({ index: INDEX(), body: { query: { multi_match: { query: req.query.q, fields: ['summary^2','extracted_text'], fuzziness: req.query.fuzziness || 'AUTO', operator: 'and' } } } });
    res.json({ results: esHits(esRes) });
  } catch (err) { console.error('Elastic fuzzy search error', err.message); res.status(500).json({ error: 'Search failed' }); }
});

  // --- Batch summary endpoint ---
  // POST /api/documents/batch-summary
  // body: { ids: number[], maxSentences?: number }
  router.post('/batch-summary', [ body('ids').isArray({ min: 1 }), body('maxSentences').optional().isInt({ min: 1, max: 10 }) ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const ids = req.body.ids;
    const maxSentences = req.body.maxSentences || 3;

    const results = [];

    for (const id of ids) {
      try {
        const docRes = await db.query('SELECT extracted_text, filename FROM documents WHERE id=$1', [id]);
        if (!docRes.rows.length) {
          results.push({ id, ok: false, error: 'Document not found' });
          continue;
        }
        const text = docRes.rows[0].extracted_text || '';

        // naive sentence splitter: split on .!?\n and take first N sentences
        const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter(s => s && s.trim());
        const summary = sentences.slice(0, maxSentences).join(' ').trim();

        // update db
        await db.query('UPDATE documents SET summary=$1, status=$2 WHERE id=$3', [summary || null, 'processed', id]);

        // index in elastic
        try {
          await indexDocument(id, { filename: docRes.rows[0].filename, summary: summary || null, extracted_text: text || null, tags: [] });
        } catch (e) {
          console.error('Elastic index error (batch)', e.message || e);
        }

        results.push({ id, ok: true, summary });
      } catch (err) {
        console.error('Batch summary error for id', id, err);
        results.push({ id, ok: false, error: err.message });
      }
    }

    res.json({ results });
  });

// ---------- Integration endpoints (frontend <-> backend) ----------

// GET /api/documents?status=processed|trashed
// Only returns documents that belong to the caller's groups (group-based access control)
router.get('/', async (req, res) => {
  const status = req.query.status === 'trashed' ? 'trashed' : 'processed';
  try {
    const r = await db.query(
      `SELECT d.id, d.filename, d.file_url, d.summary, d.extracted_text, d.category,
              d.language, d.confidence, d.audio_url, d.status, d.created_at, d.group_id,
              COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
         FROM documents d
         LEFT JOIN document_tags dt ON dt.document_id = d.id
         LEFT JOIN tags t ON t.id = dt.tag_id
        WHERE d.status = $1
          AND (d.uploader_id = $2
               OR d.group_id IN (SELECT group_id FROM user_groups WHERE user_id = $2))
        GROUP BY d.id
        ORDER BY d.created_at DESC`,
      [status, req.user.id]);
    res.json({ documents: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// POST /api/documents/save  - store one result produced by the AI service
// body: { filename, fileUrl, text, summary, tags[], category, language, confidence, audioUrl?, groupId? }
router.post('/save', requirePerm('upload'), [ body('filename').isString().notEmpty() ], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { filename, fileUrl, text, summary, tags, category, language, confidence, audioUrl, groupId } = req.body;
  const slug = slugify(filename, { lower: true, strict: true }) + '-' + Date.now(); // unique even for same filename
  try {
    const ins = await db.query(
      `INSERT INTO documents(filename,file_url,group_id,uploader_id,status,extracted_text,summary,category,language,confidence,audio_url,slug)
       VALUES($1,$2,$3,$4,'processed',$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [filename, fileUrl || null, groupId || null, req.user.id, text || null, summary || null,
       category || null, language || null, confidence ?? null, audioUrl || null, slug]);
    const id = ins.rows[0].id;

    const tagNames = Array.isArray(tags) ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean) : [];
    for (const t of tagNames) {
      const tagId = await getOrCreateTag(t);
      await db.query('INSERT INTO document_tags(document_id, tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, tagId]);
    }
    try {   // search index is optional - never fail the save because of it
      await indexDocument(id, { filename, summary: summary || null, extracted_text: text || null, tags: tagNames, group_id: groupId || null });
    } catch (e) { console.warn('Elastic index skipped:', e.message); }

    res.json({ id, message: 'Saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save document' });
  }
});
