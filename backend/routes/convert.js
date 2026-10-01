const express = require('express');
const router = express.Router();
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const multer = require('multer');
const bucket = require('../firebase');

const upload = multer({ dest: path.join(os.tmpdir(), 'uploads') });

// Helper to run soffice conversion
function convertPdfToDocx(inputPath, outDir) {
  return new Promise((resolve, reject) => {
    // soffice --headless --convert-to docx --outdir <outDir> <inputPath>
    execFile('soffice', ['--headless', '--convert-to', 'docx', '--outdir', outDir, inputPath], (err, stdout, stderr) => {
      if (err) return reject(new Error(`soffice failed: ${stderr || err.message}`));
      // output filename is same base with .docx
      const outFile = path.join(outDir, path.basename(inputPath, path.extname(inputPath)) + '.docx');
      resolve(outFile);
    });
  });
}

// POST /api/convert/upload -> multipart upload: field 'file'
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const tmpPdf = req.file.path;
  const outDir = path.dirname(tmpPdf);
  try {
    const docxPath = await convertPdfToDocx(tmpPdf, outDir);
    res.download(docxPath, path.basename(docxPath), (err) => {
      // cleanup
      try { fs.unlinkSync(tmpPdf); } catch (e) {}
      try { fs.unlinkSync(docxPath); } catch (e) {}
      if (err) console.error('Download error', err);
    });
  } catch (err) {
    // cleanup
    try { fs.unlinkSync(tmpPdf); } catch (e) {}
    console.error(err);
    res.status(500).json({ error: 'Conversion failed', details: err.message });
  }
});

// POST /api/convert/from-storage
// JSON body: { storagePath: string, saveToStorage?: boolean }
router.post('/from-storage', express.json(), async (req, res) => {
  const { storagePath, saveToStorage } = req.body || {};
  if (!storagePath) return res.status(400).json({ error: 'storagePath is required' });

  const tmpPdf = path.join(os.tmpdir(), `${Date.now()}-${path.basename(storagePath)}`);
  const outDir = path.dirname(tmpPdf);
  try {
    // download from firebase
    await bucket.file(storagePath).download({ destination: tmpPdf });

    const docxPath = await convertPdfToDocx(tmpPdf, outDir);

    if (saveToStorage) {
      // upload back to storage alongside the pdf
      const targetPath = storagePath.replace(/\.pdf$/i, '.docx');
      await bucket.upload(docxPath, { destination: targetPath });
      // cleanup
      try { fs.unlinkSync(tmpPdf); } catch (e) {}
      try { fs.unlinkSync(docxPath); } catch (e) {}
      return res.json({ message: 'Converted and uploaded', path: targetPath });
    }

    // stream file back
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(docxPath)}"`);
    const stream = fs.createReadStream(docxPath);
    stream.pipe(res);
    stream.on('end', () => {
      try { fs.unlinkSync(tmpPdf); } catch (e) {}
      try { fs.unlinkSync(docxPath); } catch (e) {}
    });
    stream.on('error', (err) => {
      console.error('Stream error', err);
      try { fs.unlinkSync(tmpPdf); } catch (e) {}
      try { fs.unlinkSync(docxPath); } catch (e) {}
      if (!res.headersSent) res.status(500).json({ error: 'Stream failed' });
    });

  } catch (err) {
    try { fs.unlinkSync(tmpPdf); } catch (e) {}
    console.error('Conversion from storage failed', err);
    res.status(500).json({ error: 'Conversion failed', details: err.message });
  }
});

module.exports = router;
