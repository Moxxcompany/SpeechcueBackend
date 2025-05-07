const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const ASTERISK_SOUNDS_DIR = '/var/lib/asterisk/sounds/custom';
const upload = multer({ dest: '/tmp/' });

// Ensure Asterisk sound dir exists
if (!fs.existsSync(ASTERISK_SOUNDS_DIR)) {
  fs.mkdirSync(ASTERISK_SOUNDS_DIR, { recursive: true });
}

app.post('/upload-audio', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { originalname, path: tempPath } = req.file;
  const ext = path.extname(originalname).toLowerCase();

  if (ext !== '.wav') {
    fs.unlinkSync(tempPath);
    return res.status(400).json({ error: 'Only .wav files are allowed' });
  }

  const finalPath = path.join(ASTERISK_SOUNDS_DIR, originalname);

  fs.rename(tempPath, finalPath, (err) => {
    if (err) {
      console.error('❌ Error moving file:', err);
      return res.status(500).json({ error: 'Failed to save file' });
    }

    console.log(`✅ Uploaded to Asterisk: ${finalPath}`);
    res.json({ message: 'Upload successful', asteriskPath: `custom/${originalname}` });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Audio Upload Server running on http://localhost:${PORT}`);
});
