export class Terminal {
  constructor(root, onCommand) {
    this.scrollback = root.querySelector('#scrollback');
    this.input = root.querySelector('#input');
    this.onCommand = onCommand;
    this.history = [];
    this.historyIdx = 0;

    this.input.addEventListener('keydown', (e) => this._handleKey(e));

    root.addEventListener('click', () => {
      if (window.getSelection().toString()) return;
      this.input.focus();
    });
  }

  _handleKey(e) {
    if (e.key === 'Enter') {
      const cmd = this.input.value;
      this.input.value = '';
      if (cmd.trim()) this.history.push(cmd);
      this.historyIdx = this.history.length;
      this.print('$ ' + cmd, 'cmd');
      this.onCommand(cmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.historyIdx > 0) {
        this.historyIdx--;
        this.input.value = this.history[this.historyIdx];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIdx < this.history.length - 1) {
        this.historyIdx++;
        this.input.value = this.history[this.historyIdx];
      } else {
        this.historyIdx = this.history.length;
        this.input.value = '';
      }
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      this.clear();
    }
  }

  print(text, cls = '') {
    const line = document.createElement('div');
    line.className = 'line ' + cls;
    line.textContent = text;
    this.scrollback.appendChild(line);
    this.scrollback.scrollTop = this.scrollback.scrollHeight;
  }

  clear() {
    this.scrollback.innerHTML = '';
  }
}