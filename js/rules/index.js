import badminton from './badminton.js';
import tabletennis from './tabletennis.js';
import squash from './squash.js';
import tennis from './tennis.js';

const ENGINES = { badminton, tabletennis, squash, tennis };

export function getEngine(sportId) {
  return ENGINES[sportId];
}
