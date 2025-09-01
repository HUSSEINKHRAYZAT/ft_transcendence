import { BaseModal } from './BaseModal';
import { t } from '../../langs/LanguageManager';
import { authService } from '../../services/AuthService';
import { stat } from 'fs';

export class StatisticsModal extends BaseModal {
    private static instance: StatisticsModal | null = null;

    constructor() {
        super();
        if (StatisticsModal.instance) {
            return StatisticsModal.instance;
        }
        StatisticsModal.instance = this;
    }

    protected getModalTitle(): string {
        return `📊 ${t('Statistics')}`;
    }

    protected getModalContent(): string {
    const user = authService.getUser();
    const statsRaw = localStorage.getItem("ft_pong_statistics");
    const stats = statsRaw ? JSON.parse(statsRaw) : null; // parse JSON safely

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

        // safe defaults
        const totalGames = stats?.totalGames || 0;
        const winCount = stats?.winCount || 0;
        const lossCount = stats?.lossCount || 0;
        const winRate = totalGames > 0 ? Math.round((winCount / totalGames) * 100) : 0;

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
                            <div class="text-2xl font-bold text-white">${totalGames}</div>
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
                            <div class="text-3xl font-bold text-green-500">${winCount}</div>
                            <div class="text-sm text-gray-400">${t('Wins')}</div>
                        </div>
                        <div class="text-center bg-gray-800 p-4 rounded-lg border border-gray-700">
                            <div class="text-3xl font-bold text-red-400">${lossCount}</div>
                            <div class="text-sm text-gray-400">${t('Losses')}</div>
                        </div>
                    </div>

                    ${totalGames > 0 ? `
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

                <!-- Additional stats... -->
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

    public static show(): void {
        console.log('📊 StatisticsModal.show() called');
        const modal = new StatisticsModal();
        modal.showModal();
    }

    public static close(): void {
        const modal = StatisticsModal.instance;
        if (modal) {
            modal.close();
        }
    }

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

    async render(): Promise<void> {
        console.log('📊 StatisticsModal render() called - use show() to display modal');
    }
}
(window as any).StatisticsModal = StatisticsModal;

export default StatisticsModal;
