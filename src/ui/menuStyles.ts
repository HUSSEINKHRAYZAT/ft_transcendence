export function injectMenuStyles(primaryHex: string) {
  if (document.querySelector('style[data-pong-ui="1"]')) return;

  const css = document.createElement("style");
  css.setAttribute("data-pong-ui", "1");
  css.textContent = `
    .btn{background:linear-gradient(135deg,#374151 0%,#1f2937 100%);border:1px solid ${primaryHex}50;color:#fff;padding:12px 20px;border-radius:12px;cursor:pointer;font-weight:600;font-size:14px;transition:all .3s;position:relative;overflow:hidden}
    .btn:hover{background:linear-gradient(135deg,#4b5563 0%,#374151 100%);border-color:${primaryHex}80;transform:translateY(-2px);box-shadow:0 8px 25px ${primaryHex}25}
    .btn-primary{background:linear-gradient(135deg,${primaryHex} 0%,${primaryHex}dd 100%);border-color:${primaryHex};color:#000;font-weight:700}
    .btn-primary:hover{background:linear-gradient(135deg,${primaryHex}ee 0%,${primaryHex} 100%);border-color:${primaryHex}ee;box-shadow:0 8px 25px ${primaryHex}50}
    .btn-secondary{background:linear-gradient(135deg,${primaryHex}33 0%,${primaryHex}1a 100%);border-color:${primaryHex}66;color:${primaryHex}}
    .btn-secondary:hover{background:linear-gradient(135deg,${primaryHex}44 0%,${primaryHex}33 100%);color:${primaryHex}dd}
    .btn-outline{background:transparent;border:1px solid #3b82f666;color:#3b82f6}
    .btn-outline:hover{background:#3b82f61a;border-color:#3b82f6;color:#60a5fa}
    .ov{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);z-index:20000;font-family:system-ui,sans-serif;color:#fff}
    .card{background:linear-gradient(135deg,#1f2937 0%,#111827 100%);border:2px solid rgba(132,204,22,.3);padding:24px;border-radius:16px;min-width:320px;max-width:500px;box-shadow:0 25px 50px rgba(0,0,0,.5),0 0 0 1px rgba(132,204,22,.2);position:relative;margin:20px}
    .muted{opacity:.8;font-size:.75rem;color:#9ca3af}
    input:focus,select:focus{outline:none;border-color:#84cc16;box-shadow:0 0 0 3px rgba(132,204,22,.1)}
    code{background:rgba(0,0,0,.4);padding:.25rem .5rem;border-radius:.25rem;border:1px solid rgba(132,204,22,.2);color:#84cc16;font-weight:500}
  `;
  document.head.appendChild(css);
}
