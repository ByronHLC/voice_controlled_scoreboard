import { createPointRaceEngine } from './point-race.js';

// 21分制、需領先2分、30分封頂、三戰兩勝，決勝局11分換邊
export default createPointRaceEngine({
  targetScore: 21,
  winBy: 2,
  cap: 30,
  bestOfGames: 3,
  deciderSwitchAt: 11,
});
