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
  'pinterest': 'pinterest',
  'twitter': 'twitter',
  'x': 'twitter',
  'pornhub': 'pornhub'
};

// Enhanced platform detection with shortened URLs support
function detectPlatform(url) {
  const urlLower = url.toLowerCase();
  
  // Instagram
  if (urlLower.includes('instagram.com/reel/')) return 'reel';
  if (urlLower.includes('instagram.com/p/')) return 'igpost';
  
  // TikTok
  if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) return 'tiktok';
  
  // YouTube (including shortened URLs)
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('m.youtube.com')) return 'youtube';
  
  // Facebook
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch') || urlLower.includes('m.facebook.com')) return 'facebook';
  
  // Threads
  if (urlLower.includes('threads.net')) return 'threads';
  
  // Pinterest (including shortened URLs)
  if (urlLower.includes('pinterest.com') || urlLower.includes('pin.it')) return 'pinterest';
  
  // Twitter/X (including shortened URLs)
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com') || urlLower.includes('t.co')) return 'twitter';
  
  // Pornhub
  if (urlLower.includes('pornhub.com')) return 'pornhub';
  
  return null;
}

// Response normalizer to handle different platform formats
function normalizeResponse(data, platform) {
  // Remove dev field from all responses
  const { dev, ...cleanData } = data;
  
  // Base response structure
  const baseResponse = {
    status: cleanData.status,
    platform: platform,
    type: null,
    title: null,
    thumbnail: null,
    items: []
  };
  
  if (cleanData.status !== 'success') {
    return {
      ...baseResponse,
      message: cleanData.message || 'Failed to process request'
    };
  }
  
  switch (platform) {
    case 'reel':
    case 'tiktok':
    case 'facebook':
    case 'threads':
    case 'twitter':
      return {
        ...baseResponse,
        type: 'video',
        thumbnail: cleanData.thumbnail,
        items: [{
          type: 'video',
          url: cleanData.video,
          thumbnail: cleanData.thumbnail
        }]
      };
      
    case 'igpost':
      return {
        ...baseResponse,
        type: 'images',
        items: cleanData.images ? cleanData.images.map((imageUrl, index) => ({
          type: 'image',
          url: imageUrl,
          thumbnail: imageUrl,
          index: index + 1,
          total: cleanData.total_image || cleanData.images.length
        })) : []
      };
      
    case 'youtube':
      return {
        ...baseResponse,
        type: 'video_audio',
        title: cleanData.title,
        thumbnail: cleanData.thumbnail,
        duration: cleanData.duration,
        items: [
          {
            type: 'video',
            url: cleanData.video_link,
            thumbnail: cleanData.thumbnail,
            label: 'Download Video'
          },
          {
            type: 'audio',
            url: cleanData.audio_link,
            thumbnail: cleanData.thumbnail,
            label: 'Download Audio'
          }
        ].filter(item => item.url) // Remove items with no URL
      };
      
    case 'pinterest':
      return {
        ...baseResponse,
        type: 'image',
        title: cleanData.title,
        thumbnail: cleanData.media_link,
        items: [{
          type: 'image',
          url: cleanData.media_link,
          thumbnail: cleanData.media_link
        }]
      };
      
    case 'pornhub':
      return {
        ...baseResponse,
        type: 'video',
        title: cleanData.title,
        thumbnail: cleanData.cover,
        items: [{
          type: 'video',
          url: cleanData.video_link,
          thumbnail: cleanData.cover
        }]
      };
      
    default:
      return {
        ...baseResponse,
        message: 'Unsupported platform response format'
      };
  }
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
    
    // Normalize and clean the response
    const normalizedResponse = normalizeResponse(data, detectedPlatform);
    
    res.json(normalizedResponse);
    
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
