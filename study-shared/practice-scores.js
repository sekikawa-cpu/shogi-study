/** Latest result per year/subject, including saved question-by-question sessions. */
export function latestPracticeScores(scores, logs) {
  const candidates = scores.map(s => ({ ...s }));
  const scoredSessions = new Set(scores.filter(s => s.sessionId).map(s => s.sessionId));
  const sessions = new Map();
  for (const log of logs) {
    if ((!log.examKey && log.practiceMode !== 'quiz') || scoredSessions.has(log.sessionId)) continue;
    let answered = Number(log.questionCount), correct = Number(log.correctCount);
    // Earlier logs stored the same counts only in the exercise memo.
    if (!(answered > 0)) {
      const match = /^アプリ演習 (\d+)問（正(\d+)\/誤\d+）$/.exec(log.memo || '');
      if (!match) continue;
      answered = Number(match[1]); correct = Number(match[2]);
    }
    if (!Number.isFinite(answered) || answered <= 0 || !Number.isFinite(correct) || correct < 0 || correct > answered) continue;
    const key = JSON.stringify([log.examKey || '', log.sessionId || log.id]);
    const yearMatch = /[｜|]([RH])(\d{2})/.exec(log.examKey || '');
    const year = yearMatch ? Number(yearMatch[2]) + (yearMatch[1] === 'R' ? 2018 : 1988) : 0;
    const subjectId = (log.examKey || '').includes('｜') ? log.examKey.split('｜')[0] : log.subjectId;
    const session = sessions.get(key) || {id: 'practice-' + key, year, subjectId, answered: 0, correct: 0, date: '', createdAt: ''};
    session.answered += answered; session.correct += correct;
    if ((log.date || '') >= session.date) session.date = log.date || '';
    if ((log.createdAt || '') >= session.createdAt) session.createdAt = log.createdAt || '';
    sessions.set(key, session);
  }
  for (const session of sessions.values()) candidates.push({...session, score: Math.round(session.correct / session.answered * 100)});
  candidates.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  const latest = new Map();
  for (const result of candidates) latest.set(`${result.year}:${result.subjectId}`, result);
  return latest;
}
