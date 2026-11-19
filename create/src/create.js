import { emptyQuiz, saveQuiz, loadQuizzes, deleteQuiz, exportQuiz, importQuiz } from '/shared/src/quiz.js';

const $ = (sel) => document.querySelector(sel);

let current = emptyQuiz();
let questions = current.questions;

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function render() {
  $('#quiz-title').value = current.title;
  const list = $('#questions');
  list.innerHTML = '';
  questions.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'q-card';
    card.innerHTML = `
      <div class="num">${i + 1}</div>
      <div class="fields">
        <input data-field="text" data-id="${q.id}" placeholder="Question text" value="${escapeAttr(q.text)}">
        <input data-field="answer" data-id="${q.id}" placeholder="Answer" value="${escapeAttr(q.answer)}">
      </div>
      <button class="remove" data-remove="${q.id}" title="Remove">×</button>
    `;
    list.appendChild(card);
  });
}

$('#questions').addEventListener('input', (e) => {
  const t = e.target;
  if (!t.dataset.field) return;
  const q = questions.find(q => q.id === t.dataset.id);
  if (q) q[t.dataset.field] = t.value;
});

$('#questions').addEventListener('click', (e) => {
  const id = e.target.dataset.remove;
  if (!id) return;
  questions = questions.filter(q => q.id !== id);
  if (!questions.length) questions.push({ id: 'q_' + Math.random().toString(36).slice(2, 10), text: '', answer: '' });
  current.questions = questions;
  render();
});

$('#btn-add').addEventListener('click', () => {
  questions.push({ id: 'q_' + Math.random().toString(36).slice(2, 10), text: '', answer: '' });
  current.questions = questions;
  render();
});

$('#quiz-title').addEventListener('input', (e) => {
  current.title = e.target.value || 'Untitled Quiz';
});

$('#btn-save').addEventListener('click', () => {
  if (!current.title.trim()) { toast('Add a title first'); return; }
  const valid = questions.filter(q => q.text.trim() && q.answer.trim());
  if (!valid.length) { toast('Add at least one complete question'); return; }
  current.questions = valid;
  saveQuiz(current);
  toast('Saved');
  renderSaved();
});

$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([exportQuiz(current)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = current.title.replace(/\W+/g, '-').toLowerCase() + '.json';
  a.click();
});

$('#btn-import').addEventListener('click', () => $('#file-import').click());
$('#file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    current = importQuiz(text);
    questions = current.questions;
    render();
    renderSaved();
    toast('Imported');
  } catch {
    toast('Invalid file');
  }
  e.target.value = '';
});

function renderSaved() {
  const list = $('#saved-list');
  const all = loadQuizzes();
  if (!all.length) {
    list.innerHTML = '<p style="color:#94a3b8;font-size:14px">No saved quizzes yet.</p>';
    return;
  }
  list.innerHTML = all.map(q => `
    <div class="saved-item">
      <div class="info">
        <span class="name">${escapeAttr(q.title)}</span>
        <span class="meta">${q.questions.length} question${q.questions.length === 1 ? '' : 's'}</span>
      </div>
      <div class="row">
        <button class="ghost" data-edit="${q.id}">Edit</button>
        <button class="ghost" data-delete="${q.id}">Delete</button>
      </div>
    </div>
  `).join('');
}

$('#saved-list').addEventListener('click', (e) => {
  const edit = e.target.dataset.edit;
  const del = e.target.dataset.delete;
  if (edit) {
    const q = loadQuizzes().find(x => x.id === edit);
    if (q) { current = q; questions = q.questions; render(); }
  }
  if (del) {
    if (confirm('Delete this quiz?')) { deleteQuiz(del); renderSaved(); }
  }
});

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 1800);
}

render();
renderSaved();