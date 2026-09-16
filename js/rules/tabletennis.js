import { createPointRaceEngine } from './point-race.js';

// 11分制、需領先2分、無封頂、五戰三勝，決勝局5分換邊
export default createPointRaceEngine({
  targetScore: 11,
  winBy: 2,
  cap: null,
  bestOfGames: 5,
  deciderSwitchAt: 5,
});
