import { BaseModal } from './BaseModal';
import { languageManager, t } from '../../langs/LanguageManager';
import { authService } from '../../services/AuthService';

export class RequestModal extends BaseModal {
  private requests: any[] = [];
  private currentUser: any = null;

  constructor() {
    super();
  }

  protected getModalTitle(): string {
    return t('Friend Requests');
  }


  protected getModalContent(): string {
    if (this.requests.length === 0) {
      return `
        <div class="text-center py-8">
          <p class="text-gray-400">${t('No pending requests.')}</p>
        </div>
        <div class="flex justify-end mt-6">
          <button id="close-requests" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors">
            ${t('Close')}
          </button>
        </div>
      `;
    }

    const requestsList = this.requests
      .map((request) => `
        <div class="flex items-center justify-between bg-gray-700 rounded-lg p-4 mb-3">
          <div class="flex items-center">
            <div class="w-10 h-10 bg-lime-500 rounded-full flex items-center justify-center text-white font-bold">
              ${this.getInitials(request.username)}
            </div>
            <div class="ml-3">
              <p class="text-white font-medium">${this.escapeHtml(request.username)}</p>
              <p class="text-gray-400 text-sm">${t('Friend request')}</p>
            </div>
          </div>
          <div class="flex gap-3">
            <button
              data-username="${this.escapeHtml(request.username)}"
              class="accept-request text-green-500 hover:text-green-400 text-2xl font-bold transition-colors"
              title="${t('Accept')}"
            >
              ✓
            </button>
            <button
              data-username="${this.escapeHtml(request.username)}"
              class="reject-request text-red-500 hover:text-red-400 text-2xl font-bold transition-colors"
              title="${t('Reject')}"
            >
              ✕
            </button>
            <button
              data-username="${this.escapeHtml(request.username)}"
              class="block-request text-yellow-500 hover:text-yellow-400 text-2xl font-bold transition-colors"
              title="${t('Block')}"
            >
              🚫
            </button>
          </div>
        </div>
      `)
      .join('');

    return `
      <div class="max-h-96 overflow-y-auto">
        ${requestsList}
      </div>
      <div class="flex justify-end mt-6">
        <button id="close-requests" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors">
          ${t('Close')}
        </button>
      </div>
    `;
  }

  protected setupEventListeners(): void {
    const closeBtn = document.getElementById('close-requests');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    document.querySelectorAll('.accept-request').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const username = (e.target as HTMLElement).getAttribute('data-username');
        if (username) {
          await this.acceptRequest(username);
        }
      });
    });

    document.querySelectorAll('.reject-request').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const username = (e.target as HTMLElement).getAttribute('data-username');
        if (username) {
          await this.rejectRequest(username);
        }
      });
    });

    document.querySelectorAll('.block-request').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const username = (e.target as HTMLElement).getAttribute('data-username');
        if (username) {
          await this.blockRequest(username);
        }
      });
    });
  }


private async rejectRequest(username: string): Promise<void> {
  if (!this.currentUser?.userName) {
    this.showToast('error', 'Error', 'User not authenticated');
    return;
  }

  try {
    const response = await authService.removeFriend(this.currentUser.userName, username);

    if (response.success) {
      this.showToast('success', 'Success', `Friend request from ${username} rejected`);

      this.requests = this.requests.filter(req => req.username !== username);

      this.updateContent();
      this.setupEventListeners();

      this.triggerFriendsRefresh();
    } else {
      this.showToast('error', 'Error', response.message || 'Failed to reject friend request');
    }
  } catch (error) {
    console.error('Error rejecting request:', error);
    this.showToast('error', 'Error', 'Network error while rejecting request');
  }
}


  async showRequests(): Promise<void> {
    this.currentUser = this.getCurrentUser();
    if (!this.currentUser) {
      console.error('No current user found');
      return;
    }

    try {
      await this.loadRequests();
      await this.show('friend-requests');
    } catch (error) {
      console.error('Error showing requests modal:', error);
      this.showToast('error', 'Error', 'Failed to load friend requests');
    }
  }

  private async loadRequests(): Promise<void> {
    if (!this.currentUser?.id) {
      this.requests = [];
      return;
    }

    try {
      const response = await authService.getFriendRequests(this.currentUser.id);
      if (response.success && response.data) {
        this.requests = response.data;
      } else {
        console.error('Failed to load requests:', response.message);
        this.requests = [];
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      this.requests = [];
    }
  }

  private async acceptRequest(username: string): Promise<void> {
    if (!this.currentUser?.userName) {
      this.showToast('error', 'Error', 'User not authenticated');
      return;
    }

    try {
      const response = await authService.acceptFriendRequest(username, this.currentUser.userName);

      if (response.success) {
        this.showToast('success', 'Success', `Friend request from ${username} accepted!`);

        this.requests = this.requests.filter(req => req.username !== username);

        this.updateContent();
        this.setupEventListeners();

        this.triggerFriendsRefresh();
      } else {
        this.showToast('error', 'Error', response.message || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      this.showToast('error', 'Error', 'Network error while accepting request');
    }
  }

private async blockRequest(username: string): Promise<void> {
  if (!this.currentUser?.userName) {
    this.showToast('error', 'Error', 'User not authenticated');
    return;
  }

  try {
    const response = await authService.blockUserFromRequest(username, this.currentUser.userName);

    if (response.success) {
      this.showToast('success', 'Success', `User ${username} has been blocked`);

      this.requests = this.requests.filter(req => req.username !== username);

      this.updateContent();
      this.setupEventListeners();
    } else {
      this.showToast('error', 'Error', response.message || 'Failed to block user');
    }
  } catch (error) {
    console.error('Error blocking user:', error);
    this.showToast('error', 'Error', 'Network error while blocking user');
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
