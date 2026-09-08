// V0.11.6 pure Coast Championship scoring/state.
(function (root) {
  'use strict';
  const VERSION = 'V0.11.6';
  const POINTS = Object.freeze([10, 7, 5, 3]);

  function pointsForPlacement(place) {
    const index = Math.max(0, Math.min(POINTS.length - 1, (Math.floor(Number(place) || 4) - 1)));
    return POINTS[index];
  }

  function createChampionship(eventIds, racerIds) {
    const events = Array.isArray(eventIds) ? eventIds.slice() : [];
    const racers = Array.isArray(racerIds) ? racerIds.slice() : [];
    const standings = {};
    for (const id of racers) standings[id] = { id, points: 0, wins: 0, podiums: 0, rankSum: 0, stages: 0 };
    return { active: false, complete: false, stageIndex: 0, eventIds: events, standings, stageResults: [] };
  }

  function addStageResult(state, eventId, rankedIds) {
    if (!state || state.complete) return state;
    const ranking = Array.isArray(rankedIds) ? rankedIds : [];
    const result = { eventId, ranking: ranking.slice(), points: {} };
    for (let i = 0; i < ranking.length; i++) {
      const id = ranking[i];
      if (!state.standings[id]) state.standings[id] = { id, points: 0, wins: 0, podiums: 0, rankSum: 0, stages: 0 };
      const row = state.standings[id];
      const place = i + 1;
      const points = pointsForPlacement(place);
      row.points += points;
      row.wins += place === 1 ? 1 : 0;
      row.podiums += place <= 3 ? 1 : 0;
      row.rankSum += place;
      row.stages += 1;
      result.points[id] = points;
    }
    state.stageResults.push(result);
    state.stageIndex += 1;
    if (state.stageIndex >= state.eventIds.length) {
      state.complete = true;
      state.active = false;
    }
    return state;
  }

  function standingsArray(state) {
    const rows = Object.values((state && state.standings) || {});
    return rows.sort((a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums || a.rankSum - b.rankSum || String(a.id).localeCompare(String(b.id)));
  }

  function overallPlacement(state, racerId) {
    const rows = standingsArray(state);
    const index = rows.findIndex(row => row.id === racerId);
    return index >= 0 ? index + 1 : rows.length || 1;
  }

  function createRecords() {
    return { championshipsCompleted: 0, championshipWins: 0, bestPoints: 0, bestOverallPlacement: null };
  }

  function sanitizeRecords(input) {
    const src = input && typeof input === 'object' ? input : {};
    return {
      championshipsCompleted: Math.max(0, Math.floor(Number(src.championshipsCompleted) || 0)),
      championshipWins: Math.max(0, Math.floor(Number(src.championshipWins) || 0)),
      bestPoints: Math.max(0, Math.floor(Number(src.bestPoints) || 0)),
      bestOverallPlacement: Number.isFinite(Number(src.bestOverallPlacement)) ? Math.max(1, Math.floor(Number(src.bestOverallPlacement))) : null
    };
  }

  function recordChampionship(records, state, playerId) {
    const next = sanitizeRecords(records);
    const place = overallPlacement(state, playerId);
    const player = state && state.standings && state.standings[playerId];
    const points = player ? Math.max(0, player.points) : 0;
    next.championshipsCompleted += 1;
    if (place === 1) next.championshipWins += 1;
    next.bestPoints = Math.max(next.bestPoints, points);
    next.bestOverallPlacement = next.bestOverallPlacement == null ? place : Math.min(next.bestOverallPlacement, place);
    return { records: next, placement: place, points };
  }

  const api = { VERSION, POINTS, pointsForPlacement, createChampionship, addStageResult, standingsArray, overallPlacement, createRecords, sanitizeRecords, recordChampionship };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_CHAMPIONSHIP_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
