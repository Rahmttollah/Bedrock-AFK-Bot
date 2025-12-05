// AFK Bedrock Bot for Aternos - works on Linux (Render / VPS) using bedrock-protocol
// Use .env for config

require('dotenv').config();
const bp = require('bedrock-protocol');

const HOST = process.env.HOST || 'Hinata_Hyu.aternos.me';
const PORT = parseInt(process.env.PORT || '31120', 10);
const USERNAME = process.env.USERNAME || 'AFKBot';
const VERSION = process.env.VERSION || '1.21.124';
const RECONNECT_DELAY_MS = parseInt(process.env.RECONNECT_DELAY_MS || '5000', 10);

let client = null;
let reconnectAttempts = 0;
let reconnectTimer = null;

function createAndStart() {
  console.log(`[bot] starting bot -> ${USERNAME}@${HOST}:${PORT} (ver ${VERSION})`);
  client = bp.createClient({
    host: HOST,
    port: PORT,
    username: USERNAME,
    offline: true,          // offline mode (works for many Bedrock servers); if using floodgate/usernames change accordingly
    version: VERSION,
    keepAliveInterval: 10000
  });

  client.on('connect', () => {
    console.log('[bot] connected (socket)');
  });

  client.on('join', () => {
    reconnectAttempts = 0;
    console.log('[bot] joined server as real player');
    startAFKLoop();
  });

  client.on('spawn', () => {
    console.log('[bot] spawn event');
  });

  client.on('despawn', () => {
    console.log('[bot] despawned');
  });

  client.on('kick', (reason) => {
    try {
      console.log('[bot] kicked:', reason.toString());
    } catch (e) { console.log('[bot] kicked (raw)'); }
  });

  client.on('error', (err) => {
    console.error('[bot] error:', err && err.message ? err.message : err);
  });

  client.on('close', (reason) => {
    console.log('[bot] connection closed', reason ? reason.toString() : '');
    stopAFKLoop();
    scheduleReconnect();
  });
}

let afkInterval = null;
function startAFKLoop() {
  if (afkInterval) return;
  // We'll send small movement / head rotation packets so server thinks player is active.
  afkInterval = setInterval(() => {
    try {
      // write move_player or play_status packets - bedrock expects specific runtime_id etc.
      // bedrock-protocol offers send move_player; use player_move? We'll use play_status and movement-lite approach.
      // Use "player_auth_input" or "move_player" patterns may vary by version; this approach is lightweight and commonly works:
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
      // also send a small keepalive-like packet
      client.write('player_auth_input', {
        motion: { x: 0, y: 0, z: 0 },
        yaw: Math.random() * 360,
        pitch: 0,
        head_yaw: Math.random() * 360,
        tick: Date.now() % 100000
      });
      console.log('[bot] activity packet sent');
    } catch (e) {
      // some servers may reject specific packets, ignore and continue
      console.warn('[bot] activity write error', e && e.message ? e.message : e);
    }
  }, 3000); // every 3s
}

function stopAFKLoop() {
  if (!afkInterval) return;
  clearInterval(afkInterval);
  afkInterval = null;
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectAttempts++;
  const delay = Math.min(RECONNECT_DELAY_MS * reconnectAttempts, 60000); // cap 60s
  console.log(`[bot] reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    createAndStart();
  }, delay);
}

// start first time
createAndStart();

// handle graceful shutdown
process.on('SIGINT', () => {
  console.log('[bot] SIGINT, exiting');
  if (client) client.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('[bot] SIGTERM, exiting');
  if (client) client.close();
  process.exit(0);
});
