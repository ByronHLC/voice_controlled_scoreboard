import { createPointRaceEngine } from './point-race.js';

// 21分制、需領先2分、30分封頂、三戰兩勝，決勝局11分換邊
const base = createPointRaceEngine({
  targetScore: 21,
  winBy: 2,
  cap: 30,
  bestOfGames: 3,
  deciderSwitchAt: 11,
});

// 正式羽球規則：發球方自己這一局的分數偶數（含0）站右邊、奇數站左邊
function sideForScore(score) {
  return score % 2 === 0 ? 'right' : 'left';
}

// 雙打發球邊追蹤：贏得這一分的隊伍下一分就發球，站位由牠剛得分後的分數奇偶決定，
// 同一隊連續得分也會自動算出要換邊。一局結束當下 gameScore 已被重置成 0，
// 所以贏下最後一分那隊算出來的邊自然就是下一局開局的右邊，不需要跨局特別處理。
export default {
  ...base,
  initState(opts = {}) {
    return {
      ...base.initState(),
      isDouble: Boolean(opts.isDouble),
      lastSide: opts.isDouble ? (opts.firstServeSide || 'right') : null,
    };
  },
  addPoint(state, team) {
    const result = base.addPoint(state, team);
    if (!state.isDouble) return result;
    const side = sideForScore(result.state.gameScore[team]);
    const switched = side !== state.lastSide;
    return {
      state: { ...result.state, lastSide: side },
      events: [...result.events, { type: 'serve_side', team, side, switched }],
    };
  },
};
