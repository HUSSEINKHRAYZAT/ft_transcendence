import WebSocket from 'ws';

export function broadcast(conns: Map<string, WebSocket>, data: any) {
  const text = JSON.stringify(data);
  for (const peer of conns.values()) {
    try {
      peer.send(text);
    } catch {}
  }
}
