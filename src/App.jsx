import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, RotateCcw, Download, Sparkles, Wand2, Film,
  Volume2, VolumeX, Settings, RefreshCw, Scissors, Tv, Smartphone,
  CheckCircle2, ArrowRight, UserPlus, Palette, MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { processCharacterSheet } from './utils/imageProcessor.js';
import { directWithGemini, PRESET_SCENARIOS, VOICE_PROFILES } from './utils/geminiDirector.js';

// Viral topic suggestion pills
const VIRAL_TOPIC_SUGGESTIONS = [
  '당근마켓 무료나눔 참교육 썰',
  '카페 멀티탭 꽂고 6시간 독점한 카공족',
  '소개팅에서 500원까지 더치페이 요구한 짠돌이',
  '신혼집 비번 멋대로 누르고 불쑥 찾아온 시누이',
  '축의금 3만원 내고 호텔 뷔페 5접시 털어간 남사친',
  '명품백 빌려가서 커피 쏟고 오리발 내미는 친구'
];

export default function App() {
  // 3-Stage Workflow Active Tab (1: 시나리오 창작, 2: 캐릭터 시트 생성, 3: 영상 제작)
  const [currentStep, setCurrentStep] = useState(1);

  // Stage 1 State: Scenario AI Generation
  const [scenarioTopic, setScenarioTopic] = useState(VIRAL_TOPIC_SUGGESTIONS[0]);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [scenarioTitle, setScenarioTitle] = useState('당근마켓 무료나눔 참교육');
  const [scenarioText, setScenarioText] = useState(PRESET_SCENARIOS[0].text);

  // Stage 2 State: Character Sheets AI Generation
  const [plannedCharA, setPlannedCharA] = useState({
    id: 'char_a',
    name: '민우 (주인공)',
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
  });

  const [plannedCharB, setPlannedCharB] = useState({
    id: 'char_b',
    name: '진상맘 (상대방)',
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
  });

  const [isGeneratingCharacters, setIsGeneratingCharacters] = useState(false);
  const [selectedBackgroundTheme, setSelectedBackgroundTheme] = useState('cafe');

  // Server & Asset Scan State
  const [serverStatus, setServerStatus] = useState({ online: false });
  const [characterList, setCharacterList] = useState([]);
  const [backgroundList, setBackgroundList] = useState([]);
  const [processedCharacters, setProcessedCharacters] = useState({});
  const [processedBackgrounds, setProcessedBackgrounds] = useState({});

  // Settings & Gemini API Key
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [keyVerifyStatus, setKeyVerifyStatus] = useState({ testing: false, message: '', success: null });

  // Stage 3 State: Production Pipeline
  const [pipelineState, setPipelineState] = useState({
    isProducing: false,
    step: 0,
    message: '',
    progress: 0
  });

  // Directed Data & Scene Index
  const [directedData, setDirectedData] = useState(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  // Playback & Video Engine State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [aspectRatio, setAspectRatio] = useState('16:9'); // '16:9' or '9:16'
  const [isMuted, setIsMuted] = useState(false);

  // Refs for Web Audio, Canvas, and MediaRecorder
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioDestRef = useRef(null);
  const currentAudioSourceRef = useRef(null);
  const decodedAudioBuffersRef = useRef({});
  const playbackStartTimeRef = useRef(0);
  const animationFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const sceneTimerRef = useRef(null);

  // 1. Initial Load & Asset Scan
  useEffect(() => {
    checkServerAndLoadAssets();
    return () => {
      stopAudioPlayback();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const checkServerAndLoadAssets = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus({ online: true, ...data });
        await loadAvailableAssets();
      } else {
        setServerStatus({ online: false });
      }
    } catch (err) {
      console.warn('Server offline:', err);
      setServerStatus({ online: false });
    }
  };

  const loadAvailableAssets = async () => {
    try {
      const [charRes, bgRes] = await Promise.all([
        fetch('/api/characters'),
        fetch('/api/backgrounds')
      ]);
      if (charRes.ok) {
        const chars = await charRes.json();
        setCharacterList(chars);
        // Pre-process existing characters with BFS cutout
        const charMap = { ...processedCharacters };
        for (const char of chars) {
          if (!charMap[char.id]) {
            try {
              const processed = await processCharacterSheet(char.url, {
                cropLabels: true,
                tolerance: 46
              });
              charMap[char.id] = processed;
            } catch (e) {}
          }
        }
        setProcessedCharacters(charMap);
      }
      if (bgRes.ok) {
        const bgs = await bgRes.json();
        setBackgroundList(bgs);
        const bgMap = {};
        for (const bg of bgs) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = bg.url;
          bgMap[bg.id] = img;
        }
        setProcessedBackgrounds(bgMap);
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
    }
  };

  // 2. Audio Context Initializer
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const dest = ctx.createMediaStreamDestination();
      audioContextRef.current = ctx;
      audioDestRef.current = dest;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const decodeAndAnalyzeAudio = async (ctx, arrayBuffer) => {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;

    const samplesPerFrame = Math.floor(sampleRate / 50);
    const totalFrames = Math.floor(rawData.length / samplesPerFrame);
    const envelope = new Float32Array(totalFrames);

    for (let f = 0; f < totalFrames; f++) {
      let sum = 0;
      const start = f * samplesPerFrame;
      const end = start + samplesPerFrame;
      for (let i = start; i < end; i++) {
        const val = rawData[i];
        sum += val * val;
      }
      envelope[f] = Math.sqrt(sum / samplesPerFrame);
    }

    return { audioBuffer, envelope, duration };
  };

  // 3. API Key Verification Handler
  const handleVerifyApiKey = async () => {
    setKeyVerifyStatus({ testing: true, message: 'Google API 연결 확인 중...', success: null });
    try {
      const res = await fetch('/api/verify-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiApiKey })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setKeyVerifyStatus({ testing: false, message: `✅ ${data.message} (모델: ${data.model})`, success: true });
        if (geminiApiKey) localStorage.setItem('geminiApiKey', geminiApiKey);
        setServerStatus(prev => ({ ...prev, hasGeminiKey: true }));
      } else {
        setKeyVerifyStatus({ testing: false, message: `❌ ${data.error || '연동 실패'}`, success: false });
      }
    } catch (e) {
      setKeyVerifyStatus({ testing: false, message: `❌ 연결 오류: ${e.message}`, success: false });
    }
  };

  // ==========================================
  // STAGE 1: AI SCENARIO GENERATOR
  // ==========================================
  const handleAiGenerateScenario = async () => {
    setIsGeneratingScenario(true);
    try {
      const res = await fetch('/api/ai-generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: scenarioTopic,
          apiKey: geminiApiKey
        })
      });

      if (res.ok) {
        const data = await res.json();
        setScenarioTitle(data.title || scenarioTopic);
        setScenarioText(data.scriptText || '');
        if (data.characterA) setPlannedCharA(prev => ({ ...prev, ...data.characterA }));
        if (data.characterB) setPlannedCharB(prev => ({ ...prev, ...data.characterB }));
        if (data.background) setSelectedBackgroundTheme(data.background);

        // Move automatically to Stage 2 with confetti
        setCurrentStep(2);
        confetti({ particleCount: 50, spread: 60 });
      }
    } catch (err) {
      console.error('Scenario generation error:', err);
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  // ==========================================
  // STAGE 2: AI CHARACTER SHEETS GENERATOR
  // ==========================================
  const handleAiGenerateCharacterSheets = async () => {
    setIsGeneratingCharacters(true);
    try {
      // 1. Generate Character A Sheet
      const resA = await fetch('/api/ai-generate-character-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plannedCharA)
      });
      const dataA = await resA.json();

      // 2. Generate Character B Sheet
      const resB = await fetch('/api/ai-generate-character-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plannedCharB)
      });
      const dataB = await resB.json();

      // Refresh character list from server
      await loadAvailableAssets();

      // Process BFS cutout for both characters immediately
      const charMap = { ...processedCharacters };
      if (dataA.url) {
        const procA = await processCharacterSheet(dataA.url, { cropLabels: true, tolerance: 46 });
        charMap[dataA.id] = procA;
      }
      if (dataB.url) {
        const procB = await processCharacterSheet(dataB.url, { cropLabels: true, tolerance: 46 });
        charMap[dataB.id] = procB;
      }
      setProcessedCharacters(charMap);

      // Move automatically to Stage 3
      setCurrentStep(3);
      confetti({ particleCount: 70, spread: 70 });
    } catch (err) {
      console.error('Character sheet generation error:', err);
    } finally {
      setIsGeneratingCharacters(false);
    }
  };

  // Upload custom character sheet (.png / .jpg)
  const handleUploadCharacter = async (e, target = 'A') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('character', file);
    try {
      const res = await fetch('/api/upload-character', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const proc = await processCharacterSheet(data.url, { cropLabels: true, tolerance: 46 });
        setProcessedCharacters(prev => ({ ...prev, [data.id]: proc }));
        await loadAvailableAssets();
        if (target === 'A') {
          setPlannedCharA(prev => ({ ...prev, id: data.id, name: data.name }));
        } else {
          setPlannedCharB(prev => ({ ...prev, id: data.id, name: data.name }));
        }
        confetti({ particleCount: 40, spread: 60 });
      }
    } catch (err) {
      console.error('Character upload error:', err);
    }
  };

  // Upload custom background (.png / .jpg)
  const handleUploadBackground = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('background', file);
    try {
      const res = await fetch('/api/upload-background', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedBackgroundTheme(data.id);
        await loadAvailableAssets();
        confetti({ particleCount: 40, spread: 60 });
      }
    } catch (err) {
      console.error('Background upload error:', err);
    }
  };

  // ==========================================
  // STAGE 3: ONE-CLICK VIDEO PRODUCTION
  // ==========================================
  const startAutoProduction = async () => {
    const ctx = getAudioContext();
    stopAudioPlayback();

    setPipelineState({
      isProducing: true,
      step: 1,
      message: '대본 분석 및 씬 디렉팅 중 (Gemini AI)...',
      progress: 15
    });

    try {
      // Step 1: Script Directing with Gemini
      const directedResult = await directWithGemini(scenarioText, geminiApiKey, characterList);

      // Map generated character IDs into directedResult scenes
      const customizedScenes = directedResult.scenes.map(s => {
        let left = plannedCharA.id;
        let right = plannedCharB.id;
        let speaker = s.speaker === 'sooyeon' || s.speaker === plannedCharA.id ? plannedCharA.id : plannedCharB.id;
        return {
          ...s,
          speaker,
          leftCharacter: left,
          rightCharacter: right,
          background: selectedBackgroundTheme || s.background || 'livingroom'
        };
      });
      directedResult.scenes = customizedScenes;
      setDirectedData(directedResult);

      setPipelineState({
        isProducing: true,
        step: 2,
        message: '캐릭터 4분할 시트 BFS 누끼 검증 중...',
        progress: 35
      });

      // Step 2: Ensure sheets are processed
      const charMap = { ...processedCharacters };
      for (const char of [plannedCharA, plannedCharB]) {
        if (!charMap[char.id]) {
          try {
            const url = `/characters/${char.id}.png`;
            const processed = await processCharacterSheet(url, { cropLabels: true, tolerance: 46 });
            charMap[char.id] = processed;
          } catch (e) {}
        }
      }
      setProcessedCharacters(charMap);

      setPipelineState({
        isProducing: true,
        step: 3,
        message: 'Edge-TTS 고음질 성우 음성 일괄 합성 중...',
        progress: 60
      });

      // Step 3: Batch Edge-TTS Voice Synthesis
      const scenesWithAudio = [];
      const decodedBuffers = {};
      const totalScenes = directedResult.scenes.length;

      for (let i = 0; i < totalScenes; i++) {
        const scene = directedResult.scenes[i];
        const isSpeakerA = scene.speaker === plannedCharA.id;
        const charMeta = isSpeakerA ? plannedCharA : plannedCharB;

        setPipelineState(prev => ({
          ...prev,
          message: `[${i + 1}/${totalScenes}] "${charMeta.name}" 음성 합성 중...`,
          progress: 60 + Math.round(((i + 1) / totalScenes) * 35)
        }));

        try {
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: scene.dialogue,
              voice: charMeta.defaultVoice || 'ko-KR-SunHiNeural',
              rate: charMeta.rate || '+0%',
              pitch: charMeta.pitch || '+0Hz'
            })
          });

          if (ttsRes.ok) {
            const ttsData = await ttsRes.json();
            const audioUrl = ttsData.audioUrl;

            const audioFetch = await fetch(audioUrl);
            const arrayBuf = await audioFetch.arrayBuffer();
            const analyzed = await decodeAndAnalyzeAudio(ctx, arrayBuf);

            decodedBuffers[i] = analyzed;
            scenesWithAudio.push({
              ...scene,
              audioUrl,
              duration: analyzed.duration
            });
          } else {
            scenesWithAudio.push(scene);
          }
        } catch (err) {
          console.error(`Audio generation error scene ${i}:`, err);
          scenesWithAudio.push(scene);
        }
      }

      decodedAudioBuffersRef.current = decodedBuffers;

      const finalizedData = {
        ...directedResult,
        scenes: scenesWithAudio
      };
      setDirectedData(finalizedData);
      setCurrentSceneIndex(0);

      setPipelineState({
        isProducing: false,
        step: 4,
        message: '🎉 전자동 썰툰 완성! 무손실 립싱크 재생 시작',
        progress: 100
      });

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

      // Start playback automatically
      setTimeout(() => {
        playScene(0, finalizedData);
      }, 400);

    } catch (err) {
      console.error('Auto production error:', err);
      setPipelineState({
        isProducing: false,
        step: 0,
        message: `제작 오류: ${err.message}`,
        progress: 0
      });
    }
  };

  // Playback & Video Helpers
  const stopAudioPlayback = () => {
    if (sceneTimerRef.current) {
      clearTimeout(sceneTimerRef.current);
      sceneTimerRef.current = null;
    }
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current.disconnect();
      } catch (e) {}
      currentAudioSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const playScene = (index, data = directedData) => {
    if (!data || !data.scenes || !data.scenes[index]) return;

    stopAudioPlayback();
    const ctx = getAudioContext();
    setCurrentSceneIndex(index);

    const analyzed = decodedAudioBuffersRef.current[index];
    if (!analyzed) return;

    const source = ctx.createBufferSource();
    source.buffer = analyzed.audioBuffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = isMuted ? 0 : 1;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    if (audioDestRef.current) gainNode.connect(audioDestRef.current);

    playbackStartTimeRef.current = ctx.currentTime;
    currentAudioSourceRef.current = source;
    setIsPlaying(true);

    source.start(0);

    source.onended = () => {
      if (currentAudioSourceRef.current === source) {
        currentAudioSourceRef.current = null;
        const nextIndex = index + 1;
        if (nextIndex < data.scenes.length) {
          sceneTimerRef.current = setTimeout(() => {
            playScene(nextIndex, data);
          }, 250);
        } else {
          setIsPlaying(false);
          if (isRecording) stopRecording();
        }
      }
    };
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stopAudioPlayback();
    } else {
      if (directedData && directedData.scenes) {
        const targetIdx = currentSceneIndex < directedData.scenes.length ? currentSceneIndex : 0;
        playScene(targetIdx);
      }
    }
  };

  const wrapBubbleText = (ctx, text, maxChars = 15) => {
    if (text.length <= maxChars) return [text];
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const w of words) {
      if ((currentLine + ' ' + w).trim().length <= maxChars) {
        currentLine = (currentLine + ' ' + w).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);
    if (lines.length === 0) {
      for (let i = 0; i < text.length; i += maxChars) {
        lines.push(text.slice(i, i + maxChars));
      }
    }
    return lines;
  };

  // Real-Time Canvas Rendering Loop
  useEffect(() => {
    let animationId;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const now = Date.now();

      let currentAudioTime = 0;
      let energy = 0;
      const actx = audioContextRef.current;
      const analyzed = decodedAudioBuffersRef.current[currentSceneIndex];

      if (isPlaying && actx && analyzed) {
        currentAudioTime = actx.currentTime - playbackStartTimeRef.current;
        if (currentAudioTime >= 0 && currentAudioTime < analyzed.duration) {
          const frameIdx = Math.floor(currentAudioTime * 50);
          if (frameIdx < analyzed.envelope.length) {
            energy = analyzed.envelope[frameIdx];
          }
        }
      }

      ctx.clearRect(0, 0, width, height);
      const currentScene = directedData?.scenes?.[currentSceneIndex];

      // 1. Draw Background
      ctx.save();
      const bgImg = currentScene?.background && processedBackgrounds[currentScene.background];
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, width, height);
      } else {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, height * 0.72, width, height * 0.28);
      }
      ctx.restore();

      // Camera Shake
      ctx.save();
      if (currentScene?.camera === 'shake' && isPlaying && currentAudioTime < 0.35) {
        const shakeMag = 12 * (1 - currentAudioTime / 0.35);
        ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
      }

      // Camera Zoom
      if (currentScene?.camera === 'zoom_in_left') {
        ctx.translate(width * 0.24, height * 0.5);
        ctx.scale(1.12, 1.12);
        ctx.translate(-width * 0.24, -height * 0.5);
      } else if (currentScene?.camera === 'zoom_in_right') {
        ctx.translate(width * 0.76, height * 0.5);
        ctx.scale(1.12, 1.12);
        ctx.translate(-width * 0.76, -height * 0.5);
      }

      // 2. Render 2 Characters
      if (currentScene) {
        const leftCharId = currentScene.leftCharacter || plannedCharA.id;
        const rightCharId = currentScene.rightCharacter || plannedCharB.id;
        const activeSpeaker = currentScene.activeSpeaker;

        const leftProcessed = processedCharacters[leftCharId] || processedCharacters['sooyeon'];
        const rightProcessed = processedCharacters[rightCharId] || processedCharacters['mother'];

        const syllableFlap = Math.sin(currentAudioTime * Math.PI * 9);
        const isSpeaking = isPlaying && energy > 0.035 && syllableFlap > -0.25;
        const isBlinking = ((now % 3200) < 130);

        const baselineY = aspectRatio === '16:9' ? height * 0.94 : height * 0.76;
        const charScaleFactor = aspectRatio === '16:9' ? 0.62 : 0.44;
        const charH = height * charScaleFactor;

        // Left Character
        if (leftProcessed?.states) {
          ctx.save();
          const isLeftActive = activeSpeaker === 'left';
          const leftX = width * 0.24;
          let bounceY = isLeftActive && isSpeaking ? Math.sin(currentAudioTime * 18) * 6 : 0;
          if (!isLeftActive) {
            bounceY = Math.sin(now * 0.0025) * 3;
            ctx.filter = 'brightness(0.88)';
          }

          ctx.translate(leftX, baselineY + bounceY);
          ctx.scale(isLeftActive ? 1.05 : 0.95, isLeftActive ? 1.05 : 0.95);

          let stateCanvas;
          if (isLeftActive) {
            stateCanvas = isSpeaking
              ? (currentScene.emotion === 'laughing' || currentScene.emotion === 'angry' ? leftProcessed.states.mouthOpenEyesClosed : leftProcessed.states.mouthOpenEyesOpen)
              : (isBlinking ? leftProcessed.states.mouthClosedEyesClosed : leftProcessed.states.mouthClosedEyesOpen);
          } else {
            stateCanvas = isBlinking ? leftProcessed.states.mouthClosedEyesClosed : leftProcessed.states.mouthClosedEyesOpen;
          }

          if (stateCanvas) {
            const charW = (charH / stateCanvas.height) * stateCanvas.width;
            ctx.drawImage(stateCanvas, -charW / 2, -charH, charW, charH);
            if (isLeftActive) drawEmotionSticker(ctx, currentScene.visualEffect, 0, -charH * 0.96, now);
          }
          ctx.restore();
        }

        // Right Character
        if (rightProcessed?.states) {
          ctx.save();
          const isRightActive = activeSpeaker === 'right';
          const rightX = width * 0.76;
          let bounceY = isRightActive && isSpeaking ? Math.sin(currentAudioTime * 18) * 6 : 0;
          if (!isRightActive) {
            bounceY = Math.sin(now * 0.0025 + 1) * 3;
            ctx.filter = 'brightness(0.88)';
          }

          ctx.translate(rightX, baselineY + bounceY);
          ctx.scale(isRightActive ? -1.05 : -0.95, isRightActive ? 1.05 : 0.95);

          let stateCanvas;
          if (isRightActive) {
            stateCanvas = isSpeaking
              ? (currentScene.emotion === 'laughing' || currentScene.emotion === 'angry' ? rightProcessed.states.mouthOpenEyesClosed : rightProcessed.states.mouthOpenEyesOpen)
              : (isBlinking ? rightProcessed.states.mouthClosedEyesClosed : rightProcessed.states.mouthClosedEyesOpen);
          } else {
            stateCanvas = isBlinking ? rightProcessed.states.mouthClosedEyesClosed : rightProcessed.states.mouthClosedEyesOpen;
          }

          if (stateCanvas) {
            const charW = (charH / stateCanvas.height) * stateCanvas.width;
            ctx.drawImage(stateCanvas, -charW / 2, -charH, charW, charH);
            if (isRightActive) {
              ctx.save();
              ctx.scale(-1, 1);
              drawEmotionSticker(ctx, currentScene.visualEffect, 0, -charH * 0.96, now);
              ctx.restore();
            }
          }
          ctx.restore();
        }

        // 3. Webtoon Speech Bubble
        if (currentScene.dialogue && isPlaying) {
          const bubbleX = activeSpeaker === 'left' ? width * 0.25 : width * 0.75;
          const bubbleY = baselineY - charH - 65;
          drawWebtoonSpeechBubble(ctx, bubbleX, bubbleY, currentScene.dialogue, activeSpeaker);
        }

        // 4. Dramatic Sound Effect Tag
        if (currentScene.soundEffect && isPlaying && currentAudioTime < 0.75) {
          const sfxScale = 1 + Math.sin(currentAudioTime * 8) * 0.18;
          const sfxX = activeSpeaker === 'left' ? width * 0.44 : width * 0.56;
          const sfxY = height * 0.35;
          drawSoundEffectBanner(ctx, sfxX, sfxY, currentScene.soundEffect, sfxScale);
        }

        // 5. Bottom Subtitle Banner
        if (currentScene.subtitle) {
          drawBottomSubtitle(ctx, width, height, currentScene.subtitle, currentScene.speaker);
        }
      } else {
        drawIdleSplash(ctx, width, height);
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, directedData, currentSceneIndex, processedCharacters, processedBackgrounds, aspectRatio]);

  // Visual Effect Helpers
  const drawWebtoonSpeechBubble = (ctx, x, y, text, speakerSide) => {
    ctx.save();
    ctx.font = 'bold 22px "Pretendard", -apple-system, sans-serif';
    const lines = wrapBubbleText(ctx, text, 15);
    const lineHeight = 30;
    const bubbleH = Math.max(lines.length * lineHeight + 34, 75);

    let maxW = 0;
    for (const l of lines) {
      const m = ctx.measureText(l).width;
      if (m > maxW) maxW = m;
    }
    const bubbleW = Math.max(maxW + 48, 180);

    const bx = x - bubbleW / 2;
    const by = y - bubbleH / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.roundRect(bx + 4, by + 4, bubbleW, bubbleH, 20);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(bx, by, bubbleW, bubbleH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    const tailX = x + (speakerSide === 'left' ? -15 : 15);
    ctx.moveTo(tailX - 12, by + bubbleH - 1);
    ctx.lineTo(tailX, by + bubbleH + 20);
    ctx.lineTo(tailX + 12, by + bubbleH - 1);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tailX - 10, by + bubbleH - 3);
    ctx.lineTo(tailX + 10, by + bubbleH - 3);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
    ctx.restore();
  };

  const drawEmotionSticker = (ctx, effectType, x, y, now) => {
    ctx.save();
    ctx.translate(x, y);
    if (effectType === 'anger_vein') {
      const s = 1 + Math.sin(now * 0.015) * 0.22;
      ctx.scale(s, s);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-14, -14, 16, 0, Math.PI / 2);
      ctx.arc(14, -14, 16, Math.PI / 2, Math.PI);
      ctx.arc(14, 14, 16, Math.PI, Math.PI * 1.5);
      ctx.arc(-14, 14, 16, Math.PI * 1.5, Math.PI * 2);
      ctx.stroke();
    } else if (effectType === 'sweat') {
      const dropY = (now * 0.05) % 25;
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(25, -20 + dropY);
      ctx.quadraticCurveTo(45, 10 + dropY, 25, 20 + dropY);
      ctx.quadraticCurveTo(5, 10 + dropY, 25, -20 + dropY);
      ctx.fill();
      ctx.stroke();
    } else if (effectType === 'sparkle') {
      const rot = now * 0.003;
      ctx.rotate(rot);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(Math.cos((i * Math.PI) / 2) * 26, Math.sin((i * Math.PI) / 2) * 26);
        ctx.lineTo(Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 9, Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 9);
      }
      ctx.closePath();
      ctx.fill();
    } else if (effectType === 'question_mark') {
      const wobble = Math.sin(now * 0.01) * 8;
      ctx.font = '900 52px -apple-system, sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 7;
      ctx.strokeText('?', wobble, 0);
      ctx.fillText('?', wobble, 0);
    }
    ctx.restore();
  };

  const drawSoundEffectBanner = (ctx, x, y, text, scale) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(-0.06);
    ctx.font = '900 64px "Pretendard", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = '#fde047';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  const drawBottomSubtitle = (ctx, width, height, subtitle, speaker) => {
    ctx.save();
    const bannerH = 90;
    const bannerY = height - bannerH - 18;
    const bannerW = width * 0.90;
    const bannerX = (width - bannerW) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 16);
    ctx.fill();
    ctx.stroke();

    const isSpeakerA = speaker === plannedCharA.id;
    const name = isSpeakerA ? plannedCharA.name : plannedCharB.name;
    const badgeBg = isSpeakerA ? '#0369a1' : '#be123c';

    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(bannerX + 20, bannerY + 16, 130, 26, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.slice(0, 10), bannerX + 85, bannerY + 29);

    ctx.font = 'bold 26px "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeText(subtitle, width / 2, bannerY + 54);
    ctx.fillStyle = '#fef08a';
    ctx.fillText(subtitle, width / 2, bannerY + 54);
    ctx.restore();
  };

  const drawIdleSplash = (ctx, width, height) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 36px "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎬 Zero-Touch Ssul-toon Studio', width / 2, height / 2 - 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px "Pretendard", sans-serif';
    ctx.fillText('1단계 시나리오 창작 → 2단계 캐릭터 생성 → 3단계 영상 제작을 시작하세요!', width / 2, height / 2 + 30);
  };

  // Video Recording (.webm) Engine
  const startRecording = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    recordedChunksRef.current = [];
    const canvasStream = canvas.captureStream(30);

    let combinedStream = canvasStream;
    if (audioDestRef.current && audioDestRef.current.stream) {
      const audioTracks = audioDestRef.current.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
      }
    }

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

    const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 3000000 });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      setIsRecording(false);
      confetti({ particleCount: 100, spread: 80 });
    };

    mediaRecorderRef.current = recorder;
    recorder.start(200);
    setIsRecording(true);
    playScene(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const downloadRecordedVideo = () => {
    if (!recordedVideoUrl) return;
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `ssultoon_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-md">
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                원클릭 전자동 <span className="text-amber-400">썰툰 스튜디오</span>
              </h1>
              <span className="text-xs bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                AI Generative Studio
              </span>
            </div>
            <p className="text-xs text-slate-400">
              [1단계: 시나리오 창작] → [2단계: 캐릭터 시트 생성] → [3단계: 원클릭 영상 제작]
            </p>
          </div>
        </div>

        {/* Status Badges & Settings */}
        <div className="flex items-center space-x-3">
          {serverStatus.hasGeminiKey ? (
            <div className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gemini AI 연동 활성 (gemini-flash-latest)</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>스마트 로컬 연출기 모드</span>
            </div>
          )}

          <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
            <span className={`w-2.5 h-2.5 rounded-full ${serverStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span className="text-slate-300">
              {serverStatus.online ? '로컬 서버 & Edge-TTS 가동 중' : '서버 확인 필요'}
            </span>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="환경 설정"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center space-x-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>스튜디오 환경설정</span>
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white text-sm">
                닫기
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Google AI Studio에서 발급받은 API 키 입력"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleVerifyApiKey}
                disabled={keyVerifyStatus.testing}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition"
              >
                {keyVerifyStatus.testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                <span>{keyVerifyStatus.testing ? 'API 연결 검증 중...' : 'API 키 즉시 검증 및 연결 테스트'}</span>
              </button>

              {keyVerifyStatus.message && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold ${
                    keyVerifyStatus.success
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {keyVerifyStatus.message}
                </div>
              )}

              <p className="text-xs text-slate-400 leading-relaxed">
                💡 API Key를 등록하면 <strong>Google Gemini AI (gemini-flash-latest)</strong>가 시나리오를 심층 분석하여 더욱 다채롭고 생동감 넘치는 썰툰 연출 JSON을 자동 생성합니다.
              </p>
            </div>
            <button
              onClick={() => {
                if (geminiApiKey) localStorage.setItem('geminiApiKey', geminiApiKey);
                setShowSettings(false);
              }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition"
            >
              설정 저장
            </button>
          </div>
        </div>
      )}

      {/* 3-Step Interactive Navigation Stepper */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentStep === 1
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-950/20 flex items-center justify-center text-xs">1</span>
              <span>시나리오 AI 창작</span>
            </button>

            <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />

            <button
              onClick={() => setCurrentStep(2)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentStep === 2
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
              <span>캐릭터 시트 AI 생성</span>
            </button>

            <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />

            <button
              onClick={() => setCurrentStep(3)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentStep === 3
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-950/20 flex items-center justify-center text-xs">3</span>
              <span>원클릭 영상 제작</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 hidden md:block">
            {currentStep === 1 && '💡 원하는 주제를 입력하고 AI로 대본을 생성하세요.'}
            {currentStep === 2 && '🎨 대본에 맞는 맞춤형 4분할 캐릭터를 생성하세요.'}
            {currentStep === 3 && '🎬 더빙, 립싱크, 웹툰 연출이 자동 완성됩니다.'}
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3-Step Interactive Control Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-5 flex flex-col">
          {/* STEP 1: Scenario AI Generator */}
          {currentStep === 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>1단계: AI 시나리오 창작기</span>
                </h2>
                <span className="text-xs bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  Gemini Flash AI
                </span>
              </div>

              {/* Topic Input Box */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  만들고 싶은 썰툰 주제 (한 줄 입력)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={scenarioTopic}
                    onChange={(e) => setScenarioTopic(e.target.value)}
                    placeholder="예: 당근마켓 무료나눔 참교육 썰, 짠돌이 소개팅남..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleAiGenerateScenario}
                    disabled={isGeneratingScenario}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow transition"
                  >
                    {isGeneratingScenario ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    <span>{isGeneratingScenario ? '창작 중...' : '대본 생성'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Topic Suggestion Pills */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">인기 바이럴 추천 소재 (클릭 시 자동 입력):</label>
                <div className="flex flex-wrap gap-1.5">
                  {VIRAL_TOPIC_SUGGESTIONS.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => setScenarioTopic(sug)}
                      className="text-[11px] bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-300 transition"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generated Script Display & Edit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    생성된 대본 ({scenarioTitle})
                  </label>
                  <span className="text-[10px] text-slate-400">직접 수정 가능</span>
                </div>
                <textarea
                  value={scenarioText}
                  onChange={(e) => setScenarioText(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs leading-relaxed text-slate-200 focus:outline-none focus:border-amber-500 font-mono resize-none"
                />
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition"
              >
                <span>대본 확정하고 2단계(캐릭터 생성)로 이동</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          )}

          {/* STEP 2: Character Sheets & Webtoon Cast */}
          {currentStep === 2 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-1.5">
                  <Scissors className="w-4 h-4" />
                  <span>2단계: 고화질 썰툰 캐릭터 & 배경 캐스팅</span>
                </h2>
                <span className="text-xs bg-rose-500/15 text-rose-300 px-2 py-0.5 rounded-full font-bold border border-rose-500/30">
                  고화질 2x2 스프라이트
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                전문 썰툰 일러스트 캐릭터를 선택하거나, <strong>미드저니/달리/직접 그린 4분할 시트</strong>를 업로드하여 바로 적용할 수 있습니다.
              </p>

              {/* Character A Casting */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 flex items-center space-x-1.5">
                    <span>👑 주인공 캐릭터 (A):</span>
                    <span className="text-white">{plannedCharA.name}</span>
                  </span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">
                    {plannedCharA.role}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0 relative">
                    <img
                      src={`/characters/${plannedCharA.id}.png`}
                      alt={plannedCharA.name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => { e.target.src = '/characters/minwoo.png'; }}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] text-slate-400 block">캐릭터 프리셋 선택</label>
                    <select
                      value={plannedCharA.id}
                      onChange={(e) => {
                        const sel = characterList.find(c => c.id === e.target.value);
                        setPlannedCharA(prev => ({
                          ...prev,
                          id: e.target.value,
                          name: sel ? sel.name : prev.name
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                    >
                      {characterList.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="text-[11px] text-slate-400 hover:text-amber-400 cursor-pointer flex items-center space-x-1">
                    <span>📁 주인공 4분할 시트 직접 업로드:</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadCharacter(e, 'A')}
                      className="hidden"
                    />
                    <span className="text-xs text-amber-400 font-bold underline ml-1">파일 선택</span>
                  </label>
                </div>
              </div>

              {/* Character B Casting */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center space-x-1.5">
                    <span>⚡ 상대방/빌런 캐릭터 (B):</span>
                    <span className="text-white">{plannedCharB.name}</span>
                  </span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">
                    {plannedCharB.role}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0 relative">
                    <img
                      src={`/characters/${plannedCharB.id}.png`}
                      alt={plannedCharB.name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => { e.target.src = '/characters/sooyeon.png'; }}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] text-slate-400 block">캐릭터 프리셋 선택</label>
                    <select
                      value={plannedCharB.id}
                      onChange={(e) => {
                        const sel = characterList.find(c => c.id === e.target.value);
                        setPlannedCharB(prev => ({
                          ...prev,
                          id: e.target.value,
                          name: sel ? sel.name : prev.name
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                    >
                      {characterList.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="text-[11px] text-slate-400 hover:text-amber-400 cursor-pointer flex items-center space-x-1">
                    <span>📁 상대방 4분할 시트 직접 업로드:</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadCharacter(e, 'B')}
                      className="hidden"
                    />
                    <span className="text-xs text-amber-400 font-bold underline ml-1">파일 선택</span>
                  </label>
                </div>
              </div>

              {/* Background Selection */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">🏞️ 웹툰 배경 테마</span>
                  <label className="text-[11px] text-slate-400 hover:text-emerald-400 cursor-pointer">
                    <span>📁 배경 파일 업로드: </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadBackground}
                      className="hidden"
                    />
                    <span className="text-xs text-emerald-400 font-bold underline">파일 선택</span>
                  </label>
                </div>
                <select
                  value={selectedBackgroundTheme}
                  onChange={(e) => setSelectedBackgroundTheme(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value="cafe">인스타 감성 카페 (고화질 웹툰 배경 - 추천)</option>
                  <option value="livingroom">아파트 거실 배경</option>
                  <option value="street">도시 야경 길거리</option>
                  {backgroundList.filter(b => !['cafe', 'livingroom', 'street'].includes(b.id)).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    setCurrentStep(3);
                    confetti({ particleCount: 50, spread: 60 });
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-lg transition"
                >
                  <span>캐릭터 & 배경 확정하고 3단계(영상 제작)로 이동</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>

                <button
                  onClick={handleAiGenerateCharacterSheets}
                  disabled={isGeneratingCharacters}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition"
                >
                  {isGeneratingCharacters ? <RefreshCw className="w-4 h-4 animate-spin text-rose-400" /> : <Palette className="w-4 h-4 text-rose-400" />}
                  <span>{isGeneratingCharacters ? '시트 재생성 중...' : '🎨 AI 캐릭터 시트 재생성 및 갱신'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Video Production Master Button */}
          <div className="bg-gradient-to-br from-amber-500/20 via-rose-500/10 to-indigo-500/20 border border-amber-500/30 rounded-2xl p-5 shadow-2xl flex flex-col space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-400 flex items-center space-x-1.5">
                <Film className="w-4 h-4" />
                <span>3단계: 썰툰 애니메이션 완성 & 렌더링</span>
              </span>
              <span className="text-slate-400">Zero-Touch Engine</span>
            </div>

            <button
              onClick={startAutoProduction}
              disabled={pipelineState.isProducing}
              className={`w-full py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center space-x-3 shadow-xl transform transition active:scale-95 ${
                pipelineState.isProducing
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 hover:from-amber-400 hover:to-rose-400 shadow-amber-500/25 glow-amber'
              }`}
            >
              {pipelineState.isProducing ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>전자동 영상 제작 중...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-6 h-6" />
                  <span>🚀 3단계: 원클릭 영상 제작 (Produce Video)</span>
                </>
              )}
            </button>

            {pipelineState.step > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>{pipelineState.message}</span>
                  <span className="text-amber-400">{pipelineState.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                    style={{ width: `${pipelineState.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Canvas Animation Player & Video Exporter (7 cols) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          {/* Canvas Viewport */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col items-center">
            {/* Viewport Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-bold text-slate-200">
                  {directedData?.scenes?.[currentSceneIndex]
                    ? `Scene ${currentSceneIndex + 1} / ${directedData.scenes.length} - ${directedData.scenes[currentSceneIndex].speaker}`
                    : '라이브 캔버스 프리뷰'}
                </span>
              </div>

              {/* Aspect Ratio Switcher */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition ${
                    aspectRatio === '16:9' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>16:9 가로형</span>
                </button>
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition ${
                    aspectRatio === '9:16' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>9:16 쇼츠</span>
                </button>
              </div>
            </div>

            {/* Canvas Display */}
            <div className="w-full flex items-center justify-center p-3 overflow-hidden bg-slate-950/80 rounded-xl my-3">
              <canvas
                ref={canvasRef}
                width={aspectRatio === '16:9' ? 1280 : 720}
                height={aspectRatio === '16:9' ? 720 : 1280}
                className={`rounded-xl shadow-2xl border border-slate-800 max-h-[480px] w-auto object-contain transition-all ${
                  aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'
                }`}
              />
            </div>

            {/* Controls Bar */}
            <div className="w-full flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={togglePlayPause}
                  className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold transition shadow-md"
                  title={isPlaying ? '일시정지' : '재생'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={() => playScene(0)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="처음부터 다시 재생"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title={isMuted ? '음소거 해제' : '음소거'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Video Recording & Export */}
              <div className="flex items-center space-x-2">
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs animate-pulse transition shadow-lg"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white" />
                    <span>녹화 중지 (Stop)</span>
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={!directedData || !directedData.scenes}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs border border-slate-700 transition"
                  >
                    <Film className="w-4 h-4 text-rose-400" />
                    <span>동영상 녹화 (.webm)</span>
                  </button>
                )}

                {recordedVideoUrl && (
                  <button
                    onClick={downloadRecordedVideo}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>.webm 다운로드</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Scene Timeline Navigation */}
          {directedData?.scenes && directedData.scenes.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">대화 씬 타임라인 (클릭하여 이동)</span>
                <span className="text-slate-400">총 {directedData.scenes.length}개 컷</span>
              </div>

              <div className="flex space-x-2 overflow-x-auto pb-2 pt-1">
                {directedData.scenes.map((scene, idx) => (
                  <button
                    key={idx}
                    onClick={() => playScene(idx)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl border text-left transition flex flex-col space-y-1 min-w-[130px] ${
                      currentSceneIndex === idx
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-amber-400">#{idx + 1} {scene.speaker}</span>
                      <span className="text-[10px] text-slate-500">{scene.emotion}</span>
                    </div>
                    <span className="text-xs text-slate-200 truncate w-full">
                      {scene.dialogue}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
