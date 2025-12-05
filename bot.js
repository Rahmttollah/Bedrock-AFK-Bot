// Simple AFK Bedrock join bot (uses bedrock-protocol from GitHub)
// Requires environment variables or .env file
require('dotenv').config();
const bp = require('bedrock-protocol');

const HOST = process.env.HOST || 'Hinata_Hyu.aternos.me';
const PORT = parseInt(process.env.PORT || '31120', 10);
const USERNAME = process.env.USERNAME || 'AFKBot';
const VERSION = process.env.VERSION || '1.21.124';
const RECONNECT_DELAY_MS = parseInt(process.env.RECONNECT_DELAY_MS || '5000', 10);

let client = null;
let afkInterval = null;
let reconnectTimeout = null;
let attempts = 0;

function log(...args){ console.log(new Date().toISOString(), ...args) }

function start() {
  log('[bot] starting ->', `${USERNAME}@${HOST}:${PORT} ver=${VERSION}`);
  client = bp.createClient({
    host: HOST,
    port: PORT,
    username: USERNAME,
    offline: true,     // offline true usually works for Aternos + Floodgate setups
    version: VERSION,
    keepAliveInterval: 10000
  });

  client.on('connect', () => log('[bot] socket connected'));
  client.on('join', () => {
    attempts = 0;
    log('[bot] joined server — spawning AFK loop');
    startAfkLoop();
  });

  client.on('spawn', () => log('[bot] spawn event'));
  client.on('despawn', () => log('[bot] despawn'));
  client.on('kick', (r) => {
    try { log('[bot] kicked:', r.toString()); } catch(e){ log('[bot] kicked (raw)'); }
  });

  client.on('error', (err) => log('[bot] error:', err && err.message ? err.message : err));
  client.on('close', () => {
    log('[bot] connection closed');
    stopAfkLoop();
    scheduleReconnect();
  });
}

function startAfkLoop(){
  if (afkInterval) return;
  // Every 3 seconds send lightweight movement/auth input that many MCPE servers accept.
  afkInterval = setInterval(() => {
    try {
      // move_player packet: lightweight pulses to simulate activity.
      client.write('move_player', {
        runtime_id: client.entityId || 1,
        position: { x: 0, y: 70, z: 0 },
        pitch: 0,
        yaw: Math.random() * 360,
        head_yaw: Math.random() * 360,
        mode: 0,
        on_ground: true,
        teleport: false
      });
      // player_auth_input: if supported, sends tick/rotation so server sees activity
      if (client.write && client.writeRaw) {
        try {
          client.write('player_auth_input', {
            motion: { x: 0, y: 0, z: 0 },
            yaw: Math.random() * 360,
            pitch: 0,
            head_yaw: Math.random() * 360,
            tick: Date.now() % 100000
          });
        } catch(e){}
      }
      log('[bot] activity packet sent');
    } catch(e){
      log('[bot] activity send error:', e && e.message ? e.message : e);
    }
  }, 3000);
}

function stopAfkLoop(){
  if (!afkInterval) return;
  clearInterval(afkInterval);
  afkInterval = null;
}

function scheduleReconnect(){
  if (reconnectTimeout) return;
  attempts++;
  const delay = Math.min(RECONNECT_DELAY_MS * attempts, 60000);
  log(`[bot] reconnecting in ${delay}ms (attempt ${attempts})`);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    start();
  }, delay);
}

// Start
start();

// Graceful shutdown
process.on('SIGINT', () => {
  log('[bot] SIGINT, shutting down');
  try { if (client) client.close(); } catch(e){}
  process.exit(0);
});
process.on('SIGTERM', () => {
  log('[bot] SIGTERM, shutting down');
  try { if (client) client.close(); } catch(e){}
  process.exit(0);
});
