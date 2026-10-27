const FILLER_WORDS = ['um', 'uh', 'like', 'aaa', 'basically', 'literally'];

function countFillers(transcript = '') {
  const counts = Object.fromEntries(FILLER_WORDS.map((word) => [word, 0]));
  const words = transcript.toLowerCase().match(/\b[\w']+\b/g) || [];

  words.forEach((word) => {
    if (counts[word] !== undefined) counts[word] += 1;
  });

  return counts;
}

function speedLabel(wpm) {
  if (wpm < 110) return 'Too Slow';
  if (wpm > 165) return 'Too Fast';
  return 'Normal';
}

function createSuggestions({ fillerCounts, wpm, eyeContactScore, confidenceScore }) {
  const totalFillers = Object.values(fillerCounts || {}).reduce((sum, count) => sum + count, 0);
  const suggestions = [];

  if (totalFillers > 5) suggestions.push('Reduce filler words by pausing briefly before your next thought.');
  if (wpm > 165) suggestions.push('Slow down slightly so important ideas have room to land.');
  if (wpm < 110) suggestions.push('Increase energy and pacing to keep your audience engaged.');
  if (eyeContactScore < 60) suggestions.push('Look toward the camera more consistently to build trust.');
  if (confidenceScore < 70) suggestions.push('Use shorter sentences and steady breathing to sound more confident.');
  if (!suggestions.length) suggestions.push('Great rhythm. Keep practicing with the same steady delivery.');

  return suggestions;
}

module.exports = { FILLER_WORDS, countFillers, speedLabel, createSuggestions };
