import { Terminal } from './terminal.js';
import { initServer, makeTarget } from './server.js';
import { createCommands } from './commands.js';

async function main() {
  const root = document.getElementById('terminal');
  const config = window.GAME_CONFIG;
  const shells = window.GAME_SHELLS;

  if (!config || !shells) {
    root.innerHTML = `<pre style="color:#ff6b6b;padding:20px">config.js failed to load. Open /config.js in a browser tab and check line 5.</pre>`;
    return;
  }
  if (config._dataLoaded === false) {
    console.warn('[config] _data/*.yml not loaded by Jekyll — using built-in defaults.');
  }

  const state = {
    energy: config.energyPerAnswer,
    cash: 500,
    pendingQuestion: null,
    targets: {},
  };

  try {
    await initServer();
  } catch (err) {
    root.innerHTML = `<pre style="color:#ff6b6b;padding:20px">Failed to load sql.js: ${err.message}</pre>`;
    return;
  }

  state.targets.bot = makeTarget({
    id: 'bot',
    username: 'admin',
    password: 'hunter2',
    coins: 1000,
    shell: 'java',
  });

  const terminal = new Terminal(root, handleCommand);
  const commands = createCommands(state, terminal);

  function handleCommand(cmd) {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const parts = trimmed.replace(/^\$/, '').split(/\s+/);
    const name = parts[0];
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
  terminal.print('║   CRYPTO MAYHEM  ·  vertical slice   ║', 'banner');
  terminal.print('╚══════════════════════════════════════╝', 'banner');
  terminal.print('', '');
  terminal.print('you have energy.  spend it wisely.', 'dim');
  terminal.print('type $help to begin.  try $targets.', 'dim');
  terminal.print('', '');
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#ff6b6b;padding:20px">${err.stack || err.message}</pre>`;
});