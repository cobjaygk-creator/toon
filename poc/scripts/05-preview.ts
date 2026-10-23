// 미리보기 · 깜빡임 + 말하기 GIF
// npm run preview -- --provider gemini --character hero
// 표정별로 4초짜리 GIF와, 5종을 이어붙인 _all.gif 를 만듭니다.
// 눈: 3.2초마다 1프레임(0.1초) 감음 / 입: 0→1→2→1 을 0.1초 간격으로 반복 (말하는 흉내)
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import gifenc from "gifenc";
const { GIFEncoder, applyPalette, quantize } = gifenc;
import { EXPRESSIONS } from "../src/config.js";
import { log, readCharacter, save, setup } from "../src/lib/common.js";
import { chromaKey } from "../src/lib/image.js";

const { provider, character, charDir, outDir, get } = setup();
const { eye_box, mouth_box } = readCharacter(charDir);
const assets = path.join(outDir, "assets");
const FPS = 10;
const SECONDS = Number(get("seconds", "4"));
const SCALE = 0.5; // GIF 용량을 위해 절반 크기
const BG = "#f4efe6"; // 투명 배경 대신 깔 색 (크로마키가 잘 됐는지도 같이 확인됨)

const MOUTH_CYCLE = [0, 1, 2, 1];
const eyeClosedAt = (f: number) => {
  const t = f / FPS;
  const phase = t % 3.2; // 3.2초 주기
  return phase > 2.9 && phase < 3.05; // 10fps 기준 1프레임
};

async function frame(expr: string, eyeClosed: boolean, mouth: number): Promise<Buffer> {
  const dir = path.join(assets, expr);
  const base = fs.readFileSync(path.join(dir, "base.png"));
  const layers = [
    { input: fs.readFileSync(path.join(dir, eyeClosed ? "eye_closed.png" : "eye_open.png")), left: eye_box.x, top: eye_box.y },
    { input: fs.readFileSync(path.join(dir, `mouth_${mouth}.png`)), left: mouth_box.x, top: mouth_box.y },
  ];
  const char = await chromaKey(await sharp(base).composite(layers).png().toBuffer());
  const meta = await sharp(char).metadata();
  const flat = await sharp({ create: { width: meta.width!, height: meta.height!, channels: 3, background: BG } })
    .composite([{ input: char }])
    .png()
    .toBuffer();
  return sharp(flat).resize(Math.round(meta.width! * SCALE)).png().toBuffer();
}

async function encode(frames: Buffer[]): Promise<Buffer> {
  const gif = GIFEncoder();
  for (const f of frames) {
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const rgba = new Uint8Array(data);
    const palette = quantize(rgba, 256);
    gif.writeFrame(applyPalette(rgba, palette), info.width, info.height, { palette, delay: 1000 / FPS });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

const t0 = Date.now();
const all: Buffer[] = [];
for (const expr of EXPRESSIONS) {
  const frames: Buffer[] = [];
  for (let f = 0; f < FPS * SECONDS; f++) {
    // 앞 절반은 말하기, 뒤 절반은 듣기(입 닫음) → 깜빡임만 보이는 구간도 확인
    const talking = f < (FPS * SECONDS) / 2;
    frames.push(await frame(expr, eyeClosedAt(f), talking ? MOUTH_CYCLE[f % 4] : 0));
  }
  save(path.join(outDir, "05-preview", `${expr}.gif`), await encode(frames));
  all.push(...frames.slice(0, FPS * 2));
}
save(path.join(outDir, "05-preview", "_all.gif"), await encode(all));
log("05-preview", provider, character, Date.now() - t0, 0);
