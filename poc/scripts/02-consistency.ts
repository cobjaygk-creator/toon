// 테스트 2 · 일관성 20컷
// npm run consistency -- --provider gemini --character hero
// 결과 _grid.png 를 보고 "같은 사람"으로 보이는 컷 수를 세어 기록표에 적습니다(합격선 16/20).
import fs from "node:fs";
import path from "node:path";
import { CONSISTENCY_SCENES, STYLE_SUFFIX } from "../src/config.js";
import { log, readCharacter, save, setup, sheetPath, withRetry } from "../src/lib/common.js";
import { contactSheet, normalize } from "../src/lib/image.js";

const { p, provider, character, charDir, outDir, get } = setup();
const sheet = fs.readFileSync(sheetPath(outDir));
const { description } = readCharacter(charDir);
const count = Number(get("count", String(CONSISTENCY_SCENES.length)));
const dir = path.join(outDir, "02-consistency");

console.log(`[${provider} / ${p.model}] 일관성 테스트 ${count}컷`);
const t0 = Date.now();
const imgs: Buffer[] = [];
for (const [i, scene] of CONSISTENCY_SCENES.slice(0, count).entries()) {
  const prompt = `${description}. Scene: ${scene}. ${STYLE_SUFFIX.replace(/plain solid pure green \(#00FF00\) background, /, "")}`;
  const img = await normalize(await withRetry(`컷 ${i + 1}`, () => p.generate({ prompt, refs: [sheet] })));
  save(path.join(dir, `${String(i + 1).padStart(2, "0")}.png`), img);
  imgs.push(img);
}
save(path.join(dir, "_grid.png"), await contactSheet([sheet, ...imgs], 7));
log("02-consistency", provider, character, Date.now() - t0, count);
console.log("\n_grid.png 의 첫 칸이 기준 시트입니다. 나머지와 비교해 보세요.");
