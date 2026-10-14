/**
 * Zero-Touch Ssul-toon Studio - Image Processor Engine
 * - 1x4 vs 2x2 Automatic Layout Detection
 * - AI Label Auto-Cropping (Top/Bottom text removal)
 * - BFS Flood-Fill Outer Background Removal (누끼 엔진)
 * - 4-State Sprite Extraction & Anti-aliasing
 */

// Helper: load image from URL / Blob / File
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (src instanceof HTMLImageElement && src.complete) {
      return resolve(src);
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${err?.message || src}`));
    img.src = src;
  });
}

// Euclidean color distance in RGB space
function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Detects whether the character sheet is:
 * - '1x4' (horizontal strip: 4 columns, 1 row)
 * - '2x2' (grid: 2 columns, 2 rows)
 * - '4x1' (vertical strip: 1 column, 4 rows)
 */
export function detectLayout(width, height) {
  const ratio = width / height;
  if (ratio >= 2.2) return '1x4';
  if (ratio <= 0.45) return '4x1';
  return '2x2';
}

/**
 * Removes background using BFS Flood-fill from outer edges inward.
 * Preserves character interior even if character wears white shirts or has white teeth.
 */
export function removeBackgroundBFS(imageData, tolerance = 38) {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);

  // Check 4 corners to determine background reference color
  const corners = [
    0, // top-left
    (width - 1), // top-right
    (height - 1) * width, // bottom-left
    totalPixels - 1 // bottom-right
  ];

  let bgR = 255;
  let bgG = 255;
  let bgB = 255;
  let validCornerCount = 0;
  let sumR = 0, sumG = 0, sumB = 0;

  for (const idx of corners) {
    const p = idx * 4;
    const a = data[p + 3];
    // If already transparent, the image was already cutout
    if (a < 20) {
      return imageData;
    }
    sumR += data[p];
    sumG += data[p + 1];
    sumB += data[p + 2];
    validCornerCount++;
  }

  if (validCornerCount > 0) {
    bgR = Math.round(sumR / validCornerCount);
    bgG = Math.round(sumG / validCornerCount);
    bgB = Math.round(sumB / validCornerCount);
  }

  // Double queue for BFS
  // Using an Int32Array queue for high performance
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;

  // Initialize perimeter (all outer border pixels)
  // Top & Bottom rows
  for (let x = 0; x < width; x++) {
    // Top pixel (x, 0)
    let p0 = x * 4;
    if (colorDistance(data[p0], data[p0 + 1], data[p0 + 2], bgR, bgG, bgB) <= tolerance) {
      visited[x] = 1;
      queue[tail++] = x;
    }
    // Bottom pixel (x, height - 1)
    let bIdx = (height - 1) * width + x;
    let pb = bIdx * 4;
    if (colorDistance(data[pb], data[pb + 1], data[pb + 2], bgR, bgG, bgB) <= tolerance) {
      visited[bIdx] = 1;
      queue[tail++] = bIdx;
    }
  }

  // Left & Right columns
  for (let y = 0; y < height; y++) {
    // Left pixel (0, y)
    let lIdx = y * width;
    if (!visited[lIdx]) {
      let pl = lIdx * 4;
      if (colorDistance(data[pl], data[pl + 1], data[pl + 2], bgR, bgG, bgB) <= tolerance) {
        visited[lIdx] = 1;
        queue[tail++] = lIdx;
      }
    }
    // Right pixel (width - 1, y)
    let rIdx = y * width + (width - 1);
    if (!visited[rIdx]) {
      let pr = rIdx * 4;
      if (colorDistance(data[pr], data[pr + 1], data[pr + 2], bgR, bgG, bgB) <= tolerance) {
        visited[rIdx] = 1;
        queue[tail++] = rIdx;
      }
    }
  }

  // BFS traversal
  while (head < tail) {
    const current = queue[head++];
    const cx = current % width;
    const cy = (current / width) | 0;

    // Set pixel to transparent
    const pIdx = current * 4;
    data[pIdx + 3] = 0; // Alpha = 0

    // Check 4-connected neighbors
    const neighbors = [
      cx > 0 ? current - 1 : -1,
      cx < width - 1 ? current + 1 : -1,
      cy > 0 ? current - width : -1,
      cy < height - 1 ? current + width : -1
    ];

    for (let i = 0; i < 4; i++) {
      const nIdx = neighbors[i];
      if (nIdx !== -1 && !visited[nIdx]) {
        const np = nIdx * 4;
        const dist = colorDistance(data[np], data[np + 1], data[np + 2], bgR, bgG, bgB);
        if (dist <= tolerance) {
          visited[nIdx] = 1;
          queue[tail++] = nIdx;
        } else if (dist <= tolerance + 18) {
          // Feather edge anti-aliasing
          visited[nIdx] = 1;
          const factor = (dist - tolerance) / 18;
          data[np + 3] = Math.round(data[np + 3] * factor);
        }
      }
    }
  }

  return imageData;
}

/**
 * Crops out top label header / bottom label banner from a single cell canvas.
 */
function cropCellLabel(cellCanvas, cropTopPercent = 0.10, cropBottomPercent = 0.02) {
  const w = cellCanvas.width;
  const h = cellCanvas.height;

  const topCropY = Math.round(h * cropTopPercent);
  const bottomCropH = Math.round(h * (1 - cropTopPercent - cropBottomPercent));

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = w;
  croppedCanvas.height = bottomCropH;

  const ctx = croppedCanvas.getContext('2d');
  ctx.drawImage(cellCanvas, 0, topCropY, w, bottomCropH, 0, 0, w, bottomCropH);

  return croppedCanvas;
}

/**
 * Main character sheet processor:
 * - Auto-detects layout (2x2 vs 1x4)
 * - Slices into 4 states
 * - Auto-crops labels
 * - Performs BFS background removal (누끼)
 * - Returns 4 state canvases and metadata
 */
export async function processCharacterSheet(imageSource, options = {}) {
  const {
    cropLabels = true,
    tolerance = 46,
    cropTopRatio = 0.12,
    cropBottomRatio = 0.01
  } = options;

  const img = await loadImage(imageSource);
  const totalW = img.naturalWidth || img.width;
  const totalH = img.naturalHeight || img.height;

  const layout = detectLayout(totalW, totalH);

  let cols = 2;
  let rows = 2;
  if (layout === '1x4') {
    cols = 4;
    rows = 1;
  } else if (layout === '4x1') {
    cols = 1;
    rows = 4;
  }

  const cellW = Math.floor(totalW / cols);
  const cellH = Math.floor(totalH / rows);

  // 4 Standard States:
  // State 0: Mouth Closed, Eyes Open (기본 / 경청)
  // State 1: Mouth Open, Eyes Open (말함)
  // State 2: Mouth Closed, Eyes Closed (눈 깜빡임)
  // State 3: Mouth Open, Eyes Closed (외침 / 웃음 / 감정 발화)
  const stateCanvases = [];

  for (let i = 0; i < 4; i++) {
    const colIndex = i % cols;
    const rowIndex = Math.floor(i / cols);

    const sx = colIndex * cellW;
    const sy = rowIndex * cellH;

    // Draw single cell
    let cellCanvas = document.createElement('canvas');
    cellCanvas.width = cellW;
    cellCanvas.height = cellH;
    let ctx = cellCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, sx, sy, cellW, cellH, 0, 0, cellW, cellH);

    // Auto-crop upper label banner if enabled
    if (cropLabels) {
      cellCanvas = cropCellLabel(cellCanvas, cropTopRatio, cropBottomRatio);
      ctx = cellCanvas.getContext('2d', { willReadFrequently: true });
    }

    // BFS Flood-Fill Background Removal
    const imgData = ctx.getImageData(0, 0, cellCanvas.width, cellCanvas.height);
    const cleanedImgData = removeBackgroundBFS(imgData, tolerance);
    ctx.putImageData(cleanedImgData, 0, 0);

    stateCanvases.push(cellCanvas);
  }

  // Create combined preview canvas for UI inspection
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = stateCanvases[0].width * 2;
  previewCanvas.height = stateCanvases[0].height * 2;
  const pCtx = previewCanvas.getContext('2d');
  pCtx.drawImage(stateCanvases[0], 0, 0);
  pCtx.drawImage(stateCanvases[1], stateCanvases[0].width, 0);
  pCtx.drawImage(stateCanvases[2], 0, stateCanvases[0].height);
  pCtx.drawImage(stateCanvases[3], stateCanvases[0].width, stateCanvases[0].height);

  return {
    layout,
    originalDimensions: { width: totalW, height: totalH },
    cellDimensions: { width: stateCanvases[0].width, height: stateCanvases[0].height },
    states: {
      mouthClosedEyesOpen: stateCanvases[0],
      mouthOpenEyesOpen: stateCanvases[1],
      mouthClosedEyesClosed: stateCanvases[2],
      mouthOpenEyesClosed: stateCanvases[3]
    },
    stateDataUrls: {
      mouthClosedEyesOpen: stateCanvases[0].toDataURL('image/png'),
      mouthOpenEyesOpen: stateCanvases[1].toDataURL('image/png'),
      mouthClosedEyesClosed: stateCanvases[2].toDataURL('image/png'),
      mouthOpenEyesClosed: stateCanvases[3].toDataURL('image/png')
    },
    previewUrl: previewCanvas.toDataURL('image/png')
  };
}
