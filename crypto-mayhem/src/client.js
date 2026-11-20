import { clearSession } from '/shared/src/session.js';
import { MSG } from '/shared/src/protocol.js';
import { Terminal } from './terminal.js';
import { initServer, makeTarget } from './server.js';
import { createCommands } from './commands.js';

export function mount(root, conn, welcome) {
  const quiz = welcome.quiz;
  const shellId = welcome.shell || 'bash';
  const shell = (window.GAME_SHELLS || []).find(s => s.id === shellId) || (window.GAME_SHELLS || [])[0];
  let started = false;
  let state = null;
  let terminal = null;

  async function startGame(title) {
    if (started) return;
    started = true;
    root.innerHTML = `
      <div id="terminal">
        <div id="scrollback"></div>
        <div id="input-row">
          <span class="prompt">$</span>
          <input id="input" type="text" autocomplete="off" autocorrect="off"
                 autocapitalize="off" spellcheck="false" autofocus>
        </div>
      </div>
    `;

    state = {
      energy: window.GAME_CONFIG?.energyPerAnswer || 3,
      cash: 500,
      pendingQuestion: null,
      answerIndex: 0,
      questions: quiz.questions || [],
      shell,
      targets: {},
    };
    state.targets.bot = makeTarget({
      id: 'bot',
      username: 'admin',
      password: 'hunter2',
      coins: 1000,
      shell: 'java',
    });

    try {
      await initServer();
    } catch (err) {
      root.innerHTML = `<pre style="color:#ff6b6b;padding:20px">Failed to load sql.js: ${err.message}</pre>`;
      return;
    }

    terminal = new Terminal(root.querySelector('#terminal'), handleCommand);
    const commands = createCommands(state, terminal, (answer) => {
      conn.send({ type: MSG.ANSWER, questionId: answer.questionId, answer: answer.answer });
    });

    function handleCommand(cmd) {
      const trimmed = cmd.trim();
      if (!trimmed) return;
      const parts = trimmed.replace(/^\$/, '').split(/\s+/);
      const name = parts[0].toLowerCase();
      const args = parts.slice(1);
      const fn = commands[name];
      if (typeof fn !== 'function') {
        terminal.print(`command not found: ${name}`, 'err');
        terminal.print('type $help for a list.', 'dim');
        return;
      }
      fn(args);
    }

    terminal.print('╔══════════════════════════════════════╗', 'banner');
    terminal.print(`║   ${String(title).slice(0, 30).padEnd(30)}  ║`, 'banner');
    terminal.print('╚══════════════════════════════════════╝', 'banner');
    terminal.print('', '');
    terminal.print(`shell selected: ${shell?.name || shellId}`, 'ok');
    terminal.print('type $help to begin. try $answer.', 'dim');
  }

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
      if (!started) startGame(msg.title || quiz.title);
    }

    if (msg.type === MSG.ACK && started) {
      if (msg.correct) {
        state.energy = msg.energy ?? state.energy;
        state.cash = msg.cash ?? state.cash;
        state.pendingQuestion = null;
        terminal.print(`correct. +${window.GAME_CONFIG?.energyPerAnswer || 3} energy (total: ${state.energy})`, 'ok');
      } else {
        terminal.print('wrong answer.', 'err');
      }
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