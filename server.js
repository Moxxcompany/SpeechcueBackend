const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

const ASTERISK_SOUNDS_DIR = '/var/lib/asterisk/sounds/custom';
const upload = multer({ dest: '/tmp/' });

app.use(cors());
app.use(express.json()); // for JSON body parsing
app.use(express.urlencoded({ extended: true }));

// Ensure sound dir exists
if (!fs.existsSync(ASTERISK_SOUNDS_DIR)) {
  fs.mkdirSync(ASTERISK_SOUNDS_DIR, { recursive: true });
}

// ✅ POST /api/audio/upload
app.post('/api/audio/upload', upload.single('audio'), (req, res) => {
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
      console.error('❌ Error saving file:', err);
      return res.status(500).json({ error: 'Failed to save file' });
    }

    console.log(`✅ Uploaded: ${finalPath}`);
    res.json({ message: 'Upload successful', asteriskPath: `custom/${originalname}` });
  });
});

// 🗑️ DELETE /api/audio/delete
app.delete('/api/audio/delete', (req, res) => {
  const { filename } = req.body;

  if (!filename || path.extname(filename).toLowerCase() !== '.wav') {
    return res.status(400).json({ error: 'Invalid or missing filename' });
  }

  const filePath = path.join(ASTERISK_SOUNDS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('❌ Error deleting file:', err);
      return res.status(500).json({ error: 'Failed to delete file' });
    }

    console.log(`🗑️ Deleted: ${filePath}`);
    res.json({ message: 'Delete successful', deleted: filename });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Audio Server running at http://localhost:${PORT}`);
});
