const assert = require('assert');
const Audio = require('../src/audio/audio-core.js');

assert.equal(Audio.VERSION, 'V0.11.16-T13');
assert.deepEqual(
  Audio.sanitizePreferences({ master: 2, music: -1, ambience: 0.5, effects: 9 }),
  { master: 1, music: 0, ambience: 0.5, effects: 1 }
);
assert.equal(Audio.sanitizePreferences({}).effects, Audio.DEFAULT_PREFS.effects);

const menu = Audio.computeMix({
  preferences: { master: 1, music: 1, ambience: 1, effects: 1 },
  worldMode: 'open-sea', eventId: 'open-sea-circuit', phase: 'menu',
  speedRatio: 0, boostActive: false
});
const race = Audio.computeMix({
  preferences: { master: 1, music: 1, ambience: 1, effects: 1 },
  worldMode: 'open-sea', eventId: 'open-sea-circuit', phase: 'racing',
  speedRatio: 1, boostActive: true
});
assert(race.wind > menu.wind);
assert(race.music > menu.music);
assert(race.engine > menu.engine);
assert(race.waterRush > menu.waterRush);
assert(race.effects > 0);
assert(race.intensity >= 1);

const idleEngine = Audio.engineProfile(0, 0, false);
const fastEngine = Audio.engineProfile(1, 1, false);
const boostEngine = Audio.engineProfile(1, 1, true);
assert(fastEngine.fundamentalHz > idleEngine.fundamentalHz);
assert(fastEngine.filterHz > idleEngine.filterHz);
assert(boostEngine.fundamentalHz > fastEngine.fundamentalHz);
assert(boostEngine.waterGain > fastEngine.waterGain);

for (const type of ['countdown','go','checkpoint','lap','final-lap','finish','boost']) {
  const cue = Audio.cueProfile(type);
  assert(Array.isArray(cue.tones) && cue.tones.length >= 1);
  assert(cue.duration > 0 && cue.gain > 0);
}

const hawaii = Audio.atmosphereProfile('hawaii-coast', 'waikiki-offshore');
const qix = Audio.atmosphereProfile('taiwan-coast', 'qixingtan-bluewater');
const final = Audio.atmosphereProfile('open-sea', 'pacific-crown-final');
assert(hawaii.warmth > qix.warmth);
assert(qix.wind > hawaii.wind);
assert.equal(final.tension, 1);

for (let i = 0; i < 20000; i++) {
  const mix = Audio.computeMix({
    preferences: {
      master: (i % 101) / 100,
      music: ((i * 3) % 101) / 100,
      ambience: ((i * 7) % 101) / 100,
      effects: ((i * 11) % 101) / 100
    },
    worldMode: ['open-sea','hawaii-coast','taiwan-coast','sun-moon-lake'][i % 4],
    eventId: i % 17 === 0 ? 'pacific-crown-final' : 'open-sea-circuit',
    phase: ['menu','preparing','countdown','racing','paused','finished','free-ride'][i % 7],
    speedRatio: (Math.sin(i * 0.013) + 1) * 0.5,
    boostActive: i % 11 === 0
  });
  for (const value of [
    mix.master,mix.wind,mix.ocean,mix.music,mix.effects,mix.engine,mix.waterRush,mix.sfx,
    mix.warmth,mix.tension,mix.intensity
  ]) assert(Number.isFinite(value) && value >= 0);
}

console.log('V0.11.16 T13 race audio regression PASS');
