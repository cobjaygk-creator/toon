// 테스트 1 · 캐릭터 시트
// 1) 후보 생성:  npm run sheet -- --provider gemini --character hero
// 2) 하나 고르기: npm run sheet -- --provider gemini --character hero --pick 2
import fs from "node:fs";
import path from "node:path";
import { EXPRESSION_PROMPTS, SHEET_CANDIDATES, STYLE_SUFFIX } from "../src/config.js";
import { log, readCharacter, save, setup, sheetPath, withRetry } from "../src/lib/common.js";
import { contactSheet, normalize } from "../src/lib/image.js";

const { p, provider, character, pick, charDir, outDir } = setup();
const candDir = path.join(outDir, "01-sheet-candidates");

if (pick) {
  const src = path.join(candDir, `sheet_${pick}.png`);
  if (!fs.existsSync(src)) throw new Error(`${src} 가 없습니다. 먼저 --pick 없이 실행하세요.`);
  fs.copyFileSync(src, sheetPath(outDir));
  console.log(`시트 ${pick}번을 기준 시트로 고정했습니다 → ${path.relative(process.cwd(), sheetPath(outDir))}`);
  console.log("다음: npm run grid 로 눈·입 좌표를 확인하세요.");
  process.exit(0);
}

const { description } = readCharacter(charDir);
const prompt = `Character sheet of one character: ${description}. ${EXPRESSION_PROMPTS.neutral}. ${STYLE_SUFFIX}`;
console.log(`[${provider} / ${p.model}] 시트 후보 ${SHEET_CANDIDATES}장 생성`);

const t0 = Date.now();
const imgs: Buffer[] = [];
for (let i = 1; i <= SHEET_CANDIDATES; i++) {
  const raw = await withRetry(`시트 ${i}`, () => p.generate({ prompt }));
  const img = await normalize(raw);
  save(path.join(candDir, `sheet_${i}.png`), img);
  imgs.push(img);
}
save(path.join(candDir, "_overview.png"), await contactSheet(imgs, SHEET_CANDIDATES));
log("01-sheet", provider, character, Date.now() - t0, SHEET_CANDIDATES);
console.log("\n_overview.png 를 보고 마음에 드는 번호를 --pick N 으로 고정하세요.");
