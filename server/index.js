import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { generateCharacterPngFile } from './character_generator.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const CHAR_DIR = path.join(PUBLIC_DIR, 'characters');
const BG_DIR = path.join(PUBLIC_DIR, 'backgrounds');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio_cache');

// Ensure directories exist
fs.mkdirSync(CHAR_DIR, { recursive: true });
fs.mkdirSync(BG_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static assets from public folder with CORS and Range headers
app.use(express.static(PUBLIC_DIR, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Accept-Ranges', 'bytes');
  }
}));

// Multer storage for uploads
const charStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CHAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\uAC00-\uD7A3]/g, '_');
    cb(null, `${baseName}_${Date.now()}${ext}`);
  }
});
const uploadChar = multer({ storage: charStorage });

const bgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, BG_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\uAC00-\uD7A3]/g, '_');
    cb(null, `${baseName}_${Date.now()}${ext}`);
  }
});
const uploadBg = multer({ storage: bgStorage });

// Character default metadata helper
function getCharacterMetadata(filename) {
  const base = path.basename(filename, path.extname(filename)).toLowerCase();
  if (base.includes('sooyeon') || base.includes('수연')) {
    return { name: '수연 (2030 여주인공)', role: '여주인공', defaultVoice: 'ko-KR-SunHiNeural', pitch: '+0Hz', rate: '+5%' };
  }
  if (base.includes('taejun') || base.includes('태준')) {
    return { name: '태준 (2030 남편/남친)', role: '남편/남친', defaultVoice: 'ko-KR-InJoonNeural', pitch: '+0Hz', rate: '+0%' };
  }
  if (base.includes('mother') || base.includes('시어머니') || base.includes('엄마')) {
    return { name: '시어머니 (5060 중년 여성)', role: '시어머니', defaultVoice: 'ko-KR-SunHiNeural', pitch: '-8Hz', rate: '-8%' };
  }
  if (base.includes('sister') || base.includes('시누이') || base.includes('동생')) {
    return { name: '시누이 (2030 얄미운 시누이)', role: '시누이', defaultVoice: 'ko-KR-SunHiNeural', pitch: '+8Hz', rate: '+10%' };
  }
  return { name: base, role: '등장인물', defaultVoice: 'ko-KR-SunHiNeural', pitch: '+0Hz', rate: '+0%' };
}

// 1. Health Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'Zero-Touch Ssul-toon Studio Backend',
    edgeTts: 'available',
    hasGeminiKey: !!process.env.GEMINI_API_KEY
  });
});

// 2. Scan Characters
app.get('/api/characters', (req, res) => {
  try {
    const files = fs.readdirSync(CHAR_DIR);
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const characters = files
      .filter(f => validExtensions.includes(path.extname(f).toLowerCase()))
      .map(file => {
        const id = path.basename(file, path.extname(file));
        const meta = getCharacterMetadata(file);
        return {
          id,
          filename: file,
          url: `/characters/${file}`,
          name: meta.name,
          role: meta.role,
          defaultVoice: meta.defaultVoice,
          pitch: meta.pitch,
          rate: meta.rate
        };
      });
    res.json(characters);
  } catch (err) {
    console.error('Error scanning characters:', err);
    res.status(500).json({ error: 'Failed to scan characters' });
  }
});

// 3. Scan Backgrounds
app.get('/api/backgrounds', (req, res) => {
  try {
    const files = fs.readdirSync(BG_DIR);
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const backgrounds = files
      .filter(f => validExtensions.includes(path.extname(f).toLowerCase()))
      .map(file => {
        const id = path.basename(file, path.extname(file));
        return {
          id,
          filename: file,
          url: `/backgrounds/${file}`,
          name: id
        };
      });
    res.json(backgrounds);
  } catch (err) {
    console.error('Error scanning backgrounds:', err);
    res.status(500).json({ error: 'Failed to scan backgrounds' });
  }
});

// Sequential TTS Generation Queue with Rate Limiting & Retry
let ttsQueue = Promise.resolve();

