const express = require('express');
const router = express.Router();
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const bucket = require('../firebase');
const db = require('../server'); // pool exported from server.js

// POST /api/ocr/process
// Body: { documentId: number, storagePath: string, tesseractLang?: string }
router.post('/process', async (req, res) => {
  const { documentId, storagePath, tesseractLang } = req.body;
  if (!documentId || !storagePath) return res.status(400).json({ error: 'documentId and storagePath required' });

  const lang = tesseractLang || 'sin+eng';

  const tmpFile = path.join(os.tmpdir(), `${Date.now()}-${path.basename(storagePath)}`);
  const outputBase = tmpFile + '-out'; // tesseract will append extension

  try {
    // Download file from firebase bucket
    await bucket.file(storagePath).download({ destination: tmpFile });

    // Run tesseract CLI: tesseract <input> <outputBase> -l sin+eng --oem 1 --psm 3
    await new Promise((resolve, reject) => {
      execFile('tesseract', [tmpFile, outputBase, '-l', lang, '--oem', '1', '--psm', '3'], (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const txtPath = outputBase + '.txt';
    const extractedText = fs.existsSync(txtPath) ? fs.readFileSync(txtPath, 'utf8') : '';

    // Save to DB: update extracted_text and status
    await db.query('UPDATE documents SET extracted_text=$1, status=$2 WHERE id=$3', [extractedText, 'processed', documentId]);

    // cleanup
    try { fs.unlinkSync(tmpFile); } catch (e) {}
    try { fs.unlinkSync(txtPath); } catch (e) {}

    res.json({ documentId, extractedText });
  } catch (err) {
    console.error('OCR error', err);
    // cleanup
    try { fs.unlinkSync(tmpFile); } catch (e) {}
    try { fs.unlinkSync(outputBase + '.txt'); } catch (e) {}
    res.status(500).json({ error: 'OCR failed', details: err.message });
  }
});

module.exports = router;
