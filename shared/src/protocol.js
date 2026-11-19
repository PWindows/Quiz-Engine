export const PROTOCOL_VERSION = 1;

export const PEER_ID_PREFIX = 'pwindows-room-';

export function peerIdForCode(code) {
  return PEER_ID_PREFIX + String(code).toUpperCase();
}

export const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeCode(length = 4) {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

export const MSG = {
  // client -> host
  JOIN:       'join',
  RECONNECT:  'reconnect',
  READY:      'ready',
  ANSWER:     'answer',
  ACTION:     'action',
  PING:       'ping',

  // host -> client
  WELCOME:    'welcome',
  STATE:      'state',
  START:      'start',
  GAME_OVER:  'game_over',
  ACK:        'ack',
  ERROR:      'error',
  KICKED:     'kicked',
  PONG:       'pong',
};