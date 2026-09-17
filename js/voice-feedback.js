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

const SPEAK_WATCHDOG_MS = 2000;
// 剛停止收音（麥克風關閉）的瞬間，iOS 的音訊工作階段還停留在錄音模式，
// 這時候立刻播報常會被系統直接靜音、不出聲也不報錯。延遲一小段時間
// 讓系統先切到播放模式，再真正開始播報。
const SPEAK_START_DELAY_MS = 150;

// 瀏覽器不會保證在播報期間持續持有 utterance 物件，若沒有另外保留參考，
// 有些瀏覽器（尤其行動版）會提前把它回收，導致 onend/onerror 完全不觸發。
// 用模組變數保留參考，播報完再釋放。
let activeUtterance = null;

export function speak(text, { onEnd } = {}) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    activeUtterance = null;
    onEnd && onEnd();
  };

  if (!('speechSynthesis' in window)) {
    finish();
    return;
  }

  const synth = window.speechSynthesis;
  try {
    if (synth.speaking || synth.pending) synth.cancel();
  } catch (err) {
    finish();
    return;
  }

  setTimeout(() => {
    if (done) return;
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-TW';
      utter.onend = finish;
      utter.onerror = finish;
      activeUtterance = utter;
      synth.speak(utter);
    } catch (err) {
      finish();
    }
  }, SPEAK_START_DELAY_MS);

  // 保險：萬一 onend/onerror 真的沒觸發，逾時就強制視為播報完成，
  // 避免收音模式因此永久卡在靜音狀態
  setTimeout(finish, SPEAK_WATCHDOG_MS);
}
