import { COLORS } from './colors.js';

// 「加一」語音辨識常會被聽成同音的「佳音」「佳醫」，一併視為加分指令
const ADD_WORDS = ['加一分', '加分', '加一', '加1分', '+1', '佳音', '佳醫'];
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

const SILENCE_WATCHDOG_MS = 5000;

export function createVoiceInput({ onCommand, onTranscript }) {
  let recognition = null;
  let active = false; // 使用者是否想要收音
  let muted = false; // 播報語音回饋時暫停收音，避免自我誤觸發
  let heardAnything = false; // 這次 start() 之後，瀏覽器有沒有回報過任何事件

  function buildRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = 'zh-TW';
    r.continuous = true;
    r.interimResults = false;
    r.onstart = () => {
      heardAnything = true;
      onTranscript('（收音中…請說話）');
    };
    r.onresult = (e) => {
      heardAnything = true;
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript;
      onTranscript(text);
      const command = parseCommand(text);
      if (command) onCommand(command);
    };
    r.onerror = (e) => {
      heardAnything = true;
      onTranscript(`（語音辨識錯誤：${e.error}）`);
    };
    r.onend = () => {
      if (active && !muted) {
        try {
          r.start();
        } catch (err) {
          onTranscript(`（自動重啟失敗：${err.message || err}）`);
        }
      }
    };
    return r;
  }

  function armSilenceWatchdog() {
    heardAnything = false;
    setTimeout(() => {
      if (active && !muted && !heardAnything) {
        onTranscript(
          '（沒有偵測到麥克風回應，請確認 Safari 網址列旁「aA」選單裡的網站設定已允許麥克風，或改用下方手動按鈕）'
        );
      }
    }, SILENCE_WATCHDOG_MS);
  }

  return {
    start() {
      if (!recognition) recognition = buildRecognition();
      if (!recognition) {
        onTranscript('此瀏覽器不支援語音辨識，請使用手動按鈕');
        return false;
      }
      active = true;
      armSilenceWatchdog();
      try {
        recognition.start();
      } catch (err) {
        onTranscript(`（無法啟動語音辨識：${err.message || err}）`);
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
