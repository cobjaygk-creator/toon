// 테스트 3 · 표정 5종 베이스
// npm run expressions -- --provider gemini --character hero
// 시트를 원본으로 "표정만 바꾸기" 편집을 해서 구도가 그대로 유지되게 합니다.
import fs from "node:fs";
import path from "node:path";
import { EXPRESSIONS, EXPRESSION_PROMPTS } from "../src/config.js";
import { log, readCharacter, save, setup, sheetPath, withRetry } from "../src/lib/common.js";
import { contactSheet, meanDiff, normalize } from "../src/lib/image.js";

const { p, provider, character, charDir, outDir } = setup();
const sheet = fs.readFileSync(sheetPath(outDir));
const { eye_box, mouth_box } = readCharacter(charDir);
const assets = path.join(outDir, "assets");

console.log(`[${provider} / ${p.model}] 표정 5종 생성`);
const t0 = Date.now();
let calls = 0;
const imgs: Buffer[] = [];
for (const expr of EXPRESSIONS) {
  let img: Buffer;
  if (expr === "neutral") img = sheet; // 기본 표정 = 기준 시트 그대로
  else {
    img = await normalize(
      await withRetry(expr, () =>
        p.edit({ image: sheet, prompt: `Change the facial expression to: ${expr}, ${EXPRESSION_PROMPTS[expr]}.` }),
      ),
    );
    calls++;
  }
  save(path.join(assets, expr, "base.png"), img);
  // 얼굴 밖(머리·옷·배경)이 얼마나 바뀌었나 = 낮을수록 좋음. 10 이하면 양호, 25 이상이면 구도가 틀어진 것
  const drift = await meanDiff(sheet, img, { exclude: [eye_box, mouth_box] });
  console.log(`  ${expr}: 얼굴 밖 변화량 ${drift.toFixed(1)}`);
  imgs.push(img);
}
save(path.join(outDir, "03-expressions.png"), await contactSheet(imgs, 5));
log("03-expressions", provider, character, Date.now() - t0, calls);
