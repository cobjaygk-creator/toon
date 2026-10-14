/**
 * Zero-Touch Ssul-toon Studio - Gemini Director & Smart NLP Director
 * - Directs raw Korean stories/scripts into animated Ssul-toon scene sequences
 * - Gemini 2.5 Flash API integration
 * - Intelligent local Korean NLP rule-based Director fallback
 * - Character casting & Voice assignment (Edge-TTS voices)
 */

export const PRESET_SCENARIOS = [
  {
    id: 'inlaw_food',
    title: '🔥 [시월드 참교육] "제사음식 전 10판 다 부쳐라!" 시어머니의 황당한 요구',
    description: '명절 전 10판을 혼자 다 하라는 시어머니에게 시원하게 사이다 날리는 며느리 수연의 썰',
    text: `시어머니: 얘, 수연아! 이번 추석 제사 음식은 네가 전 10판 다 부쳐놓거라!
수연: 네? 어머님, 저도 직장 다니고 친정에도 가봐야 하는데요?
시어머니: 어디 시어머니 말씀에 또박또박 말대꾸니! 며느리 도리도 몰라?!
수연: 어머님, 그럼 아버님이랑 서방님도 같이 전 부치시는 거죠?
시어머니: 남자가 어디 부엌에 들어와! 여자가 하는 일이지!
수연: 그럼 전 10판 부치는 비용 150만원이랑 출장 인건비 계좌로 입금해 주시면 전문가 수준으로 부쳐올게요!
시어머니: 뭐, 뭐라고?! 150만원?! 너 지금 제정신이니?!
수연: 어머님, 요즘 종갓집 제사도 외주 맡기는 시대잖아요? 입금 확인되면 부치겠습니다!`
  },
  {
    id: 'blind_date',
    title: '💸 [레전드 진상] 축의금 3만원 내고 호텔 뷔페 5접시 싹쓸이한 남사친',
    description: '호텔 결혼식 축의금 3만원 내고 스테이크와 와인을 털어간 뻔뻔한 남사친 태준과의 대화',
    text: `태준: 수연아! 저번 주 결혼식 호텔 뷔페 진짜 대박 맛있더라! 스테이크만 세 번 먹었어.
수연: 태준아, 맛있게 먹었다니 다행인데... 축의금 봉투에 3만원 들어있던데 확인 좀 해줄래?
태준: 어? 3만원 맞는데 왜? 참석해 준 것만으로도 고마워해야 하는 거 아니야?
수연: 식대가 1인당 12만원인 곳이었잖아. 게다가 너 친구까지 데려와서 둘이 먹었잖아!
태준: 야, 축하하러 간 자리에 돈 계산을 그렇게 따지냐? 너무 속물이다 너!
수연: 속물? 남의 축제날에 와서 24만원어치 먹방 찍고 3만원 낸 네가 할 말은 아니지 않니?
태준: 허... 친구 사이에 밥 한 끼 가지고 되게 빡빡하게 구네. 섭섭하다 진짜.
수연: 섭섭한 김에 차액 21만원이나 카카오페이로 보내고 연락 끊어줘!`
  },
  {
    id: 'sister_inlaw',
    title: '🚪 [사이다 응징] 신혼집 비번 멋대로 누르고 들어온 시누이',
    description: '주말 아침 불쑥 도어락 누르고 들어와 냉장고 털어가는 얄미운 시누이 참교육 썰',
    text: `시누이: 올케 언니! 왜 이렇게 문을 늦게 열어? 나 갈비찜 해놓은 거 좀 가져가려고 왔지~
수연: 아가씨... 저희 신혼집인데 비밀번호를 누르고 들어오시면 어떡해요?
시누이: 어머, 오빠 집이 곧 내 집이지! 가족끼리 비밀번호 좀 공유하는 게 뭐가 어때서 그래요?
수연: 여긴 저희 부부 사생활 공간이에요. 미리 연락도 없이 이러시는 건 예의가 아니에요.
시누이: 예의? 올케 언니 나한테 훈계하는 거예요? 엄마한테 다 이를 거야!
수연: 네, 어머님께 지금 바로 전화드릴게요. 신혼집 무단침입으로 경찰에 신고해도 되는지 여쭤보려고요!
시누이: 뭐... 뭐라고요? 경찰?! 겨우 반찬 좀 가져가려는데 경찰을 부른다고요?!
수연: 당장 도어락 비번 바꿨으니, 앞으로는 1층 인터폰 누르고 예약하고 오세요!`
  }
];

