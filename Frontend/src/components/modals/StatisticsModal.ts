import { BaseModal } from './BaseModal';
import { t } from '../../langs/LanguageManager';
import { authService } from '../../services/AuthService';
import { UserStats } from '../../types/User';

export class StatisticsModal extends BaseModal {
	private static instance: StatisticsModal | null = null;

	constructor(private friendId?: string, private friendUsername?: string) {
		super();
		if (StatisticsModal.instance) {
			return StatisticsModal.instance;
		}
		StatisticsModal.instance = this;
	}

	protected getModalTitle(): string {
		if (this.friendUsername) {
			return t('Statistics') + ` - ${this.friendUsername}`;
		}
		return t('Statistics');
	}

	private getFriendStatisticsContent(): string {
    return `
        <div id="friend-stats-loading" class="text-center py-8">
            <div class="text-gray-400">Loading friend statistics...</div>
        </div>

        <div id="friend-stats-content" class="hidden">
            <div class="text-center mb-6">
                <div class="w-20 h-20 rounded-full bg-purple-500 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3 shadow-lg">
                    ${this.friendUsername?.charAt(0).toUpperCase() || 'F'}
                </div>
                <h3 class="text-xl font-bold text-white">${this.friendUsername || 'Friend'}</h3>
                <p class="text-gray-400">Friend Statistics</p>
            </div>

            <div class="space-y-4 mb-6">
                <!-- Games Statistics -->
                <div class="bg-gray-700 p-4 rounded-lg border border-gray-600 shadow-md">
                    <h4 class="text-lg font-semibold text-purple-500 mb-3 flex items-center">
                        🎮 ${t('Game Statistics')}
                    </h4>

                    <div class="grid grid-cols-2 gap-4 text-center">
                        <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                            <div class="text-2xl font-bold text-white" data-stat="total-games">0</div>
                            <div class="text-sm text-gray-400">${t('Games Played')}</div>
                        </div>
                        <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                            <div class="text-2xl font-bold text-purple-500" data-stat="win-rate">0%</div>
                            <div class="text-sm text-gray-400">${t('Win Rate')}</div>
                        </div>
                    </div>
                </div>

                <!-- Win/Loss Record -->
                <div class="bg-gray-700 p-4 rounded-lg border border-gray-600 shadow-md">
                    <h4 class="text-lg font-semibold text-purple-500 mb-3 flex items-center">
                        🏆 ${t('Record')}
                    </h4>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="text-center bg-gray-800 p-4 rounded-lg border border-gray-700">
                            <div class="text-3xl font-bold text-green-500" data-stat="win-count">0</div>
                            <div class="text-sm text-gray-400">${t('Wins')}</div>
                        </div>
                        <div class="text-center bg-gray-800 p-4 rounded-lg border border-gray-700">
                            <div class="text-3xl font-bold text-red-400" data-stat="loss-count">0</div>
                            <div class="text-sm text-gray-400">${t('Losses')}</div>
                        </div>
                    </div>

                    <div class="mt-4" id="win-rate-progress" style="display: none;">
                        <div class="flex justify-between text-sm text-gray-400 mb-1">
                            <span>${t('Win Rate Progress')}</span>
                            <span data-stat="win-rate">0%</span>
                        </div>
                        <div class="w-full bg-gray-800 rounded-full h-2 border border-gray-700">
                            <div class="bg-purple-500 h-2 rounded-full transition-all duration-1000 ease-out"
                                data-stat="win-rate-bar"
                                style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex gap-3">
            <button id="close-statistics-btn" class="flex-1 btn-gray">
                ${t('Close')}
            </button>
        </div>
    `;
}

public static showForFriend(friendId: string, friendUsername: string): void {

    const modal = new StatisticsModal(friendId, friendUsername);
    modal.showModal();
    // loadFriendStatistics will be called from getModalContent via setTimeout
}

private async loadFriendStatistics(): Promise<void> {

    if (!this.friendId) {

        return;
    }

    try {
        const stats = await authService.getFriendStatistics(this.friendId);

        const loadingElement = document.getElementById('friend-stats-loading');
        const contentElement = document.getElementById('friend-stats-content');

        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }

        if (contentElement) {
            contentElement.classList.remove('hidden');
        }

        if (stats) {
            setTimeout(() => {
                this.updateStatisticsInModal(stats);
                if (stats.totalGames > 0) {
                    const progressElement = document.getElementById('win-rate-progress');
                    if (progressElement) {
                        progressElement.style.display = 'block';
                    }
                }
            }, 100);
        } else {
            if (contentElement) {
                contentElement.innerHTML = `
                    <div class="text-center text-red-400 py-8">
                        <p>Unable to load friend statistics</p>
                        <p class="text-sm text-gray-500 mt-2">This friend's statistics are not available</p>
                    </div>
                `;
            }
        }
    } catch (error) {

        const loadingElement = document.getElementById('friend-stats-loading');
        const contentElement = document.getElementById('friend-stats-content');

        if (loadingElement) loadingElement.classList.add('hidden');
        if (contentElement) {
            contentElement.classList.remove('hidden');
            contentElement.innerHTML = `
                <div class="text-center text-red-400 py-8">
                    <p>Error loading statistics</p>
                    <p class="text-sm text-gray-500 mt-2">Please try again later</p>
                </div>
            `;
        }
    }
}
protected getModalContent(): string {
    const user = authService.getUser();

    if (this.friendId && this.friendUsername) {
        setTimeout(() => {
            this.loadFriendStatistics();
        }, 100);

        return this.getFriendStatisticsContent();
    }

    const statsRaw = localStorage.getItem("ft_pong_statistics");
    const stats = statsRaw ? JSON.parse(statsRaw) : null;

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

        <!-- Refresh button -->
        <div class="flex justify-end mb-4">
            <button id="refresh-stats-btn" class="btn-gray text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                🔄 ${t('Refresh')}
            </button>
        </div>

        <div class="space-y-4 mb-6">
            <!-- Games Statistics -->
            <div class="bg-gray-700 p-4 rounded-lg border border-gray-600 shadow-md">
                <h4 class="text-lg font-semibold text-lime-500 mb-3 flex items-center">
                    🎮 ${t('Game Statistics')}
                </h4>

                <div class="grid grid-cols-2 gap-4 text-center">
                    <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <div class="text-2xl font-bold text-white" data-stat="total-games">${totalGames}</div>
                        <div class="text-sm text-gray-400">${t('Games Played')}</div>
                    </div>
                    <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <div class="text-2xl font-bold text-lime-500" data-stat="win-rate">${winRate}%</div>
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
                        <div class="text-3xl font-bold text-green-500" data-stat="win-count">${winCount}</div>
                        <div class="text-sm text-gray-400">${t('Wins')}</div>
                    </div>
                    <div class="text-center bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <div class="text-3xl font-bold text-red-400" data-stat="loss-count">${lossCount}</div>
                        <div class="text-sm text-gray-400">${t('Losses')}</div>
                    </div>
                </div>

                ${totalGames > 0 ? `
                    <div class="mt-4">
                        <div class="flex justify-between text-sm text-gray-400 mb-1">
                            <span>${t('Win Rate Progress')}</span>
                            <span data-stat="win-rate">${winRate}%</span>
                        </div>
                        <div class="w-full bg-gray-800 rounded-full h-2 border border-gray-700">
                            <div class="bg-lime-500 h-2 rounded-full transition-all duration-1000 ease-out"
                                data-stat="win-rate-bar"
                                style="width: ${winRate}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>

        <div class="flex gap-3">
            <button id="close-statistics-btn" class="flex-1 btn-gray">
                ${t('Close')}
            </button>
        </div>
    `;
}

	protected setupEventListeners(): void {
		const closeBtn = document.querySelector('#close-statistics-btn');
		const playAgainBtn = document.querySelector('#play-again-btn');
		const startPlayingBtn = document.querySelector('#start-playing-btn');
		const refreshStatsBtn = document.querySelector('#refresh-stats-btn');

		if (closeBtn) {
			closeBtn.addEventListener('click', (e) => { e.preventDefault(); window.history.back(); });
		}

		if (playAgainBtn) {
			playAgainBtn.addEventListener('click', () => {
				this.close();
				if (typeof (window as any).handlePlayGame === 'function') {
					(window as any).handlePlayGame();
				}
			});
		}

		if (startPlayingBtn) {
			startPlayingBtn.addEventListener('click', () => {
				this.close();
				if (typeof (window as any).handlePlayGame === 'function') {
					(window as any).handlePlayGame();
				}
			});
		}

		if (refreshStatsBtn) {
			refreshStatsBtn.addEventListener('click', async () => {
				const btn = refreshStatsBtn as HTMLButtonElement;

				// Show loading state
				const originalText = btn.innerHTML;
				btn.innerHTML = '⏳ Loading...';
				btn.classList.add('opacity-50', 'cursor-not-allowed');
				btn.setAttribute('disabled', 'true');

				try {
					const updatedStats = await authService.refreshStatistics();

					if (updatedStats) {
						this.updateStatisticsInModal(updatedStats); // ✅ update live

						btn.innerHTML = '✅ Refreshed';
						setTimeout(() => {
							btn.innerHTML = originalText;
							btn.classList.remove('opacity-50', 'cursor-not-allowed');
							btn.removeAttribute('disabled');
						}, 1500);
					} else {
						throw new Error('Failed to refresh statistics');
					}
				} catch (error) {

					btn.innerHTML = '❌ Error';
					setTimeout(() => {
						btn.innerHTML = originalText;
						btn.classList.remove('opacity-50', 'cursor-not-allowed');
						btn.removeAttribute('disabled');
					}, 1500);
				}
			});
		}

	}

	public static show(): void {

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

	showModal(): Promise<void> {
		return this.show('statistics');
	}
	close(): Promise<void> {
		StatisticsModal.instance = null;
		return super.close();
	}

	public render(): void {
		const modalContent = this.getModalContent();
		// Your existing modal rendering logic here
		// Example:
		const modalElement = document.getElementById('statistics-modal');
		if (modalElement) {
			modalElement.innerHTML = modalContent;
			this.setupEventListeners(); // Re-attach event listeners after re-render
		}

	}

protected updateStatisticsInModal(stats: UserStats): void {

    const totalGamesElement = document.querySelector('[data-stat="total-games"]');
    const winCountElement = document.querySelector('[data-stat="win-count"]');
    const lossCountElement = document.querySelector('[data-stat="loss-count"]');
    const winRateElements = document.querySelectorAll('[data-stat="win-rate"]');
    const winRateBarElement = document.querySelector('[data-stat="win-rate-bar"]');

    const totalGames = stats.totalGames || 0;
    const winCount = stats.winCount || 0;
    const lossCount = stats.lossCount || 0;
    const winRate = totalGames > 0 ? Math.round((winCount / totalGames) * 100) : 0;

    if (totalGamesElement) {
        totalGamesElement.textContent = totalGames.toString();
    }

    if (winCountElement) {
        winCountElement.textContent = winCount.toString();
    }

    if (lossCountElement) {
        lossCountElement.textContent = lossCount.toString();
    }

    // Update all win rate elements (there might be multiple)
    winRateElements.forEach(element => {
        element.textContent = `${winRate}%`;
    });

    if (winRateBarElement) {
        (winRateBarElement as HTMLElement).style.width = `${winRate}%`;
    }
}

}

(window as any).StatisticsModal = StatisticsModal;

export default StatisticsModal;
