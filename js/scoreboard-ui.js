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