async function generateTTSWithRetry(targetVoice, cleanText, pitch, rate, cacheFilePath, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[TTS Queue] Attempt ${attempt} [${targetVoice}]: "${cleanText.slice(0, 30)}..."`);
      const tts = new MsEdgeTTS();
      await tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const { audioStream } = tts.toStream(cleanText, { pitch, rate });
      const tempPath = `${cacheFilePath}.tmp_${Date.now()}`;
      const writeStream = fs.createWriteStream(tempPath);

      await new Promise((resolve, reject) => {
        audioStream.pipe(writeStream);
        audioStream.on('error', reject);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const stat = fs.statSync(tempPath);
      if (stat.size > 0) {
        fs.renameSync(tempPath, cacheFilePath);
        return stat.size;
      } else {
        throw new Error('Received 0 bytes of audio');
      }
    } catch (err) {
      console.warn(`[TTS Queue] Attempt ${attempt} failed:`, err.message);
      if (attempt < maxRetries) {
        const delay = 1000 * attempt;
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

// 4. Edge-TTS Generation with Audio Caching
app.post('/api/tts', async (req, res) => {
  const { text, voice = 'ko-KR-SunHiNeural', pitch = '+0Hz', rate = '+0%' } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text is required for TTS generation' });
  }

  // Validate and sanitize voice name for Edge-TTS
  const VALID_VOICES = ['ko-KR-SunHiNeural', 'ko-KR-InJoonNeural', 'ko-KR-HyunsuMultilingualNeural'];
  let targetVoice = voice;
  if (!VALID_VOICES.includes(targetVoice)) {
    if (targetVoice.toLowerCase().includes('injoon') || targetVoice.toLowerCase().includes('male') || targetVoice.toLowerCase().includes('taejun')) {
      targetVoice = 'ko-KR-InJoonNeural';
    } else {
      targetVoice = 'ko-KR-SunHiNeural';
    }
  }

  const cleanText = text.trim();
  // Compute deterministic MD5 hash for audio caching
  const hashKey = crypto
    .createHash('md5')
    .update(`${targetVoice}_${pitch}_${rate}_${cleanText}`)
    .digest('hex');

  const cacheFileName = `${hashKey}.mp3`;
  const cacheFilePath = path.join(AUDIO_DIR, cacheFileName);
  const audioUrl = `/audio_cache/${cacheFileName}`;

  // If already cached and valid, return immediately
  if (fs.existsSync(cacheFilePath)) {
    const stat = fs.statSync(cacheFilePath);
    if (stat.size > 0) {
      return res.json({
        cached: true,
        audioUrl,
        size: stat.size,
        voice: targetVoice,
        text: cleanText
      });
    }
  }

  // Enqueue TTS generation sequentially to prevent 429 Rate Limits
  ttsQueue = ttsQueue.then(async () => {
    // If cached while waiting in queue, return cached
    if (fs.existsSync(cacheFilePath)) {
      const stat = fs.statSync(cacheFilePath);
      if (stat.size > 0) {
        return res.json({
          cached: true,
          audioUrl,
          size: stat.size,
          voice: targetVoice,
          text: cleanText
        });
      }
    }

    await new Promise(r => setTimeout(r, 200));
    const size = await generateTTSWithRetry(targetVoice, cleanText, pitch, rate, cacheFilePath);
    console.log(`TTS generation complete: ${cacheFileName} (${size} bytes)`);

    res.json({
      cached: false,
      audioUrl,
      size,
      voice: targetVoice,
      text: cleanText
    });
  }).catch((err) => {
    console.error('Edge-TTS generation error:', err);
    if (fs.existsSync(cacheFilePath)) {
      try { fs.unlinkSync(cacheFilePath); } catch (e) {}
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate Edge-TTS audio', message: err.message });
    }
  });
});

// 5. Upload Custom Character Sheet
app.post('/api/upload-character', uploadChar.single('character'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No character image file uploaded' });
  }
  const file = req.file.filename;
  const id = path.basename(file, path.extname(file));
  const meta = getCharacterMetadata(file);

  res.json({
    id,
    filename: file,
    url: `/characters/${file}`,
    name: meta.name,
    role: meta.role,
    defaultVoice: meta.defaultVoice
  });
});

// 6. Upload Custom Background
app.post('/api/upload-background', uploadBg.single('background'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No background image file uploaded' });
  }
  const file = req.file.filename;
  const id = path.basename(file, path.extname(file));

  res.json({
    id,
    filename: file,
    url: `/backgrounds/${file}`,
    name: id
  });
});

// 7. Gemini API Proxy (Server-side model invocation)
app.post('/api/gemini-proxy', async (req, res) => {
  const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'Gemini API key is not configured' });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const { prompt, systemInstruction } = req.body;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    };
    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Gemini API error', details: errText });
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ result: candidateText, model });
  } catch (err) {
    console.error('Gemini proxy error:', err);
    res.status(500).json({ error: 'Failed to contact Gemini API', message: err.message });
  }
});

// 8. Verify and Save Gemini API Key
app.post('/api/verify-gemini', async (req, res) => {
  const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ valid: false, error: 'API Key를 입력해주세요.' });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const testResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }]
      })
    });

    if (testResponse.ok) {
      process.env.GEMINI_API_KEY = apiKey;
      const envPath = path.join(ROOT_DIR, '.env');
      fs.writeFileSync(envPath, `GEMINI_API_KEY=${apiKey}\nGEMINI_MODEL=${model}\nPORT=${PORT}\n`);

      return res.json({
        valid: true,
        model,
        message: 'Google Gemini API 연동이 성공적으로 확인 및 저장되었습니다!'
      });
    } else {
      const err = await testResponse.json();
      return res.status(400).json({
        valid: false,
        error: err?.error?.message || 'API 키 검증 실패 (Google 응답 오류)'
      });
    }
  } catch (e) {
    return res.status(500).json({ valid: false, error: e.message });
  }
});

// 9. AI Scenario Generator Endpoint
app.post('/api/ai-generate-scenario', async (req, res) => {
  const { topic = '당근마켓 무료나눔 참교육' } = req.body;
  const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  const systemInstruction = `
당신은 유튜브 100만 구독자 썰툰 전문 대표 작가 겸 총괄 연출 PD입니다.
주어진 주제로 박진감 넘치고 통쾌한 사이다 2인 대화 썰툰 대본을 작성하고, 등장인물 2인의 비주얼 외모와 음성 스펙을 JSON으로 반환하세요.

[규칙]
- 대본(scriptText)은 반드시 2인이 번갈아 가며 한마디씩 티키타카를 주고받는 "화자: 대사" 형식으로 6~8줄 내외로 작성하세요.
- characterA: 주인공/사이다/상식인 캐릭터
- characterB: 빌런/진상/상대방 캐릭터
- hairType: "long" | "short_male" | "perm" | "ponytail" | "bob" | "spiky"
- eyeStyle: "cute" | "sharp" | "sassy" | "angry"
- accessory: "none" | "glasses" | "earrings" | "scarf"
- defaultVoice: 여성 "ko-KR-SunHiNeural", 남성 "ko-KR-InJoonNeural"
- background: "livingroom" | "cafe" | "court" | "street"

[JSON 스키마]
{
  "title": "썰툰 제목",
  "topic": "${topic}",
  "scriptText": "화자A: 대사\\n화자B: 대사\\n...",
  "characterA": {
    "id": "char_a",
    "name": "이름 (나이/직업)",
    "role": "주인공",
    "hairType": "short_male",
    "hairColor": "#1e293b",
    "clothColor": "#3b82f6",
    "skinColor": "#fde2e4",
    "accessory": "none",
    "eyeStyle": "cute",
    "defaultVoice": "ko-KR-InJoonNeural",
    "pitch": "+0Hz",
    "rate": "+0%"
  },
  "characterB": {
    "id": "char_b",
    "name": "이름 (나이/역할)",
    "role": "상대방",
    "hairType": "perm",
    "hairColor": "#475569",
    "clothColor": "#ec4899",
    "skinColor": "#fed7aa",
    "accessory": "scarf",
    "eyeStyle": "sharp",
    "defaultVoice": "ko-KR-SunHiNeural",
    "pitch": "-8Hz",
    "rate": "-8%"
  },
  "background": "livingroom"
}
반드시 순수한 JSON만 반환하세요.
`;

  try {
    if (apiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `주제: "${topic}"에 대해 썰툰 대본과 캐릭터 스펙을 기획해줘.` }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
        })
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text.replace(/```json/gi, '').replace(/```/gi, '').trim());
          return res.json(parsed);
        }
      }
    }
  } catch (err) {
    console.warn('Gemini scenario generation fallback:', err.message);
  }

  // Fallback scenario generator
  res.json({
    title: `[사이다 참교육] ${topic}`,
    topic,
    scriptText: `민우: 저기요, 아무리 그래도 남의 집 문을 이렇게 발로 차시면 안 되죠!\n진상맘: 네가 내 연락 씹고 차단했잖아! 이웃끼리 중고 물건 공짜로 좀 나눔하면 덧나니?!\n민우: 100만원짜리 최신 태블릿을 왜 공짜로 드립니까? 지금 초인종 파손에 주거침입 시도예요.\n진상맘: 젊은 놈이 싸가지없이 어른을 가르쳐?! 너 내가 경찰 부를 줄 알아!\n민우: 네, 부르세요. 지금 도어락 카메라로 4K 영상 전부 녹화됐으니 고소장 바로 접수하겠습니다.\n진상맘: 뭐, 뭐라고?! 녹화 중이었다고?! 너 지금 제정신이야?!\n민우: 경찰 오시면 합의금이랑 도어락 수리비 청구할 테니 각오하세요!`,
    characterA: {
      id: 'minwoo',
      name: '민우 (20대 남주)',
      role: '주인공',
      hairType: 'short_male',
      hairColor: '#1e293b',
      clothColor: '#3b82f6',
      skinColor: '#fde2e4',
      accessory: 'none',
      eyeStyle: 'cute',
      defaultVoice: 'ko-KR-InJoonNeural',
      pitch: '+0Hz',
      rate: '+0%'
    },
    characterB: {
      id: 'jinsang',
      name: '진상맘 (50대 빌런)',
      role: '상대방',
      hairType: 'perm',
      hairColor: '#475569',
      clothColor: '#ec4899',
      skinColor: '#fed7aa',
      accessory: 'scarf',
      eyeStyle: 'sharp',
      defaultVoice: 'ko-KR-SunHiNeural',
      pitch: '-8Hz',
      rate: '-8%'
    },
    background: 'street'
  });
});

// 10. AI Character Sheet Generator Endpoint
app.post('/api/ai-generate-character-sheet', async (req, res) => {
  const {
    id = `char_${Date.now()}`,
    name = '신규 캐릭터',
    hairColor = '#1e293b',
    skinColor = '#fde2e4',
    clothColor = '#3b82f6',
    hairType = 'short_male',
    accessory = 'none',
    eyeStyle = 'cute',
    role = '등장인물',
    defaultVoice = 'ko-KR-SunHiNeural',
    pitch = '+0Hz',
    rate = '+0%'
  } = req.body;

  try {
    const filename = `${id}.png`;
    const targetPath = path.join(CHAR_DIR, filename);

    await generateCharacterPngFile({
      hairColor,
      skinColor,
      clothColor,
      hairType,
      accessory,
      eyeStyle
    }, targetPath);

    console.log(`AI Character sheet generated: ${filename}`);

    res.json({
      id,
      filename,
      url: `/characters/${filename}`,
      name,
      role,
      defaultVoice,
      pitch,
      rate
    });
  } catch (err) {
    console.error('Character sheet generation failed:', err);
    res.status(500).json({ error: 'Failed to generate character sheet', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  🚀 Zero-Touch Ssul-toon Studio Server started!`);
  console.log(`  🔗 Server Port: http://localhost:${PORT}`);
  console.log(`  📁 Characters:  ${CHAR_DIR}`);
  console.log(`  📁 Backgrounds: ${BG_DIR}`);
  console.log(`  📁 Audio Cache: ${AUDIO_DIR}`);
  console.log(`=======================================================`);
});
