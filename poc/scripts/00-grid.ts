// 좌표 찾기 도우미: 기준 시트 위에 격자와 현재 eye_box / mouth_box 를 그려서 보여줍니다.
// npm run grid -- --provider gemini --character hero
// 파란 박스가 눈·입을 넉넉히 감싸도록 characters/<이름>/character.json 의 숫자를 고친 뒤 다시 실행하세요.
import fs from "node:fs";
import path from "node:path";
import { readCharacter, save, setup, sheetPath } from "../src/lib/common.js";
import { gridOverlay } from "../src/lib/image.js";

const { charDir, outDir } = setup();
const sheet = sheetPath(outDir);
if (!fs.existsSync(sheet)) throw new Error("기준 시트가 없습니다. 01-sheet 를 --pick 까지 실행하세요.");
const { eye_box, mouth_box } = readCharacter(charDir);
save(path.join(outDir, "00-grid.png"), await gridOverlay(fs.readFileSync(sheet), { eye_box, mouth_box }));
console.log("박스 팁: 눈썹은 빼고 눈만, 입은 턱선에 닿지 않게. 상하좌우 10~20px 여유를 두세요.");
