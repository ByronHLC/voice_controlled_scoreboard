import { COLORS, colorById } from './colors.js';
import { createMatch } from './match-state.js';
import { render as renderScoreboard, showTranscript, showRotationReminder } from './scoreboard-ui.js';
import { createVoiceInput } from './voice-input.js';
import { buildAnnouncement, shouldRemindRotation, speak } from './voice-feedback.js';
import { createMicMeter } from './mic-meter.js';

const SPORT_LABELS = { badminton: '羽球', tabletennis: '桌球', squash: '壁球', tennis: '網球' };
const MODE_LABELS = { single: '單打', double: '雙打' };

const setupScreen = document.getElementById('setup-screen');
const scoreboardScreen = document.getElementById('scoreboard-screen');
const teamAColorSelect = document.getElementById('team-a-color');
const teamBColorSelect = document.getElementById('team-b-color');
const setupError = document.getElementById('setup-error');
const startBtn = document.getElementById('start-match-btn');
const undoBtn = document.getElementById('undo-btn');
const resetBtn = document.getElementById('reset-btn');
const voiceToggleBtn = document.getElementById('voice-toggle-btn');

const debugLogEl = document.getElementById('debug-log');
function logDebug(msg) {
  const time = new Date().toISOString().slice(11, 23);
  debugLogEl.textContent += `${time} ${msg}\n`;
  debugLogEl.scrollTop = debugLogEl.scrollHeight;
}

// iOS Safari 的語音清單是非同步載入的，剛載入頁面時常常是空的；
// 提早呼叫一次 getVoices() 觸發載入，並記錄 voiceschanged 時機方便比對
if ('speechSynthesis' in window) {
  logDebug(`voices-on-load voices=${window.speechSynthesis.getVoices().length}`);
  window.speechSynthesis.onvoiceschanged = () => {
    logDebug(`voiceschanged voices=${window.speechSynthesis.getVoices().length}`);
  };
}

let match = null;
let teamNames = null; // { A: '藍', B: '紅' }
let colorIds = null; // { A: 'blue', B: 'red' }
let isDoubleMode = false;

function populateColorSelects() {
  for (const select of [teamAColorSelect, teamBColorSelect]) {
    select.innerHTML = '';
    for (const c of COLORS) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.label;
      select.appendChild(opt);
    }
  }
  teamAColorSelect.value = 'blue';
  teamBColorSelect.value = 'red';
}
populateColorSelects();

const micTestBtn = document.getElementById('mic-test-btn');
const micMeterFill = document.getElementById('mic-meter-fill');
const micMeter = createMicMeter({
  onLevel: (level) => {
    micMeterFill.style.width = `${Math.round(level * 100)}%`;
  },
  onError: (err) => {
    alert(`無法開啟麥克風：${err.message || err}`);
  },
});
let micTesting = false;
micTestBtn.addEventListener('click', async () => {
  if (micTesting) {
    micMeter.stop();
    micTesting = false;
    micTestBtn.textContent = '測試麥克風音量';
    micMeterFill.style.width = '0%';
    return;
  }
  const ok = await micMeter.start();
  if (ok) {
    micTesting = true;
    micTestBtn.textContent = '停止測試';
  }
});

const voiceInput = createVoiceInput({
  onTranscript: (text) => showTranscript(`聽到：${text}`),
  onCommand: (command) => {
    const team = colorIds.A === command.colorId ? 'A' : colorIds.B === command.colorId ? 'B' : null;
    if (!team) {
      showTranscript(`（${colorById(command.colorId)?.label ?? ''}隊未在本場比賽中，已忽略）`);
      return;
    }
    applyAction(team, command.delta, 'voice');
  },
});

// iOS Safari 的 speechSynthesis 第一次播報要在使用者點擊事件裡「同步」呼叫，
// 才會把整個分頁後續的播報權限解鎖；經過 setTimeout 或等待其他非同步流程
// 再呼叫，常常會被系統悄悄擋掉。這裡用一個無聲的假播報，在真正的點擊事件
// 裡搶先解鎖，之後不管語音還是按鈕觸發的播報才會穩定出聲。
function unlockSpeech() {
  if (!('speechSynthesis' in window)) return;
  try {
    const utter = new SpeechSynthesisUtterance(' ');
    utter.volume = 0;
    utter.onstart = () => logDebug('unlock:started');
    utter.onend = () => logDebug('unlock:onend');
    utter.onerror = () => logDebug('unlock:onerror');
    window.speechSynthesis.speak(utter);
    logDebug('unlock:speak-called');
  } catch (err) {
    logDebug(`unlock:throw ${err.message || err}`);
  }
}

startBtn.addEventListener('click', () => {
  unlockSpeech();
  const sport = document.getElementById('sport-select').value;
  const mode = document.getElementById('mode-select').value;
  isDoubleMode = mode === 'double';
  const aColor = teamAColorSelect.value;
  const bColor = teamBColorSelect.value;

  if (aColor === bColor) {
    setupError.textContent = '兩隊顏色不能相同';
    setupError.classList.remove('hidden');
    return;
  }
  setupError.classList.add('hidden');

  colorIds = { A: aColor, B: bColor };
  teamNames = { A: colorById(aColor).label, B: colorById(bColor).label };
  match = createMatch(sport);

  document.getElementById('panel-a').style.background = colorById(aColor).hex;
  document.getElementById('panel-b').style.background = colorById(bColor).hex;
  document.getElementById('mode-badge').textContent = `${SPORT_LABELS[sport]} · ${MODE_LABELS[mode]}`;
  showTranscript('');

  setupScreen.classList.add('hidden');
  scoreboardScreen.classList.remove('hidden');
  renderScoreboard(match, teamNames);
});

document.querySelectorAll('.controls button').forEach((btn) => {
  btn.addEventListener('click', () => {
    applyAction(btn.dataset.team, Number(btn.dataset.delta), 'button');
  });
});

undoBtn.addEventListener('click', () => {
  if (match && match.undo()) {
    renderScoreboard(match, teamNames);
  }
});

resetBtn.addEventListener('click', () => {
  if (!confirm('確定要重新開始嗎？目前比分會消失')) return;
  voiceInput.stop();
  voiceToggleBtn.textContent = '開啟收音模式';
  scoreboardScreen.classList.add('hidden');
  setupScreen.classList.remove('hidden');
});

voiceToggleBtn.addEventListener('click', () => {
  if (voiceInput.isActive()) {
    voiceInput.stop();
    voiceToggleBtn.textContent = '開啟收音模式';
  } else {
    unlockSpeech();
    const ok = voiceInput.start();
    if (ok) voiceToggleBtn.textContent = '關閉收音模式';
  }
});

function applyAction(team, delta, source) {
  if (!match) return;
  const events = delta > 0 ? match.addPoint(team) : match.subtractPoint(team);
  renderScoreboard(match, teamNames);

  const rotationOpts = { isDouble: isDoubleMode, isAdd: delta > 0 };
  const text = buildAnnouncement(match, events, teamNames, rotationOpts);
  showRotationReminder(shouldRemindRotation(events, rotationOpts) ? '請輪換發球位置' : null);
  logDebug(`applyAction[${source}] ${team} ${delta} -> "${text}"`);
  voiceInput.mute((reason) => {
    logDebug(`mute:confirmed:${reason}`);
    speak(text, {
      onEnd: () => voiceInput.unmute(),
      onDebug: (stage) => logDebug(`speak:${stage}`),
    });
  });

  if (events.some((e) => e.type === 'match_won')) {
    voiceInput.stop();
    voiceToggleBtn.textContent = '開啟收音模式';
  }
}
