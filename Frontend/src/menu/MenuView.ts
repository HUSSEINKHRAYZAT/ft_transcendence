import { markUI } from "../ui";
import { themeBridge } from "../game/utils/ThemeBridge";

export type MenuRenderContext = {
  youName: string | null;
};

export function createMenuRoot(ctx: MenuRenderContext) {
  const theme = themeBridge.getCurrentTheme();
  const primaryHex = themeBridge.color3ToHex(theme.primary);
  const backgroundRgb = `${Math.round(theme.background.r * 255)}, ${Math.round(
    theme.background.g * 255
  )}, ${Math.round(theme.background.b * 255)}`;

  const root = markUI(document.createElement("div"));
  root.className =
    "fixed inset-0 grid place-items-center text-white font-sans z-[10000]";
  root.style.background = `rgba(${backgroundRgb}, 0.95)`;
  root.style.backdropFilter = "blur(8px)";

  root.innerHTML = `
    <div class="rounded-3xl w-full max-w-4xl mx-4 shadow-2xl backdrop-blur-sm" style="background: rgba(${backgroundRgb}, 0.8); border: 1px solid rgba(132, 204, 22, 0.25); padding: 32px;">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <button data-action="back" class="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-200 border" style="background: linear-gradient(135deg, #4b5563 0%, #374151 100%); border-color: rgba(75, 85, 99, 0.3);" title="← Back to Frontend">←</button>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style="background: linear-gradient(135deg, ${primaryHex} 0%, ${primaryHex}dd 100%);">🎮</div>
          <h1 class="text-3xl font-bold tracking-wide" style="background: linear-gradient(135deg, ${primaryHex} 0%, ${primaryHex}dd 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">3D Pong Game Setup</h1>
        </div>
        <div class="text-sm px-4 py-2 rounded-xl" style="background: rgba(132, 204, 22, 0.1); border: 1px solid rgba(132, 204, 22, 0.3); color: ${primaryHex};">
          ${
            ctx.youName
              ? `👤 <span class="font-semibold">${ctx.youName}</span>`
              : `<span class="opacity-80">🔒 Not signed in</span>`
          }
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Local Play Card -->
        <div class="rounded-2xl p-5 transition-all duration-300 border" style="background: linear-gradient(135deg, rgba(132, 204, 22, 0.05) 0%, rgba(132, 204, 22, 0.02) 100%); border-color: rgba(132, 204, 22, 0.2);" onmouseover="this.style.borderColor='rgba(132, 204, 22, 0.4)'; this.style.boxShadow='0 10px 25px rgba(132, 204, 22, 0.1)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='rgba(132, 204, 22, 0.2)'; this.style.boxShadow='none'; this.style.transform='translateY(0)';">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%);">🏠</div>
            <div class="text-lg font-semibold" style="color: #84cc16;">Local Play</div>
          </div>
          <button data-action="local2" class="w-full mb-4 px-4 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2" style="background: #84cc16; color: white;" onmouseover="this.style.background='#65a30d'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#84cc16'; this.style.transform='translateY(0)';">🎮 2P Local Match</button>
          <div class="rounded-xl p-4" style="background: rgba(0, 0, 0, 0.2);">
            <label class="block text-sm font-medium mb-2" style="color: #84cc16;">🤖 AI Difficulty</label>
            <div class="flex items-center gap-3 mb-3">
              <input id="aiSlider" type="range" min="1" max="10" step="1" value="6" class="flex-1" style="accent-color: #84cc16;">
              <span id="aiVal" class="w-8 text-center font-semibold" style="color: #84cc16;">6</span>
            </div>
            <button data-action="ai2" class="w-full mb-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 border flex items-center justify-center gap-2" style="background: rgba(132, 204, 22, 0.1); border-color: rgba(132, 204, 22, 0.3); color: #84cc16;" onmouseover="this.style.background='rgba(132, 204, 22, 0.2)'; this.style.borderColor='rgba(132, 204, 22, 0.5)';" onmouseout="this.style.background='rgba(132, 204, 22, 0.1)'; this.style.borderColor='rgba(132, 204, 22, 0.3)';">⚔️ VS AI</button>
            <button data-action="ai3" class="w-full mb-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 border flex items-center justify-center gap-2" style="background: rgba(132, 204, 22, 0.1); border-color: rgba(132, 204, 22, 0.3); color: #84cc16;" onmouseover="this.style.background='rgba(132, 204, 22, 0.2)'; this.style.borderColor='rgba(132, 204, 22, 0.5)';" onmouseout="this.style.background='rgba(132, 204, 22, 0.1)'; this.style.borderColor='rgba(132, 204, 22, 0.3)';">🧠 3 AI (4P)</button>
            <div class="text-xs opacity-70 mt-1" style="color: #84cc16;">1 player vs 3 bots (uses difficulty above)</div>
          </div>
        </div>

        <!-- Online Play Card -->
        <div class="rounded-2xl p-5 transition-all duration-300 border" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%); border-color: rgba(59, 130, 246, 0.2);" onmouseover="this.style.borderColor='rgba(59, 130, 246, 0.4)'; this.style.boxShadow='0 10px 25px rgba(59, 130, 246, 0.1)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='rgba(59, 130, 246, 0.2)'; this.style.boxShadow='none'; this.style.transform='translateY(0)';">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">🌐</div>
            <div class="text-lg font-semibold" style="color: #3b82f6;">Online Play</div>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <button data-action="sockethost2" class="px-3 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-1 text-sm" style="background: #3b82f6; color: white;" onmouseover="this.style.background='#2563eb'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#3b82f6'; this.style.transform='translateY(0)';">🎯 Host 2P</button>
            <button data-action="socketjoin2" class="px-3 py-2 rounded-lg font-medium transition-all duration-300 border flex items-center justify-center gap-1 text-sm" style="background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: #3b82f6;" onmouseover="this.style.background='rgba(59, 130, 246, 0.2)'; this.style.borderColor='rgba(59, 130, 246, 0.5)';" onmouseout="this.style.background='rgba(59, 130, 246, 0.1)'; this.style.borderColor='rgba(59, 130, 246, 0.3)';">🔗 Join 2P</button>
            <button data-action="sockethost4" class="px-3 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-1 text-sm" style="background: #3b82f6; color: white;" onmouseover="this.style.background='#2563eb'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#3b82f6'; this.style.transform='translateY(0)';">🎯 Host 4P</button>
            <button data-action="socketjoin4" class="px-3 py-2 rounded-lg font-medium transition-all duration-300 border flex items-center justify-center gap-1 text-sm" style="background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: #3b82f6;" onmouseover="this.style.background='rgba(59, 130, 246, 0.2)'; this.style.borderColor='rgba(59, 130, 246, 0.5)';" onmouseout="this.style.background='rgba(59, 130, 246, 0.1)'; this.style.borderColor='rgba(59, 130, 246, 0.3)';">🔗 Join 4P</button>
          </div>
          <div class="text-xs text-center" style="color: #3b82f6;">🌐 Real-time Web socket multiplayer</div>
        </div>

        <!-- Tournament Card -->
        <div class="rounded-2xl p-5 transition-all duration-300 border" style="background: linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(147, 51, 234, 0.02) 100%); border-color: rgba(147, 51, 234, 0.2);" onmouseover="this.style.borderColor='rgba(147, 51, 234, 0.4)'; this.style.boxShadow='0 10px 25px rgba(147, 51, 234, 0.1)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='rgba(147, 51, 234, 0.2)'; this.style.boxShadow='none'; this.style.transform='translateY(0)';">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);">🏆</div>
            <div class="text-lg font-semibold" style="color: #9333ea;">Tournament</div>
          </div>
          <div class="flex gap-3 items-center mb-3">
            <label class="text-sm font-medium" style="color: #9333ea;">👥 Size:</label>
            <select id="tSize" class="px-3 py-2 text-white font-medium text-sm flex-1 rounded-lg border" style="background: rgba(0, 0, 0, 0.3); border-color: rgba(147, 51, 234, 0.3);">
              <option value="8" selected>8 Players</option>
              <option value="16">16 Players</option>
            </select>
          </div>
          <button data-action="tourn" class="w-full mb-2 px-4 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2" style="background: #9333ea; color: white;" onmouseover="this.style.background='#7c3aed'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#9333ea'; this.style.transform='translateY(0)';">🏆 Create Tournament</button>
          <button data-action="joinTourn" class="w-full mb-3 px-4 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2" style="background: #7c3aed; color: white;" onmouseover="this.style.background='#6d28d9'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#7c3aed'; this.style.transform='translateY(0)';">🎯 Join Tournament</button>
          <div class="text-xs text-center" style="color: #9333ea;">📊 Results saved to database</div>
        </div>
      </div>
    </div>
  `;

  // Add event listeners for AI slider
  setTimeout(() => {
    const aiSlider = root.querySelector('#aiSlider') as HTMLInputElement;
    const aiVal = root.querySelector('#aiVal') as HTMLSpanElement;

    if (aiSlider && aiVal) {
      aiSlider.addEventListener('input', (e) => {
        aiVal.textContent = (e.target as HTMLInputElement).value;
      });
    }

    // Add hover effects for back button
    const backBtn = root.querySelector('[data-action="back"]') as HTMLElement;
    if (backBtn) {
      backBtn.addEventListener('mouseenter', () => {
        backBtn.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
        backBtn.style.borderColor = 'rgba(107, 114, 128, 0.5)';
        backBtn.style.transform = 'translateY(-1px)';
      });
      backBtn.addEventListener('mouseleave', () => {
        backBtn.style.background = 'linear-gradient(135deg, #4b5563 0%, #374151 100%)';
        backBtn.style.borderColor = 'rgba(75, 85, 99, 0.3)';
        backBtn.style.transform = 'translateY(0)';
      });
    }
  }, 0);

  return { root, primaryHex, backgroundRgb };
}
