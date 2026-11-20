import { attemptLogin } from './server.js';

export function createCommands(state, terminal, submitAnswer) {
  const config = window.GAME_CONFIG;
  const shells = window.GAME_SHELLS;

  return {
    help: () => {
      terminal.print('commands:', 'dim');
      terminal.print(`  $answer                  get a question (+${config.energyPerAnswer} energy on correct)`, 'dim');
      terminal.print('  $submit <answer>         answer the pending question', 'dim');
      terminal.print('  $hack <target> login <user> [pass]', 'dim');
      terminal.print('  $targets                 list known targets', 'dim');
      terminal.print('  $status                  show energy + cash', 'dim');
      terminal.print('  $shell                   show your selected shell', 'dim');
      terminal.print('  $clear                   clear the screen (or Ctrl+L)', 'dim');
    },

    answer: () => {
      const questions = state.questions || [];
      if (!questions.length) {
        terminal.print('no quiz questions are available.', 'err');
        return;
      }
      const question = questions[state.answerIndex % questions.length];
      state.answerIndex++;
      state.pendingQuestion = question;
      terminal.print('question: ' + state.pendingQuestion.text, 'ok');
      terminal.print('type: $submit <answer>', 'dim');
    },

    submit: (args) => {
      if (!state.pendingQuestion) {
        terminal.print('no pending question. type $answer.', 'err');
        return;
      }
      const given = args.join(' ').trim().toLowerCase();
      if (submitAnswer) {
        submitAnswer({ questionId: state.pendingQuestion.id, answer: given });
        return;
      }
      if (given === state.pendingQuestion.answer) {
        state.energy += config.energyPerAnswer;
        terminal.print(`correct. +${config.energyPerAnswer} energy (total: ${state.energy})`, 'ok');
        state.pendingQuestion = null;
      } else {
        terminal.print('wrong answer.', 'err');
      }
    },

    energy: () => terminal.print(`energy: ${state.energy}`, ''),

    status: () => {
      terminal.print(`energy: ${state.energy}`, '');
      terminal.print(`cash:   ${state.cash}`, '');
    },

    shell: () => {
      if (!state.shell) { terminal.print('no shell selected.', 'dim'); return; }
      terminal.print(`shell:  ${state.shell.name}`, 'ok');
      terminal.print(`access: ${state.shell.username}`, 'dim');
      terminal.print(`tag:    ${state.shell.unique}`, 'dim');
    },

    targets: () => {
      const ids = Object.keys(state.targets);
      if (!ids.length) { terminal.print('no targets.', 'dim'); return; }
      for (const id of ids) {
        const t = state.targets[id];
        terminal.print(`  ${id}  (${t.coins} coins, ${t.shell})`, 'dim');
      }
    },

    clear: () => terminal.clear(),

    hack: (args) => {
      const [targetId, verb, ...rest] = args;
      if (!targetId || !verb) {
        terminal.print('usage: $hack <target> login <user> [pass]', 'err');
        return;
      }
      if (verb !== 'login') {
        terminal.print(`unknown verb: ${verb}. (only "login" is supported in this build)`, 'err');
        return;
      }
      const t = state.targets[targetId];
      if (!t) { terminal.print(`target not found: ${targetId}`, 'err'); return; }
      if (state.energy < 1) { terminal.print('not enough energy. type $answer.', 'err'); return; }

      const raw = rest.join(' ');
      let user, pass;
      if (raw.includes("'") || raw.includes('--')) {
        user = raw;
        pass = '';
      } else {
        const parts = raw.split(/\s+/);
        user = parts[0] || '';
        pass = parts[1] || '';
      }

      state.energy -= 1;
      const result = attemptLogin(t, user, pass);

      if (result.query) terminal.print(`[query] ${result.query}`, 'query');
      if (result.error) { terminal.print(`[sql] ${result.error}`, 'err'); return; }

      if (result.ok) {
        const shell = shells.find(s => s.id === t.shell) || shells[0];
        const steal = Math.floor(t.coins * shell.stealCap);
        t.coins -= steal;
        state.cash += steal;
        terminal.print(config.errorStrings.welcome, 'ok');
        terminal.print(`[stolen: ${steal} coins from ${targetId}]`, 'ok');
        terminal.print(`[balance: ${state.cash}]`, 'dim');
      } else if (result.reason === 'no-user') {
        terminal.print(config.errorStrings.noUser, 'err');
      } else {
        terminal.print(config.errorStrings.wrongPass, 'err');
      }
    },
  };
}