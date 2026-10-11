const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create directory if not exists
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Function to generate raw PNG with gradient background and luxury logo
function createPng(width, height) {
  // RGBA buffer
  const rgba = Buffer.alloc(width * height * 4);

  // Center coordinates
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.44;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < height; x++) {
      const idx = (y * width + x) * 4;
      
      // Rounded squircle / rounded rect container
      const cornerRadius = width * 0.22;
      const dx = Math.max(0, Math.abs(x - cx) - (width * 0.46 - cornerRadius));
      const dy = Math.max(0, Math.abs(y - cy) - (height * 0.46 - cornerRadius));
      const distFromCorner = Math.sqrt(dx * dx + dy * dy);

      if (distFromCorner > cornerRadius) {
        // Transparent outside
        rgba[idx] = 0;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 0;
        continue;
      }

      // Background gradient: #0b1528 (slate-950) to #0f766e (brand-700) to #14b8a6 (brand-500)
      const gradFactor = (x + y) / (width + height);
      let rBg = Math.round(11 + gradFactor * (15 - 11));
      let gBg = Math.round(21 + gradFactor * (118 - 21));
      let bBg = Math.round(40 + gradFactor * (110 - 40));

      // Draw subtle inner border
      if (distFromCorner > cornerRadius - 4 || 
          Math.abs(x - cx) > width * 0.44 || 
          Math.abs(y - cy) > height * 0.44) {
        rBg = Math.min(255, rBg + 40);
        gBg = Math.min(255, gBg + 60);
        bBg = Math.min(255, bBg + 60);
      }

      // Draw Pin & Pulse wave symbol
      // Pin circle at cx, cy - height * 0.08, radius height * 0.2
      const pinY = cy - height * 0.06;
      const distPin = Math.hypot(x - cx, y - pinY);

      let isForeground = false;
      let fgR = 255, fgG = 255, fgB = 255;

      // Outer pin circle
      if (distPin < height * 0.22 && distPin > height * 0.13) {
        isForeground = true;
        fgR = 20; fgG = 184; fgB = 166; // brand-500
      }
      // Inner pin center dot
      if (distPin < height * 0.07) {
        isForeground = true;
        fgR = 245; fgG = 158; fgB = 11; // gold-500
      }

      // Pulse wave line across middle (y near cy + height * 0.18)
      const pulseY = cy + height * 0.18;
      const waveX = (x - cx) / (width * 0.35);
      if (Math.abs(waveX) <= 1) {
        // Heartbeat pulse waveform function: 0 -> peak -> trough -> 0
        let targetY = pulseY;
        if (waveX > -0.3 && waveX < -0.1) {
          targetY = pulseY - height * 0.12 * Math.sin((waveX + 0.3) / 0.2 * Math.PI);
        } else if (waveX >= -0.1 && waveX < 0.2) {
          targetY = pulseY + height * 0.08 * Math.sin((waveX + 0.1) / 0.3 * Math.PI);
        }
        if (Math.abs(y - targetY) < Math.max(2, width * 0.02)) {
          isForeground = true;
          fgR = 255; fgG = 255; fgB = 255;
        }
      }

      if (isForeground) {
        rgba[idx] = fgR;
        rgba[idx + 1] = fgG;
        rgba[idx + 2] = fgB;
        rgba[idx + 3] = 255;
      } else {
        rgba[idx] = rBg;
        rgba[idx + 1] = gBg;
        rgba[idx + 2] = bBg;
        rgba[idx + 3] = 255;
      }
    }
  }

  return encodePng(width, height, rgba);
}

// Pure Node.js PNG encoder
function encodePng(width, height, rgba) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // color type 6: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with filter type 0 (None) before each scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);
  for (let y = 0; y < height; y++) {
    const rawOffset = y * scanlineLength;
    rawData[rawOffset] = 0; // Filter: None
    rgba.copy(rawData, rawOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  // Compress IDAT
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table & function for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// Generate sizes
const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
];

for (const { name, size } of sizes) {
  const pngBuf = createPng(size, size);
  fs.writeFileSync(path.join(iconsDir, name), pngBuf);
  console.log(`Generated ${name} (${size}x${size}, ${pngBuf.length} bytes)`);
}

// Also create favicon.ico / copy 32x32 to public
fs.copyFileSync(path.join(iconsDir, 'favicon-32x32.png'), path.join(__dirname, '..', 'public', 'favicon.ico'));

// Also create vector SVG icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#0f766e" />
      <stop offset="100%" stop-color="#14b8a6" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <rect x="12" y="12" width="488" height="488" rx="100" stroke="#5eead4" stroke-opacity="0.3" stroke-width="4" />
  
  <!-- Map Pin & Pulse -->
  <g transform="translate(256, 210)">
    <circle cx="0" cy="0" r="96" stroke="#ffffff" stroke-width="24" fill="none" opacity="0.95" />
    <circle cx="0" cy="0" r="38" fill="url(#goldGrad)" filter="url(#glow)" />
    <path d="M-56,64 L0,150 L56,64" fill="#ffffff" opacity="0.95" />
  </g>
  
  <!-- Pulse Waveform -->
  <path d="M 80,390 L 170,390 L 205,330 L 245,430 L 285,350 L 325,410 L 350,390 L 432,390" 
        stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#glow)" />
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
console.log('Generated icon.svg');
