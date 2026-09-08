const assert = require('assert');
const Audio = require('../src/audio/audio-core.js');

assert.equal(Audio.VERSION, 'V0.11.7');
assert.deepEqual(Audio.sanitizePreferences({ master: 2, music: -1, ambience: 0.5 }), { master: 1, music: 0, ambience: 0.5 });

const menu = Audio.computeMix({ preferences: { master: 1, music: 1, ambience: 1 }, worldMode: 'open-sea', eventId: 'open-sea-circuit', phase: 'menu', speedRatio: 0, boostActive: false });
const race = Audio.computeMix({ preferences: { master: 1, music: 1, ambience: 1 }, worldMode: 'open-sea', eventId: 'open-sea-circuit', phase: 'racing', speedRatio: 1, boostActive: true });
assert(race.wind > menu.wind);
assert(race.music > menu.music);
assert(race.intensity >= 1);

const hawaii = Audio.atmosphereProfile('hawaii-coast', 'waikiki-offshore');
const qix = Audio.atmosphereProfile('taiwan-coast', 'qixingtan-bluewater');
const final = Audio.atmosphereProfile('open-sea', 'pacific-crown-final');
assert(hawaii.warmth > qix.warmth);
assert(qix.wind > hawaii.wind);
assert.equal(final.tension, 1);

for (let i = 0; i < 20000; i++) {
  const mix = Audio.computeMix({
    preferences: { master: (i % 101) / 100, music: ((i * 3) % 101) / 100, ambience: ((i * 7) % 101) / 100 },
    worldMode: ['open-sea','hawaii-coast','taiwan-coast','sun-moon-lake'][i % 4],
    eventId: i % 17 === 0 ? 'pacific-crown-final' : 'open-sea-circuit',
    phase: ['menu','preparing','countdown','racing','paused','finished','free-ride'][i % 7],
    speedRatio: (Math.sin(i * 0.013) + 1) * 0.5,
    boostActive: i % 11 === 0
  });
  for (const value of [mix.master,mix.wind,mix.ocean,mix.music,mix.warmth,mix.tension,mix.intensity]) assert(Number.isFinite(value) && value >= 0);
}

console.log('V0.11.7 audio atmosphere regression PASS');
