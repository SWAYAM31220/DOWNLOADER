process.env.YTDL_NO_UPDATE = '1';
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core'); // ✅ added

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

    if (!detectedPlatform) {
      return res.status(400).json({
        status: 'error',
        message: 'Unsupported platform or invalid URL'
      });
    }

    // ✅ Special handling for YouTube
    if (detectedPlatform === 'youtube') {
      try {
        const info = await ytdl.getInfo(url);
        const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
        const bestFormat = videoFormats[0]; // pick first available

        return res.json({
          status: 'success',
          title: info.videoDetails.title,
          video: bestFormat.url,
          thumbnail: info.videoDetails.thumbnails.pop().url
        });
      } catch (ytError) {
        console.error('YouTube Error:', ytError);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to process YouTube video'
        });
      }
    }

    // ✅ For other platforms → tiiny.io
    const tiinyParam = platformMapping[detectedPlatform];
    if (!tiinyParam) {
      return res.status(400).json({
        status: 'error',
        message: 'Unsupported platform'
      });
    }

    const tiinyUrl = `https://multimedia.tiiny.io?${tiinyParam}=${encodeURIComponent(url)}`;

    const response = await fetch(tiinyUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

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

