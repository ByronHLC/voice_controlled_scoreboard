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

const SPEAK_WATCHDOG_MS = 6000;

export function speak(text, { onEnd } = {}) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onEnd && onEnd();
  };

  try {
    if (!('speechSynthesis' in window)) {
      finish();
      return;
    }
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-TW';
    utter.onend = finish;
    utter.onerror = finish;
    synth.speak(utter);
  } catch (err) {
    finish();
    return;
  }

  // 保險：部分瀏覽器（尤其行動版 Safari）偶爾完全不觸發 onend/onerror，
  // 逾時就強制視為播報完成，避免收音模式因此永久卡在靜音狀態
  setTimeout(finish, SPEAK_WATCHDOG_MS);
}
