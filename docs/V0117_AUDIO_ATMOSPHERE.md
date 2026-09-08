# V0.11.7 — Audio / Atmosphere / Music

Status: engineering candidate; browser/Safari listening acceptance pending.

## Goal

Add a continuous emotional audio layer without importing unverified music or sample assets and without changing gameplay/physics authority.

## Procedural soundscape

The new runtime uses Web Audio only:

- filtered procedural wind noise
- filtered procedural ocean bed
- two-oscillator ambient tonal pad
- phase/world-aware filtering and gain

No external MP3/WAV/OGG files are shipped by V0.11.7.

Existing V0.11.0 countdown/checkpoint/finish tones and V0.11.2 engine/jet/Boost audio remain in place. V0.11.7 provides the background atmosphere/music layer rather than replacing those gameplay cues.

## Context mix

World profiles:

- Open Sea — broad ocean + medium wind
- Waikīkī — warmer, softer wind
- Qixingtan — stronger airy/wind presence
- Sun Moon Lake — quieter atmosphere
- Pacific Crown Final — maximum tension / stronger ocean and wind

Race phase profiles:

- menu — restrained music/ambience
- preparing/countdown — rising mix
- racing — full mix
- paused — strongly reduced
- finished — moderate result ambience
- free ride — strongest ambience, lighter music

Speed and Boost increase wind/intensity without changing any movement values.

## Settings

Start/Pause menus gain an Audio button with browser-local sliders:

- Master
- Music
- Ocean / Wind

Storage key:

`swimRing.audio.v0117`

## Browser safety

AudioContext is only created/resumed after a user pointer/key gesture. It suspends when the document becomes hidden and resumes on return when permitted.

Mix parameters update at 10 Hz; no per-frame noise generation or remote audio API is used.

## Asset / licensing boundary

V0.11.7 is procedural-only. SoundShockAudio and other Resource Hub audio sources remain discovery-only until individual commercial licenses are verified and recorded in `THIRD_PARTY_ASSETS.md`.

## Authority boundary

Unchanged:

- Ocean / getWaveHeight
- 9-Point+
- Planar Surge/Sway/Yaw
- steering / reverse / shoreline
- race/checkpoint logic
- AI movement logic
- Boost equations
- Camera
- Graphics/Safari hard budget
- Google 3D / disaster authority

## Automated gate

`tests/v0117-audio-core.test.js` covers preference sanitization, world profiles, race-phase intensity, final-event tension and 20,000 finite mix iterations.

## Browser acceptance still required

- no autoplay error before first gesture
- audio actually starts after gesture
- no harsh clipping or excessive volume
- world transitions feel distinct
- pause reduces ambience/music
- final event sounds more intense
- Audio sliders persist after reload
- Boost/engine/race cues remain audible and not masked
- background tab does not continue playing unexpectedly
- Safari frame-time and battery impact remain acceptable
