const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Platform mapping for tiiny.io API
const platformMapping = {
  'reel': 'reel',
  'igpost': 'igpost',
  'tiktok': 'tiktok',
  'youtube': 'yt',
  'facebook': 'fb',
  'threads': 'threads',
  'spotify': 'spotify',
  'pinterest': 'pinterest',
  'twitter': 'twitter',
  'x': 'twitter',
  'pornhub': 'pornhub'
};

// Helper function to detect platform from URL
function detectPlatform(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('instagram.com/reel/')) return 'reel';
  if (urlLower.includes('instagram.com/p/')) return 'igpost';
  if (urlLower.includes('tiktok.com')) return 'tiktok';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
  if (urlLower.includes('facebook.com')) return 'facebook';
  if (urlLower.includes('threads.net')) return 'threads';
  if (urlLower.includes('spotify.com')) return 'spotify';
  if (urlLower.includes('pinterest.com')) return 'pinterest';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
  if (urlLower.includes('pornhub.com')) return 'pornhub';
  
  return null;
}

// Main download endpoint
app.post('/api/download', async (req, res) => {
  try {
    const { platform, url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'URL is required' 
      });
    }
    
    // Auto-detect platform if not provided
    let detectedPlatform = platform || detectPlatform(url);
    
    if (!detectedPlatform || !platformMapping[detectedPlatform]) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Unsupported platform or invalid URL' 
      });
    }
    
    // Map platform to tiiny.io parameter
    const tiinyParam = platformMapping[detectedPlatform];
    
    // Construct tiiny.io API URL
    const tiinyUrl = `https://multimedia.tiiny.io?${tiinyParam}=${encodeURIComponent(url)}`;
    
    // Fetch from tiiny.io
    const response = await fetch(tiinyUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return clean response (remove dev field)
    const cleanResponse = {
      status: data.status,
      video: data.video,
      thumbnail: data.thumbnail
    };
    
    res.json(cleanResponse);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to process download request' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;