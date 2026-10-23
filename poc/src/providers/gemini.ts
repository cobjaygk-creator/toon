import { GoogleGenAI } from "@google/genai";
import { MODELS } from "../config.js";
import type { EditOptions, GenerateOptions, ImageProvider } from "./types.js";

// Google Gemini 이미지 모델 (Nano Banana 계열). Interactions API 사용.
// 문서: https://ai.google.dev/gemini-api/docs/image-generation
// 캐릭터 레퍼런스는 최대 4장(Nano Banana 2.1 기준)까지 일관성 유지에 쓰입니다.
// 마스크 인페인팅은 없어서, 원본 + "이 부분만 바꿔라" 프롬프트로 수정합니다.

export function createGemini(): ImageProvider {
  if (!process.env.GEMINI_API_KEY) throw new Error(".env에 GEMINI_API_KEY가 없습니다.");
  const ai = new GoogleGenAI({});
  const model = MODELS.gemini;

  async function run(input: unknown[]): Promise<Buffer> {
    const interaction: any = await (ai as any).interactions.create({
      model,
      input,
      response_format: { type: "image", mime_type: "image/png", aspect_ratio: "2:3", image_size: "1K" },
    });
    const img = interaction.output_image;
    if (!img?.data) {
      throw new Error(`이미지가 반환되지 않았습니다: ${interaction.output_text ?? "(응답 텍스트 없음)"}`);
    }
    return Buffer.from(img.data, "base64");
  }

  const image = (buf: Buffer) => ({ type: "image", mime_type: "image/png", data: buf.toString("base64") });

  return {
    name: "gemini",
    model,
    async generate({ prompt, refs = [] }: GenerateOptions) {
      const text = refs.length
        ? `Draw the SAME character shown in the reference image(s). Keep face, hair, outfit, colors and art style identical. ${prompt}`
        : prompt;
      return run([{ type: "text", text }, ...refs.slice(0, 4).map(image)]);
    },
    async edit({ image: src, prompt }: EditOptions) {
      const text =
        `Edit this image. ${prompt} ` +
        "Change ONLY that part. Keep everything else pixel-identical: same framing, size, position, " +
        "line art, colors and background. Do not move, crop or zoom.";
      return run([{ type: "text", text }, image(src)]);
    },
  };
}
