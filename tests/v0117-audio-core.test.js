const assert = require('assert');
const Core = require('../src/audio/audio-core.js');

assert.equal(Core.VERSION, 'V0.11.7');
const defaults = Core.normalizeSettings();
assert(defaults.master > 0 && defaults.master <= 1);
assert(defaults.music > 0 && defaults.music <= 1);
assert(defaults.ambience > 0 && defaults.ambience <= 1);

const clamped = Core.normalizeSettings({ master: 4, music: -2, ambience: 0.5, muted: true });
assert.equal(clamped.master, 1);
assert.equal(clamped.music, 0);
assert.equal(clamped.ambience, 0.5);
assert.equal(clamped.muted, true);

const menu = Core.phaseMix('menu', { seaState: 'normal', speedRatio: 0 });
const race = Core.phaseMix('racing', { seaState: 'normal', speedRatio: 0.8 });
const paused = Core.phaseMix('paused', { seaState: 'normal', speedRatio: 0.8 });
const finalRace = Core.phaseMix('racing', { seaState: 'rough', speedRatio: 1, finale: true });
assert(race.music > menu.music);
assert(paused.music < race.music);
assert(paused.ambience < race.ambience);
assert(finalRace.music > race.music);
assert(finalRace.pulse > race.pulse);
assert(finalRace.wind >= race.wind);

const muted = Core.effectiveGains({ master: 1, music: 1, ambience: 1, muted: true }, race);
assert.equal(muted.master, 0);
assert.equal(muted.music, 0);
assert.equal(muted.ambience, 0);

assert.deepEqual(Core.chordAt(0, false), Core.CHORDS[0]);
assert.deepEqual(Core.chordAt(4, false), Core.CHORDS[0]);
assert.deepEqual(Core.chordAt(0, true), Core.FINAL_CHORDS[0]);
assert.notDeepEqual(Core.chordAt(0, true), Core.chordAt(0, false));
assert(Core.worldTone('hawaii-coast').windHz !== Core.worldTone('taiwan-coast').windHz);

for (let i = 0; i < 20000; i++) {
  const phases = ['menu', 'preparing', 'countdown', 'racing', 'paused', 'finished', 'free-ride'];
  const mix = Core.phaseMix(phases[i % phases.length], {
    seaState: i % 3 === 0 ? 'rough' : 'normal',
    speedRatio: Math.abs(Math.sin(i * 0.011)),
    finale: i % 7 === 0
  });
  const gains = Core.effectiveGains({
    master: (i % 101) / 100,
    music: ((i * 3) % 101) / 100,
    ambience: ((i * 7) % 101) / 100,
    muted: false
  }, mix);
  for (const value of Object.values(mix)) {
    if (typeof value === 'number') assert(Number.isFinite(value));
  }
  for (const value of Object.values(gains)) {
    assert(Number.isFinite(value));
    assert(value >= 0 && value <= 1);
  }
  const chord = Core.chordAt(i, i % 2 === 0);
  assert.equal(chord.length, 3);
  assert(chord.every(Number.isFinite));
}

console.log('V0.11.7 audio policy regression PASS');
