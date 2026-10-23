// 자체 점검: 알려진 만큼 밀린 이미지를 alignTo 가 정확히 찾아내는지, 이음매 지표가 밀림을 잡아내는지
import fs from "node:fs";
import sharp from "sharp";
import { CANVAS } from "../src/config.js";
import { alignTo, seamDiff } from "../src/lib/image.js";

const base = fs.readFileSync("output/mock/hero/assets/neutral/base.png");
const box = JSON.parse(fs.readFileSync("characters/hero/character.json", "utf8")).eye_box;
const { width: W, height: H } = CANVAS;
let ok = true;
for (const [sx, sy] of [[3, -2], [-5, 4], [0, 6], [7, 7]]) {
  // 내용을 (sx, sy) 만큼 이동시킨 가짜 "편집본"
  const shifted = await sharp({ create: { width: W, height: H, channels: 3, background: "#00ff00" } })
    .composite([{ input: await sharp(base).extract({ left: Math.max(0, -sx), top: Math.max(0, -sy), width: W - Math.abs(sx), height: H - Math.abs(sy) }).toBuffer(), left: Math.max(0, sx), top: Math.max(0, sy) }])
    .png().toBuffer();
  const before = await seamDiff(base, shifted, box);
  const { img, dx, dy } = await alignTo(base, shifted, box);
  const after = await seamDiff(base, img, box);
  const pass = dx === sx && dy === sy;
  ok &&= pass;
  console.log(`밀림 (${sx},${sy}) → 찾은 값 (${dx},${dy}) ${pass ? "OK" : "FAIL"} | 이음매 ${before.toFixed(1)} → ${after.toFixed(1)}`);
}
process.exit(ok ? 0 : 1);
