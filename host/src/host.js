import { loadQuizzes, publicQuiz } from '/shared/src/quiz.js';
import { MSG, makeCode, peerIdForCode } from '/shared/src/protocol.js';

const $ = (sel) => document.querySelector(sel);

let peer = null;
let roomCode = null;
let quiz = null;
let gameStarted = false;
const players = new Map(); // playerId -> { peerId, conn, name, ready }
const connectionPlayers = new WeakMap();

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showPick() {
  const list = $('#quiz-list');
  const all = loadQuizzes();
  if (!all.length) {
    list.innerHTML = '<p class="sub">No quizzes yet. Create one at /create/ first.</p>';
    return;
  }
  list.innerHTML = all.map(q => `
    <div class="quiz-option" data-id="${q.id}">
      <span class="name">${escapeHtml(q.title)}</span>
      <span class="meta">${q.questions.length} question${q.questions.length === 1 ? '' : 's'}</span>
    </div>
  `).join('');
}

function startHosting(quizData) {
  quiz = quizData;
  roomCode = makeCode(4);
  const peerId = peerIdForCode(roomCode);

  peer = new Peer(peerId, { debug: 1 });

  peer.on('open', () => {
    $('#pick').hidden = true;
    $('#lobby').hidden = false;
    $('#room-code').textContent = roomCode;
    $('#join-url').textContent = location.origin + '/join/';
    renderPlayers();
  });

  peer.on('error', (err) => {
    console.error(err);
    if (err.type === 'unavailable-id') {
      toast('Room code taken — trying another');
      peer.destroy();
      startHosting(quiz);
    } else {
      toast('Connection error: ' + err.type);
    }
  });

  peer.on('connection', (conn) => {
    conn.on('data', (data) => handleMessage(conn, data));
    conn.on('close', () => {
      const playerId = connectionPlayers.get(conn);
      if (!playerId) return;
      const p = players.get(playerId);
      if (p && p.conn === conn) {
        p.conn = null;
        renderPlayers();
      }
    });
  });
}

function handleMessage(conn, msg) {
  if (!msg || typeof msg !== 'object') return;

  switch (msg.type) {
    case MSG.JOIN: {
      const playerId = String(msg.playerId || '');
      const name = String(msg.name || 'Player').slice(0, 24);
      if (!playerId) {
        conn.send({ type: MSG.ERROR, message: 'missing playerId' });
        return;
      }
      const existing = players.get(playerId);
      if (existing) {
        existing.peerId = conn.peer;
        existing.conn = conn;
        existing.name = name;
        existing.shell = String(msg.shell || existing.shell || 'bash');
      } else {
        players.set(playerId, { playerId, peerId: conn.peer, conn, name, shell: String(msg.shell || 'bash'), ready: false, cash: 500, energy: 3 });
      }
      connectionPlayers.set(conn, playerId);
      conn.send({
        type: MSG.WELCOME,
        playerId,
        game: quiz.game || 'crypto',
        quiz: publicQuiz(quiz),
        settings: { rounds: 15 },
        shell: players.get(playerId).shell,
        players: Array.from(players.values()).map(p => ({ id: p.playerId, name: p.name, shell: p.shell })),
      });
      renderPlayers();
      break;
    }

    case MSG.RECONNECT: {
      const playerId = String(msg.playerId || '');
      const p = players.get(playerId);
      if (!p) {
        conn.send({ type: MSG.ERROR, message: 'unknown session' });
        return;
      }
      p.peerId = conn.peer;
      p.conn = conn;
      connectionPlayers.set(conn, playerId);
      conn.send({
        type: MSG.WELCOME,
        playerId,
        game: quiz.game || 'crypto',
        quiz: publicQuiz(quiz),
        settings: { rounds: 15 },
        reconnected: true,
        shell: p.shell,
        players: Array.from(players.values()).map(player => ({ id: player.playerId, name: player.name, shell: player.shell })),
      });
      if (gameStarted) {
        conn.send({ type: MSG.START, title: quiz.title });
      }
      renderPlayers();
      break;
    }

    case MSG.READY: {
      for (const p of players.values()) {
        if (p.peerId === conn.peer) { p.ready = true; break; }
      }
      renderPlayers();
      break;
    }

    case MSG.PING:
      conn.send({ type: MSG.PONG });
      break;

    case MSG.ANSWER: {
      let p = null;
      for (const player of players.values()) {
        if (player.peerId === conn.peer) { p = player; break; }
      }
      if (!p) break;
      const question = quiz.questions.find(q => q.id === msg.questionId);
      const correct = !!question && String(msg.answer || '').trim().toLowerCase() === String(question.answer || '').trim().toLowerCase();
      if (correct) {
        p.energy = (p.energy || 0) + (window.GAME_CONFIG?.energyPerAnswer || 3);
        p.cash = (p.cash || 0);
        conn.send({ type: MSG.ACK, correct: true, energy: p.energy, cash: p.cash });
      } else {
        conn.send({ type: MSG.ACK, correct: false, energy: p.energy || 0, cash: p.cash || 0 });
      }
      break;
    }
  }
}

function renderPlayers() {
  const ul = $('#player-list');
  const list = Array.from(players.values());
  $('#player-count').textContent = list.length;
  ul.innerHTML = list.map(p => {
    const cls = !p.conn ? 'disconnected' : (p.ready ? '' : 'waiting');
    const status = !p.conn ? 'disconnected' : (p.ready ? 'ready' : 'joining…');
    return `<li class="${cls}">
      <span>${escapeHtml(p.name)} <span class="shell-name">· ${escapeHtml(p.shell)}</span></span>
      <span class="status">${status}</span>
    </li>`;
  }).join('');
  $('#btn-start').disabled = list.length === 0 || gameStarted;
  $('#btn-end').disabled = !gameStarted;
}

$('#quiz-list').addEventListener('click', (e) => {
  const card = e.target.closest('.quiz-option');
  if (!card) return;
  const q = loadQuizzes().find(x => x.id === card.dataset.id);
  if (q) startHosting(q);
});

$('#btn-start').addEventListener('click', () => {
  gameStarted = true;
  for (const p of players.values()) {
    if (p.conn) {
      try { p.conn.send({ type: MSG.START, title: quiz.title }); } catch {}
    }
  }
  renderPlayers();
  $('#btn-start').textContent = 'Game in progress';
});

$('#btn-end').addEventListener('click', () => {
  if (!confirm('End the game for everyone?')) return;
  for (const p of players.values()) {
    if (p.conn) {
      try { p.conn.send({ type: MSG.GAME_OVER, finalState: { cash: 0 } }); } catch {}
    }
  }
  gameStarted = false;
  $('#btn-start').textContent = 'Start game';
  renderPlayers();
});

$('#btn-cancel').addEventListener('click', () => {
  if (!confirm('Close the room?')) return;
  for (const p of players.values()) {
    if (p.conn) {
      try { p.conn.send({ type: MSG.KICKED, reason: 'host closed room' }); } catch {}
      try { p.conn.close(); } catch {}
    }
  }
  if (peer) peer.destroy();
  location.reload();
});

window.addEventListener('beforeunload', () => { if (peer) peer.destroy(); });

showPick();