import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHAR_DIR = path.join(__dirname, '..', 'public', 'characters');
const BG_DIR = path.join(__dirname, '..', 'public', 'backgrounds');
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio_cache');

fs.mkdirSync(CHAR_DIR, { recursive: true });
fs.mkdirSync(BG_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Helper to create 4-state character SVG (2x2 grid)
// cell 0: (x: 0, y: 0) -> Mouth Closed, Eyes Open
// cell 1: (x: 512, y: 0) -> Mouth Open, Eyes Open
// cell 2: (x: 0, y: 512) -> Mouth Closed, Eyes Closed
// cell 3: (x: 512, y: 512) -> Mouth Open, Eyes Closed
function generateCharacterSheetSvg(char) {
  const { name, hairColor, skinColor, clothColor, hairType, accessory, eyeStyle } = char;

  const renderCell = (cx, cy, label, mouthOpen, eyesOpen) => {
    // Face center relative to cell: (cx + 256, cy + 280)
    const fx = cx + 256;
    const fy = cy + 280;

    // Eyes
    let eyesSvg = '';
    if (eyesOpen) {
      if (eyeStyle === 'sharp') {
        // Mother / sharp eyes
        eyesSvg = `
          <!-- Left Eye -->
          <ellipse cx="${fx - 55}" cy="${fy - 20}" rx="22" ry="16" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx - 52}" cy="${fy - 20}" r="10" fill="#2d3748"/>
          <circle cx="${fx - 55}" cy="${fy - 24}" r="4" fill="#ffffff"/>
          <path d="M ${fx - 80} ${fy - 38} Q ${fx - 55} ${fy - 48} ${fx - 30} ${fy - 32}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
          
          <!-- Right Eye -->
          <ellipse cx="${fx + 55}" cy="${fy - 20}" rx="22" ry="16" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx + 52}" cy="${fy - 20}" r="10" fill="#2d3748"/>
          <circle cx="${fx + 49}" cy="${fy - 24}" r="4" fill="#ffffff"/>
          <path d="M ${fx + 30} ${fy - 32} Q ${fx + 55} ${fy - 48} ${fx + 80} ${fy - 38}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
        `;
      } else if (eyeStyle === 'sassy') {
        // Sister / sassy cat eyes
        eyesSvg = `
          <!-- Left Eye -->
          <ellipse cx="${fx - 55}" cy="${fy - 18}" rx="24" ry="18" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx - 50}" cy="${fy - 18}" r="12" fill="#4a5568"/>
          <circle cx="${fx - 54}" cy="${fy - 22}" r="5" fill="#ffffff"/>
          <path d="M ${fx - 82} ${fy - 32} Q ${fx - 55} ${fy - 44} ${fx - 28} ${fy - 32}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
          <path d="M ${fx - 32} ${fy - 22} L ${fx - 24} ${fy - 28}" stroke="#222" stroke-width="3.5" stroke-linecap="round"/>
          
          <!-- Right Eye -->
          <ellipse cx="${fx + 55}" cy="${fy - 18}" rx="24" ry="18" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx + 50}" cy="${fy - 18}" r="12" fill="#4a5568"/>
          <circle cx="${fx + 46}" cy="${fy - 22}" r="5" fill="#ffffff"/>
          <path d="M ${fx + 28} ${fy - 32} Q ${fx + 55} ${fy - 44} ${fx + 82} ${fy - 32}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
          <path d="M ${fx + 32} ${fy - 22} L ${fx + 24} ${fy - 28}" stroke="#222" stroke-width="3.5" stroke-linecap="round"/>
        `;
      } else {
        // Normal cute webtoon eyes (Sooyeon, Taejun)
        eyesSvg = `
          <!-- Left Eye -->
          <ellipse cx="${fx - 52}" cy="${fy - 18}" rx="22" ry="24" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx - 50}" cy="${fy - 15}" r="14" fill="#1a202c"/>
          <circle cx="${fx - 55}" cy="${fy - 22}" r="6" fill="#ffffff"/>
          <circle cx="${fx - 46}" cy="${fy - 10}" r="3" fill="#ffffff"/>
          <path d="M ${fx - 76} ${fy - 42} Q ${fx - 52} ${fy - 50} ${fx - 28} ${fy - 38}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
          
          <!-- Right Eye -->
          <ellipse cx="${fx + 52}" cy="${fy - 18}" rx="22" ry="24" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx + 50}" cy="${fy - 15}" r="14" fill="#1a202c"/>
          <circle cx="${fx + 45}" cy="${fy - 22}" r="6" fill="#ffffff"/>
          <circle cx="${fx + 54}" cy="${fy - 10}" r="3" fill="#ffffff"/>
          <path d="M ${fx + 28} ${fy - 38} Q ${fx + 52} ${fy - 50} ${fx + 76} ${fy - 42}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
        `;
      }
    } else {
      // Eyes Closed (blink or happy curve)
      eyesSvg = `
        <!-- Left Eye Closed -->
        <path d="M ${fx - 78} ${fy - 15} Q ${fx - 52} ${fy + 6} ${fx - 26} ${fy - 15}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
        <path d="M ${fx - 76} ${fy - 38} Q ${fx - 52} ${fy - 48} ${fx - 28} ${fy - 36}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
        
        <!-- Right Eye Closed -->
        <path d="M ${fx + 26} ${fy - 15} Q ${fx + 52} ${fy + 6} ${fx + 78} ${fy - 15}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
        <path d="M ${fx + 28} ${fy - 36} Q ${fx + 52} ${fy - 48} ${fx + 76} ${fy - 38}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
      `;
    }

    // Mouth
    let mouthSvg = '';
    if (mouthOpen) {
      if (!eyesOpen) {
        // Laughing / Shouting mouth
        mouthSvg = `
          <path d="M ${fx - 36} ${fy + 55} Q ${fx} ${fy + 105} ${fx + 36} ${fy + 55} Z" fill="#b91c1c" stroke="#222" stroke-width="4"/>
          <!-- Tongue -->
          <path d="M ${fx - 22} ${fy + 82} Q ${fx} ${fy + 68} ${fx + 22} ${fy + 82} Q ${fx} ${fy + 98} ${fx - 22} ${fy + 82} Z" fill="#f87171"/>
          <!-- Teeth -->
          <path d="M ${fx - 28} ${fy + 57} L ${fx + 28} ${fy + 57} Q ${fx} ${fy + 68} ${fx - 28} ${fy + 57} Z" fill="#ffffff"/>
        `;
      } else {
        // Open speaking mouth
        mouthSvg = `
          <path d="M ${fx - 28} ${fy + 60} Q ${fx} ${fy + 96} ${fx + 28} ${fy + 60} Z" fill="#b91c1c" stroke="#222" stroke-width="4"/>
          <path d="M ${fx - 18} ${fy + 78} Q ${fx} ${fy + 66} ${fx + 18} ${fy + 78} Q ${fx} ${fy + 92} ${fx - 18} ${fy + 78} Z" fill="#f87171"/>
        `;
      }
    } else {
      // Closed mouth
      mouthSvg = `
        <path d="M ${fx - 20} ${fy + 64} Q ${fx} ${fy + 68} ${fx + 20} ${fy + 64}" stroke="#222" stroke-width="4" stroke-linecap="round" fill="none"/>
      `;
    }

    // Hair Back
    let hairBack = '';
    if (hairType === 'long') {
      hairBack = `
        <path d="M ${fx - 130} ${fy - 80} C ${fx - 160} ${fy + 140}, ${fx - 140} ${fy + 250}, ${fx - 90} ${fy + 280} L ${fx + 90} ${fy + 280} C ${fx + 140} ${fy + 250}, ${fx + 160} ${fy + 140}, ${fx + 130} ${fy - 80} Z" fill="${hairColor}"/>
      `;
    } else if (hairType === 'perm') {
      hairBack = `
        <!-- Ajumma Perm Hair Back -->
        <circle cx="${fx - 110}" cy="${fy - 40}" r="45" fill="${hairColor}"/>
        <circle cx="${fx + 110}" cy="${fy - 40}" r="45" fill="${hairColor}"/>
        <circle cx="${fx - 120}" cy="${fy + 20}" r="40" fill="${hairColor}"/>
        <circle cx="${fx + 120}" cy="${fy + 20}" r="40" fill="${hairColor}"/>
        <circle cx="${fx - 100}" cy="${fy + 80}" r="38" fill="${hairColor}"/>
        <circle cx="${fx + 100}" cy="${fy + 80}" r="38" fill="${hairColor}"/>
      `;
    } else if (hairType === 'ponytail') {
      hairBack = `
        <!-- Ponytail behind right shoulder -->
        <path d="M ${fx + 80} ${fy - 40} C ${fx + 160} ${fy - 20}, ${fx + 180} ${fy + 120}, ${fx + 130} ${fy + 200} C ${fx + 110} ${fy + 150}, ${fx + 110} ${fy + 50}, ${fx + 70} ${fy - 10} Z" fill="${hairColor}"/>
      `;
    }

    // Hair Front
    let hairFront = '';
    if (hairType === 'long') {
      hairFront = `
        <!-- Long front bangs -->
        <path d="M ${fx - 115} ${fy - 70} Q ${fx} ${fy - 170} ${fx + 115} ${fy - 70} C ${fx + 125} ${fy - 20}, ${fx + 105} ${fy + 60}, ${fx + 95} ${fy + 100} C ${fx + 80} ${fy + 30}, ${fx + 75} ${fy - 30}, ${fx + 30} ${fy - 45} C ${fx} ${fy - 45}, ${fx - 30} ${fy - 45}, ${fx - 75} ${fy - 30} C ${fx - 80} ${fy + 30}, ${fx - 105} ${fy + 60}, ${fx - 115} ${fy - 70} Z" fill="${hairColor}"/>
      `;
    } else if (hairType === 'short_male') {
      hairFront = `
        <!-- Dandy Cut Hair -->
        <path d="M ${fx - 110} ${fy - 60} Q ${fx} ${fy - 170} ${fx + 110} ${fy - 60} C ${fx + 115} ${fy - 10}, ${fx + 95} ${fy + 20}, ${fx + 85} ${fy - 10} C ${fx + 65} ${fy - 40}, ${fx + 20} ${fy - 42}, ${fx - 15} ${fy - 38} C ${fx - 55} ${fy - 38}, ${fx - 90} ${fy - 10}, ${fx - 110} ${fy - 60} Z" fill="${hairColor}"/>
      `;
    } else if (hairType === 'perm') {
      hairFront = `
        <!-- Ajumma Perm Puffs Top -->
        <circle cx="${fx - 80}" cy="${fy - 100}" r="45" fill="${hairColor}"/>
        <circle cx="${fx - 30}" cy="${fy - 120}" r="48" fill="${hairColor}"/>
        <circle cx="${fx + 30}" cy="${fy - 120}" r="48" fill="${hairColor}"/>
        <circle cx="${fx + 80}" cy="${fy - 100}" r="45" fill="${hairColor}"/>
        <path d="M ${fx - 90} ${fy - 60} Q ${fx} ${fy - 85} ${fx + 90} ${fy - 60} L ${fx + 85} ${fy - 40} Q ${fx} ${fy - 60} ${fx - 85} ${fy - 40} Z" fill="${hairColor}"/>
      `;
    } else if (hairType === 'ponytail') {
      hairFront = `
        <path d="M ${fx - 110} ${fy - 60} Q ${fx} ${fy - 165} ${fx + 110} ${fy - 60} C ${fx + 100} ${fy - 10}, ${fx + 70} ${fy - 30}, ${fx + 25} ${fy - 40} C ${fx - 15} ${fy - 40}, ${fx - 60} ${fy - 30}, ${fx - 110} ${fy - 60} Z" fill="${hairColor}"/>
      `;
    }

    // Accessories
    let accSvg = '';
    if (accessory === 'earrings') {
      accSvg = `
        <circle cx="${fx - 104}" cy="${fy + 20}" r="6" fill="#fbbf24" stroke="#222" stroke-width="2"/>
        <circle cx="${fx + 104}" cy="${fy + 20}" r="6" fill="#fbbf24" stroke="#222" stroke-width="2"/>
      `;
    } else if (accessory === 'scarf') {
      accSvg = `
        <!-- Mother Luxury Floral Scarf -->
        <path d="M ${fx - 65} ${fy + 140} Q ${fx} ${fy + 180} ${fx + 65} ${fy + 140} Q ${fx} ${fy + 120} ${fx - 65} ${fy + 140} Z" fill="#ec4899" stroke="#9d174d" stroke-width="3"/>
        <circle cx="${fx}" cy="${fy + 160}" r="10" fill="#fbbf24" stroke="#222" stroke-width="2"/>
      `;
    }

    // Blush
    const blushSvg = `
      <ellipse cx="${fx - 65}" cy="${fy + 15}" rx="14" ry="7" fill="#fb7185" opacity="0.35"/>
      <ellipse cx="${fx + 65}" cy="${fy + 15}" rx="14" ry="7" fill="#fb7185" opacity="0.35"/>
    `;

    return `
      <!-- Cell Background with Label Bar (White canvas to test BFS flood-fill background removal) -->
      <rect x="${cx}" y="${cy}" width="512" height="512" fill="#ffffff"/>
      
      <!-- Label Header (to be detected and auto-cropped by imageProcessor) -->
      <rect x="${cx + 20}" y="${cy + 15}" width="472" height="36" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="${cx + 256}" y="${cy + 38}" font-family="'Pretendard', sans-serif" font-size="16" font-weight="bold" fill="#475569" text-anchor="middle">${label}</text>

      <!-- Character Visuals -->
      <g>
        ${hairBack}

        <!-- Shoulders / Body -->
        <path d="M ${fx - 160} ${fy + 240} C ${fx - 110} ${fy + 140}, ${fx - 55} ${fy + 130}, ${fx - 40} ${fy + 110} L ${fx + 40} ${fy + 110} C ${fx + 55} ${fy + 130}, ${fx + 110} ${fy + 140}, ${fx + 160} ${fy + 240} Z" fill="${clothColor}" stroke="#1e293b" stroke-width="4"/>

        <!-- Neck -->
        <rect x="${fx - 28}" y="${fy + 75}" width="56" height="55" rx="10" fill="${skinColor}" stroke="#1e293b" stroke-width="4"/>

        <!-- Ears -->
        <ellipse cx="${fx - 100}" cy="${fy + 10}" rx="14" ry="22" fill="${skinColor}" stroke="#1e293b" stroke-width="3"/>
        <ellipse cx="${fx + 100}" cy="${fy + 10}" rx="14" ry="22" fill="${skinColor}" stroke="#1e293b" stroke-width="3"/>

        <!-- Face / Head Base -->
        <ellipse cx="${fx}" cy="${fy}" rx="100" ry="110" fill="${skinColor}" stroke="#1e293b" stroke-width="4"/>

        <!-- Nose -->
        <path d="M ${fx} ${fy + 15} L ${fx - 4} ${fy + 28} L ${fx + 4} ${fy + 28}" stroke="#222" stroke-width="3" stroke-linecap="round" fill="none"/>

        ${blushSvg}
        ${eyesSvg}
        ${mouthSvg}
        ${hairFront}
        ${accSvg}
      </g>
    `;
  };

  return `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <!-- Clean White Background without dividing grid lines -->
      <rect width="1024" height="1024" fill="#ffffff"/>

      ${renderCell(0, 0, '1: 입 다물고 눈 뜬 상태 (기본/경청)', false, true)}
      ${renderCell(512, 0, '2: 입 벌리고 눈 뜬 상태 (발화)', true, true)}
      ${renderCell(0, 512, '3: 입 다물고 눈 감은 상태 (깜빡임)', false, false)}
      ${renderCell(512, 512, '4: 입 벌리고 눈 감은 상태 (외침/웃음)', true, false)}
    </svg>
  `;
}

// Background SVG Generators
function generateLivingRoomSvg() {
  return `
    <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fdfbf7"/>
          <stop offset="100%" stop-color="#ece5d8"/>
        </linearGradient>
        <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#dfcfb8"/>
          <stop offset="100%" stop-color="#c8b295"/>
        </linearGradient>
      </defs>
      <!-- Wall -->
      <rect width="1280" height="520" fill="url(#wallGrad)"/>
      <!-- Molding -->
      <rect y="505" width="1280" height="15" fill="#a89078"/>
      <!-- Wood Floor -->
      <rect y="520" width="1280" height="200" fill="url(#floorGrad)"/>
      <!-- Floor planks -->
      <line x1="200" y1="520" x2="150" y2="720" stroke="#bba487" stroke-width="2"/>
      <line x1="450" y1="520" x2="420" y2="720" stroke="#bba487" stroke-width="2"/>
      <line x1="750" y1="520" x2="740" y2="720" stroke="#bba487" stroke-width="2"/>
      <line x1="1050" y1="520" x2="1080" y2="720" stroke="#bba487" stroke-width="2"/>

      <!-- Window with Sunlight -->
      <rect x="750" y="80" width="380" height="340" rx="6" fill="#bfdbfe" stroke="#64748b" stroke-width="10"/>
      <rect x="760" y="90" width="170" height="155" fill="#dbeafe"/>
      <rect x="945" y="90" width="170" height="155" fill="#dbeafe"/>
      <rect x="760" y="255" width="170" height="155" fill="#dbeafe"/>
      <rect x="945" y="255" width="170" height="155" fill="#dbeafe"/>
      <!-- Curtains -->
      <path d="M 730 60 Q 750 250 710 440 L 760 440 Q 780 250 750 60 Z" fill="#fef08a" opacity="0.8"/>
      <path d="M 1150 60 Q 1130 250 1170 440 L 1120 440 Q 1100 250 1130 60 Z" fill="#fef08a" opacity="0.8"/>

      <!-- Wall Picture Frame -->
      <rect x="250" y="120" width="220" height="160" rx="4" fill="#3b82f6" stroke="#b45309" stroke-width="8"/>
      <circle cx="360" cy="180" r="30" fill="#fde047"/>
      <polygon points="260,260 330,190 400,260" fill="#22c55e"/>
      <polygon points="340,260 410,210 460,260" fill="#15803d"/>

      <!-- Modern Sofa Center -->
      <rect x="220" y="380" width="840" height="180" rx="30" fill="#64748b"/>
      <rect x="250" y="340" width="780" height="120" rx="20" fill="#475569"/>
      <!-- Sofa Cushions -->
      <rect x="270" y="440" width="230" height="100" rx="15" fill="#334155"/>
      <rect x="525" y="440" width="230" height="100" rx="15" fill="#334155"/>
      <rect x="780" y="440" width="230" height="100" rx="15" fill="#334155"/>
      <circle cx="340" cy="400" r="45" fill="#f59e0b"/>
      <circle cx="940" cy="400" r="45" fill="#ec4899"/>

      <!-- Indoor Plant on Right -->
      <path d="M 1180 430 L 1160 560 L 1220 560 L 1200 430 Z" fill="#c2410c"/>
      <path d="M 1190 430 Q 1150 320 1110 300 Q 1160 360 1190 430" fill="#16a34a"/>
      <path d="M 1190 430 Q 1230 310 1260 280 Q 1230 350 1190 430" fill="#15803d"/>
      <path d="M 1190 430 Q 1190 260 1180 240 Q 1200 340 1190 430" fill="#22c55e"/>
    </svg>
  `;
}

function generateCafeSvg() {
  return `
    <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <!-- Brick / Wood Cozy Cafe Background -->
      <rect width="1280" height="720" fill="#292524"/>
      <!-- Brick Texture Lines -->
      <rect y="0" width="1280" height="480" fill="#44403c"/>
      <line x1="0" y1="120" x2="1280" y2="120" stroke="#292524" stroke-width="4"/>
      <line x1="0" y1="240" x2="1280" y2="240" stroke="#292524" stroke-width="4"/>
      <line x1="0" y1="360" x2="1280" y2="360" stroke="#292524" stroke-width="4"/>
      <line x1="0" y1="480" x2="1280" y2="480" stroke="#1c1917" stroke-width="8"/>
      <!-- Wood Counter Table -->
      <rect y="480" width="1280" height="240" fill="#78350f"/>
      <rect y="480" width="1280" height="25" fill="#92400e"/>
      <!-- Pendant Warm Lights -->
      <line x1="280" y1="0" x2="280" y2="160" stroke="#000" stroke-width="3"/>
      <ellipse cx="280" cy="180" rx="35" ry="20" fill="#f59e0b"/>
      <circle cx="280" cy="190" r="14" fill="#fef08a"/>
      <line x1="1000" y1="0" x2="1000" y2="160" stroke="#000" stroke-width="3"/>
      <ellipse cx="1000" cy="180" rx="35" ry="20" fill="#f59e0b"/>
      <circle cx="1000" cy="190" r="14" fill="#fef08a"/>
      <!-- Coffee Blackboard Menu -->
      <rect x="440" y="80" width="400" height="220" rx="10" fill="#1c1917" stroke="#b45309" stroke-width="8"/>
      <text x="640" y="130" font-family="'Pretendard', sans-serif" font-size="28" font-weight="bold" fill="#f59e0b" text-anchor="middle">☕ SSUL CAFE MENU</text>
      <text x="500" y="180" font-family="sans-serif" font-size="18" fill="#e7e5e4">Americano ....... 4.5</text>
      <text x="500" y="220" font-family="sans-serif" font-size="18" fill="#e7e5e4">Vanilla Latte ..... 5.5</text>
      <text x="500" y="260" font-family="sans-serif" font-size="18" fill="#f87171">사이다 폭탄에이드 . 6.0</text>
      <!-- Coffee Cups on Table -->
      <rect x="220" y="440" width="50" height="60" rx="6" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
      <rect x="1010" y="440" width="50" height="60" rx="6" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
    </svg>
  `;
}

function generateCourtSvg() {
  return `
    <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <!-- Courtroom / Serious Legal Setting -->
      <rect width="1280" height="720" fill="#1e1b4b"/>
      <!-- Wood Panels -->
      <rect y="0" width="1280" height="420" fill="#451a03"/>
      <rect x="100" y="40" width="220" height="340" fill="#78350f" stroke="#292524" stroke-width="4"/>
      <rect x="360" y="40" width="220" height="340" fill="#78350f" stroke="#292524" stroke-width="4"/>
      <rect x="700" y="40" width="220" height="340" fill="#78350f" stroke="#292524" stroke-width="4"/>
      <rect x="960" y="40" width="220" height="340" fill="#78350f" stroke="#292524" stroke-width="4"/>
      <!-- Court Emblem / Scales of Justice -->
      <circle cx="640" cy="140" r="50" fill="#fbbf24" stroke="#d97706" stroke-width="6"/>
      <path d="M 640 110 L 640 170 M 610 130 L 670 130 M 610 130 L 600 155 L 620 155 Z M 670 130 L 660 155 L 680 155 Z" stroke="#78350f" stroke-width="4" fill="none"/>
      <!-- High Judge Bench -->
      <rect y="420" width="1280" height="300" fill="#312e81"/>
      <rect y="420" width="1280" height="40" fill="#4338ca"/>
      <!-- Gavel on Desk -->
      <ellipse cx="640" cy="445" rx="35" ry="12" fill="#78350f"/>
      <rect x="630" y="415" width="20" height="30" rx="4" fill="#92400e" stroke="#451a03" stroke-width="2"/>
    </svg>
  `;
}

function generateStreetSvg() {
  return `
    <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <!-- Night City Street / Neon Lights -->
      <rect width="1280" height="720" fill="#090d16"/>
      <!-- Distant City Skyline -->
      <rect x="50" y="160" width="140" height="360" fill="#1e293b"/>
      <rect x="220" y="110" width="180" height="410" fill="#0f172a"/>
      <rect x="430" y="200" width="120" height="320" fill="#1e293b"/>
      <rect x="720" y="90" width="210" height="430" fill="#0f172a"/>
      <rect x="960" y="140" width="160" height="380" fill="#1e293b"/>
      <rect x="1140" y="190" width="120" height="330" fill="#0f172a"/>
      <!-- Building Windows -->
      <g fill="#fef08a" opacity="0.6">
        <rect x="80" y="200" width="12" height="18"/>
        <rect x="120" y="200" width="12" height="18"/>
        <rect x="80" y="240" width="12" height="18"/>
        <rect x="120" y="280" width="12" height="18"/>
        <rect x="250" y="150" width="16" height="20"/>
        <rect x="300" y="150" width="16" height="20"/>
        <rect x="250" y="200" width="16" height="20"/>
        <rect x="760" y="130" width="18" height="24"/>
        <rect x="820" y="130" width="18" height="24"/>
        <rect x="820" y="180" width="18" height="24"/>
        <rect x="1000" y="180" width="14" height="20"/>
        <rect x="1050" y="180" width="14" height="20"/>
      </g>
      <!-- Neon Signs -->
      <rect x="420" y="240" width="140" height="50" rx="8" fill="#ec4899" opacity="0.9"/>
      <text x="490" y="275" font-family="'Pretendard', sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle">포차 25시</text>
      <!-- Street Road & Pavement -->
      <rect y="500" width="1280" height="220" fill="#1e293b"/>
      <rect y="490" width="1280" height="15" fill="#475569"/>
      <!-- Road markings -->
      <line x1="100" y1="620" x2="300" y2="620" stroke="#f8fafc" stroke-width="8" stroke-dasharray="60,40"/>
      <line x1="500" y1="620" x2="700" y2="620" stroke="#f8fafc" stroke-width="8" stroke-dasharray="60,40"/>
      <line x1="900" y1="620" x2="1100" y2="620" stroke="#f8fafc" stroke-width="8" stroke-dasharray="60,40"/>
      <!-- Street Lantern -->
      <line x1="180" y1="260" x2="180" y2="500" stroke="#334155" stroke-width="10"/>
      <circle cx="180" cy="250" r="28" fill="#fde047" opacity="0.9"/>
      <ellipse cx="180" cy="500" rx="90" ry="25" fill="#fde047" opacity="0.15"/>
    </svg>
  `;
}

// Characters specification
const characters = [
  {
    id: 'sooyeon',
    name: 'sooyeon.png',
    hairColor: '#451a03',
    skinColor: '#fde2e4',
    clothColor: '#3b82f6',
    hairType: 'long',
    accessory: 'none',
    eyeStyle: 'cute'
  },
  {
    id: 'taejun',
    name: 'taejun.png',
    hairColor: '#1e293b',
    skinColor: '#fed7aa',
    clothColor: '#10b981',
    hairType: 'short_male',
    accessory: 'none',
    eyeStyle: 'cute'
  },
  {
    id: 'mother',
    name: 'mother.png',
    hairColor: '#374151',
    skinColor: '#fed7aa',
    clothColor: '#9333ea',
    hairType: 'perm',
    accessory: 'scarf',
    eyeStyle: 'sharp'
  },
  {
    id: 'sister',
    name: 'sister.png',
    hairColor: '#b45309',
    skinColor: '#fde2e4',
    clothColor: '#f43f5e',
    hairType: 'ponytail',
    accessory: 'earrings',
    eyeStyle: 'sassy'
  }
];

async function main() {
  console.log('Generating characters and backgrounds...');

  // 1. Generate Characters
  for (const char of characters) {
    const svg = generateCharacterSheetSvg(char);
    const targetPng = path.join(CHAR_DIR, char.name);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(targetPng);
    console.log(`Generated character sheet: ${char.name}`);
  }

  // 2. Generate Backgrounds
  const backgrounds = [
    { name: 'livingroom.png', svg: generateLivingRoomSvg() },
    { name: 'cafe.png', svg: generateCafeSvg() },
    { name: 'court.png', svg: generateCourtSvg() },
    { name: 'street.png', svg: generateStreetSvg() }
  ];

  for (const bg of backgrounds) {
    const targetPng = path.join(BG_DIR, bg.name);
    await sharp(Buffer.from(bg.svg))
      .png()
      .toFile(targetPng);
    console.log(`Generated background: ${bg.name}`);
  }

  console.log('All assets successfully generated!');
}

main().catch(console.error);
