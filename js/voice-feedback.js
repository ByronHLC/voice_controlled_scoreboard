// 依比分事件組出要播報的中文句子
export function buildAnnouncement(match, events, teamNames) {
  const matchWon = events.find((e) => e.type === 'match_won');
  if (matchWon) return `比賽結束，${teamNames[matchWon.winner]}隊獲勝`;

  const gameWon = events.find((e) => e.type === 'game_won');
  if (gameWon) {
    let text = `這一局，${teamNames[gameWon.winner]}隊獲勝`;
    if (events.some((e) => e.type === 'side_switch')) text += '，請換邊';
    return text;
  }

  if (events.some((e) => e.type === 'side_switch')) {
    return `${match.engine.getSpokenScore(match.getState(), teamNames)}，請換邊`;
  }

  return match.engine.getSpokenScore(match.getState(), teamNames);
}

export function speak(text, { onEnd } = {}) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-TW';
  utter.onend = () => onEnd && onEnd();
  utter.onerror = () => onEnd && onEnd();
  window.speechSynthesis.speak(utter);
}
