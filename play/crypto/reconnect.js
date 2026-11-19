import { MSG, peerIdForCode } from '/shared/src/protocol.js';
import { loadSession, clearSession } from '/shared/src/session.js';

const session = loadSession();
const root = document.getElementById('root');

if (session && session.code && session.playerId) {
  attemptReconnect(session);
}

function attemptReconnect(session) {
  const peer = new Peer({ debug: 1 });
  let conn = null;
  let resolved = false;

  peer.on('open', () => {
    conn = peer.connect(peerIdForCode(session.code), { reliable: true });

    conn.on('open', () => {
      conn.send({ type: MSG.RECONNECT, playerId: session.playerId });
    });

    conn.on('data', async (msg) => {
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === MSG.WELCOME && !resolved) {
        resolved = true;
        document.getElementById('no-session').hidden = true;
        document.title = (msg.quiz?.title || 'Game') + ' · PWindows Quiz Engine';

        try {
          const mod = await import(`/${session.game}-mayhem/src/client.js`);
          mod.mount(root, conn, msg);
        } catch (e) {
          console.error(e);
          clearSession();
          location.href = '/join/';
        }
      }

      if (msg.type === MSG.KICKED || msg.type === MSG.ERROR) {
        clearSession();
        location.href = '/join/';
      }
    });

    conn.on('close', () => {
      if (!resolved) clearSession();
    });

    conn.on('error', () => {
      if (!resolved) clearSession();
    });
  });

  peer.on('error', (err) => {
    console.error(err);
    if (err.type === 'peer-unavailable') clearSession();
  });

  setTimeout(() => {
    if (!conn || !conn.open || !resolved) clearSession();
  }, 6000);
}