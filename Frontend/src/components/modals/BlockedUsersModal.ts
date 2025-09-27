import { BaseModal } from './BaseModal';
import { languageManager, t } from '../../langs/LanguageManager';
import { authService } from '../../services/AuthService';

export class BlockedUsersModal extends BaseModal {
  private blockedUsers: any[] = [];
  private currentUser: any = null;

  constructor() {
    super();
  }

  protected getModalTitle(): string {
    return t('Blocked Users');
  }

  protected getModalContent(): string {
    if (this.blockedUsers.length === 0) {
      return `
        <div class="text-center py-8">
          <p class="text-gray-400">${t('No blocked users.')}</p>
        </div>
        <div class="flex justify-end mt-6">
          <button id="close-blocked-users" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors">
            ${t('Close')}
          </button>
        </div>
      `;
    }

    const blockedUsersList = this.blockedUsers
      .map((user) => `
        <div class="flex items-center justify-between bg-gray-700 rounded-lg p-4 mb-3">
          <div class="flex items-center">
            <div class="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
              ${this.getInitials(user.username)}
            </div>
            <div class="ml-3">
              <p class="text-white font-medium">${this.escapeHtml(user.username)}</p>
              <p class="text-gray-400 text-sm">${t('Blocked user')}</p>
            </div>
          </div>
          <div class="flex gap-3">
            <button
              data-username="${this.escapeHtml(user.username)}"
              class="unblock-user text-gray-400 hover:text-green-400 text-2xl font-bold transition-colors"
              title="${t('Unblock')}"
            >
              🔓
            </button>
          </div>
        </div>
      `)
      .join('');

    return `
      <div class="max-h-96 overflow-y-auto">
        ${blockedUsersList}
      </div>
      <div class="flex justify-end mt-6">
        <button id="close-blocked-users" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors">
          ${t('Close')}
        </button>
      </div>
    `;
  }

  protected setupEventListeners(): void {
    const closeBtn = document.getElementById('close-blocked-users');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    document.querySelectorAll('.unblock-user').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const username = (e.target as HTMLElement).getAttribute('data-username');
        if (username) {
          await this.unblockUser(username);
        }
      });
    });
  }

  async showBlockedUsers(): Promise<void> {
    this.currentUser = this.getCurrentUser();
    if (!this.currentUser) {
      console.error('No current user found');
      return;
    }

    try {
      await this.loadBlockedUsers();
      await this.show('blocked-users');
    } catch (error) {
      console.error('Error showing blocked users modal:', error);
      this.showToast('error', 'Error', 'Failed to load blocked users');
    }
  }

  private async loadBlockedUsers(): Promise<void> {
    if (!this.currentUser?.id) {
      this.blockedUsers = [];
      return;
    }

    try {
      const response = await authService.getBlockedUsers(this.currentUser.id);
      if (response.success && response.data) {
        this.blockedUsers = response.data;
      } else {
        console.error('Failed to load blocked users:', response.message);
        this.blockedUsers = [];
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
      this.blockedUsers = [];
    }
  }

  private async unblockUser(username: string): Promise<void> {
    if (!this.currentUser?.userName) {
      this.showToast('error', 'Error', 'User not authenticated');
      return;
    }

    try {
      const response = await authService.removeFriend(this.currentUser.userName, username);

      if (response.success) {
        this.showToast('success', 'Success', `User ${username} has been unblocked`);

        this.blockedUsers = this.blockedUsers.filter(user => user.username !== username);

        this.updateContent();
        this.setupEventListeners();

        this.triggerFriendsRefresh();
      } else {
        this.showToast('error', 'Error', response.message || 'Failed to unblock user');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      this.showToast('error', 'Error', 'Network error while unblocking user');
    }
  }

  private getInitials(username: string): string {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private triggerFriendsRefresh(): void {
    window.dispatchEvent(new CustomEvent('friends-list-changed'));
  }
}
