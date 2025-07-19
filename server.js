require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Middleware
const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve images

console.log("Using URI:", process.env.MONGODB_URI)
// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Multer setup (store in ./uploads folder)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    // Saves with original name + timestamp
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Schema and Model for storing documents
const DocumentSchema = new mongoose.Schema({
  prompt: String,
  document: {
    data: Buffer,
    contentType: String,
    originalName: String
  }
});
const Doc = mongoose.model('Doc', DocumentSchema);


app.post('/api/upload', upload.single('document'), async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const file = req.file;

    if (!prompt || !file) {
      return res.status(400).json({ error: "Prompt or document is required." });
    }

    // Save file buffer directly to MongoDB
    const docEntry = new Doc({
      prompt,
      document: file
        ? {
            data: file.buffer,
            contentType: file.mimetype,
            originalName: file.originalname
          }
        : null
    });
    await docEntry.save();

    // Date formatting (IST)
    const date = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) + ' IST';

    res.json({
      message: 'Upload successful',
      prompt:" " + prompt,
      documentName: file.originalname,
      date,
      documentUrl: `/uploads/${file.filename}`,
      objectId: docEntry._id // URL to access the file
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
