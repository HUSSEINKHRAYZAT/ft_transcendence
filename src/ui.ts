export function clearPongUI() {
  document.querySelectorAll<HTMLElement>("[data-pong-ui='1']").forEach((n) => n.remove());
}
export function markUI(el: HTMLElement) {
  el.setAttribute("data-pong-ui", "1");
  return el;
}

