import { markUI } from "../ui";
import { themeBridge } from "../game/utils/ThemeBridge";
import { t } from "../langs"

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
  // Assign a stable id so router can find/unmount it
  root.id = 'game-menu-root';

  root.innerHTML = `
    <div class="rounded-3xl w-full max-w-4xl mx-4 shadow-2xl backdrop-blur-sm relative" style="background: rgba(${backgroundRgb}, 0.85); border: 2px solid rgba(132, 204, 22, 0.4); padding: 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(132, 204, 22, 0.2); z-index: 10;">
      <div class="flex items-center justify-between mb-8 relative z-10">
        <div class="flex items-center gap-4">
          <button data-action="back" class="w-12 h-12 rounded-xl flex items-center justify-center text-xl btn border" style="background: linear-gradient(135deg, #4b5563 0%, #374151 100%); border-color: rgba(75, 85, 99, 0.3);" title="${t('← Back to Frontend')}">
            <span>←</span>
          </button>
          <div class="menu-icon w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-lg" style="background: linear-gradient(135deg, ${primaryHex} 0%, ${primaryHex}dd 100%); box-shadow: 0 8px 25px ${primaryHex}40;">🎮</div>
          <h1 class="menu-title text-4xl font-bold tracking-wide" style="
            color: ${primaryHex};
            text-shadow:
              1px 1px 0 rgba(0,0,0,0.3),
              2px 2px 0 rgba(0,0,0,0.25),
              3px 3px 0 rgba(0,0,0,0.2),
              4px 4px 0 rgba(0,0,0,0.15),
              5px 5px 0 rgba(0,0,0,0.1),
              6px 6px 10px rgba(0,0,0,0.4),
              0 0 20px ${primaryHex}80;
            transform: perspective(500px) rotateX(5deg);
            transform-style: preserve-3d;
          ">${t('3D Pong Game Setup')}</h1>
        </div>
        <div class="text-sm px-5 py-3 rounded-xl border backdrop-blur-sm" style="background: linear-gradient(135deg, rgba(132, 204, 22, 0.15) 0%, rgba(132, 204, 22, 0.05) 100%); border: 1px solid rgba(132, 204, 22, 0.4); color: ${primaryHex};">
          ${
            ctx.youName
              ? `👤 <span class="font-bold">${ctx.youName}</span>`
              : `<span class="opacity-80">${t('🔒 Not signed in')}</span>`
          }
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <!-- Local Play Card -->
        <div class="menu-card rounded-2xl p-5 border" style="background: linear-gradient(135deg, rgba(132, 204, 22, 0.05) 0%, rgba(132, 204, 22, 0.02) 100%); border-color: rgba(132, 204, 22, 0.2);">
          <div class="flex items-center gap-2 mb-4">
            <div class="menu-icon w-6 h-6 rounded-lg flex items-center justify-center text-xs" style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%);">🏠</div>
            <div class="text-lg font-semibold" style="color: #84cc16;">${t('Local Play')}</div>
          </div>
          <button data-action="local2" class="btn btn-primary w-full mb-4 px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2" style="background: #84cc16; color: white;">🎮 ${t('2P Local Match')}</button>
          <div class="rounded-xl p-4" style="background: rgba(0, 0, 0, 0.2);">
            <label class="block text-sm font-medium mb-2" style="color: #84cc16;">${t('🤖 AI Difficulty')}</label>
            <div class="flex items-center gap-3 mb-3">
              <input id="aiSlider" type="range" min="1" max="10" step="1" value="6" class="slider-3d flex-1">
              <span id="aiVal" class="w-8 text-center font-semibold" style="color: #84cc16;">6</span>
            </div>
            <button data-action="ai2" class="btn btn-secondary w-full mb-2 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2" style="background: rgba(132, 204, 22, 0.1); border-color: rgba(132, 204, 22, 0.3); color: #84cc16;">⚔️ ${t('VS AI')}</button>
            <button data-action="ai3" class="btn btn-secondary w-full mb-2 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2" style="background: rgba(132, 204, 22, 0.1); border-color: rgba(132, 204, 22, 0.3); color: #84cc16;">🧠 ${t('3 AI (4P)')}</button>
            <div class="text-xs opacity-70 mt-1" style="color: #84cc16;">${t('1 player vs 3 bots (uses difficulty above)')}</div>
          </div>
        </div>

        <!-- Online Play Card -->
        <div class="menu-card rounded-2xl p-5 border" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%); border-color: rgba(59, 130, 246, 0.2);">
          <div class="flex items-center gap-2 mb-4">
            <div class="menu-icon w-6 h-6 rounded-lg flex items-center justify-center text-xs" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">🌐</div>
            <div class="text-lg font-semibold" style="color: #3b82f6;">${t('Online Play')}</div>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <button data-action="sockethost2" class="btn btn-primary px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-1 text-sm" style="background: #3b82f6; color: white;">🎯 ${t('Host 2P')}</button>
            <button data-action="socketjoin2" class="btn btn-outline px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-1 text-sm" style="background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: #3b82f6;">🔗 ${t('Join 2P')}</button>
            <button data-action="sockethost4" class="btn btn-primary px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-1 text-sm" style="background: #3b82f6; color: white;">🎯 ${t('Host 4P')}</button>
            <button data-action="socketjoin4" class="btn btn-outline px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-1 text-sm" style="background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: #3b82f6;">🔗 ${t('Join 4P')}</button>
          </div>
                    <div class="text-xs text-center pulse" style="color: #3b82f6;">🌐 ${t('Real-time Web socket multiplayer')}</div>
        </div>

        <!-- Tournament Card -->
        <div class="menu-card rounded-2xl p-5 border" style="background: linear-gradient(135deg, rgba(132, 204, 22, 0.05) 0%, rgba(132, 204, 22, 0.02) 100%); border-color: rgba(132, 204, 22, 0.2);">
          <div class="flex items-center gap-2 mb-4">
            <div class="menu-icon w-6 h-6 rounded-lg flex items-center justify-center text-xs" style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%);">🏆</div>
            <div class="text-lg font-semibold" style="color: #84cc16;">${t('Tournaments')}</div>
          </div>

          <div class="text-center mb-4">
            <div class="text-sm mb-3" style="color: #84cc16;">${t('Create & join competitive tournaments')}</div>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <button data-action="tournament-create" class="btn btn-primary px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2" style="background: #84cc16; color: white;">
              ➕ ${t('Create')}
            </button>
            <button data-action="tournament-join" class="btn btn-primary px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2" style="background: #22c55e; color: white;">
              🔑 ${t('Join')}
            </button>
          </div>

          <div class="text-xs text-center" style="color: #84cc16;">🤖 ${t('AI bots • Remote multiplayer • Brackets')}</div>
        </div>
      </div>
    </div>
  `;

  // Simple slider functionality
  setTimeout(() => {
    const aiSlider = root.querySelector('#aiSlider') as HTMLInputElement;
    const aiVal = root.querySelector('#aiVal') as HTMLSpanElement;

    if (aiSlider && aiVal) {
      aiSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        aiVal.textContent = value;
      });
    }
  }, 0);

  return { root, primaryHex, backgroundRgb };
}
