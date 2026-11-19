let SQL = null;

export async function initServer() {
  if (typeof initSqlJs === 'undefined') {
    throw new Error('sql.js failed to load. Check your internet / CDN.');
  }
  SQL = await initSqlJs({
    locateFile: (f) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${f}`,
  });
}

export function makeTarget({ id, username, password, coins, shell }) {
  return { id, username, password, coins, shell };
}

/**
 * Attempt a login against a target.
 * Runs a fresh sandbox DB per attempt so DROP TABLE griefing can't persist.
 * Returns:
 *   { ok: true,  query }
 *   { ok: false, reason: 'no-user',   query }
 *   { ok: false, reason: 'wrong-pass', query }
 *   { ok: false, error: <sqlite msg>,  query }
 */
export function attemptLogin(target, user, pass) {
  const db = new SQL.Database();

  try {
    db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, pass TEXT)');
    db.run('INSERT INTO users (name, pass) VALUES (?, ?)', [target.username, target.password]);

    const existsQuery = `SELECT 1 FROM users WHERE name='${user}' LIMIT 1`;
    let exists;
    try {
      exists = db.exec(existsQuery);
    } catch (e) {
      return { ok: false, error: e.message, query: existsQuery };
    }
    if (!exists.length || !exists[0].values.length) {
      return { ok: false, reason: 'no-user', query: existsQuery };
    }

    const loginQuery = `SELECT * FROM users WHERE name='${user}' AND pass='${pass}'`;
    let login;
    try {
      login = db.exec(loginQuery);
    } catch (e) {
      return { ok: false, error: e.message, query: loginQuery };
    }
    if (login.length && login[0].values.length) {
      return { ok: true, query: loginQuery };
    }
    return { ok: false, reason: 'wrong-pass', query: loginQuery };
  } finally {
    db.close();
  }
}