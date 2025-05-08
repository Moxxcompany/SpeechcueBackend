const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

const ASTERISK_SOUNDS_DIR = '/var/lib/asterisk/sounds/custom';
const upload = multer({ dest: '/tmp/' });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure custom folder exists
if (!fs.existsSync(ASTERISK_SOUNDS_DIR)) {
  fs.mkdirSync(ASTERISK_SOUNDS_DIR, { recursive: true });
}

app.post('/api/audio/upload', upload.single('audio'), (req, res) => {
  console.log('📥 Received upload:', req.file);

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { originalname, path: tempPath } = req.file;
  const ext = path.extname(originalname).toLowerCase();

  if (ext !== '.wav') {
    fs.unlinkSync(tempPath);
    return res.status(400).json({ error: 'Only .wav files are allowed' });
  }

  const outputFilePath = path.join(ASTERISK_SOUNDS_DIR, originalname);

  // 🔁 Use ffmpeg to convert format
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-i', tempPath,
    '-ar', '8000',
    '-ac', '1',
    '-sample_fmt', 's16',
    '-f', 'wav',
    outputFilePath,
  ]);

  ffmpeg.stderr.on('data', (data) => {
    console.error(`[ffmpeg] ${data}`);
  });

  ffmpeg.on('exit', (code) => {
    fs.unlink(tempPath, () => {}); // cleanup temp file

    if (code !== 0) {
      return res.status(500).json({ error: 'FFmpeg conversion failed' });
    }

    console.log(`✅ Converted and saved: ${outputFilePath}`);
    res.json({ message: 'Upload and conversion successful', asteriskPath: `custom/${originalname}` });
  });
});

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
