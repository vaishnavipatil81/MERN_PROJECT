const Analytics = (() => {
  const fillers = ['um', 'uh', 'like', 'aaa', 'basically', 'literally'];

  function words(text) {
    return (text.toLowerCase().match(/\b[\w']+\b/g) || []).filter(Boolean);
  }

  function countFillers(text) {
    const counts = Object.fromEntries(fillers.map((word) => [word, 0]));
    words(text).forEach((word) => {
      if (counts[word] !== undefined) counts[word] += 1;
    });
    return counts;
  }

  function totalFillers(counts) {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }

  function calculateWpm(text, startedAt) {
    const elapsedMinutes = Math.max((Date.now() - startedAt) / 60000, 0.1);
    return Math.round(words(text).length / elapsedMinutes);
  }

  function speedLabel(wpm) {
    if (wpm < 110) return 'Too Slow';
    if (wpm > 165) return 'Too Fast';
    return 'Normal';
  }

  function confidence({ fillerCounts, wpm, eyeContactScore, pauseCount }) {
    const speedPenalty = wpm < 110 ? 12 : wpm > 165 ? 14 : 0;
    const fillerPenalty = Math.min(totalFillers(fillerCounts) * 4, 28);
    const pausePenalty = Math.min(pauseCount * 3, 15);
    const eyePenalty = Math.max(0, 100 - eyeContactScore) * 0.25;
    return Math.max(0, Math.min(100, Math.round(100 - speedPenalty - fillerPenalty - pausePenalty - eyePenalty)));
  }

  function highlightFillers(text) {
    const pattern = new RegExp(`\\b(${fillers.join('|')})\\b`, 'gi');
    return text.replace(pattern, '<span class="filler">$1</span>');
  }

  function suggestions({ fillerCounts, wpm, eyeContactScore, confidenceScore }) {
    const items = [];
    if (totalFillers(fillerCounts) > 5) items.push('Use intentional pauses instead of filler words.');
    if (wpm > 165) items.push('Slow down slightly and let key ideas breathe.');
    if (wpm < 110) items.push('Add more vocal energy and tighten long pauses.');
    if (eyeContactScore < 60) items.push('Bring your gaze back to the camera more often.');
    if (confidenceScore < 70) items.push('Open with shorter sentences to build momentum.');
    return items.length ? items : ['Strong delivery. Keep reinforcing this rhythm.'];
  }

  return { fillers, words, countFillers, totalFillers, calculateWpm, speedLabel, confidence, highlightFillers, suggestions };
})();