// Available default voices for Korean Ssul-toon
// Available default voices for Korean Ssul-toon (100% verified Edge-TTS neural voices)
export const VOICE_PROFILES = {
  sooyeon: { name: '수연 (2030 여성)', voice: 'ko-KR-SunHiNeural', rate: '+5%', pitch: '+0Hz' },
  taejun: { name: '태준 (2030 남성)', voice: 'ko-KR-InJoonNeural', rate: '+0%', pitch: '+0Hz' },
  mother: { name: '시어머니 (5060 중년)', voice: 'ko-KR-SunHiNeural', rate: '-8%', pitch: '-8Hz' },
  sister: { name: '시누이 (2030 얄미운)', voice: 'ko-KR-SunHiNeural', rate: '+10%', pitch: '+8Hz' },
  narrator: { name: '나레이션', voice: 'ko-KR-InJoonNeural', rate: '-2%', pitch: '-2Hz' }
};

/**
 * Parses raw text scenario into structured Ssul-toon cuts using Smart Local NLP heuristics.
 * Guarantees 100% zero-touch execution even without Gemini API key.
 */
export function smartLocalDirector(scenarioText, charactersList = []) {
  const lines = scenarioText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const scenes = [];
  let currentSpeaker = 'sooyeon';
  let defaultBg = 'livingroom';

  // Determine background theme based on keywords
  const fullText = scenarioText.toLowerCase();
  if (fullText.includes('결혼') || fullText.includes('뷔페') || fullText.includes('카페') || fullText.includes('커피')) {
    defaultBg = 'cafe';
  } else if (fullText.includes('경찰') || fullText.includes('법') || fullText.includes('고소') || fullText.includes('합의')) {
    defaultBg = 'court';
  } else if (fullText.includes('거리') || fullText.includes('포차') || fullText.includes('밤') || fullText.includes('길거리')) {
    defaultBg = 'street';
  }

  // Detect main 2 characters in the script
  let charLeft = 'sooyeon';
  let charRight = 'mother';

  if (fullText.includes('태준') || fullText.includes('남편') || fullText.includes('남자') || fullText.includes('남사친')) {
    charRight = 'taejun';
  } else if (fullText.includes('시누이') || fullText.includes('아가씨') || fullText.includes('동생')) {
    charRight = 'sister';
  }

  lines.forEach((line, index) => {
    let speaker = currentSpeaker;
    let dialogue = line;

    // Check if line starts with character name (e.g. "시어머니: ...", "수연: ...")
    const match = line.match(/^([^:：]+)[:：]\s*(.*)$/);
    if (match) {
      const name = match[1].trim();
      dialogue = match[2].trim();

      if (name.includes('시어머니') || name.includes('엄마') || name.includes('모친')) {
        speaker = 'mother';
        charRight = 'mother';
      } else if (name.includes('수연') || name.includes('며느리') || name.includes('나') || name.includes('주인공')) {
        speaker = 'sooyeon';
        charLeft = 'sooyeon';
      } else if (name.includes('태준') || name.includes('남편') || name.includes('친구') || name.includes('남사친')) {
        speaker = 'taejun';
        charRight = 'taejun';
      } else if (name.includes('시누이') || name.includes('아가씨') || name.includes('동생')) {
        speaker = 'sister';
        charRight = 'sister';
      }
    } else {
      // Alternating speaker heuristic if no name prefix
      speaker = index % 2 === 0 ? charRight : charLeft;
    }

    currentSpeaker = speaker;

    // Detect Emotion and Effects from dialogue sentiment
    let emotion = 'normal';
    let visualEffect = 'none';
    let soundEffect = '';
    let camera = 'normal';

    const dText = dialogue;
    if (dText.includes('?!') || dText.includes('소리') || dText.includes('말대꾸') || dText.includes('뭐라고') || dText.includes('정신') || dText.includes('속물')) {
      emotion = 'angry';
      visualEffect = 'anger_vein';
      soundEffect = '빠각!';
      camera = 'shake';
    } else if (dText.includes('네?') || dText.includes('어머') || dText.includes('경찰') || dText.includes('150만원') || dText.includes('24만원') || dText.includes('헉')) {
      emotion = 'shocked';
      visualEffect = 'sweat';
      soundEffect = '쿵!';
      camera = speaker === charLeft ? 'zoom_in_left' : 'zoom_in_right';
    } else if (dText.includes('전문가') || dText.includes('입금') || dText.includes('대박') || dText.includes('사이다') || dText.includes('통쾌') || dText.includes('예약')) {
      emotion = 'smug';
      visualEffect = 'sparkle';
      soundEffect = '샤방~';
      camera = 'normal';
    } else if (dText.includes('?') || dText.includes('왜') || dText.includes('어때서')) {
      emotion = 'panic';
      visualEffect = 'question_mark';
      soundEffect = '물음표?';
      camera = 'normal';
    }

    const activeSpeaker = speaker === charLeft ? 'left' : 'right';

    // Highlight key phrase for punchy webtoon subtitle
    let subtitle = dialogue;
    if (dialogue.length > 32) {
      subtitle = dialogue.slice(0, 32) + '...';
    }

    scenes.push({
      sceneIndex: index,
      speaker,
      leftCharacter: charLeft,
      rightCharacter: charRight,
      activeSpeaker,
      dialogue,
      subtitle,
      emotion,
      visualEffect,
      soundEffect,
      camera,
      background: defaultBg
    });
  });

  return {
    title: '전자동 연출 썰툰',
    directorMode: 'smart_local_nlp',
    scenes
  };
}

