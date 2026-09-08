const assert = require('assert');
const Core = require('../src/ui/race-presentation-core.js');

assert.equal(Core.VERSION, 'V0.11.13');
assert.equal(Core.placementPresentation(1).headline, 'VICTORY');
assert.equal(Core.placementPresentation(2).headline, 'PODIUM');
assert.equal(Core.placementPresentation(3).label, 'P3');
assert.equal(Core.placementPresentation(99).label, 'P4');
assert.equal(Core.placementPresentation(-5).label, 'P1');

const final = Core.identity({
  id: 'pacific-crown-final', name: 'Pacific Crown Final', worldMode: 'open-sea', laps: 3, finale: true
});
assert.equal(final.finale, true);
assert.equal(final.laps, 3);
assert.equal(final.accent, Core.ACCENTS.final);

const hawaii = Core.identity({ id: 'waikiki-offshore', name: 'Waikīkī Offshore Sprint', worldMode: 'hawaii-coast', laps: 2 });
const taiwan = Core.identity({ id: 'qixingtan-bluewater', name: 'Qixingtan Bluewater Run', worldMode: 'taiwan-coast', laps: 2 });
assert.equal(hawaii.accent, Core.ACCENTS.hawaii);
assert.equal(taiwan.accent, Core.ACCENTS.taiwan);
assert.notEqual(hawaii.accent.accent, taiwan.accent.accent);

const standings = Core.sanitizeStandings([
  { id: 'coral', name: 'CORAL', finished: true, finishMs: 61000, lap: 2, nextCheckpointIndex: 0 },
  { id: 'player', name: 'YOU', finished: true, finishMs: 999, lap: 2, nextCheckpointIndex: 0 },
  { id: 'tide', name: 'TIDE', finished: false, lap: 2, nextCheckpointIndex: 5 },
  { id: 'mango', name: 'MANGO', finished: false, lap: 1, nextCheckpointIndex: 7 },
  { id: 'extra', name: 'EXTRA' }
], 62543);
assert.equal(standings.length, 4);
assert.equal(standings[0].place, 1);
assert.equal(standings[1].isPlayer, true);
assert.equal(standings[1].finishMs, 62543);
assert.deepEqual(Core.standingStatus(standings[1]), { type: 'time', value: 62543 });
assert.deepEqual(Core.standingStatus(standings[0]), { type: 'finished', value: 61000 });
assert.deepEqual(Core.standingStatus(standings[2]), { type: 'progress', lap: 2, gate: 5 });

assert.equal(Core.safeText('<b>RIVAL</b>', 'x', 6), '<b>RIV');
assert.equal(Core.safeText('', 'fallback', 20), 'fallback');

for (let i = 0; i < 20000; i++) {
  const place = Core.placementPresentation((i % 9) - 2);
  assert(place.place >= 1 && place.place <= 4);
  assert(place.label.length === 2);
  const event = Core.identity({
    id: i % 11 === 0 ? 'pacific-crown-final' : `event-${i}`,
    name: `Race ${i}`,
    worldMode: i % 3 === 0 ? 'hawaii-coast' : i % 3 === 1 ? 'taiwan-coast' : 'open-sea',
    laps: (i % 15) - 2,
    finale: i % 11 === 0
  });
  assert(event.laps >= 1 && event.laps <= 9);
  assert(/^#[0-9a-f]{6}$/i.test(event.accent.accent));

  const rows = Core.sanitizeStandings([
    { id: 'player', name: 'YOU', finished: true, lap: 1 + i % 3 },
    { id: 'rival', name: 'RIVAL', finished: i % 2 === 0, finishMs: 50000 + i, lap: 1 + i % 3, nextCheckpointIndex: i % 8 }
  ], 40000 + i);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].finishMs, 40000 + i);
  const status = Core.standingStatus(rows[1]);
  assert(['finished', 'progress'].includes(status.type));
}

console.log('V0.11.13 race presentation regression PASS');
