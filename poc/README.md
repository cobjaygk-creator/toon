# 썰툰 제작기 · 0단계 기술검증

AI로 만든 캐릭터를 **베이스 + 눈 파츠 + 입 파츠**로 나눠서, 눈 깜빡임·말하기를 티 안 나게 합성할 수 있는지 확인하는 스크립트 모음입니다. 화면(UI)은 없고 터미널에서 명령어로 실행합니다.

## 0. 처음 한 번만

1. [Node.js](https://nodejs.org) 20 이상 설치
2. 이 폴더에서 터미널을 열고:
   ```
   npm install
   ```
3. `.env.example` 을 복사해 `.env` 로 이름을 바꾸고 API 키 입력
   - Gemini 키: https://aistudio.google.com/apikey
   - OpenAI 키: https://platform.openai.com/api-keys (조직 인증이 필요할 수 있음)

## 1. API 키 없이 먼저 돌려보기 (추천)

```
npm run demo
```

`mock`(가짜 그림) 제공자로 전체 과정을 한 번에 돌립니다. 비용 0원.
`output/mock/hero/05-preview/_all.gif` 가 나오면 설치는 끝난 겁니다.

## 2. 실제 검증 순서

모든 명령은 `--provider gemini` 또는 `--provider openai` 를 붙여 API를 고릅니다. 캐릭터는 `--character hero` (기본값).

| 순서 | 명령 | 하는 일 | 확인할 것 |
| --- | --- | --- | --- |
| 1 | `npm run sheet -- --provider gemini` | 캐릭터 시트 후보 4장 생성 | `01-sheet-candidates/_overview.png` |
| 1-2 | `npm run sheet -- --provider gemini --pick 2` | 마음에 드는 번호를 기준 시트로 고정 | `sheet.png` |
| 2 | `npm run grid -- --provider gemini` | 시트 위에 격자 + 눈·입 박스 표시 | `00-grid.png` (아래 3번 참고) |
| 3 | `npm run consistency -- --provider gemini` | 시트를 참고해 20컷 생성 | `02-consistency/_grid.png` 에서 같은 사람으로 보이는 컷 수 (합격 16/20) |
| 4 | `npm run expressions -- --provider gemini` | 표정 5종 베이스 생성 | `03-expressions.png`, 터미널의 "얼굴 밖 변화량" |
| 5 | `npm run parts -- --provider gemini` | 표정별 눈 감음·입 2단계 파츠 생성 | 터미널의 "이음매" 숫자, `04-parts-report.csv` |
| 6 | `npm run preview -- --provider gemini` | 깜빡임 + 말하기 GIF | `05-preview/*.gif` 를 직접 보기 |

결과는 모두 `output/<제공자>/<캐릭터>/` 아래에 쌓이고, 걸린 시간과 API 호출 수는 `output/log.csv` 에 기록됩니다.

## 3. 눈·입 박스 맞추기 (2번 단계)

`characters/hero/character.json` 의 숫자가 눈·입 위치입니다. 기본값은 mock 캐릭터에 맞춰져 있어서 **실제 AI 시트에서는 반드시 고쳐야 합니다.**

1. `00-grid.png` 를 엽니다. 빨간 격자는 50px, 숫자는 100px 단위입니다.
2. 파란 박스가 눈(눈썹 제외)과 입을 상하좌우 10~20px 여유 있게 감싸도록 `x, y, w, h` 를 고칩니다.
3. `npm run grid` 를 다시 실행해 확인합니다.

## 4. 숫자 읽는 법

- **얼굴 밖 변화량** (4단계): 표정을 바꿀 때 머리·옷·배경이 얼마나 바뀌었는지. 10 이하 양호, 25 이상이면 구도가 틀어진 것.
- **이음매** (5단계, 핵심): 파츠를 붙일 자리 테두리가 베이스와 얼마나 다른지. 2 이하 양호, 2~5 확대하면 사각형이 보임, 5 초과 실패.
  - 스크립트가 자동으로 **위치 보정**(AI가 그림을 몇 px 밀어버린 경우)과 **색 보정**(밝기·색감이 달라진 경우)을 한 뒤의 값입니다.
  - 실패하면: 박스를 조금 키우기 → `--feather 12` 로 경계 더 부드럽게 → 그래도 안 되면 그 API는 탈락.

## 5. 자주 쓰는 옵션

- `--character villain` : 다른 캐릭터. `characters/villain/character.json` 을 hero 것을 복사해 만드세요.
- `--count 5` : 3단계 컷 수 줄이기(비용 절약용 시험)
- `--expr happy` : 5단계를 한 표정만 다시
- `--feather 12` : 5단계 경계 부드러움(기본 8)
- `--seconds 6` : 6단계 GIF 길이

## 6. 파일 구조

```
characters/<이름>/character.json   캐릭터 설명 + 눈·입 박스 좌표
src/config.ts                     그림체 문구, 캔버스 크기, 표정·장면 목록, 모델명
src/providers/                    gemini / openai / mock 연결
src/lib/image.ts                  잘라내기, 붙이기, 위치·색 보정, 크로마키, 지표 계산
scripts/00~05                     단계별 실행 파일
scripts/_selftest.ts              위치 보정 자체 점검 (npm run selftest, demo 이후 실행)
```

## 참고

- 기본 모델: Gemini `gemini-nano-banana-2.1`, OpenAI `gpt-image-2.5-sunburst`. `.env` 에서 바꿀 수 있습니다.
- Gemini는 마스크 편집이 없어 "눈만 감겨줘" 프롬프트로 수정하고, OpenAI는 마스크도 함께 보냅니다. 어느 쪽이든 박스 영역만 잘라 쓰므로 박스 밖이 바뀌어도 결과에는 영향이 없습니다.
- Gemini 결과물에는 SynthID 워터마크가 들어갑니다(눈에 보이지 않음).
- 레퍼런스 채널의 캐릭터·화풍을 그대로 따라 하는 프롬프트나 이미지는 쓰지 마세요.
