import { numToChinese } from './util.js';

// 羽球／桌球／壁球共用的「單局分數競賽」規則引擎
// targetScore: 幾分獲勝, winBy: 需領先幾分, cap: 封頂分數（無則傳 null）
// bestOfGames: 幾戰幾勝, deciderSwitchAt: 決勝局中途換邊的分數門檻（無則傳 null）
export function createPointRaceEngine({ targetScore, winBy, cap, bestOfGames, deciderSwitchAt }) {
  const gamesToWin = Math.ceil(bestOfGames / 2);
  const other = (team) => (team === 'A' ? 'B' : 'A');

  function isGameWon(gameScore, team) {
    const t = gameScore[team];
    const o = gameScore[other(team)];
    if (cap && t >= cap) return true;
    return t >= targetScore && t - o >= winBy;
  }

  return {
    initState() {
      return {
        gameScore: { A: 0, B: 0 },
        gamesWon: { A: 0, B: 0 },
        matchOver: false,
        winner: null,
        deciderSwitched: false,
      };
    },

    addPoint(state, team) {
      if (state.matchOver) return { state, events: [] };
      const s = structuredClone(state);
      s.gameScore[team] += 1;
      const events = [];

      const isDecider = s.gamesWon.A === gamesToWin - 1 && s.gamesWon.B === gamesToWin - 1;
      if (
        isDecider &&
        deciderSwitchAt &&
        !s.deciderSwitched &&
        (s.gameScore.A >= deciderSwitchAt || s.gameScore.B >= deciderSwitchAt)
      ) {
        s.deciderSwitched = true;
        events.push({ type: 'side_switch' });
      }

      if (isGameWon(s.gameScore, team)) {
        s.gamesWon[team] += 1;
        s.gameScore = { A: 0, B: 0 };
        s.deciderSwitched = false;
        events.push({ type: 'game_won', winner: team });
        if (s.gamesWon[team] >= gamesToWin) {
          s.matchOver = true;
          s.winner = team;
          events.push({ type: 'match_won', winner: team });
        } else {
          events.push({ type: 'side_switch' });
        }
      }
      return { state: s, events };
    },

    subtractPoint(state, team) {
      if (state.matchOver) return { state, events: [] };
      const s = structuredClone(state);
      s.gameScore[team] = Math.max(0, s.gameScore[team] - 1);
      return { state: s, events: [] };
    },

    getDisplay(state) {
      return {
        A: { score: String(state.gameScore.A), sub: `局 ${state.gamesWon.A}` },
        B: { score: String(state.gameScore.B), sub: `局 ${state.gamesWon.B}` },
        isMatchOver: state.matchOver,
        winner: state.winner,
      };
    },

    getSpokenScore(state) {
      return `${numToChinese(state.gameScore.A)}比${numToChinese(state.gameScore.B)}`;
    },
  };
}
