import { markUI } from "../../ui";
import { SocketService } from "../../services/SocketService";
import { API_BASE_URL } from "../../utils/Constants";

interface Friend {
  id: string;
  username: string;
  status: string;
}

export class FriendInviteModal {
  private modal: HTMLElement | null = null;
  private token: string;
  private socketService: SocketService | null = null;

  constructor(token: string) {
    this.token = token;
    // Try to get the socket service from window if available
    this.socketService = (window as any).socketService || null;
  }

  public async show(roomCode: string, gameMode: string, hostName: string): Promise<void> {
    // Get friends list
    const friends = await this.getFriendsList();
    if (!friends || friends.length === 0) {
      throw new Error("No online friends available");
    }

    // Filter only online friends
    const onlineFriends = friends.filter(friend => friend.status === 'online');
    if (onlineFriends.length === 0) {
      throw new Error("None of your friends are currently online");
    }

    // Create modal overlay
    this.modal = markUI(document.createElement("div"));
    this.modal.className = "fixed inset-0 grid place-items-center text-white font-sans z-[20000]";
    this.modal.style.background = "rgba(0, 0, 0, 0.8)";
    this.modal.style.backdropFilter = "blur(5px)";

    this.modal.innerHTML = `
      <div class="rounded-xl w-full max-w-md mx-4 shadow-2xl" style="background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(59, 130, 246, 0.3); padding: 24px;">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-blue-400">🎮 Invite Friends to Play</h2>
          <button class="close-modal text-gray-400 hover:text-white">✕</button>
        </div>

        <div class="mb-4">
          <p class="text-sm text-blue-300 mb-1">Room Code: <span class="font-mono font-bold">${roomCode}</span></p>
          <p class="text-sm text-blue-300">Game Type: ${gameMode.toUpperCase()}</p>
        </div>

        <div class="mb-4 border border-blue-900 rounded-lg p-3 bg-blue-900/20">
          <div class="text-sm text-blue-300 mb-2">Select friends to invite:</div>
          <div class="max-h-60 overflow-y-auto" id="friends-list">
            ${onlineFriends.map(friend => `
              <label class="flex items-center gap-2 py-2 px-1 hover:bg-blue-900/30 rounded cursor-pointer">
                <input type="checkbox" class="friend-checkbox" value="${friend.username}" data-id="${friend.id}">
                <span class="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span class="text-white">${friend.username}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="border-t border-blue-900/50 pt-4 flex justify-between">
          <button class="close-modal px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition">Cancel</button>
          <button id="send-invites" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">Send Invites</button>
        </div>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(this.modal);

    // Set up event listeners
    const closeButtons = this.modal.querySelectorAll('.close-modal');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    const sendButton = this.modal.querySelector('#send-invites');
    if (sendButton) {
      sendButton.addEventListener('click', () => {
        const selectedFriends = this.getSelectedFriends();
        if (selectedFriends.length === 0) {
          this.showError("Please select at least one friend to invite");
          return;
        }

        this.sendInvitations(selectedFriends, roomCode, gameMode, hostName);
        this.close();
      });
    }
  }

  private getSelectedFriends(): string[] {
    if (!this.modal) return [];

    const checkboxes = this.modal.querySelectorAll<HTMLInputElement>('.friend-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  }

  private sendInvitations(friends: string[], roomCode: string, gameMode: string, hostName: string): void {
    if (!this.socketService) {
      console.error("Socket service not available");
      return;
    }

    const message = `🎮 GAME INVITE: ${hostName} invites you to play ${gameMode.toUpperCase()}! Join with code: ${roomCode}`;

    friends.forEach(friend => {
      // Use the socket service to send direct messages
      this.socketService!.sendDirectMessage(friend, message);

      // Show notification
      if ((window as any).notifyBox) {
        (window as any).notifyBox.addNotification(`Invite sent to ${friend}`, 'success');
      }
    });
  }

  private close(): void {
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
      this.modal = null;
    }
  }

  private showError(message: string): void {
    if ((window as any).notifyBox) {
      (window as any).notifyBox.addNotification(message, 'error');
    } else {
      alert(message);
    }
  }

  private async getFriendsList(): Promise<Friend[]> {
    try {
      // Get user ID from local storage
      const userData = localStorage.getItem('ft_pong_user_data');
      if (!userData) {
        throw new Error("User data not found");
      }

      const user = JSON.parse(userData);
      const userId = user.id;

      if (!userId) {
        throw new Error("User ID not found");
      }

      // Fetch friends list
      const response = await fetch(`${API_BASE_URL}/relation/friends/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load friends list");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching friends list:', error);
      throw error;
    }
  }
}
