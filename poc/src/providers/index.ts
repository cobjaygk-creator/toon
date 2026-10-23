import { PROVIDERS, type ProviderName } from "../config.js";
import { createGemini } from "./gemini.js";
import { createMock } from "./mock.js";
import { createOpenAI } from "./openai.js";
import type { ImageProvider } from "./types.js";

export function getProvider(name: string): ImageProvider {
  if (!PROVIDERS.includes(name as ProviderName)) {
    throw new Error(`--provider 는 ${PROVIDERS.join(" / ")} 중 하나여야 합니다. (입력: ${name})`);
  }
  if (name === "gemini") return createGemini();
  if (name === "openai") return createOpenAI();
  return createMock();
}
