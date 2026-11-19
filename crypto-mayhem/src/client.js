import { MSG } from '/shared/src/protocol.js';
import { clearSession } from '/shared/src/session.js';

export function mount(root, conn, welcome) {
  const quiz = welcome.quiz;

  root.innerHTML = `
    <div class="waiting">
      <p class="label">Connected</p>
      <h2 class="quiz-title"></h2>
      <p class="status">Waiting for the host to start…</p>
    </div>
  `;
  root.querySelector('.quiz-title').textContent = quiz.title;

  conn.send({ type: MSG.READY });

  conn.on('data', (msg) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === MSG.START) {
      root.innerHTML = `
        <div class="waiting">
          <p class="label">In game</p>
          <h2 class="quiz-title"></h2>
          <p class="status">Terminal multiplayer ships next. You're connected.</p>
        </div>
      `;
      root.querySelector('.quiz-title').textContent = msg.title || quiz.title;
    }

    if (msg.type === MSG.GAME_OVER) {
      clearSession();
      root.innerHTML = `
        <div class="waiting">
          <p class="label">Game over</p>
          <h2 class="quiz-title">Thanks for playing</h2>
          <p class="status">Final score: ${msg.finalState?.cash ?? 0}</p>
          <p style="margin-top:24px;">
            <a href="/join/" style="color:var(--accent);text-decoration:none;font-weight:600;">
              ← Back to /join/
            </a>
          </p>
        </div>
      `;
    }

    if (msg.type === MSG.KICKED) {
      clearSession();
      root.innerHTML = `
        <div class="waiting">
          <p class="label">Removed</p>
          <h2 class="quiz-title">${msg.reason || 'kicked'}</h2>
          <p style="margin-top:24px;">
            <a href="/join/" style="color:var(--accent);text-decoration:none;font-weight:600;">
              ← Back to /join/
            </a>
          </p>
        </div>
      `;
    }
  });
}