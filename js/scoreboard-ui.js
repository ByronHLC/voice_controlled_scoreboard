export function render(match, teamNames) {
  const state = match.getState();
  const display = match.engine.getDisplay(state);

  document.getElementById('team-a-label').textContent = `${teamNames.A}隊`;
  document.getElementById('team-b-label').textContent = `${teamNames.B}隊`;
  document.getElementById('score-a').textContent = display.A.score;
  document.getElementById('score-b').textContent = display.B.score;
  document.getElementById('sub-a').textContent = display.A.sub;
  document.getElementById('sub-b').textContent = display.B.sub;

  const banner = document.getElementById('match-over-banner');
  if (display.isMatchOver) {
    banner.textContent = `比賽結束：${teamNames[display.winner]}隊獲勝`;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

export function showTranscript(text) {
  document.getElementById('transcript').textContent = text;
}

const ROTATION_BANNER_MS = 3000;
let rotationHideTimer = null;

// 雙打輪換提醒是「這一下動作」的一次性通知，不是能從 match state 推導的
// 持久狀態，所以用命令式呼叫顯示、自動淡出，而不是像 render() 那樣每次都重算
export function showRotationReminder(text) {
  const el = document.getElementById('rotation-banner');
  clearTimeout(rotationHideTimer);
  if (!text) {
    el.classList.add('hidden');
    return;
  }
  el.textContent = text;
  el.classList.remove('hidden');
  rotationHideTimer = setTimeout(() => el.classList.add('hidden'), ROTATION_BANNER_MS);
}
