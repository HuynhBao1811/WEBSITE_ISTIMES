// backend/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
console.log('🔍 MONGODB_URI from .env:', process.env.MONGODB_URI);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Define a simple News schema
const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  author: String,
  publishedAt: { type: Date, default: Date.now },
});
const News = mongoose.model('News', newsSchema);

// CRUD endpoints
app.get('/api/news', async (req, res) => {
  const items = await News.find().sort({ publishedAt: -1 });
  res.json(items);
});

app.post('/api/news', async (req, res) => {
  const item = new News(req.body);
  await item.save();
  res.status(201).json(item);
});

app.put('/api/news/:id', async (req, res) => {
  const updated = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

app.delete('/api/news/:id', async (req, res) => {
  await News.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// Health check
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server listening on http://localhost:${PORT}`));
