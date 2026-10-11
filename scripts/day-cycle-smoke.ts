import assert from 'node:assert/strict';
import { createInitialState, processEndDay } from '../services/gameLogic';

// Pure game-logic smoke test: process multiple consecutive day transitions
// without React Native UI or device-specific APIs.
let state = createInitialState();
const firstDay = state.gun;

for (let i = 1; i <= 10; i += 1) {
  const before = state.gun;
  const { newState, result } = processEndDay(state);

  assert.equal(newState.gun, before + 1, `day ${i}: state must advance exactly one day`);
  assert.equal(result.gun, before, `day ${i}: report must refer to the day that just ended`);
  assert.ok(Number.isFinite(newState.nakit), `day ${i}: cash must remain finite`);
  assert.ok(Number.isFinite(newState.memnuniyet), `day ${i}: satisfaction must remain finite`);
  assert.ok(Array.isArray(newState.bugunRezervasyonlar), `day ${i}: reservations must remain an array`);

  state = newState;
}

assert.equal(state.gun, firstDay + 10, 'ten transitions must advance the game by ten days');
console.log(`DAY_CYCLE_SMOKE_OK: ${firstDay} -> ${state.gun} (10 transitions)`);
