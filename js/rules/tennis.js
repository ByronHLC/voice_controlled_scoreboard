import { numToChinese } from './util.js';

// 單盤網球：分/局兩層，deuce/advantage，6局勝且需領先2局，6-6搶七
const POINT_WORDS = ['零', '十五', '三十', '四十'];

function other(team) {
  return team === 'A' ? 'B' : 'A';
}

function checkGameWinner(points) {
  if (points.A >= 4 && points.A - points.B >= 2) return 'A';
  if (points.B >= 4 && points.B - points.A >= 2) return 'B';
  return null;
}

export default {
  initState() {
    return {
      games: { A: 0, B: 0 },
      points: { A: 0, B: 0 },
      inTiebreak: false,
      tiebreak: { A: 0, B: 0 },
      matchOver: false,
      winner: null,
    };
  },

  addPoint(state, team) {
    if (state.matchOver) return { state, events: [] };
    const s = structuredClone(state);
    const events = [];

    if (s.inTiebreak) {
      s.tiebreak[team] += 1;
      const a = s.tiebreak.A;
      const b = s.tiebreak.B;
      const tbWinner = a >= 7 && a - b >= 2 ? 'A' : b >= 7 && b - a >= 2 ? 'B' : null;
      if (tbWinner) {
        s.games[tbWinner] += 1;
        s.inTiebreak = false;
        s.matchOver = true;
        s.winner = tbWinner;
        events.push({ type: 'game_won', winner: tbWinner });
        events.push({ type: 'match_won', winner: tbWinner });
      } else if ((a + b) % 6 === 0) {
        events.push({ type: 'side_switch' });
      }
      return { state: s, events };
    }

    s.points[team] += 1;
    const winner = checkGameWinner(s.points);
    if (winner) {
      s.games[winner] += 1;
      s.points = { A: 0, B: 0 };
      events.push({ type: 'game_won', winner });

      const gA = s.games.A;
      const gB = s.games.B;
      if ((gA >= 6 && gA - gB >= 2) || (gB >= 6 && gB - gA >= 2)) {
        s.matchOver = true;
        s.winner = winner;
        events.push({ type: 'match_won', winner });
      } else if (gA === 6 && gB === 6) {
        s.inTiebreak = true;
        s.tiebreak = { A: 0, B: 0 };
        events.push({ type: 'side_switch' });
      } else if ((gA + gB) % 2 === 1) {
        events.push({ type: 'side_switch' });
      }
    }
    return { state: s, events };
  },

  subtractPoint(state, team) {
    if (state.matchOver) return { state, events: [] };
    const s = structuredClone(state);
    if (s.inTiebreak) {
      s.tiebreak[team] = Math.max(0, s.tiebreak[team] - 1);
    } else {
      s.points[team] = Math.max(0, s.points[team] - 1);
    }
    return { state: s, events: [] };
  },

  getDisplay(state) {
    const fmt = (team) => {
      if (state.inTiebreak) return String(state.tiebreak[team]);
      const p = state.points[team];
      const o = state.points[other(team)];
      if (p >= 3 && o >= 3) {
        if (p === o) return '平分';
        return p > o ? '佔先' : '四十';
      }
      return POINT_WORDS[Math.min(p, 3)];
    };
    return {
      A: { score: fmt('A'), sub: `局 ${state.games.A}` },
      B: { score: fmt('B'), sub: `局 ${state.games.B}` },
      isMatchOver: state.matchOver,
      winner: state.winner,
    };
  },

  getSpokenScore(state, teamNames) {
    if (state.inTiebreak) {
      return `搶七，${numToChinese(state.tiebreak.A)}比${numToChinese(state.tiebreak.B)}`;
    }
    const a = state.points.A;
    const b = state.points.B;
    if (a >= 3 && b >= 3) {
      if (a === b) return '平分';
      const leader = a > b ? 'A' : 'B';
      return `${teamNames[leader]}隊佔先`;
    }
    return `${POINT_WORDS[Math.min(a, 3)]}比${POINT_WORDS[Math.min(b, 3)]}`;
  },
};
