import { BaseModal } from './BaseModal';
import { t } from '@/langs/LanguageManager';

export class StatisticsModal extends BaseModal {
    private static instance: StatisticsModal | null = null;

    constructor() {
        super();
        // Singleton pattern
        if (StatisticsModal.instance) {
            return StatisticsModal.instance;
        }
        StatisticsModal.instance = this;
    }

    protected getModalTitle(): string {
        return `📊 ${t('Statistics')}`;
    }

protected getModalContent(): string {
    const userData = localStorage.getItem('ft_pong_user_data');
    let user = null;

    try {
        user = userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error parsing user data:', error);
    }

    if (!user) {
        return `
            <div class="text-center text-red-400">
                <p>${t('No user data found')}</p>
                <p class="text-sm text-gray-500 mt-2">${t('Please login to view your statistics')}</p>
            </div>
            <button id="close-statistics-btn" class="w-full btn-lime mt-4">
                ${t('Close')}
            </button>
        `;
    }

    const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;
    const totalGames = (user.wins || 0) + (user.losses || 0);
    const gamesPlayed = user.gamesPlayed || totalGames || 0;

    return `
        <div class="text-center mb-6">
            <div class="w-20 h-20 rounded-full bg-lime-500 flex items-center justify-center text-2xl font-bold text-gray-900 mx-auto mb-3 shadow-lg">
                ${(user.firstName || user.userName || 'U').charAt(0).toUpperCase()}
            </div>
            <h3 class="text-xl font-bold text-white">${user.firstName || ''} ${user.lastName || ''}${user.firstName && user.lastName ? '' : user.userName || 'Player'}</h3>
            <p class="text-gray-400">${user.email || 'No email'}</p>
        </div>

        <div class="space-y-4 mb-6">
            <!-- Games Statistics -->
            <div class="bg-gray-700 p-4 rounded-lg border border-gray-600 shadow-md">
                <h4 class="text-lg font-semibold text-lime-500 mb-3 flex items-center">
                    🎮 ${t('Game Statistics')}
                </h4>

                <div class="grid grid-cols-2 gap-4 text-center">
                    <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <div class="text-2xl font-bold text-white">${gamesPlayed}</div>
                        <div class="text-sm text-gray-400">${t('Games Played')}</div>
                    </div>
                    <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <div class="text-2xl font-bold text-lime-500">${winRate}%</div>
                        <div class="text-sm text-gray-400">${t('Win Rate')}</div>
                    </div>
                </div>
            </div>

            <!-- Win/Loss Record -->
            <div class="bg-gray-700 p-4 rounded-lg border border-gray-600 shadow-md">
                <h4 class="text-lg font-semibold text-lime-500 mb-3 flex items-center">
                    🏆 ${t('Record')}
                </h4>

                <div class="grid grid-cols-2 gap-4">
                    <div class="text-center bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <div class="text-3xl font-bold text-green-500">${user.wins || 0}</div>
                        <div class="text-sm text-gray-400">${t('Wins')}</div>
                    </div>
                    <div class="text-center bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <div class="text-3xl font-bold text-red-400">${user.losses || 0}</div>
                        <div class="text-sm text-gray-400">${t('Losses')}</div>
                    </div>
                </div>

                ${gamesPlayed > 0 ? `
                    <div class="mt-4">
                        <div class="flex justify-between text-sm text-gray-400 mb-1">
                            <span>${t('Win Rate Progress')}</span>
                            <span>${winRate}%</span>
                        </div>
                        <div class="w-full bg-gray-800 rounded-full h-2 border border-gray-700">
                            <div class="bg-lime-500 h-2 rounded-full transition-all duration-1000 ease-out"
                                 style="width: ${winRate}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Additional Stats -->
            <div class="bg-gray-700 p-4 rounded-lg border border-gray-600 shadow-md">
                <h4 class="text-lg font-semibold text-lime-500 mb-3 flex items-center">
                    📈 ${t('Performance')}
                </h4>

                <div class="space-y-3">
                    <div class="flex justify-between py-2 border-b border-gray-600">
                        <span class="text-gray-400">${t('Username')}:</span>
                        <span class="text-white font-medium">${user.userName || 'Not set'}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-600">
                        <span class="text-gray-400">${t('Member Since')}:</span>
                        <span class="text-white font-medium">${new Date().toLocaleDateString()}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-600">
                        <span class="text-gray-400">${t('Status')}:</span>
                        <span class="text-lime-500 font-medium flex items-center">
                            <span class="w-2 h-2 bg-lime-500 rounded-full mr-2 animate-pulse"></span>
                            ${t('Active')}
                        </span>
                    </div>
                    ${gamesPlayed > 0 ? `
                        <div class="flex justify-between py-2">
                            <span class="text-gray-400">${t('Best Streak')}:</span>
                            <span class="text-yellow-500 font-medium">${Math.max(user.wins || 0, 1)} ${t('wins')}</span>
                        </div>
                    ` : ''}
                </div>
            </div>

        <div class="flex gap-3">
            <button id="close-statistics-btn" class="flex-1 btn-lime">
                ${t('Close')}
            </button>
            ${gamesPlayed > 0 ? `
                <button id="play-again-btn" class="flex-1 btn-secondary">
                    🎮 ${t('Play Again')}
                </button>
            ` : `
                <button id="start-playing-btn" class="flex-1 btn-secondary">
                    🚀 ${t('Start Playing')}
                </button>
            `}
        </div>
    `;
}


    protected setupEventListeners(): void {
        const closeBtn = document.querySelector('#close-statistics-btn');
        const playAgainBtn = document.querySelector('#play-again-btn');
        const startPlayingBtn = document.querySelector('#start-playing-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.close();
                // Trigger play game handler
                if (typeof (window as any).handlePlayGame === 'function') {
                    (window as any).handlePlayGame();
                }
            });
        }

        if (startPlayingBtn) {
            startPlayingBtn.addEventListener('click', () => {
                this.close();
                // Trigger play game handler
                if (typeof (window as any).handlePlayGame === 'function') {
                    (window as any).handlePlayGame();
                }
            });
        }
    }

    /**
     * Show the statistics modal
     */
    public static show(): void {
        console.log('📊 StatisticsModal.show() called');
        const modal = new StatisticsModal();
        modal.showModal();
    }

    /**
     * Close the statistics modal
     */
    public static close(): void {
        const modal = StatisticsModal.instance;
        if (modal) {
            modal.close();
        }
    }

    /**
     * Check if modal is currently open
     */
    public static isOpen(): boolean {
        return StatisticsModal.instance?.isOpen() || false;
    }

    showModal(): void {
        this.show('statistics');
    }

    close(): Promise<void> {
        StatisticsModal.instance = null;
        return super.close();
    }

    /**
     * Add a render method for compatibility with component initialization
     */
    async render(): Promise<void> {
        // This method exists for compatibility but doesn't actually render
        // The modal is shown using showModal() or the static show() method
        console.log('📊 StatisticsModal render() called - use show() to display modal');
    }
}

// Make StatisticsModal globally available
(window as any).StatisticsModal = StatisticsModal;

export default StatisticsModal;
