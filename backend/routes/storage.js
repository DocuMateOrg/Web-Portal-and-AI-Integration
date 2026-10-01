const express = require('express');
const router = express.Router();
const bucket = require('../firebase');

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
