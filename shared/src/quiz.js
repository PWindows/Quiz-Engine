const STORAGE_KEY = 'pwindows.quizzes.v1';

function uid(prefix = 'q') {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

export function emptyQuiz() {
  return {
    id: uid('quiz'),
    game: 'crypto',
    title: 'Untitled Quiz',
    questions: [{ id: uid(), text: '', answer: '' }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function loadQuizzes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuiz(quiz) {
  const all = loadQuizzes();
  quiz.updatedAt = Date.now();
  const idx = all.findIndex(q => q.id === quiz.id);
  if (idx >= 0) all[idx] = quiz;
  else all.push(quiz);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return quiz;
}

export function deleteQuiz(id) {
  const all = loadQuizzes().filter(q => q.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getQuiz(id) {
  return loadQuizzes().find(q => q.id === id) || null;
}

export function exportQuiz(quiz) {
  return JSON.stringify(quiz, null, 2);
}

export function importQuiz(json) {
  const parsed = JSON.parse(json);
  const fresh = {
    ...parsed,
    id: uid('quiz'),
    game: parsed.game || 'crypto',
    questions: (parsed.questions || []).map(q => ({
      id: uid(),
      text: q.text || '',
      answer: q.answer || '',
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveQuiz(fresh);
  return fresh;
}

export function publicQuiz(quiz) {
  return {
    id: quiz.id,
    game: quiz.game || 'crypto',
    title: quiz.title,
    questions: quiz.questions.map(q => ({ id: q.id, text: q.text })),
  };
}