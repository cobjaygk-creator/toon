# 원클릭 전자동 썰툰 애니메이션 스튜디오 (Zero-Touch Ssul-toon Studio)

시나리오(줄글/대본)와 캐릭터 시트 이미지만 있으면 **대본 각색 → 캐스팅 → 성우 더빙(TTS) → 정밀 립싱크 → 2인 대화 연출 → 동영상 추출(.webm)**까지 사람의 세부 편집 없이 원클릭으로 자동 완성되는 풀스택 애플리케이션입니다.

---

## 🛠️ 시스템 아키텍처 및 폴더 구조

```text
c:\work\toon\
├── public/
│   ├── characters/          # 캐릭터 4분할 시트 보관 폴더 (자동 스캔 대상)
│   │   ├── sooyeon.png      # 여주인공 (2030 여성)
│   │   ├── taejun.png       # 남편/남친 (2030 남성)
│   │   ├── mother.png       # 시어머니 (5060 중년 여성)
│   │   └── sister.png       # 시누이 (2030 젊은 여성)
│   ├── backgrounds/         # 배경 이미지 폴더 (없을 경우 Canvas 프로시저럴 배경 자동 렌더링)
│   │   ├── livingroom.png   # 아파트 거실
│   │   ├── cafe.png         # 카페
│   │   ├── court.png        # 법정/사무실
│   │   └── street.png       # 도시 길거리
│   └── audio_cache/         # 생성된 Edge-TTS 음성 고속 캐싱 폴더 (MD5 기반)
├── server/
│   ├── index.js             # Express 로컬 서버 (무료 Edge-TTS 생성, 에셋 폴더 스캔, 오디오 캐싱)
│   └── generate_assets.js   # 캐릭터 및 배경 시트 에셋 생성기
├── src/
│   ├── utils/
│   │   ├── imageProcessor.js # 1x4 vs 2x2 자동 판별, 상하단 라벨 자동 크롭, BFS 외곽선 누끼 엔진
│   │   └── geminiDirector.js # Gemini 2.5 Flash API 연동 자동 각색 & 내장 스마트 NLP 연출기
│   ├── App.jsx              # 원클릭 전자동 대시보드 UI + Canvas 애니메이션 & 녹화 엔진
│   ├── main.jsx
│   └── index.css            # Tailwind CSS & 썰툰 애니메이션 스타일
├── package.json
└── vite.config.js
```

---

## 🚀 빠른 시작 방법 (Quick Start)

터미널에서 명령어 **하나만** 실행하면 백엔드와 프론트엔드가 동시에 실행됩니다.

```bash
npm run dev
```

- **프론트엔드 URL**: `http://localhost:5173`
- **백엔드 서버 URL**: `http://localhost:3001`

---

## ✨ 핵심 파이프라인 기능

1. **원클릭 전자동 파이프라인 (Zero-Touch Workflow)**:
   - 시나리오 프리셋 선택 또는 사용자 대본 입력 후 `원클릭 전자동 썰툰 제작` 클릭 시 모든 공정이 자동 진행됩니다.
2. **AI 대본 각색 & 디렉팅 (`geminiDirector.js`)**:
   - Gemini 2.5 Flash API 연동 지원 (API Key가 없어도 내장된 고성능 **Smart Korean NLP Director**가 100% 자동 각색 및 연출을 수행).
   - 대화 씬 분할, 화자/배역 자동 캐스팅, 감정 분석, 카메라 워크, 효과음 태그, 배경 매칭.
3. **지능형 캐릭터 시트 프로세서 (`imageProcessor.js`)**:
   - `1x4` 가로 스트립 vs `2x2` 격자형 레이아웃 자동 판별.
   - AI 생성 시트 상하단 텍스트 라벨 자동 감지 및 스마트 크롭.
   - **BFS 외곽선 누끼 엔진**: 경계면에서 시작하는 Flood-fill 알고리즘으로 캐릭터 내부의 흰 옷이나 흰 이빨을 보존하면서 배경만 깔끔하게 투명화.
   - 4가지 표준 상태 자동 추출 (1: 기본 경청, 2: 발화, 3: 깜빡임, 4: 외침/웃음).
4. **무료 고음질 성우 더빙 (Edge-TTS)**:
   - Microsoft Edge TTS를 활용한 실시간 고음질 한국어 음성 합성 (`ko-KR-SunHiNeural`, `ko-KR-InJoonNeural`, `ko-KR-SoonBokNeural`, `ko-KR-JiMinNeural` 등).
   - 배역별 맞춤 Pitch / Rate 튜닝 및 MD5 기반 영구 오디오 캐싱.
5. **실시간 음성 에너지 기반 정밀 립싱크 (Lip-Sync Engine)**:
   - Web Audio API `AudioContext` & `AnalyserNode` 실시간 주파수 분석.
   - 발화 에너지에 따라 입 모양을 자연스럽게 개폐 및 말하는 사람 리드미컬 바운스.
   - 경청자 살짝 딤드(Dimmed) 및 자연스러운 고개 끄덕임 리액션.
   - 자연스러운 눈 깜빡임 타이밍 자동 계산.
6. **2인 대화 썰툰 연출 & 웹툰 말풍선 / 자막**:
   - 감정 이펙트 스티커 (분노 마크 💢, 식은땀 💧, 물음표 ❓, 반짝이 ✨).
   - 카메라 줌 & 화면 흔들림(Camera Shake) 연출.
   - 화자 입을 정확히 가리키는 웹툰 말풍선 및 하단 강조 자막 바.
7. **동영상 추출 (.webm)**:
   - Canvas Capture Stream(30 FPS)과 Web Audio 스트림을 결합하여 고화질 비디오 자동 녹화 및 원클릭 다운로드.
   - 유튜브 쇼츠/릴스용 `9:16` 및 일반 유튜브용 `16:9` 화면 비율 실시간 전환 지원.
