import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Generates a modular 4-split character sheet (2x2 grid, 1024x1024)
 * Cell 0 (Top-Left): Mouth Closed, Eyes Open (기본 / 경청)
 * Cell 1 (Top-Right): Mouth Open, Eyes Open (발화)
 * Cell 2 (Bottom-Left): Mouth Closed, Eyes Closed (눈 깜빡임)
 * Cell 3 (Bottom-Right): Mouth Open, Eyes Closed (외침 / 웃음 / 감정 발화)
 */
export function buildCharacterSheetSvg(config) {
  const {
    hairColor = '#451a03',
    skinColor = '#fde2e4',
    clothColor = '#3b82f6',
    hairType = 'long',
    accessory = 'none',
    eyeStyle = 'cute'
  } = config;

  const renderCell = (cx, cy, label, mouthOpen, eyesOpen) => {
    const fx = cx + 256;
    const fy = cy + 280;

    // 1. Eyes
    let eyesSvg = '';
    if (eyesOpen) {
      if (eyeStyle === 'sharp' || eyeStyle === 'angry') {
        eyesSvg = `
          <ellipse cx="${fx - 55}" cy="${fy - 20}" rx="22" ry="16" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx - 52}" cy="${fy - 20}" r="10" fill="#2d3748"/>
          <circle cx="${fx - 55}" cy="${fy - 24}" r="4" fill="#ffffff"/>
          <path d="M ${fx - 80} ${fy - 38} Q ${fx - 55} ${fy - 48} ${fx - 30} ${fy - 32}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
          
          <ellipse cx="${fx + 55}" cy="${fy - 20}" rx="22" ry="16" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx + 52}" cy="${fy - 20}" r="10" fill="#2d3748"/>
          <circle cx="${fx + 49}" cy="${fy - 24}" r="4" fill="#ffffff"/>
          <path d="M ${fx + 30} ${fy - 32} Q ${fx + 55} ${fy - 48} ${fx + 80} ${fy - 38}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
        `;
      } else if (eyeStyle === 'sassy') {
        eyesSvg = `
          <ellipse cx="${fx - 55}" cy="${fy - 18}" rx="24" ry="18" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx - 50}" cy="${fy - 18}" r="12" fill="#4a5568"/>
          <circle cx="${fx - 54}" cy="${fy - 22}" r="5" fill="#ffffff"/>
          <path d="M ${fx - 82} ${fy - 32} Q ${fx - 55} ${fy - 44} ${fx - 28} ${fy - 32}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
          <path d="M ${fx - 32} ${fy - 22} L ${fx - 24} ${fy - 28}" stroke="#222" stroke-width="3.5" stroke-linecap="round"/>
          
          <ellipse cx="${fx + 55}" cy="${fy - 18}" rx="24" ry="18" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx + 50}" cy="${fy - 18}" r="12" fill="#4a5568"/>
          <circle cx="${fx + 46}" cy="${fy - 22}" r="5" fill="#ffffff"/>
          <path d="M ${fx + 28} ${fy - 32} Q ${fx + 55} ${fy - 44} ${fx + 82} ${fy - 32}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
          <path d="M ${fx + 32} ${fy - 22} L ${fx + 24} ${fy - 28}" stroke="#222" stroke-width="3.5" stroke-linecap="round"/>
        `;
      } else {
        // Cute webtoon round eyes
        eyesSvg = `
          <ellipse cx="${fx - 52}" cy="${fy - 18}" rx="22" ry="24" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx - 50}" cy="${fy - 15}" r="14" fill="#1a202c"/>
          <circle cx="${fx - 55}" cy="${fy - 22}" r="6" fill="#ffffff"/>
          <circle cx="${fx - 46}" cy="${fy - 10}" r="3" fill="#ffffff"/>
          <path d="M ${fx - 76} ${fy - 42} Q ${fx - 52} ${fy - 50} ${fx - 28} ${fy - 38}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
          
          <ellipse cx="${fx + 52}" cy="${fy - 18}" rx="22" ry="24" fill="#ffffff" stroke="#222" stroke-width="3"/>
          <circle cx="${fx + 50}" cy="${fy - 15}" r="14" fill="#1a202c"/>
          <circle cx="${fx + 45}" cy="${fy - 22}" r="6" fill="#ffffff"/>
          <circle cx="${fx + 54}" cy="${fy - 10}" r="3" fill="#ffffff"/>
          <path d="M ${fx + 28} ${fy - 38} Q ${fx + 52} ${fy - 50} ${fx + 76} ${fy - 42}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
        `;
      }
    } else {
      // Eyes closed (happy curve or blink)
      eyesSvg = `
        <path d="M ${fx - 78} ${fy - 15} Q ${fx - 52} ${fy + 6} ${fx - 26} ${fy - 15}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
        <path d="M ${fx - 76} ${fy - 38} Q ${fx - 52} ${fy - 48} ${fx - 28} ${fy - 36}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
        
        <path d="M ${fx + 26} ${fy - 15} Q ${fx + 52} ${fy + 6} ${fx + 78} ${fy - 15}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
        <path d="M ${fx + 28} ${fy - 36} Q ${fx + 52} ${fy - 48} ${fx + 76} ${fy - 38}" stroke="#222" stroke-width="5" stroke-linecap="round" fill="none"/>
      `;
    }

    // 2. Mouth
    let mouthSvg = '';
    if (mouthOpen) {
      if (!eyesOpen) {
        // Shouting / Laughing open mouth
        mouthSvg = `
          <path d="M ${fx - 36} ${fy + 55} Q ${fx} ${fy + 105} ${fx + 36} ${fy + 55} Z" fill="#b91c1c" stroke="#222" stroke-width="4"/>
          <path d="M ${fx - 22} ${fy + 82} Q ${fx} ${fy + 68} ${fx + 22} ${fy + 82} Q ${fx} ${fy + 98} ${fx - 22} ${fy + 82} Z" fill="#f87171"/>
          <path d="M ${fx - 28} ${fy + 57} L ${fx + 28} ${fy + 57} Q ${fx} ${fy + 68} ${fx - 28} ${fy + 57} Z" fill="#ffffff"/>
        `;
      } else {
        // Speaking open mouth
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

    // 3. Hair Back
    let hairBack = '';
    if (hairType === 'long') {
      hairBack = `
        <path d="M ${fx - 130} ${fy - 80} C ${fx - 160} ${fy + 140}, ${fx - 140} ${fy + 250}, ${fx - 90} ${fy + 280} L ${fx + 90} ${fy + 280} C ${fx + 140} ${fy + 250}, ${fx + 160} ${fy + 140}, ${fx + 130} ${fy - 80} Z" fill="${hairColor}"/>
      `;
    } else if (hairType === 'perm') {
      hairBack = `
        <circle cx="${fx - 110}" cy="${fy - 40}" r="45" fill="${hairColor}"/>
        <circle cx="${fx + 110}" cy="${fy - 40}" r="45" fill="${hairColor}"/>
        <circle cx="${fx - 120}" cy="${fy + 20}" r="40" fill="${hairColor}"/>
        <circle cx="${fx + 120}" cy="${fy + 20}" r="40" fill="${hairColor}"/>
        <circle cx="${fx - 100}" cy="${fy + 80}" r="38" fill="${hairColor}"/>
        <circle cx="${fx + 100}" cy="${fy + 80}" r="38" fill="${hairColor}"/>
      `;
    } else if (hairType === 'ponytail') {
      hairBack = `
        <path d="M ${fx + 80} ${fy - 40} C ${fx + 160} ${fy - 20}, ${fx + 180} ${fy + 120}, ${fx + 130} ${fy + 200} C ${fx + 110} ${fy + 150}, ${fx + 110} ${fy + 50}, ${fx + 70} ${fy - 10} Z" fill="${hairColor}"/>
      `;
    } else if (hairType === 'bob') {
      hairBack = `
        <path d="M ${fx - 125} ${fy - 70} C ${fx - 145} ${fy + 60}, ${fx - 125} ${fy + 130}, ${fx - 85} ${fy + 140} L ${fx + 85} ${fy + 140} C ${fx + 125} ${fy + 130}, ${fx + 145} ${fy + 60}, ${fx + 125} ${fy - 70} Z" fill="${hairColor}"/>
      `;
    }

    // 4. Hair Front
    let hairFront = '';
    if (hairType === 'long') {
      hairFront = `
        <path d="M ${fx - 115} ${fy - 70} Q ${fx} ${fy - 170} ${fx + 115} ${fy - 70} C ${fx + 125} ${fy - 20}, ${fx + 105} ${fy + 60}, ${fx + 95} ${fy + 100} C ${fx + 80} ${fy + 30}, ${fx + 75} ${fy - 30}, ${fx + 30} ${fy - 45} C ${fx} ${fy - 45}, ${fx - 30} ${fy - 45}, ${fx - 75} ${fy - 30} C ${fx - 80} ${fy + 30}, ${fx - 105} ${fy + 60}, ${fx - 115} ${fy - 70} Z" fill="${hairColor}"/>
      `;
    } else if (hairType === 'short_male' || hairType === 'spiky') {
      hairFront = `
        <path d="M ${fx - 110} ${fy - 60} Q ${fx} ${fy - 170} ${fx + 110} ${fy - 60} C ${fx + 115} ${fy - 10}, ${fx + 95} ${fy + 20}, ${fx + 85} ${fy - 10} C ${fx + 65} ${fy - 40}, ${fx + 20} ${fy - 42}, ${fx - 15} ${fy - 38} C ${fx - 55} ${fy - 38}, ${fx - 90} ${fy - 10}, ${fx - 110} ${fy - 60} Z" fill="${hairColor}"/>
      `;
    } else if (hairType === 'perm') {
      hairFront = `
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
    } else if (hairType === 'bob') {
      hairFront = `
        <path d="M ${fx - 112} ${fy - 65} Q ${fx} ${fy - 165} ${fx + 112} ${fy - 65} C ${fx + 120} ${fy - 10}, ${fx + 105} ${fy + 40}, ${fx + 70} ${fy + 25} C ${fx + 25} ${fy - 35}, ${fx - 25} ${fy - 35}, ${fx - 70} ${fy + 25} C ${fx - 105} ${fy + 40}, ${fx - 120} ${fy - 10}, ${fx - 112} ${fy - 65} Z" fill="${hairColor}"/>
      `;
    }

    // 5. Accessories (Glasses, Scarf, Earrings)
    let accSvg = '';
    if (accessory === 'glasses') {
      accSvg = `
        <rect x="${fx - 82}" y="${fy - 35}" width="60" height="36" rx="8" fill="none" stroke="#1e293b" stroke-width="4.5"/>
        <rect x="${fx + 22}" y="${fy - 35}" width="60" height="36" rx="8" fill="none" stroke="#1e293b" stroke-width="4.5"/>
        <line x1="${fx - 22}" y1="${fy - 17}" x2="${fx + 22}" y2="${fy - 17}" stroke="#1e293b" stroke-width="4.5"/>
      `;
    } else if (accessory === 'earrings') {
      accSvg = `
        <circle cx="${fx - 104}" cy="${fy + 20}" r="6" fill="#fbbf24" stroke="#222" stroke-width="2"/>
        <circle cx="${fx + 104}" cy="${fy + 20}" r="6" fill="#fbbf24" stroke="#222" stroke-width="2"/>
      `;
    } else if (accessory === 'scarf') {
      accSvg = `
        <path d="M ${fx - 65} ${fy + 140} Q ${fx} ${fy + 180} ${fx + 65} ${fy + 140} Q ${fx} ${fy + 120} ${fx - 65} ${fy + 140} Z" fill="#ec4899" stroke="#9d174d" stroke-width="3"/>
        <circle cx="${fx}" cy="${fy + 160}" r="10" fill="#fbbf24" stroke="#222" stroke-width="2"/>
      `;
    }

    const blushSvg = `
      <ellipse cx="${fx - 65}" cy="${fy + 15}" rx="14" ry="7" fill="#fb7185" opacity="0.35"/>
      <ellipse cx="${fx + 65}" cy="${fy + 15}" rx="14" ry="7" fill="#fb7185" opacity="0.35"/>
    `;

    return `
      <!-- Pure White Background -->
      <rect x="${cx}" y="${cy}" width="512" height="512" fill="#ffffff"/>
      
      <!-- Label Header (auto-cropped) -->
      <rect x="${cx + 20}" y="${cy + 15}" width="472" height="36" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="${cx + 256}" y="${cy + 38}" font-family="'Pretendard', sans-serif" font-size="16" font-weight="bold" fill="#475569" text-anchor="middle">${label}</text>

      <g>
        ${hairBack}

        <!-- Shoulders / Body -->
        <path d="M ${fx - 160} ${fy + 240} C ${fx - 110} ${fy + 140}, ${fx - 55} ${fy + 130}, ${fx - 40} ${fy + 110} L ${fx + 40} ${fy + 110} C ${fx + 55} ${fy + 130}, ${fx + 110} ${fy + 140}, ${fx + 160} ${fy + 240} Z" fill="${clothColor}" stroke="#1e293b" stroke-width="4"/>

        <!-- Neck -->
        <rect x="${fx - 28}" y="${fy + 75}" width="56" height="55" rx="10" fill="${skinColor}" stroke="#1e293b" stroke-width="4"/>

        <!-- Ears -->
        <ellipse cx="${fx - 100}" cy="${fy + 10}" rx="14" ry="22" fill="${skinColor}" stroke="#1e293b" stroke-width="3"/>
        <ellipse cx="${fx + 100}" cy="${fy + 10}" rx="14" ry="22" fill="${skinColor}" stroke="#1e293b" stroke-width="3"/>

        <!-- Face Base -->
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
      <rect width="1024" height="1024" fill="#ffffff"/>
      ${renderCell(0, 0, '1: 입 다물고 눈 뜬 상태 (기본/경청)', false, true)}
      ${renderCell(512, 0, '2: 입 벌리고 눈 뜬 상태 (발화)', true, true)}
      ${renderCell(0, 512, '3: 입 다물고 눈 감은 상태 (깜빡임)', false, false)}
      ${renderCell(512, 512, '4: 입 벌리고 눈 감은 상태 (외침/웃음)', true, false)}
    </svg>
  `;
}

/**
 * Saves character PNG into targetPath using high-quality webtoon sprite bases
 */
export async function generateCharacterPngFile(config, targetPath) {
  const { hairType = 'short_male', role = '', name = '' } = config;
  const isFemale =
    hairType === 'long' ||
    hairType === 'ponytail' ||
    hairType === 'bob' ||
    hairType === 'perm' ||
    role.includes('여') ||
    role.includes('시어머니') ||
    role.includes('시누이') ||
    role.includes('엄마') ||
    name.includes('수연') ||
    name.includes('여');

  const charDir = path.dirname(targetPath);
  const baseFile = isFemale
    ? path.join(charDir, 'sooyeon.png')
    : path.join(charDir, 'minwoo.png');

  if (fs.existsSync(baseFile)) {
    fs.copyFileSync(baseFile, targetPath);
    return targetPath;
  }

  // Fallback to SVG if base file not found
  const svg = buildCharacterSheetSvg(config);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(targetPath);
  return targetPath;
}
