// V0.11.7 championship stinger bridge. Observer-only; no gameplay writes.
(function (root) {
  'use strict';

  root.addEventListener('jetski:race-finished', event => {
    const detail = event && event.detail;
    if (!detail || !detail.finished) return;
    const manager = root.JETSKI_RACE_MANAGER;
    if (!manager || !manager.selectedEvent || !manager.selectedEvent.finale) return;

    root.setTimeout(() => {
      const audio = root.JETSKI_AUDIO;
      const progression = root.JETSKI_PROGRESSION;
      const core = root.JETSKI_PROGRESSION_CORE;
      if (!audio || !progression || !core) return;
      if (typeof core.campaignComplete !== 'function' || !core.campaignComplete(progression.profile)) return;
      if (typeof audio.playStinger === 'function') audio.playStinger('championship');
      root.dispatchEvent(new CustomEvent('jetski:championship-audio-fired', {
        detail: { tier: typeof core.championshipTier === 'function' ? core.championshipTier(progression.profile) : null }
      }));
    }, 750);
  });
})(typeof window !== 'undefined' ? window : globalThis);
