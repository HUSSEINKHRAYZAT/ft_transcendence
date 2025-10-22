/**
 * Custom Confirmation Dialog
 * Replaces browser's default confirm() with a styled modal matching the site design
 */

export class ConfirmDialog {
  private static instance: ConfirmDialog | null = null;
  private overlay: HTMLElement | null = null;
  private resolveCallback: ((value: boolean) => void) | null = null;

  private constructor() {}

  static getInstance(): ConfirmDialog {
    if (!ConfirmDialog.instance) {
      ConfirmDialog.instance = new ConfirmDialog();
    }
    return ConfirmDialog.instance;
  }

  /**
   * Show a confirmation dialog
   * @param message - The message to display
   * @param title - Optional title (default: "Confirm")
   * @param confirmText - Text for confirm button (default: "Yes")
   * @param cancelText - Text for cancel button (default: "No")
   * @returns Promise<boolean> - true if confirmed, false if cancelled
   */
  show(
    message: string,
    title: string = 'Confirm',
    confirmText: string = 'Yes',
    cancelText: string = 'No'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.createOverlay(message, title, confirmText, cancelText);
    });
  }

  private createOverlay(
    message: string,
    title: string,
    confirmText: string,
    cancelText: string
  ): void {
    // Remove existing overlay if any
    this.cleanup();

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'confirm-dialog-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 99999;
      animation: fadeIn 0.2s ease-out;
    `;

    // Create dialog box
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog-box';
    dialog.style.cssText = `
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      border: 2px solid rgba(132, 204, 22, 0.3);
      border-radius: 16px;
      padding: 0;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 
                  0 0 40px rgba(132, 204, 22, 0.15);
      animation: slideIn 0.3s ease-out;
      overflow: hidden;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(135deg, rgba(132, 204, 22, 0.15) 0%, rgba(132, 204, 22, 0.05) 100%);
      border-bottom: 1px solid rgba(132, 204, 22, 0.2);
      padding: 20px 24px;
    `;
    header.innerHTML = `
      <h3 style="
        margin: 0;
        color: #84cc16;
        font-size: 20px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <span style="font-size: 24px;">⚠️</span>
        ${this.escapeHtml(title)}
      </h3>
    `;

    // Create content
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 24px;
      color: #e5e7eb;
      font-size: 16px;
      line-height: 1.6;
    `;
    content.textContent = message;

    // Create footer with buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 20px 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(132, 204, 22, 0.1);
    `;

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = cancelText;
    cancelBtn.className = 'confirm-dialog-btn-cancel';
    cancelBtn.style.cssText = `
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid rgba(107, 114, 128, 0.5);
      background: rgba(55, 65, 81, 0.5);
      color: #d1d5db;
    `;
    cancelBtn.onmouseover = () => {
      cancelBtn.style.background = 'rgba(75, 85, 99, 0.7)';
      cancelBtn.style.borderColor = 'rgba(156, 163, 175, 0.5)';
    };
    cancelBtn.onmouseout = () => {
      cancelBtn.style.background = 'rgba(55, 65, 81, 0.5)';
      cancelBtn.style.borderColor = 'rgba(107, 114, 128, 0.5)';
    };
    cancelBtn.onclick = () => this.handleResponse(false);

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmText;
    confirmBtn.className = 'confirm-dialog-btn-confirm';
    confirmBtn.style.cssText = `
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid rgba(132, 204, 22, 0.5);
      background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%);
      color: white;
    `;
    confirmBtn.onmouseover = () => {
      confirmBtn.style.background = 'linear-gradient(135deg, #65a30d 0%, #4d7c0f 100%)';
      confirmBtn.style.transform = 'translateY(-1px)';
      confirmBtn.style.boxShadow = '0 4px 12px rgba(132, 204, 22, 0.3)';
    };
    confirmBtn.onmouseout = () => {
      confirmBtn.style.background = 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)';
      confirmBtn.style.transform = 'translateY(0)';
      confirmBtn.style.boxShadow = 'none';
    };
    confirmBtn.onclick = () => this.handleResponse(true);

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(content);
    dialog.appendChild(footer);
    this.overlay.appendChild(dialog);

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    this.overlay.appendChild(style);

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.handleResponse(false);
      }
    });

    // Close on ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.handleResponse(false);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Add to DOM
    document.body.appendChild(this.overlay);

    // Focus confirm button
    setTimeout(() => confirmBtn.focus(), 100);
  }

  private handleResponse(confirmed: boolean): void {
    if (this.resolveCallback) {
      this.resolveCallback(confirmed);
      this.resolveCallback = null;
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export a convenient function to use the dialog
export async function showConfirmDialog(
  message: string,
  title?: string,
  confirmText?: string,
  cancelText?: string
): Promise<boolean> {
  const dialog = ConfirmDialog.getInstance();
  return dialog.show(message, title, confirmText, cancelText);
}
