import { COLORS } from './colors.js';

const ADD_WORDS = ['加一分', '加分', '加一', '加1分'];
const SUB_WORDS = ['扣一分', '扣分', '減一分', '扣一', '減一'];

// 從一句逐字稿判斷「哪個顏色隊」「加分還是扣分」，抓不到就回傳 null
export function parseCommand(text) {
  const t = text.replace(/\s/g, '');
  let colorId = null;
  for (const c of COLORS) {
    if (c.voice.some((v) => t.includes(v))) {
      colorId = c.id;
      break;
    }
  }
  if (!colorId) return null;
  if (SUB_WORDS.some((w) => t.includes(w))) return { colorId, delta: -1 };
  if (ADD_WORDS.some((w) => t.includes(w))) return { colorId, delta: 1 };
  return null;
}

export function createVoiceInput({ onCommand, onTranscript }) {
  let recognition = null;
  let active = false; // 使用者是否想要收音
  let muted = false; // 播報語音回饋時暫停收音，避免自我誤觸發

  function buildRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = 'zh-TW';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript;
      onTranscript(text);
      const command = parseCommand(text);
      if (command) onCommand(command);
    };
    r.onerror = () => {};
    r.onend = () => {
      if (active && !muted) {
        try {
          r.start();
        } catch (err) {
          // 部分瀏覽器對「已在執行中」重複呼叫 start() 會丟例外，忽略即可
        }
      }
    };
    return r;
  }

  return {
    start() {
      if (!recognition) recognition = buildRecognition();
      if (!recognition) {
        onTranscript('此瀏覽器不支援語音辨識，請使用手動按鈕');
        return false;
      }
      active = true;
      try {
        recognition.start();
      } catch (err) {
        // 忽略重複啟動造成的例外
      }
      return true;
    },
    stop() {
      active = false;
      if (recognition) recognition.stop();
    },
    mute() {
      muted = true;
      if (recognition && active) recognition.stop();
    },
    unmute() {
      muted = false;
      if (recognition && active) {
        try {
          recognition.start();
        } catch (err) {
          // 忽略重複啟動造成的例外
        }
      }
    },
    isActive: () => active,
  };
}
