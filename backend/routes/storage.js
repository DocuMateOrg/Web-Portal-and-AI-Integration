const express = require('express');
const router = express.Router();
const { bucket } = require('../firebase');
const db = require('../db');

router.get('/usage', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COALESCE(SUM(d.file_size), 0)::text AS bytes,
              COUNT(*)::text AS documents,
              COUNT(d.file_size)::text AS measured_documents
         FROM documents d
        WHERE d.status IN ('processed', 'trashed')
          AND (d.uploader_id = $1
               OR d.group_id IN (SELECT group_id FROM user_groups WHERE user_id = $1))`,
      [req.user.id]
    );
    res.json({
      bytes: result.rows[0].bytes,
      documents: Number(result.rows[0].documents),
      measuredDocuments: Number(result.rows[0].measured_documents),
    });
  } catch (err) {
    console.error('[storage usage] Failed to calculate document storage:', err);
    res.status(500).json({ error: 'Failed to calculate storage usage' });
  }
});

// Download a file from Firebase Storage and stream it to the client.
// Query: ?path=folder/name.pdf or provide the full object path in the bucket.
router.get('/download', async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Missing "path" query parameter' });

    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) return res.status(404).json({ error: 'File not found' });

    // Get metadata to set content-type and size if available
    const [metadata] = await file.getMetadata();
    if (metadata && metadata.contentType) {
      res.setHeader('Content-Type', metadata.contentType);
    }
    if (metadata && metadata.size) {
      res.setHeader('Content-Length', metadata.size);
    }

    // Suggest download filename
    const suggestedName = (filePath.split('/').pop()) || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${suggestedName}"`);

    const readStream = file.createReadStream();
    readStream.on('error', (err) => {
      console.error('Stream error', err);
      if (!res.headersSent) res.status(500).json({ error: 'Error reading file' });
      else res.end();
    });

    readStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
