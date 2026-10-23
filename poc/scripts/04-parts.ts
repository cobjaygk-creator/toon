// 테스트 4 · 눈·입 파츠
// npm run parts -- --provider gemini --character hero
//
// 표정마다 "눈 감음 / 입 반 / 입 크게" 3장을 편집으로 만들고, 결과에서 박스 영역만 잘라
// 가장자리를 부드럽게(feather) 처리한 투명 PNG로 저장합니다.
// 열린 눈 / 닫힌 입 파츠는 베이스에서 그대로 잘라 씁니다(추가 호출 없음).
// → 캐릭터 1명 = 표정 5 × 편집 3 = API 15회
import fs from "node:fs";
import path from "node:path";
import { EXPRESSIONS } from "../src/config.js";
import { log, readCharacter, save, setup, withRetry } from "../src/lib/common.js";
import { type Box, alignTo, boxMask, crop, featherEdges, matchColors, meanDiff, normalize, seamDiff } from "../src/lib/image.js";

const { p, provider, character, charDir, outDir, get } = setup();
const { eye_box, mouth_box } = readCharacter(charDir);
const assets = path.join(outDir, "assets");
const FEATHER = Number(get("feather", "8"));
const only = get("expr"); // --expr happy 로 하나만 다시 만들 수 있음

const EDITS: { file: string; box: Box; prompt: string }[] = [
  { file: "eye_closed.png", box: eye_box, prompt: "Close the eyes gently (eyes closed, as in a natural blink)." },
  { file: "mouth_1.png", box: mouth_box, prompt: "Make the mouth slightly open, as if mid-word." },
  { file: "mouth_2.png", box: mouth_box, prompt: "Make the mouth wide open, as if speaking loudly." },
];

const report: string[] = ["expression,part,shift_dx,shift_dy,outside_change,seam_before_align,seam"];
const t0 = Date.now();
let calls = 0;
console.log(`[${provider} / ${p.model}] 눈·입 파츠 생성 (feather ${FEATHER}px)`);

for (const expr of EXPRESSIONS) {
  if (only && only !== expr) continue;
  const dir = path.join(assets, expr);
  const baseFile = path.join(dir, "base.png");
  if (!fs.existsSync(baseFile)) throw new Error(`${baseFile} 가 없습니다. 03-expressions 를 먼저 실행하세요.`);
  const base = fs.readFileSync(baseFile);

  // 베이스에서 그대로 잘라내는 기본 파츠
  save(path.join(dir, "eye_open.png"), await crop(base, eye_box));
  save(path.join(dir, "mouth_0.png"), await crop(base, mouth_box));

  for (const e of EDITS) {
    // 마스크는 항상 함께 보냄: OpenAI는 사용하고, Gemini는 무시하고 프롬프트로만 수정
    const mask = await boxMask(e.box);
    const raw = await normalize(
      await withRetry(`${expr}/${e.file}`, () =>
        p.edit({ image: base, mask, prompt: `Keep the ${expr} expression. ${e.prompt}` }),
      ),
    );
    calls++;
    const seamBefore = await seamDiff(base, raw, e.box);
    // 1) AI가 그림 전체를 밀었으면 되돌림  2) 밝기·색감이 달라졌으면 테두리 기준으로 맞춤
    const aligned = await alignTo(base, raw, e.box);
    const { dx, dy } = aligned;
    const { img: edited, gain } = await matchColors(base, aligned.img, e.box);
    const part = await featherEdges(await crop(edited, e.box), FEATHER);
    save(path.join(dir, e.file), part);
    save(path.join(dir, "_raw", e.file), raw);

    // 품질 지표
    const outside = await meanDiff(base, edited, { exclude: [e.box] }); // 박스 밖을 얼마나 건드렸나(참고용)
    const seam = await seamDiff(base, edited, e.box); // 붙일 자리 테두리가 얼마나 다른가(핵심 지표)
    report.push(`${expr},${e.file},${dx},${dy},${outside.toFixed(1)},${seamBefore.toFixed(1)},${seam.toFixed(1)}`);
    const fixes = [
      dx || dy ? `위치 ${dx},${dy}px 보정` : "",
      gain.some((g) => g !== 1) ? `색 ${gain.map((g) => g.toFixed(3)).join("/")} 보정` : "",
    ].filter(Boolean).join(", ");
    console.log(`  ${expr}/${e.file}: 이음매 ${seamBefore.toFixed(1)} → ${seam.toFixed(1)}${fixes ? ` (${fixes})` : ""}`);
  }
}

save(path.join(outDir, "04-parts-report.csv"), Buffer.from("﻿" + report.join("\n")));
log("04-parts", provider, character, Date.now() - t0, calls, `feather=${FEATHER}`);
console.log("\n이음매 2 이하: 양호 / 2~5: 확대하면 사각형이 보임 / 5 초과: 실패(박스 위치·프롬프트 조정 또는 --feather 값 키우기)");
