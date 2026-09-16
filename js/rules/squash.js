import { createPointRaceEngine } from './point-race.js';

// PAR 11分制、需領先2分、無封頂、五戰三勝；每局結束換邊，決勝局無中途換邊
export default createPointRaceEngine({
  targetScore: 11,
  winBy: 2,
  cap: null,
  bestOfGames: 5,
  deciderSwitchAt: null,
});
