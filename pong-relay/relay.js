// relay-logged.js
const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });
const rooms = Object.create(null);
const getRoom = id => rooms[id] ||= { mode:'2p', host:null, guests:new Set(), usedIdx:new Set() };
const send = (ws, o) => { try{ ws.readyState===1 && ws.send(JSON.stringify(o)); }catch{} };

wss.on('connection', (ws) => {
  ws.meta = { roomId:null, role:null, idx:null };
  console.log('[conn]');

  ws.on('message', (buf) => {
    let msg; try{ msg = JSON.parse(String(buf)); }catch{ return; }
    console.log('[recv]', msg);

    if (msg.t === 'hello' && msg.roomId) {
      const r = getRoom(msg.roomId); r.mode = msg.mode === '4p' ? '4p' : '2p';
      r.host = ws; ws.meta = { roomId: msg.roomId, role:'host', idx:null };
      console.log(`[host] room=${msg.roomId} mode=${r.mode}`);
      return;
    }
    if (msg.t === 'join' && msg.roomId) {
      const r = getRoom(msg.roomId); ws.meta = { roomId: msg.roomId, role:'guest', idx:null };
      r.guests.add(ws);
      let idx = null; const cand = r.mode === '4p' ? [1,2,3] : [1];
      for (const c of cand) if (!r.usedIdx.has(c)) { idx = c; break; }
      if (idx == null) { send(ws, { t:'assign', idx:-1 }); return; }
      ws.meta.idx = idx; r.usedIdx.add(idx);
      send(ws, { t:'assign', idx });
      if (r.host) send(r.host, { t:'join', roomId: msg.roomId, idx });
      console.log(`[guest] room=${msg.roomId} idx=${idx}`);
      return;
    }
    if (msg.t === 'input' && ws.meta.role === 'guest') {
      const r = rooms[ws.meta.roomId]; if (r?.host) send(r.host, { t:'input', idx: ws.meta.idx, up:!!msg.up, down:!!msg.down });
      return;
    }
    if (msg.t === 'state' && ws.meta.role === 'host') {
      const r = rooms[ws.meta.roomId]; if (!r) return;
      for (const g of r.guests) send(g, msg);
      return;
    }
  });

  ws.on('close', () => {
    const { roomId, role, idx } = ws.meta || {};
    console.log('[close]', role, roomId, idx);
    if (!roomId) return;
    const r = rooms[roomId]; if (!r) return;
    if (role === 'guest') { r.guests.delete(ws); if (idx!=null) r.usedIdx.delete(idx); }
    if (role === 'host') { r.host = null; for (const g of r.guests) try{ g.close(); }catch{}; delete rooms[roomId]; }
  });
});

console.log(`WS relay listening on ws://0.0.0.0:${PORT}`);
