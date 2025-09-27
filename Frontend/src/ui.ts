export function clearPongUI() {
  document.querySelectorAll<HTMLElement>("[data-pong-ui='1']").forEach((n) => n.remove());
}
export function markUI(el: HTMLElement) {
  el.setAttribute("data-pong-ui", "1");
  return el;
}
export function genCode(len = 6) {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += a[(Math.random() * a.length) | 0];
  return s;
}
