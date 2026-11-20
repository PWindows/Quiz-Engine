import { MSG, peerIdForCode } from '/shared/src/protocol.js';
import { saveSession, makePlayerId } from '/shared/src/session.js';

const $ = (sel) => document.querySelector(sel);

let peer = null;
let conn = null;
let mounted = false;
let playerId = null;
let selectedShell = null;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}

function renderShells() {
  const shells = window.GAME_SHELLS || [];
  const options = $('#shell-options');
  if (!shells.length) return;
  selectedShell = shells[0].id;
  options.innerHTML = shells.map((shell, i) => `
    <label class="shell-option">
      <input type="radio" name="shell" value="${shell.id}" ${i === 0 ? 'checked' : ''}>
      <span class="shell-name">${shell.name}</span>
      <span class="shell-tagline">${shell.tagline}</span>
    </label>
  `).join('');
  options.addEventListener('change', (e) => {
    if (e.target.name === 'shell') selectedShell = e.target.value;
  });
}

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error('failed to load ' + href));
    document.head.appendChild(link);
  });
}

async function mountGame(msg) {
  if (mounted) return;
  mounted = true;

  const game = msg.game || 'crypto';
  const playPath = `/play/${game}/`;

  saveSession({ playerId, code: msg.code, name: msg.name, game, shell: msg.shell || selectedShell });

  if (location.pathname !== playPath) {
    history.pushState({ game, code: msg.code, playerId }, '', playPath);
  }

  try {
    await loadStylesheet(`/${game}-mayhem/style.css`);
  } catch (e) {
    console.warn('game theme failed to load', e);
  }

  $('#form-screen').hidden = true;
  $('#game-screen').hidden = false;
  $('#game-screen').innerHTML = '';
  document.title = (msg.quiz?.title || 'Game') + ' · PWindows Quiz Engine';

  try {
    const mod = await import(`/${game}-mayhem/src/client.js`);
    mod.mount($('#game-screen'), conn, msg);
  } catch (e) {
    console.error(e);
    $('#game-screen').innerHTML =
      `<p style="color:#ff6b6b;padding:40px;text-align:center;">Failed to load game: ${e.message}</p>`;
  }
}

function join() {
  const code = $('#code').value.trim().toUpperCase();
  const name = $('#name').value.trim() || 'Player';
  if (code.length !== 4) { toast('Enter a 4-character code'); return; }

  playerId = makePlayerId();
  $('#btn-join').disabled = true;
  peer = new Peer({ debug: 1 });

  peer.on('open', () => {
    conn = peer.connect(peerIdForCode(code), { reliable: true });
    conn.on('open', () => {
      conn.send({ type: MSG.JOIN, name, playerId, shell: selectedShell });
    });
    conn.on('data', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === MSG.WELCOME) {
        msg.code = code;
        msg.name = name;
        mountGame(msg);
      } else if (!mounted && (msg.type === MSG.KICKED || msg.type === MSG.ERROR)) {
        toast(msg.reason || msg.message || 'error');
        $('#btn-join').disabled = false;
      }
    });
    conn.on('close', () => {
      if (!mounted) {
        toast('Disconnected from host');
        $('#btn-join').disabled = false;
      }
    });
    conn.on('error', (err) => {
      console.error(err);
      if (!mounted) {
        toast('Connection error');
        $('#btn-join').disabled = false;
      }
    });
  });

  peer.on('error', (err) => {
    console.error(err);
    if (err.type === 'peer-unavailable') toast('No room with that code');
    else toast('Connection error: ' + err.type);
    $('#btn-join').disabled = false;
  });

  setTimeout(() => {
    if (!conn || !conn.open) {
      $('#btn-join').disabled = false;
      toast('Could not reach host. Check the code.');
    }
  }, 8000);
}

$('#btn-join').addEventListener('click', join);
$('#code').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
});
$('#code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#name').focus(); });
$('#name').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
renderShells();

window.addEventListener('beforeunload', () => { if (peer) peer.destroy(); });