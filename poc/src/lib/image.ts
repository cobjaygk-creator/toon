import sharp from "sharp";
import { CANVAS, CHROMA } from "../config.js";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** API마다 다른 출력 크기를 1024x1536 캔버스로 통일 (비율 유지, 크로마 색으로 여백 채움) */
export async function normalize(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .resize(CANVAS.width, CANVAS.height, { fit: "contain", background: { r: CHROMA.r, g: CHROMA.g, b: CHROMA.b, alpha: 1 } })
    .removeAlpha()
    .png()
    .toBuffer();
}

/** 크로마(초록) 배경을 투명으로. 경계는 부드럽게, 초록 번짐(spill)도 줄입니다. */
export async function chromaKey(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const greenness = g - Math.max(r, b); // 초록이 다른 채널보다 얼마나 강한가
    if (greenness > 90) data[i + 3] = 0;
    else if (greenness > 40) {
      data[i + 3] = Math.round(255 * (1 - (greenness - 40) / 50));
      data[i + 1] = Math.max(r, b); // spill 제거
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

export async function crop(buf: Buffer, box: Box): Promise<Buffer> {
  return sharp(buf).extract({ left: box.x, top: box.y, width: box.w, height: box.h }).png().toBuffer();
}

/** 가장자리를 feather(px)만큼 서서히 투명하게 만든 알파 마스크를 파츠에 적용 → 경계선이 안 보이게 */
export async function featherEdges(part: Buffer, feather: number): Promise<Buffer> {
  const { data, info } = await sharp(part).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      const k = d >= feather ? 1 : d / feather;
      const i = (y * w + x) * 4 + 3;
      data[i] = Math.round(data[i] * k);
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

export async function paste(base: Buffer, part: Buffer, box: Box): Promise<Buffer> {
  return sharp(base).composite([{ input: part, left: box.x, top: box.y }]).png().toBuffer();
}

/** 박스용 마스크: 박스 영역만 투명(=다시 그릴 곳), 나머지 불투명. OpenAI 마스크 규격. */
export async function boxMask(box: Box): Promise<Buffer> {
  const { width, height } = CANVAS;
  const hole = await sharp({ create: { width: box.w, height: box.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .png()
    .toBuffer();
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
    .composite([{ input: hole, left: box.x, top: box.y, blend: "dest-out" }])
    .png()
    .toBuffer();
}

/** 두 이미지의 평균 색 차이(0~255). region을 주면 그 영역만, exclude를 주면 그 영역은 빼고 계산 */
export async function meanDiff(a: Buffer, b: Buffer, opts: { region?: Box; exclude?: Box[] } = {}): Promise<number> {
  const ra = await sharp(a).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rb = await sharp(b).removeAlpha().resize(ra.info.width, ra.info.height).raw().toBuffer();
  const { width: w, height: h } = ra.info;
  const reg = opts.region ?? { x: 0, y: 0, w, h };
  const inBox = (x: number, y: number, bx: Box) => x >= bx.x && x < bx.x + bx.w && y >= bx.y && y < bx.y + bx.h;
  let sum = 0, n = 0;
  for (let y = reg.y; y < reg.y + reg.h; y++) {
    for (let x = reg.x; x < reg.x + reg.w; x++) {
      if (opts.exclude?.some((bx) => inBox(x, y, bx))) continue;
      const i = (y * w + x) * 3;
      sum += Math.abs(ra.data[i] - rb[i]) + Math.abs(ra.data[i + 1] - rb[i + 1]) + Math.abs(ra.data[i + 2] - rb[i + 2]);
      n += 3;
    }
  }
  return n ? sum / n : 0;
}

function ringStrips(box: Box, ring: number): Box[] {
  return [
    { x: box.x, y: box.y, w: box.w, h: ring },
    { x: box.x, y: box.y + box.h - ring, w: box.w, h: ring },
    { x: box.x, y: box.y, w: ring, h: box.h },
    { x: box.x + box.w - ring, y: box.y, w: ring, h: box.h },
  ];
}

/**
 * 이음매 지표: 박스 테두리 안쪽 띠(ring px)에서 "베이스"와 "편집본"이 얼마나 다른가.
 * 이 띠는 feather로 두 이미지가 섞이는 곳이라, 여기가 다르면 붙인 자리가 사각형으로 티 나거나 겹쳐 보입니다.
 * 박스 한가운데(눈·입 자체)는 원래 달라야 하므로 제외합니다.
 */
export async function seamDiff(base: Buffer, edited: Buffer, box: Box, ring = 8): Promise<number> {
  const vals = await Promise.all(ringStrips(box, ring).map((s) => meanDiff(base, edited, { region: s })));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

async function ringMean(img: Buffer, box: Box, ring: number): Promise<[number, number, number]> {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0];
  let n = 0;
  for (const s of ringStrips(box, ring)) {
    for (let y = s.y; y < s.y + s.h; y++)
      for (let x = s.x; x < s.x + s.w; x++) {
        const i = (y * info.width + x) * 3;
        sum[0] += data[i]; sum[1] += data[i + 1]; sum[2] += data[i + 2]; n++;
      }
  }
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}

/**
 * AI 편집본은 전체 밝기·색감이 미세하게 바뀌어 오는 경우가 많습니다.
 * 박스 테두리 띠의 평균 색이 베이스와 같아지도록 편집본 전체 색을 보정합니다(채널별 배율).
 */
export async function matchColors(base: Buffer, edited: Buffer, box: Box, ring = 8): Promise<{ img: Buffer; gain: number[] }> {
  const [mb, me] = await Promise.all([ringMean(base, box, ring), ringMean(edited, box, ring)]);
  const gain = mb.map((v, i) => (me[i] > 1 ? v / me[i] : 1));
  if (gain.every((g) => Math.abs(g - 1) < 0.003)) return { img: edited, gain: [1, 1, 1] };
  const img = await sharp(edited).removeAlpha().linear(gain, [0, 0, 0]).png().toBuffer();
  return { img, gain };
}

/**
 * AI 편집은 그림 전체를 몇 px 밀어버리는 경우가 많습니다.
 * 박스 주변(margin px) 영역에서 편집본을 ±range px 옮겨보며 베이스와 가장 잘 맞는 위치를 찾아 되돌립니다.
 */
export async function alignTo(base: Buffer, edited: Buffer, box: Box, range = 8, margin = 60): Promise<{ img: Buffer; dx: number; dy: number }> {
  const { width: W, height: H } = CANVAS;
  const area = {
    x: Math.max(0, box.x - margin),
    y: Math.max(0, box.y - margin),
    w: Math.min(W, box.x + box.w + margin) - Math.max(0, box.x - margin),
    h: Math.min(H, box.y + box.h + margin) - Math.max(0, box.y - margin),
  };
  const gray = async (b: Buffer) => (await sharp(b).greyscale().raw().toBuffer());
  const g0 = await gray(base), g1 = await gray(edited);
  let best = { dx: 0, dy: 0, err: Infinity };
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      let err = 0;
      for (let y = area.y; y < area.y + area.h; y += 2) {
        for (let x = area.x; x < area.x + area.w; x += 2) {
          if (x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h) continue; // 바뀌어야 하는 곳은 제외
          const sx = x + dx, sy = y + dy;
          if (sx < 0 || sy < 0 || sx >= W || sy >= H) { err += 255; continue; }
          err += Math.abs(g0[y * W + x] - g1[sy * W + sx]);
        }
      }
      if (err < best.err) best = { dx, dy, err };
    }
  }
  if (best.dx === 0 && best.dy === 0) return { img: edited, dx: 0, dy: 0 };
  // 편집본을 (-dx, -dy) 만큼 옮겨 베이스에 맞춤
  const img = await sharp({ create: { width: W, height: H, channels: 3, background: { r: CHROMA.r, g: CHROMA.g, b: CHROMA.b } } })
    .composite([{ input: await sharp(edited).extract({ left: Math.max(0, best.dx), top: Math.max(0, best.dy), width: W - Math.abs(best.dx), height: H - Math.abs(best.dy) }).toBuffer(), left: Math.max(0, -best.dx), top: Math.max(0, -best.dy) }])
    .png()
    .toBuffer();
  return { img, dx: best.dx, dy: best.dy };
}

/** 이미지 여러 장을 cols열 그리드 한 장으로 */
export async function contactSheet(images: Buffer[], cols: number, cellW = 256): Promise<Buffer> {
  const cellH = Math.round((cellW * CANVAS.height) / CANVAS.width);
  const rows = Math.ceil(images.length / cols);
  const cells = await Promise.all(
    images.map((img) => sharp(img).resize(cellW, cellH, { fit: "contain", background: "#ffffff" }).png().toBuffer()),
  );
  return sharp({ create: { width: cols * cellW, height: rows * cellH, channels: 3, background: "#ffffff" } })
    .composite(cells.map((input, i) => ({ input, left: (i % cols) * cellW, top: Math.floor(i / cols) * cellH })))
    .png()
    .toBuffer();
}

/** 좌표 찾기용: 이미지 위에 50px 격자 + 100px마다 숫자 */
export async function gridOverlay(buf: Buffer, boxes: Record<string, Box> = {}): Promise<Buffer> {
  const { width: W, height: H } = CANVAS;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  for (let x = 0; x <= W; x += 50)
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${x % 100 ? "#ff000055" : "#ff0000aa"}" stroke-width="1"/>`;
  for (let y = 0; y <= H; y += 50)
    svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${y % 100 ? "#ff000055" : "#ff0000aa"}" stroke-width="1"/>`;
  for (let x = 0; x < W; x += 100) svg += `<text x="${x + 2}" y="14" font-size="13" fill="#c00" font-family="sans-serif">${x}</text>`;
  for (let y = 100; y < H; y += 100) svg += `<text x="2" y="${y - 2}" font-size="13" fill="#c00" font-family="sans-serif">${y}</text>`;
  for (const [name, b] of Object.entries(boxes)) {
    svg += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="none" stroke="#0050ff" stroke-width="3"/>`;
    svg += `<text x="${b.x}" y="${b.y - 6}" font-size="16" fill="#0050ff" font-family="sans-serif">${name}</text>`;
  }
  svg += "</svg>";
  return sharp(buf).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
}
