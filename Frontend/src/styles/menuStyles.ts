export function injectMenuStyles(primaryHex: string) {
  if (document.querySelector('style[data-pong-ui="1"]')) return;

  const css = document.createElement("style");
  css.setAttribute("data-pong-ui", "1");
  css.textContent = `
    /* Button Styles (animations removed) */
    .btn{
      background:linear-gradient(135deg,#374151 0%,#1f2937 100%);
      border:1px solid ${primaryHex}50;
      color:#fff;
      padding:12px 20px;
      border-radius:12px;
      cursor:pointer;
      font-weight:600;
      font-size:14px;
      position:relative;
      overflow:hidden;
      box-shadow:0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .btn:hover{
      background:linear-gradient(135deg,#4b5563 0%,#374151 100%);
      border-color:${primaryHex}80;
      box-shadow:0 12px 30px ${primaryHex}25, 0 6px 12px rgba(0,0,0,0.3);
    }
    
    .btn-primary{
      background:linear-gradient(135deg,${primaryHex} 0%,${primaryHex}dd 100%);
      border-color:${primaryHex};
      color:#000;
      font-weight:700;
      box-shadow:0 6px 16px ${primaryHex}40, 0 3px 6px rgba(0,0,0,0.2);
    }
    
    .btn-primary:hover{
      background:linear-gradient(135deg,${primaryHex}ee 0%,${primaryHex} 100%);
      border-color:${primaryHex}ee;
      box-shadow:0 16px 40px ${primaryHex}50, 0 8px 16px rgba(0,0,0,0.4);
    }
    
    .btn-secondary{
      background:linear-gradient(135deg,${primaryHex}33 0%,${primaryHex}1a 100%);
      border-color:${primaryHex}66;
      color:${primaryHex};
    }
    
    .btn-secondary:hover{
      background:linear-gradient(135deg,${primaryHex}44 0%,${primaryHex}33 100%);
      color:${primaryHex}dd;
    }
    
    .btn-outline{
      background:transparent;
      border:1px solid #3b82f666;
      color:#3b82f6;
    }
    
    .btn-outline:hover{
      background:#3b82f61a;
      border-color:#3b82f6;
      color:#60a5fa;
    }

    /* 3D Card Styles (animations removed) */
    .menu-card{
      position:relative;
      z-index:1;
    }
    
    /* Menu Title */
    .menu-title{
      /* No animations */
    }

    /* Menu Icon */
    .menu-icon{
      /* No animations */
    }

    /* Enhanced Slider */
    .slider-3d{
      appearance:none;
      height:8px;
      border-radius:4px;
      background:linear-gradient(90deg, #374151, ${primaryHex}33);
      outline:none;
    }
    
    .slider-3d::-webkit-slider-thumb{
      appearance:none;
      width:20px;
      height:20px;
      border-radius:50%;
      background:linear-gradient(135deg, ${primaryHex}, ${primaryHex}dd);
      cursor:pointer;
      border:2px solid #fff;
      box-shadow:0 4px 8px rgba(0,0,0,0.3);
    }

    /* Existing styles remain... */
    .ov{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);z-index:20000;font-family:system-ui,sans-serif;color:#fff}
    .card{background:linear-gradient(135deg,#1f2937 0%,#111827 100%);border:2px solid rgba(132,204,22,.3);padding:24px;border-radius:16px;min-width:320px;max-width:500px;box-shadow:0 25px 50px rgba(0,0,0,.5),0 0 0 1px rgba(132,204,22,.2);position:relative;margin:20px}
    .muted{opacity:.8;font-size:.75rem;color:#9ca3af}
    input:focus,select:focus{outline:none;border-color:#84cc16;box-shadow:0 0 0 3px rgba(132,204,22,.1)}
    code{background:rgba(0,0,0,.4);padding:.25rem .5rem;border-radius:.25rem;border:1px solid rgba(132,204,22,.2);color:#84cc16;font-weight:500}
  `;
  document.head.appendChild(css);
}
