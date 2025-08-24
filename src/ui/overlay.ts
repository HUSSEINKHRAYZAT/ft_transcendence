import { markUI } from "../ui"; // your existing util

export function overlay(html: string): HTMLElement {
  const ov = markUI(document.createElement("div"));
  ov.className = "ov";
  ov.innerHTML = html;

  // add a close button if none exists
  const card = ov.querySelector('.card') as HTMLElement | null;
  if (card && !card.querySelector('[data-close]')) {
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.className = 'absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 transition-all duration-200 flex items-center justify-center text-lg font-bold';
    closeBtn.setAttribute('data-close', '');
    closeBtn.title = 'Close (Esc)';
    card.appendChild(closeBtn);
    card.classList.add('relative');
  }

  const onEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      ov.remove();
      document.removeEventListener('keydown', onEscape);
    }
  };

  ov.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === ov || t.hasAttribute('data-close')) {
      ov.remove();
      document.removeEventListener('keydown', onEscape);
    }
  });

  document.addEventListener('keydown', onEscape);
  document.body.appendChild(ov);
  return ov;
}
