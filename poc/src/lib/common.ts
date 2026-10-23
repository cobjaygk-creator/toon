import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { getProvider } from "../providers/index.js";
import type { Box } from "./image.js";

export const ROOT = path.resolve(import.meta.dirname, "../..");

/** --provider gemini --character hero 같은 인자 읽기 */
export function args() {
  const a = process.argv.slice(2);
  const get = (k: string, d?: string) => {
    const i = a.indexOf(`--${k}`);
    return i >= 0 && a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : d;
  };
  return {
    provider: get("provider", "mock")!,
    character: get("character", "hero")!,
    pick: get("pick"),
    get,
  };
}

export function setup() {
  const { provider, character, pick, get } = args();
  const p = getProvider(provider);
  const charDir = path.join(ROOT, "characters", character);
  const outDir = path.join(ROOT, "output", provider, character);
  fs.mkdirSync(outDir, { recursive: true });
  return { p, provider, character, pick, get, charDir, outDir };
}

export interface CharacterFile {
  description: string;
  eye_box: Box;
  mouth_box: Box;
}

export function readCharacter(charDir: string): CharacterFile {
  const f = path.join(charDir, "character.json");
  if (!fs.existsSync(f)) throw new Error(`${f} 가 없습니다. characters/hero/character.json 을 참고해 만들어 주세요.`);
  return JSON.parse(fs.readFileSync(f, "utf8"));
}

export function save(file: string, buf: Buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log("  저장:", path.relative(ROOT, file));
}

/** output/log.csv 에 단계·제공자·소요시간·API 호출 수 기록 */
export function log(step: string, provider: string, character: string, ms: number, calls: number, note = "") {
  const f = path.join(ROOT, "output", "log.csv");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  if (!fs.existsSync(f)) fs.writeFileSync(f, "﻿time,step,provider,character,seconds,api_calls,note\n");
  const row = [new Date().toISOString(), step, provider, character, (ms / 1000).toFixed(1), calls, `"${note.replace(/"/g, "'")}"`];
  fs.appendFileSync(f, row.join(",") + "\n");
}

/** API 호출을 실패 시 2번까지 재시도 */
export async function withRetry<T>(label: string, fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i >= tries) throw e;
      console.warn(`  ${label} 실패(${i}/${tries}): ${e?.message ?? e} → 재시도`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

export function sheetPath(outDir: string) {
  return path.join(outDir, "sheet.png");
}
