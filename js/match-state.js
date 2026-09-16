import { getEngine } from './rules/index.js';

export function createMatch(sportId) {
  const engine = getEngine(sportId);
  let state = engine.initState();
  const history = [];

  return {
    engine,
    getState: () => state,

    addPoint(team) {
      history.push(structuredClone(state));
      const result = engine.addPoint(state, team);
      state = result.state;
      return result.events;
    },

    subtractPoint(team) {
      history.push(structuredClone(state));
      const result = engine.subtractPoint(state, team);
      state = result.state;
      return result.events;
    },

    undo() {
      if (history.length === 0) return false;
      state = history.pop();
      return true;
    },
  };
}
