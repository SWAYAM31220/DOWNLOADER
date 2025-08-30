const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORS configuration
const corsOptions = {
  origin: ["https://swayam31220.github.io"], // your GitHub Pages domain
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight

// Middleware
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
  
  if (urlLower.includes('instagram.com/reel/')) return 'reel';
  if (urlLower.includes('instagram.com/p/')) return 'igpost';
  if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) return 'tiktok';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('m.youtube.com')) return 'youtube';
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch') || urlLower.includes('m.facebook.com')) return 'facebook';
  if (urlLower.includes('threads.net')) return 'threads';
  if (urlLower.includes('pinterest.com') || urlLower.includes('pin.it')) return 'pinterest';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com') || urlLower.includes('t.co')) return 'twitter';
  if (urlLower.includes('pornhub.com')) return 'pornhub';
  
  return null;
}

// Normalize response and ensure all URLs are strings
function normalizeResponse(data, platform) {
  const { dev, ...cleanData } = data;

  const baseResponse = {
    status: cleanData.status,
    platform: platform,
    type: null,
    title: cleanData.title || null,
    thumbnail: cleanData.thumbnail || null,
    items: []
  };

  if (cleanData.status !== 'success') {
    return { ...baseResponse, message: cleanData.message || 'Failed to process request' };
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
        items: [{
          type: 'video',
          url: typeof cleanData.video === 'string' ? cleanData.video : '',
          thumbnail: cleanData.thumbnail || ''
        }]
      };

    case 'igpost':
      return {
        ...baseResponse,
        type: 'images',
        items: cleanData.images ? cleanData.images.map((img, idx) => ({
          type: 'image',
          url: typeof img === 'string' ? img : (img?.url || ''),
          thumbnail: typeof img === 'string' ? img : (img?.thumbnail || ''),
          index: idx + 1,
          total: cleanData.total_image || cleanData.images.length
        })) : []
      };

    case 'youtube':
      return {
        ...baseResponse,
        type: 'video_audio',
        duration: cleanData.duration || null,
        items: [
          {
            type: 'video',
            url: typeof cleanData.video_link === 'string' ? cleanData.video_link : '',
            thumbnail: cleanData.thumbnail || '',
            label: 'Download Video'
          },
          {
            type: 'audio',
            url: typeof cleanData.audio_link === 'string' ? cleanData.audio_link : '',
            thumbnail: cleanData.thumbnail || '',
            label: 'Download Audio'
          }
        ].filter(item => item.url)
      };

    case 'pinterest':
      return {
        ...baseResponse,
        type: 'image',
        items: [{
          type: 'image',
          url: typeof cleanData.media_link === 'string' ? cleanData.media_link : '',
          thumbnail: typeof cleanData.media_link === 'string' ? cleanData.media_link : ''
        }]
      };

    case 'pornhub':
      return {
        ...baseResponse,
        type: 'video',
        items: [{
          type: 'video',
          url: typeof cleanData.video_link === 'string' ? cleanData.video_link : '',
          thumbnail: cleanData.cover || ''
        }]
      };

    default:
      return { ...baseResponse, message: 'Unsupported platform response format' };
  }
}

// Main download endpoint
app.post('/api/download', async (req, res) => {
  try {
    const { platform, url } = req.body;

    if (!url) return res.status(400).json({ status: 'error', message: 'URL is required' });

    const detectedPlatform = platform || detectPlatform(url);
    if (!detectedPlatform || !platformMapping[detectedPlatform]) {
      return res.status(400).json({ status: 'error', message: 'Unsupported platform or invalid URL' });
    }

    const tiinyParam = platformMapping[detectedPlatform];
    const tiinyUrl = `https://multimedia.tiiny.io?${tiinyParam}=${encodeURIComponent(url)}`;

    const response = await fetch(tiinyUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const normalizedResponse = normalizeResponse(data, detectedPlatform);

    res.json(normalizedResponse);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process download request' });
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