/**
 * Directs scenario with Gemini 2.5 Flash API.
 * Falls back safely to smartLocalDirector if API fails or key is missing.
 */
export async function directWithGemini(scenarioText, apiKey = '', charactersList = []) {
  const systemInstruction = `
당신은 유튜브 100만 구독자 썰툰 전문 총괄 연출 감독(PD)입니다.
사용자가 제공하는 한국어 줄글/대본을 분석하여, 캐릭터 2인이 대화하는 박진감 넘치는 썰툰 애니메이션 연출 JSON 데이터를 생성하세요.

[등장인물 매칭 가이드]
- sooyeon: 2030 여성, 주인공/며느리/사이다 캐릭터
- taejun: 2030 남성, 남편/남자친구/진상남
- mother: 5060 중년 여성, 시어머니/엄마
- sister: 2030 얄미운 시누이/여동생

[반환 JSON 스키마 규격]
{
  "title": "썰툰 제목",
  "scenes": [
    {
      "sceneIndex": 0,
      "speaker": "sooyeon", // "sooyeon" | "taejun" | "mother" | "sister"
      "leftCharacter": "sooyeon", // 왼쪽 배치 캐릭터 ID
      "rightCharacter": "mother", // 오른쪽 배치 캐릭터 ID
      "activeSpeaker": "left", // "left" | "right" (지금 말하고 있는 쪽)
      "dialogue": "음성 TTS로 읽힐 대사 원문 (자연스럽고 간결하게)",
      "subtitle": "화면 하단에 강조될 핵심 자막",
      "emotion": "normal" | "angry" | "shocked" | "smug" | "panic" | "laughing",
      "visualEffect": "sweat" | "anger_vein" | "question_mark" | "sparkle" | "none",
      "soundEffect": "쿵!" | "빠각!" | "샤방~" | "헉!" | "",
      "camera": "normal" | "zoom_in_left" | "zoom_in_right" | "shake",
      "background": "livingroom" | "cafe" | "court" | "street"
    }
  ]
}
반드시 순수한 JSON만 반환하세요.
`;

  try {
    const response = await fetch('/api/gemini-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        prompt: `다음 시나리오를 썰툰 연출 JSON으로 각색 및 연출해줘:\n\n${scenarioText}`,
        systemInstruction
      })
    });

    if (!response.ok) {
      console.warn('Gemini proxy returned non-OK, using smart local director fallback.');
      return smartLocalDirector(scenarioText, charactersList);
    }

    const data = await response.json();
    let text = data.result;
    if (!text) {
      return smartLocalDirector(scenarioText, charactersList);
    }

    // Clean markdown code blocks if any
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(text);

    // Normalize scenes
    const rawScenes = parsed.scenes || parsed.cuts || [];
    if (!rawScenes || rawScenes.length === 0) {
      return smartLocalDirector(scenarioText, charactersList);
    }

    const normalizedScenes = rawScenes.map((s, idx) => {
      let speaker = s.speaker || s.character || 'sooyeon';
      if (speaker.includes('시어머니') || speaker.includes('엄마')) speaker = 'mother';
      else if (speaker.includes('수연') || speaker.includes('며느리')) speaker = 'sooyeon';
      else if (speaker.includes('태준') || speaker.includes('남편') || speaker.includes('친구')) speaker = 'taejun';
      else if (speaker.includes('시누이') || speaker.includes('아가씨') || speaker.includes('동생')) speaker = 'sister';

      let leftChar = s.leftCharacter || 'sooyeon';
      let rightChar = s.rightCharacter || (speaker === 'sooyeon' ? 'mother' : speaker);

      let activeSpeaker = s.activeSpeaker;
      if (!activeSpeaker) {
        activeSpeaker = speaker === leftChar ? 'left' : 'right';
      }

      return {
        sceneIndex: idx,
        speaker,
        leftCharacter: leftChar,
        rightCharacter: rightChar,
        activeSpeaker,
        dialogue: s.dialogue || s.line || s.text || '',
        subtitle: s.subtitle || s.dialogue || s.line || '',
        emotion: s.emotion || 'normal',
        visualEffect: s.visualEffect || 'none',
        soundEffect: s.soundEffect || '',
        camera: s.camera || 'normal',
        background: s.background || 'livingroom'
      };
    });

    return {
      title: parsed.title || 'Gemini AI 각색 썰툰',
      directorMode: 'gemini_flash',
      scenes: normalizedScenes
    };
  } catch (err) {
    console.error('Gemini directing parsing failed, fallback to local director:', err);
    return smartLocalDirector(scenarioText, charactersList);
  }
}
