import { clearPongUI } from "./src/ui";
import { Menu } from "./src/menu";
import { Pong3D } from "./src/game/Pong3D";

window.addEventListener("load", async () => {
  clearPongUI();
  const cfg = await Menu.render();
  new Pong3D(cfg);
});
