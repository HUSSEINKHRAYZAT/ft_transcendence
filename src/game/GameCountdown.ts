import { markUI } from "../ui";

export interface CountdownOptions {
  onComplete?: () => void;
  onTick?: (count: number) => void;
}

export class GameCountdown {
  private countdownElement?: HTMLDivElement;

  constructor(private options: CountdownOptions = {}) {}

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.showCountdownOverlay();
      this.runCountdown(() => {
        this.hideCountdownOverlay();
        this.options.onComplete?.();
        resolve();
      });
    });
  }

  private showCountdownOverlay() {
    const overlay = markUI(document.createElement("div"));
    overlay.className =
      "fixed inset-0 grid place-items-center bg-black/80 text-white z-[10001] font-sans select-none backdrop-blur-sm";
    
    const countdownContainer = document.createElement("div");
    countdownContainer.className = 
      "flex flex-col items-center gap-6 px-8 py-10 bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-3xl shadow-2xl border border-lime-500/30";
    countdownContainer.style.fontFamily = "'Orbitron', system-ui, sans-serif";
    countdownContainer.style.boxShadow = 
      "0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(132, 204, 22, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)";

    const titleText = document.createElement("div");
    titleText.className = "text-2xl font-bold text-lime-400 tracking-wide uppercase";
    titleText.textContent = "Get Ready!";

    const countdownNumber = document.createElement("div");
    countdownNumber.id = "countdownNumber";
    countdownNumber.className = 
      "text-8xl font-black text-white leading-none transition-all duration-300 transform";
    countdownNumber.style.textShadow = "0 4px 16px rgba(132, 204, 22, 0.5)";
    countdownNumber.textContent = "3";

    const instructionText = document.createElement("div");
    instructionText.className = "text-lg text-gray-300 text-center max-w-md";
    instructionText.textContent = "Use arrow keys to control your paddle";

    countdownContainer.append(titleText, countdownNumber, instructionText);
    overlay.appendChild(countdownContainer);
    document.body.appendChild(overlay);
    
    this.countdownElement = overlay as HTMLDivElement;
  }

  private runCountdown(onComplete: () => void) {
    const countdownNumbers = [3, 2, 1];
    let currentIndex = 0;

    const tick = () => {
      const numberElement = document.getElementById("countdownNumber");
      if (!numberElement || !this.countdownElement) return;

      if (currentIndex < countdownNumbers.length) {
        const count = countdownNumbers[currentIndex];
        this.options.onTick?.(count);
        
        // Update number with animation
        numberElement.style.transform = "scale(0.5)";
        numberElement.style.opacity = "0.5";
        
        setTimeout(() => {
          numberElement.textContent = count.toString();
          numberElement.style.transform = "scale(1.2)";
          numberElement.style.opacity = "1";
          
          setTimeout(() => {
            numberElement.style.transform = "scale(1)";
          }, 100);
        }, 100);
        
        currentIndex++;
        setTimeout(tick, 1000);
      } else {
        // Show "GO!"
        numberElement.style.transform = "scale(0.5)";
        numberElement.style.opacity = "0.5";
        
        setTimeout(() => {
          numberElement.textContent = "GO!";
          numberElement.className = 
            "text-6xl font-black text-lime-400 leading-none transition-all duration-300 transform";
          numberElement.style.textShadow = "0 4px 16px rgba(132, 204, 22, 0.8)";
          numberElement.style.transform = "scale(1.3)";
          numberElement.style.opacity = "1";
          
          setTimeout(() => {
            numberElement.style.transform = "scale(1)";
            setTimeout(onComplete, 500);
          }, 100);
        }, 100);
      }
    };

    // Start the countdown
    tick();
  }

  private hideCountdownOverlay() {
    if (this.countdownElement) {
      this.countdownElement.style.opacity = "0";
      this.countdownElement.style.transform = "scale(0.9)";
      this.countdownElement.style.transition = "opacity 300ms ease-out, transform 300ms ease-out";
      
      setTimeout(() => {
        this.countdownElement?.remove();
        this.countdownElement = undefined;
      }, 300);
    }
  }
}