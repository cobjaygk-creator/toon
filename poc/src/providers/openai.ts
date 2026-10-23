import OpenAI, { toFile } from "openai";
import { MODELS } from "../config.js";
import type { EditOptions, GenerateOptions, ImageProvider } from "./types.js";

// OpenAI GPT Image (기본 gpt-image-2.5-sunburst: 편집 정밀도 우선 모델).
// 문서: https://developers.openai.com/api/docs/guides/image-generation
// 마스크 편집 지원. 단, 문서상 마스크는 "가이드"라 경계를 완벽히 지키진 않으므로
// 결과에서 박스 영역만 잘라 붙이는 방식은 그대로 유지합니다.

export function createOpenAI(): ImageProvider {
  if (!process.env.OPENAI_API_KEY) throw new Error(".env에 OPENAI_API_KEY가 없습니다.");
  const client = new OpenAI();
  const model = MODELS.openai;
  const png = (buf: Buffer, name: string) => toFile(buf, name, { type: "image/png" });

  const first = (res: any): Buffer => {
    const b64 = res?.data?.[0]?.b64_json;
    if (!b64) throw new Error("이미지가 반환되지 않았습니다.");
    return Buffer.from(b64, "base64");
  };

  return {
    name: "openai",
    model,
    async generate({ prompt, refs = [] }: GenerateOptions) {
      if (!refs.length) {
        return first(await client.images.generate({ model, prompt, size: "1024x1536" }));
      }
      const images = await Promise.all(refs.slice(0, 5).map((r, i) => png(r, `ref${i}.png`)));
      return first(
        await client.images.edit({
          model,
          image: images,
          size: "1024x1536",
          prompt:
            "Draw the SAME character shown in the reference image(s). Keep face, hair, outfit, colors and art style identical. " +
            prompt,
        }),
      );
    },
    async edit({ image, prompt, mask }: EditOptions) {
      return first(
        await client.images.edit({
          model,
          image: await png(image, "base.png"),
          ...(mask ? { mask: await png(mask, "mask.png") } : {}),
          size: "1024x1536",
          prompt: `${prompt} Change only the masked area. Keep everything else identical.`,
        }),
      );
    },
  };
}
