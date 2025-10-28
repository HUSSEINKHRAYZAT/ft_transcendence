
export class Navbar {
  private container: HTMLElement | null = null;
  private isRendered: boolean = false;

  constructor() {
    this.container = document.getElementById('navbar');
  }

  async render(): Promise<void> {
    if (!this.container) {

      return;
    }

    try {
      this.container.innerHTML = this.getNavbarHTML();
      this.setupEventListeners();
      this.isRendered = true;

    } catch (error) {

    }
  }

  private getNavbarHTML(): string {
    return `
      <div class="bg-gray-800 border-b border-gray-700">
        <div class="container mx-auto px-4">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center">
              <img src="https://img.icons8.com/color/48/ping-pong.png" alt="Pong Icon" class="w-6 h-6 mr-2">
              <span class="text-2xl font-bold text-lime-500">FT_PONG</span>
            </div>
            <div class="flex space-x-4">
              <button id="nav-home" class="px-3 py-2 rounded-md text-sm font-medium text-lime-500 bg-gray-700">HOME</button>
              <button id="nav-about" class="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-lime-500 transition-colors duration-300">ABOUT US</button>
              <button id="nav-project" class="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-lime-500 transition-colors duration-300">PROJECT</button>
            </div>
            <div>
              <button id="nav-login" class="bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">Login</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    const aboutBtn = document.getElementById('nav-about');
    const projectBtn = document.getElementById('nav-project');
    const loginBtn = document.getElementById('nav-login');

    if (aboutBtn) {
      aboutBtn.addEventListener('click', () => this.showInfoModal('about'));
    }

    if (projectBtn) {
      projectBtn.addEventListener('click', () => this.showInfoModal('project'));
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.showLoginModal());
    }
  }

  private showInfoModal(type: string): void {

    if ((window as any).modalService && (window as any).modalService.showInfoModal) {
      (window as any).modalService.showInfoModal(type);
    } else {

      alert(`${type} information - Modal service not loaded`);
    }
  }

  private showLoginModal(): void {

    if ((window as any).modalService && (window as any).modalService.showLoginModal) {
      (window as any).modalService.showLoginModal();
    } else {

      alert('Login - Modal service not loaded');
    }
  }

  updateAuthState(isAuthenticated: boolean, user?: any): void {
    if (!this.isRendered) return;

    const loginBtn = document.getElementById('nav-login');
    if (loginBtn && isAuthenticated && user) {
      loginBtn.textContent = `Hi, ${user.firstName}`;
      loginBtn.className = 'bg-dark-green-600 hover:bg-dark-green-700 text-white font-bold py-2 px-4 rounded transition-all duration-300';
    } else if (loginBtn) {
      loginBtn.textContent = 'Login';
      loginBtn.className = 'bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300';
    }
  }

  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.isRendered = false;

  }
}
