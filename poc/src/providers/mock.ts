import sharp from "sharp";
import { CANVAS, CHROMA } from "../config.js";
import type { EditOptions, GenerateOptions, ImageProvider } from "./types.js";

// API 키 없이 파이프라인 전체를 시험해보는 가짜 제공자.
// 단순한 캐릭터를 직접 그리고, 편집 시에는 실제 AI처럼 화면 전체가 살짝 틀어지게(2px 이동, 미세 색 변화) 만듭니다.
// → 04단계의 "박스만 잘라 붙이기"가 이런 틀어짐을 흡수하는지 확인할 수 있습니다.

type Eye = "open" | "closed";
type Mouth = 0 | 1 | 2;

function pick<T extends string>(prompt: string, options: T[], fallback: T): T {
  const p = prompt.toLowerCase();
  return options.find((o) => p.includes(o)) ?? fallback;
}

function drawCharacter(expr: string, eye: Eye, mouth: Mouth, dx = 0, dy = 0): string {
  const { width: W, height: H } = CANVAS;
  const cx = W / 2 + dx;
  const brow: Record<string, string> = {
    neutral: "M-70 0 h50 M20 0 h50",
    happy: "M-70 4 q25 -12 50 0 M20 4 q25 -12 50 0",
    angry: "M-70 -8 l50 14 M20 6 l50 -14",
    sad: "M-70 6 l50 -12 M20 -6 l50 12",
    surprised: "M-70 -10 q25 -14 50 0 M20 -10 q25 -14 50 0",
  };
  const eyeShape =
    eye === "open"
      ? `<ellipse cx="-45" cy="0" rx="16" ry="${expr === "surprised" ? 22 : 18}" fill="#2b2b2b"/><ellipse cx="45" cy="0" rx="16" ry="${expr === "surprised" ? 22 : 18}" fill="#2b2b2b"/><circle cx="-40" cy="-6" r="5" fill="#fff"/><circle cx="50" cy="-6" r="5" fill="#fff"/>`
      : `<path d="M-62 2 q17 10 34 0 M28 2 q17 10 34 0" stroke="#2b2b2b" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  const smile = expr === "happy" ? 10 : expr === "sad" ? -8 : 0;
  const mouthShape =
    mouth === 0
      ? `<path d="M-28 0 q28 ${smile} 56 0" stroke="#7a3b3b" stroke-width="5" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="0" cy="${mouth === 1 ? 2 : 6}" rx="${mouth === 1 ? 20 : 26}" ry="${mouth === 1 ? 9 : 20}" fill="#7a3b3b"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="${CHROMA.hex}"/><g transform="translate(0 ${dy})">
  <path d="M${cx - 320} ${H} q0 -600 320 -600 q320 0 320 600 z" fill="#8a8f9c" stroke="#333" stroke-width="5"/>
  <rect x="${cx - 55}" y="790" width="110" height="${H - 600 - 790 + 30}" fill="#f6d7c3" stroke="#333" stroke-width="5"/>
  <ellipse cx="${cx}" cy="560" rx="230" ry="270" fill="#f6d7c3" stroke="#333" stroke-width="5"/>
  <path d="M${cx - 240} 560 q-10 -330 240 -330 q250 0 240 330 q-40 -170 -240 -200 q-200 30 -240 200 z" fill="#3a2a22" stroke="#333" stroke-width="5"/>
  <g transform="translate(${cx} 460)"><path d="${brow[expr] ?? brow.neutral}" stroke="#3a2a22" stroke-width="8" fill="none" stroke-linecap="round"/></g>
  <g transform="translate(${cx} 520)">${eyeShape}</g>
  <path d="M${cx} 560 l-8 50 h16" stroke="#c99" stroke-width="4" fill="none"/>
  <g transform="translate(${cx} 680)">${mouthShape}</g>
</g></svg>`;
}

async function render(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function createMock(): ImageProvider {
  const exprs = ["neutral", "happy", "angry", "sad", "surprised"];
  let n = 0;
  return {
    name: "mock",
    model: "mock-drawing",
    async generate({ prompt }: GenerateOptions) {
      return render(drawCharacter(pick(prompt, exprs, "neutral"), "open", 0));
    },
    async edit({ prompt }: EditOptions) {
      const p = prompt.toLowerCase();
      const expr = pick(p, exprs, "neutral");
      const eye: Eye = p.includes("eyes closed") || p.includes("close the eyes") ? "closed" : "open";
      const mouth: Mouth = p.includes("wide open") ? 2 : p.includes("slightly open") ? 1 : 0;
      // 실제 AI 편집처럼 전체가 몇 px 밀리는 상황 재현 (호출마다 다르게)
      n++;
      const dx = (n % 5) - 2, dy = ((n * 3) % 7) - 3;
      const drifted = await render(drawCharacter(expr, eye, mouth, dx, dy));
      return sharp(drifted).modulate({ brightness: 1.02 }).png().toBuffer();
    },
  };
}
