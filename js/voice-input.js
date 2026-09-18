import { COLORS } from './colors.js';

// 「加一」語音辨識常會被聽成同音字（佳音/佳醫），「一」也常被聽成得/的/壹，
// 這裡盡量把常見的誤判排列組合都涵蓋進去
const ADD_WORDS = [
  '加一分', '加一', '加分', '加1分', '加壹分', '加壹', '+1',
  '佳音', '佳醫', '加音', '加醫',
  '得一分', '得一', '得分', '得意分', '的一分', '的一', '低一分',
  '得壹分', '得壹', '得1分', '得1',
];
const SUB_WORDS = [
  '扣一分', '扣一', '扣分', '減一分', '減一', '減壹分', '扣壹分',
  '少一分', '少一', '剪一分', '扣意分', '苦一分',
];

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
// mute() 呼叫 recognition.stop() 後，iOS 實際釋放麥克風音訊工作階段所需的時間
// 並不固定，若在真正釋放前就開始播報，常會被系統直接靜音吞掉。因此改成等
// recognition 的 onend 事件（代表真的停了）才回呼；這個逾時只是防止 onend
// 萬一沒觸發時的保險，不是主要判斷依據。
const MUTE_STOP_WATCHDOG_MS = 800;

export function createVoiceInput({ onCommand, onTranscript }) {
  let recognition = null;
  let active = false; // 使用者是否想要收音
  // 有幾個「播報中」還沒恢復收音；用計數而非布林值，
  // 避免兩句語音指令幾乎重疊觸發時互相干擾（見下方 mute/unmute 說明）
  let muteDepth = 0;
  let heardAnything = false; // 這次 start() 之後，瀏覽器有沒有回報過任何事件
  let onStopConfirmed = null; // mute() 等待 recognition 真正停止時的回呼

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
      if (onStopConfirmed) {
        const cb = onStopConfirmed;
        onStopConfirmed = null;
        cb();
        return;
      }
      if (active && muteDepth === 0) {
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
      if (active && muteDepth === 0 && !heardAnything) {
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
      muteDepth = 0;
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
      muteDepth = 0;
      if (recognition) {
        try {
          recognition.stop();
        } catch (err) {
          // 已經是停止狀態，忽略
        }
      }
    },
    // 加分事件觸發播報前呼叫。用深度計數：如果已經有一個播報在等待恢復收音，
    // 這次只需要把計數加一，不用（也不能）再呼叫一次 recognition.stop()，
    // 否則兩句指令幾乎同時觸發時，第二次 stop() 會因為「已經是停止狀態」丟出
    // InvalidStateError，若沒接住就會讓收音永遠卡在靜音、再也不會恢復。
    // onStopped 會在麥克風真正停止（onend 事件）後才被呼叫，播報要等到那時候
    // 才開始，避免音訊工作階段還沒切回可播放狀態就講話而被系統靜音吞掉。
    mute(onStopped) {
      muteDepth += 1;
      if (muteDepth !== 1 || !recognition || !active) {
        onStopped && onStopped();
        return;
      }
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        onStopped && onStopped();
      };
      onStopConfirmed = settle;
      setTimeout(settle, MUTE_STOP_WATCHDOG_MS);
      try {
        recognition.stop();
      } catch (err) {
        // 已經是停止狀態，忽略；直接視為已停止
        onStopConfirmed = null;
        settle();
      }
    },
    // 播報結束後呼叫。只有在所有重疊的播報都結束（計數歸零）才真的恢復收音。
    unmute() {
      muteDepth = Math.max(0, muteDepth - 1);
      if (muteDepth === 0 && recognition && active) {
        try {
          recognition.start();
        } catch (err) {
          onTranscript(`（無法恢復收音：${err.message || err}）`);
        }
      }
    },
    isActive: () => active,
  };
}
