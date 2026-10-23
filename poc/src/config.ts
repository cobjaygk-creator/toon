// 공통 설정. 숫자나 문구를 바꿀 때는 이 파일만 고치면 됩니다.

export const CANVAS = { width: 1024, height: 1536 }; // 세로 2:3, 상반신 정면

// 크로마키 배경색. 프롬프트에서 이 색 배경을 요청하고, 나중에 투명 처리합니다.
export const CHROMA = { r: 0, g: 255, b: 0, hex: "#00FF00" };

// 모든 프롬프트 뒤에 붙는 그림체 고정 문구
export const STYLE_SUFFIX =
  "Korean webtoon style, clean line art, flat cel shading, front-facing upper body, " +
  "centered, head and shoulders fill the upper half, plain solid pure green (#00FF00) background, " +
  "no text, no watermark, consistent character design";

export const EXPRESSIONS = ["neutral", "happy", "angry", "sad", "surprised"] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export const EXPRESSION_PROMPTS: Record<Expression, string> = {
  neutral: "calm neutral expression, eyes open, mouth closed",
  happy: "happy smiling expression, eyes open, mouth closed in a smile",
  angry: "angry expression, furrowed brows, eyes open, mouth closed",
  sad: "sad expression, drooping brows, eyes open, mouth closed",
  surprised: "surprised expression, raised brows, wide open eyes, mouth closed",
};

// 테스트 2(일관성 20컷)에 쓸 장면 변형
export const CONSISTENCY_SCENES = [
  "standing in a living room at night",
  "sitting at a kitchen table",
  "walking on a city street",
  "talking on a phone",
  "arms crossed, looking annoyed",
  "looking over the shoulder",
  "three-quarter view, slight smile",
  "side profile view",
  "holding a coffee cup in a cafe",
  "in an office in front of a laptop",
  "pointing at someone off-screen",
  "crying with hands on face",
  "laughing loudly",
  "shocked, hands raised",
  "in a hospital hallway",
  "at a wedding hall entrance",
  "lying on a sofa",
  "close-up of face",
  "full body standing",
  "under an umbrella in the rain",
];

// 4장에서 몇 장의 시트 후보를 뽑을지
export const SHEET_CANDIDATES = 4;

export const PROVIDERS = ["gemini", "openai", "mock"] as const;
export type ProviderName = (typeof PROVIDERS)[number];

export const MODELS = {
  gemini: process.env.GEMINI_IMAGE_MODEL ?? "gemini-nano-banana-2.1",
  openai: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-sunburst",
};
