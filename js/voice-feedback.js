// 雙打時，發球方每得一分（非扣分修正）都提醒輪換發球位置；
// 一局或整場結束時不疊加，那些情況本來就有自己的換邊/獲勝播報
export function shouldRemindRotation(events, { isDouble, isAdd } = {}) {
  if (!isDouble || !isAdd) return false;
  return !events.some((e) => e.type === 'game_won' || e.type === 'match_won');
}

// 羽球雙打精確版：組出「[隊伍]隊，換發球邊，左/右邊發球」，跟現有「請換邊」
// （兩隊互換場地端）刻意用不同詞，避免同一句裡「換邊」出現兩次卻意思不同
export function describeServeSide(event, teamNames) {
  const sideLabel = event.side === 'left' ? '左邊' : '右邊';
  const switchedPart = event.switched ? '，換發球邊' : '';
  return `${teamNames[event.team]}隊${switchedPart}，${sideLabel}發球`;
}

// 依比分事件組出要播報的中文句子
export function buildAnnouncement(match, events, teamNames, opts = {}) {
  const matchWon = events.find((e) => e.type === 'match_won');
  if (matchWon) return `比賽結束，${teamNames[matchWon.winner]}隊獲勝`;

  const gameWon = events.find((e) => e.type === 'game_won');
  if (gameWon) {
    let text = `這一局，${teamNames[gameWon.winner]}隊獲勝`;
    if (events.some((e) => e.type === 'side_switch')) text += '，請換邊';
    const gameWonServeSide = events.find((e) => e.type === 'serve_side');
    if (gameWonServeSide) text += `，${describeServeSide(gameWonServeSide, teamNames)}`;
    return text;
  }

  const serveSide = events.find((e) => e.type === 'serve_side');
  const rotationSuffix = serveSide
    ? `，${describeServeSide(serveSide, teamNames)}`
    : shouldRemindRotation(events, opts) ? '，請輪換發球位置' : '';

  if (events.some((e) => e.type === 'side_switch')) {
    return `${match.engine.getSpokenScore(match.getState(), teamNames)}，請換邊${rotationSuffix}`;
  }

  return `${match.engine.getSpokenScore(match.getState(), teamNames)}${rotationSuffix}`;
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

export function speak(text, { onEnd, onDebug } = {}) {
  const debug = (stage) => onDebug && onDebug(stage);
  let done = false;
  const finish = (reason) => {
    if (done) return;
    done = true;
    activeUtterance = null;
    debug(`finish:${reason}`);
    onEnd && onEnd();
  };

  if (!('speechSynthesis' in window)) {
    finish('no-speechSynthesis');
    return;
  }

  const synth = window.speechSynthesis;
  try {
    if (synth.speaking || synth.pending) synth.cancel();
  } catch (err) {
    finish('cancel-error');
    return;
  }

  debug(`scheduled voices=${synth.getVoices().length}`);
  setTimeout(() => {
    if (done) return;
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-TW';
      debug(`about-to-speak voices=${synth.getVoices().length}`);
      utter.onstart = () => debug('started');
      utter.onend = () => finish('onend');
      utter.onerror = () => finish('onerror');
      activeUtterance = utter;
      synth.speak(utter);
      debug('speak-called');
    } catch (err) {
      finish('speak-throw');
    }
  }, SPEAK_START_DELAY_MS);

  // 保險：萬一 onend/onerror 真的沒觸發，逾時就強制視為播報完成，
  // 避免收音模式因此永久卡在靜音狀態
  setTimeout(() => finish('watchdog'), SPEAK_WATCHDOG_MS);
}
