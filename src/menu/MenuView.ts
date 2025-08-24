import { markUI } from "../ui";
import { themeBridge } from "../game/ThemeBridge";

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

  root.innerHTML = `
    <div class="p-8 rounded-3xl w-full max-w-4xl mx-4 shadow-2xl backdrop-blur-sm" style="background: rgba(${backgroundRgb}, 0.8); border: 1px solid ${primaryHex}40;">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <button data-action="back" class="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center text-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-200 border border-gray-500/30 hover:border-gray-400/50" title="← Back to Frontend">←</button>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style="background: linear-gradient(135deg, ${primaryHex} 0%, ${primaryHex}dd 100%);">🎮</div>
          <h1 class="text-3xl font-bold tracking-wide" style="background: linear-gradient(135deg, ${primaryHex} 0%, ${primaryHex}dd 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">3D Pong Game Setup</h1>
        </div>
        <div class="text-sm px-4 py-2 rounded-xl" style="background: ${primaryHex}1a; border: 1px solid ${primaryHex}50; color: ${primaryHex};">
          ${
            ctx.youName
              ? `👤 <span class="font-semibold">${ctx.youName}</span>`
              : `<span class="opacity-80">🔒 Not signed in</span>`
          }
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Local Play Card -->
        <div class="bg-gradient-to-br from-lime-500/5 to-lime-500/2 border border-lime-500/20 rounded-2xl p-5 transition-all duration-300 hover:border-lime-500/40 hover:shadow-lg hover:shadow-lime-500/10">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-6 h-6 bg-gradient-to-br from-lime-500 to-lime-600 rounded-lg flex items-center justify-center text-xs">🏠</div>
            <div class="text-lg font-semibold text-lime-500">Local Play</div>
          </div>
          <button data-action="local2" class="btn btn-primary w-full mb-4">🎮 2P Local Match</button>
          <div class="bg-black/20 rounded-xl p-4">
            <label class="block text-sm font-medium text-lime-400 mb-2">🤖 AI Difficulty</label>
            <div class="flex items-center gap-3">
              <input id="aiSlider" type="range" min="1" max="10" step="1" value="6" class="flex-1 accent-lime-500">
              <span id="aiVal" class="w-8 text-center font-semibold text-lime-500">6</span>
            </div>
            <button data-action="ai2" class="btn btn-secondary w-full mt-3">⚔️ VS AI</button>
            <!-- inside Local Play Card, after the VS AI button -->
            <button data-action="ai3" class="btn btn-secondary w-full mt-2">🧠 3 AI (4P)</button>
            <div class="text-[11px] opacity-70 mt-1">1 player vs 3 bots (uses difficulty above)</div>
          </div>
        </div>

        <!-- Online Play Card (Socket.IO only) -->
        <div class="bg-gradient-to-br from-blue-500/5 to-blue-500/2 border border-blue-500/20 rounded-2xl p-5 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-content text-xs">🌐</div>
            <div class="text-lg font-semibold text-blue-500">Online Play</div>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <button data-action="sockethost2" class="btn btn-primary">🎯 Host 2P </button>
            <button data-action="socketjoin2" class="btn btn-outline">🔗 Join 2P </button>
            <button data-action="sockethost4" class="btn btn-primary">🎯 Host 4P </button>
            <button data-action="socketjoin4" class="btn btn-outline">🔗 Join 4P </button>
          </div>
          <div class="text-xs text-blue-400 text-center">🌐 Real-time Socket.IO multiplayer</div>
        </div>

        <!-- Tournament Card -->
        <div class="bg-gradient-to-br from-purple-500/5 to-purple-500/2 border border-purple-500/20 rounded-2xl p-5 transition-all duration-300 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-xs">🏆</div>
            <div class="text-lg font-semibold text-purple-500">Tournament</div>
          </div>
          <div class="flex gap-3 items-center mb-3">
            <label class="text-sm text-purple-400 font-medium">👥 Size:</label>
            <select id="tSize" class="bg-black/30 border border-purple-500/30 rounded-lg px-3 py-2 text-white font-medium text-sm flex-1">
              <option value="8" selected>8 Players</option>
              <option value="16">16 Players</option>
            </select>
          </div>
          <button data-action="tourn" class="btn btn-primary w-full mb-3">🏆 Create Tournament</button>
          <div class="text-xs text-purple-400 text-center">📊 Results saved to database</div>
        </div>
      </div>
    </div>
  `;

  return { root, primaryHex, backgroundRgb };
}
