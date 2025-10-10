import { languageManager, t } from '../../langs/LanguageManager';
import { RequestModal } from '../modals/RequestModal';
import { authService } from '../../services/AuthService';
import { BlockedUsersModal } from '../modals/BlockedUsersModal';



interface ChatMessage {
    id: string;
    from: string;
    to: string;
    text: string;
    timestamp: Date;
    isOwn: boolean;
}

export class FriendsBox {
    private container: HTMLElement | null = null;
    private blockedUsersModal: BlockedUsersModal;
    private isRendered: boolean = false;
    private unsubscribeLanguageChange?: () => void;
    private requestModal: RequestModal;
    private friendsData: any[] = [];
    private pendingMessages: Map<string, number> = new Map();
    private notificationContainer: HTMLElement | null = null;

    private activeChatUser: string | null = null;
    private chatMessages: Map<string, ChatMessage[]> = new Map();
    private processedMessageIds: Set<string> = new Set();
    private lastMessageContent: Map<string, string> = new Map();
    private refreshTimeout: number | null = null;

    private boundHandleFriendStatusChange!: (event: Event) => void;
    private boundHandleDirectMessageReceived!: (event: Event) => void;
    private boundHandleDirectMessageSent!: (event: Event) => void;
    private boundHandleFriendsListChanged!: () => void;
    private boundHandleThemeChange!: (event: Event) => void;
    private boundHandleSocketReconnected!: (event: Event) => void;
    private boundHandleCloseChatIfActive!: (event: Event) => void;

    constructor() {
        this.container = document.getElementById("friends-box");
        this.requestModal = new RequestModal();
        this.blockedUsersModal = new BlockedUsersModal();
        this.boundHandleThemeChange = this.handleThemeChange.bind(this);
        window.addEventListener('theme-changed', this.boundHandleThemeChange);

        // Bind event handlers once
        this.boundHandleFriendStatusChange = this.handleFriendStatusChange.bind(this);
        this.boundHandleDirectMessageReceived = this.handleDirectMessageReceived.bind(this);
        this.boundHandleDirectMessageSent = this.handleDirectMessageSent.bind(this);
        this.boundHandleFriendsListChanged = () => {
            this.loadAndRenderFriends().catch(() => {});
        };
        this.boundHandleSocketReconnected = () => {
            this.handleReconnection();
            this.loadAndRenderFriends().catch(() => {});
        };

        this.boundHandleCloseChatIfActive = this.handleCloseChatIfActive.bind(this);

        this.unsubscribeLanguageChange = languageManager.onLanguageChange(() => {
            if (this.isRendered) {
                this.updateContent();
                this.setupEventListeners();
                this.loadAndRenderFriends().catch(() => {});
                this.loadMessagesFromStorage();
            }
        });

        window.addEventListener('friends-list-changed', this.boundHandleFriendsListChanged);
        window.addEventListener('friend-status-change', this.boundHandleFriendStatusChange);
        window.addEventListener('direct-message-received', this.boundHandleDirectMessageReceived);
        window.addEventListener('direct-message-sent', this.boundHandleDirectMessageSent);
        window.addEventListener('socket-reconnected', this.boundHandleSocketReconnected);
        window.addEventListener('close-chat-if-active', this.boundHandleCloseChatIfActive); // NEW
        this.loadMessagesFromStorage();
    }

    private handleThemeChange(): void {
    if (this.activeChatUser) {
        this.renderChatMessages();
    }
    }

    private handleFriendStatusChange(event: Event): void {
        const customEvent = event as CustomEvent;
        const { username, status } = customEvent.detail;
        console.log(`Friend status update: ${username} is ${status}`);

        this.updateFriendStatus(username, status);

        if (this.isRendered) {
            if (this.refreshTimeout) {
                clearTimeout(this.refreshTimeout);
            }
            this.refreshTimeout = window.setTimeout(() => {
                this.loadAndRenderFriends().catch(err => {
                    console.error("Error refreshing friends list after status change:", err);
                });
                this.refreshTimeout = null;
            }, 300);
        }
    }

    private handleDirectMessageReceived(event: Event): void {
        const customEvent = event as CustomEvent;
        const { from, text, messageId, timestamp } = customEvent.detail;

        console.log(`📨 Message received from: ${from} - "${text}"`);

        const msgId = messageId || `${from}_${text}_${Date.now()}`;
        const messageKey = `${from}_received`;
        const lastMessage = this.lastMessageContent.get(messageKey);

        if (this.processedMessageIds.has(msgId) || lastMessage === text) {
            console.log('📨 Duplicate message detected, ignoring');
            return;
        }

        this.processedMessageIds.add(msgId);
        if (this.processedMessageIds.size > 500) {
            const first = this.processedMessageIds.values().next().value;
            this.processedMessageIds.delete(first);
        }
        this.lastMessageContent.set(messageKey, text);

        const message: ChatMessage = {
            id: msgId,
            from: from,
            to: 'me',
            text: text,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            isOwn: false
        };

        this.addMessageToChat(from, message);

        if (this.activeChatUser !== from) {
            this.incrementPendingMessageCount(from);
            this.updateFriendMessageIndicator(from);
        } else {
            this.renderChatMessages();
        }

        const friendExists = this.friendsData.some(f => f.username === from);
        if (!friendExists) {
            this.loadAndRenderFriends().catch(err => {
                console.error("Error refreshing friends list after message:", err);
            });
        } else {
            this.removeDuplicateFriendCards();
        }
    }

    private handleDirectMessageSent(event: Event): void {
            const customEvent = event as CustomEvent;
            const { to, text, messageId, timestamp } = customEvent.detail;

            console.log(`📤 Message sent to: ${to} - "${text}"`);

            const msgId = messageId || `sent_${Date.now()}`;
            const messageKey = `${to}_sent`;
            const lastMessage = this.lastMessageContent.get(messageKey);

            if (this.processedMessageIds.has(msgId) || lastMessage === text) {
                console.log('📤 Duplicate sent message detected, ignoring');
                return;
            }

            this.processedMessageIds.add(msgId);
            if (this.processedMessageIds.size > 500) {
                const first = this.processedMessageIds.values().next().value;
                this.processedMessageIds.delete(first);
            }
            this.lastMessageContent.set(messageKey, text);

            const message: ChatMessage = {
                id: msgId,
                from: 'me',
                to: to,
                text: text,
                timestamp: timestamp ? new Date(timestamp) : new Date(),
                isOwn: true
            };

            this.addMessageToChat(to, message);

            if (this.activeChatUser === to) {
                this.renderChatMessages();
                setTimeout(() => {
                    const chatMessages = document.getElementById('chat-messages');
                    if (chatMessages) {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                }, 100);
            }
        }

    private addMessageToChat(username: string, message: ChatMessage): void {
        if (!this.chatMessages.has(username)) {
            this.chatMessages.set(username, []);
        }

        const messages = this.chatMessages.get(username)!;

        const isDuplicate = messages.some(msg =>
            msg.text === message.text &&
            msg.isOwn === message.isOwn &&
            Math.abs(msg.timestamp.getTime() - message.timestamp.getTime()) < 5000 // Within 5 seconds
        );

        if (isDuplicate) {
            console.log('💬 Duplicate message in chat history, skipping');
            return;
        }

        messages.push(message);

        if (messages.length > 50) {
            messages.splice(0, messages.length - 50);
        }

        this.saveMessagesToStorage();
    }

    private incrementPendingMessageCount(username: string): void {
        const currentCount = this.pendingMessages.get(username) || 0;
        this.pendingMessages.set(username, currentCount + 1);
    }

    private clearPendingMessageCount(username: string): void {
        this.pendingMessages.delete(username);
        this.updateFriendMessageIndicator(username);
    }

    private updateFriendMessageIndicator(username: string): void {
        const count = this.pendingMessages.get(username) || 0;
        const friendCards = this.container?.querySelectorAll('.friend-card') || [];

        friendCards.forEach((card) => {
            const usernameElement = card.querySelector('.friend-username');

            if (usernameElement?.textContent?.includes(`@${username}`)) {
                let messageIndicator = card.querySelector('.message-indicator');

                if (!messageIndicator && count > 0) {
                    const actionButtons = card.querySelector('.friend-actions');
                    if (actionButtons) {
                        const indicatorDiv = document.createElement('div');
                        indicatorDiv.className = 'message-indicator bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center mr-2';
                        indicatorDiv.textContent = count.toString();
                        actionButtons.insertBefore(indicatorDiv, actionButtons.firstChild);
                    }
                } else if (messageIndicator) {
                    if (count > 0) {
                        messageIndicator.textContent = count.toString();
                        messageIndicator.classList.remove('hidden');
                    } else {
                        messageIndicator.classList.add('hidden');
                    }
                }
            }
        });
    }

    private updateFriendStatus(username: string, status: string): void {

        const friendIndex = this.friendsData.findIndex(f => f.username === username);
        if (friendIndex !== -1) {
            this.friendsData[friendIndex].status = status;
        } else {
            return;
        }

        const friendCards = this.container?.querySelectorAll('.friend-card') || [];
        friendCards.forEach((card) => {
            const usernameElement = card.querySelector('.friend-username');
            const statusCircle = card.querySelector('.status-circle');

            if (usernameElement?.textContent?.includes(`@${username}`)) {
                if (statusCircle) {
                    statusCircle.classList.remove('bg-green-500', 'bg-red-500', 'bg-gray-500');

                    switch (status.toLowerCase()) {
                        case 'online':
                            statusCircle.classList.add('bg-green-500');
                            break;
                        case 'offline':
                            statusCircle.classList.add('bg-red-500');
                            break;
                        default:
                            statusCircle.classList.add('bg-gray-500');
                    }
                }
            }
        });
    }

    private getCurrentUser() {
        try {
            const raw = localStorage.getItem("ft_pong_user_data");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    async render(): Promise<void> {
        if (!this.container) {
            console.error("Friends box container not found");
            return;
        }


        try {
            this.updateContent();
            this.setupEventListeners();
            await this.loadAndRenderFriends();
            this.isRendered = true;
        } catch (error) {
            console.error("Error rendering FriendsBox:", error);
        }
    }

    private updateContent(): void {
        if (!this.container) return;

        const authToken = localStorage.getItem("ft_pong_auth_token");
        const userData = localStorage.getItem("ft_pong_user_data");

        if (authToken && userData) {
            this.container.innerHTML = this.getAuthenticatedContent();
        } else {
            this.container.innerHTML = this.getUnauthenticatedContent();
        }
    }

    private getAuthenticatedContent(): string {
        return `
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-lime-500">👥 ${t('Friends')}</h3>
                <div class="flex items-center gap-2">
                    <button id="blocked-users" class="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-all duration-300" title="${t('Blocked Users')}">
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-7a2 2 0 100-4 2 2 0 000 4zM7 19H5a2 2 0 01-2-2V7a2 2 0 012-2h2m10 0h2a2 2 0 012 2v10a2 2 0 01-2 2h-2"></path>
                        </svg>
                    </button>
                    <button id="friend-requests" class="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-all duration-300" title="${t('Requests')}">
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4-2-2-4 4"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Rest of the content remains the same -->
            <!-- Notification Container -->
            <div id="notification-container" class="mb-4"></div>

            <div class="mb-4 space-y-3">
                <!-- Add Friend Input -->
                <form id="add-friend-form" class="flex gap-2">
                    <input
                        id="add-friend-input"
                        type="text"
                        placeholder="${t('Add friend by username...')}"
                        class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                    >
                    <button
                        type="submit"
                        id="add-friend-submit"
                        class="bg-lime-500 hover:bg-lime-600 text-white font-bold px-4 py-2 rounded transition-all duration-300"
                    >
                        ${t('Add')}
                    </button>
                </form>

                <!-- Search Friends Input -->
                <input
                    id="friends-search"
                    type="text"
                    placeholder="${t('Search friends...')}"
                    class="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-lime-500"
                >
            </div>

            <div id="friends-list" class="space-y-3">
                <div id="friends-empty" class="text-sm text-gray-400">
                    ${t('Loading friends...')}
                </div>
            </div>

            <!-- Chat Interface -->
            <div id="chat-interface" class="hidden mt-4 border-t border-gray-600 pt-4">
                <div class="flex items-center justify-between mb-3">
                    <h4 id="chat-header" class="text-lg font-semibold text-lime-500"></h4>
                    <button id="close-chat" class="text-gray-400 hover:text-white">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <div id="chat-messages" class="bg-gray-800 border border-gray-600 rounded-lg p-3 h-48 overflow-y-auto mb-3">
                    <div class="text-gray-400 text-center text-sm">No messages yet</div>
                </div>

                <form id="chat-form" class="flex gap-2">
                    <input
                        id="chat-input"
                        type="text"
                        placeholder="${t('Type your message...')}"
                        class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                        maxlength="500"
                    >
                    <button
                        type="submit"
                        class="bg-lime-500 hover:bg-lime-600 text-white font-bold px-4 py-2 rounded transition-all duration-300"
                    >
                        ${t('Send')}
                    </button>
                </form>
            </div>
        `;
    }


    private handleViewFriendStats(friendId: string, friendUsername: string): void {

    if ((window as any).StatisticsModal) {
        (window as any).StatisticsModal.showForFriend(friendId, friendUsername);
    } else {
        console.error("StatisticsModal not available");
        alert('Statistics modal not loaded');
    }
    }

    private getUnauthenticatedContent(): string {
        return `
            <h3 class="text-xl font-bold mb-4 text-lime-500">👥 ${t('Friends')}</h3>
            <p class="text-gray-400">${t('Please log in to view friends')}</p>
            <button id="friends-signin" class="mt-4 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
                ${t('Sign In')}
            </button>
        `;
    }

    private setupEventListeners(): void {
        const signinBtn = document.getElementById("friends-signin");
        const requestsBtn = document.getElementById("friend-requests");
        const blockedUsersBtn = document.getElementById("blocked-users");
        const searchInput = document.getElementById("friends-search") as HTMLInputElement;
        const chatForm = document.getElementById("chat-form") as HTMLFormElement;
        const closeChatBtn = document.getElementById("close-chat");
        const addFriendForm = document.getElementById("add-friend-form") as HTMLFormElement;

        // Initialize notification container
        this.notificationContainer = document.getElementById("notification-container");

        if (signinBtn) {
            signinBtn.addEventListener("click", () => this.showLoginModal());
        }

        if (requestsBtn) {
            requestsBtn.addEventListener("click", () => this.showRequestsModal());
        }

        if (blockedUsersBtn) {
            blockedUsersBtn.addEventListener("click", () => this.showBlockedUsersModal());
        }

        if (searchInput) {
            searchInput.addEventListener("input", (e) => this.handleSearch((e.target as HTMLInputElement).value));
        }

        if (chatForm) {
            chatForm.addEventListener("submit", (e) => this.handleSendMessage(e));
        }

        if (closeChatBtn) {
            closeChatBtn.addEventListener("click", () => this.closeChatInterface());
        }

        if (addFriendForm) {
            addFriendForm.addEventListener("submit", (e) => this.handleAddFriendSubmit(e));
        }

        
    }

    private async showBlockedUsersModal(): Promise<void> {
        const me = this.getCurrentUser();
        if (!me?.userName) {
            alert(t('Please sign in first.'));
            return;
        }

        await this.blockedUsersModal.showBlockedUsers();
    }

    private async handleAddFriendSubmit(event: Event): Promise<void> {
        event.preventDefault();

        const me = this.getCurrentUser();
        if (!me?.userName)
        {
            this.showNotification(t('Please sign in first.'), 'error');
            return;
        }

        const input = document.getElementById("add-friend-input") as HTMLInputElement;
        const submitBtn = document.getElementById("add-friend-submit") as HTMLButtonElement;

        if (!input || !submitBtn) return;

        const friendUsername = input.value.trim();
        if (!friendUsername) {
            this.showNotification(t('Please enter a username'), 'error');
            return;
        }

        if (friendUsername === me.userName) {
            this.showNotification(t('You cannot add yourself'), 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = t('Sending...');
        input.disabled = true;

        try {
            const response = await authService.sendFriendRequest(me.userName, friendUsername);

            if (response.success) {
                this.showNotification(t('Friend request sent!'), 'success');
                input.value = "";
            } else {
                let errorMessage = t('Could not send request');
                if (response.message?.includes('404')) {
                    errorMessage = t('User not found');
                } else if (response.message?.includes('409')) {
                    errorMessage = t('Friend request already exists or user is already your friend');
                } else if (response.message) {
                    errorMessage = response.message;
                }
                this.showNotification(errorMessage, 'error');
            }
        } catch (err: any) {
            console.error('Error sending friend request:', err);
            this.showNotification(t('Could not send request') + ': ' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = t('Add');
            input.disabled = false;
        }
    }

    private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
        if (!this.notificationContainer) return;

        const notificationId = `notification-${Date.now()}`;
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

        const notificationHtml = `
            <div id="${notificationId}" class="${bgColor} text-white px-4 py-3 rounded-lg mb-2 flex items-center justify-between animate-fade-in">
                <span class="text-sm">${this.escape(message)}</span>
                <button onclick="document.getElementById('${notificationId}').remove()" class="ml-3 text-white hover:text-gray-200">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        this.notificationContainer.insertAdjacentHTML('beforeend', notificationHtml);

        setTimeout(() => {
            const notification = document.getElementById(notificationId);
            if (notification) {
                notification.remove();
            }
        }, 5000);
    }

    private handleSearch(query: string): void {
        const friendCards = this.container?.querySelectorAll('.friend-card') || [];
        const lowerQuery = query.toLowerCase();

        friendCards.forEach((card) => {
            const nameElement = card.querySelector('.friend-name');
            const usernameElement = card.querySelector('.friend-username');

            if (nameElement && usernameElement) {
                const name = nameElement.textContent?.toLowerCase() || '';
                const username = usernameElement.textContent?.toLowerCase() || '';

                if (name.includes(lowerQuery) || username.includes(lowerQuery)) {
                    (card as HTMLElement).style.display = 'flex';
                } else {
                    (card as HTMLElement).style.display = 'none';
                }
            }
        });
    }

    private handleChatFriend(friendUsername: string): void {

        if (this.activeChatUser === friendUsername) {
            this.closeChatInterface();
        } else {
            this.openChatInterface(friendUsername);
        }
    }

    private openChatInterface(username: string): void {
        this.activeChatUser = username;

        this.clearPendingMessageCount(username);

        const chatInterface = document.getElementById('chat-interface');
        const chatHeader = document.getElementById('chat-header');

        if (chatInterface && chatHeader) {
            chatInterface.classList.remove('hidden');
            chatHeader.textContent = `Chat with ${username}`;

            this.renderChatMessages();

            const chatInput = document.getElementById('chat-input') as HTMLInputElement;
            if (chatInput) {
                chatInput.focus();
            }
        }
    }

    private removeDuplicateFriendCards(): void {
        const friendCards = this.container?.querySelectorAll('.friend-card') || [];
        const seenUsernames = new Set<string>();

        friendCards.forEach((card) => {
            const usernameElement = card.querySelector('.friend-username');
            if (usernameElement) {
                const usernameText = usernameElement.textContent;
                if (usernameText) {
                    const username = usernameText.replace('@', '');

                    if (seenUsernames.has(username)) {
                        console.log(`🔍 Removing duplicate friend card for ${username}`);
                        card.remove();
                    } else {
                        seenUsernames.add(username);
                    }
                }
            }
        });
    }

    private closeChatInterface(): void {
        if (this.activeChatUser) {
            console.log(`🗑️ Clearing messages for ${this.activeChatUser}`);
            this.chatMessages.delete(this.activeChatUser);

            const userMessageIds = Array.from(this.processedMessageIds).filter(id =>
                id.includes(this.activeChatUser!) || id.startsWith(`${this.activeChatUser}_`)
            );
            userMessageIds.forEach(id => this.processedMessageIds.delete(id));

            this.lastMessageContent.delete(`${this.activeChatUser}_received`);
            this.lastMessageContent.delete(`${this.activeChatUser}_sent`);

            this.saveMessagesToStorage();

            console.log(`✅ Messages cleared for ${this.activeChatUser}`);
        }

        this.activeChatUser = null;

        const chatInterface = document.getElementById('chat-interface');
        if (chatInterface) {
            chatInterface.classList.add('hidden');
        }
    }

    private renderChatMessages(): void {
        if (!this.activeChatUser) return;

        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messages = this.chatMessages.get(this.activeChatUser) || [];

        if (messages.length === 0) {
            chatMessages.innerHTML = '<div class="text-gray-400 text-center text-sm">No messages yet</div>';
            return;
        }

        const sortedMessages = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        const messagesHtml = sortedMessages.map(msg => this.renderSingleMessage(msg)).join('');
        chatMessages.innerHTML = messagesHtml;

        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 10);
    }

    private renderSingleMessage(message: ChatMessage): string {
        const timeStr = message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        const alignment = message.isOwn ? 'ml-auto text-right' : 'mr-auto text-left';
        const bgColor = message.isOwn ? 'bg-lime-600' : 'bg-received-message';
        const displayName = message.isOwn ? t('You') : message.from;

        return `
            <div class="message-bubble mb-2 ${alignment}">
                <div class="max-w-xs ${bgColor} rounded-lg p-3 text-white">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium text-sm">${this.escapeHtml(displayName)}</span>
                        <span class="text-xs text-gray-200 opacity-75">${timeStr}</span>
                    </div>
                    <div class="text-sm break-words">${this.escapeHtml(message.text)}</div>
                </div>
            </div>
        `;
    }

    private handleSendMessage(event: Event): void {
        event.preventDefault();

        if (!this.activeChatUser) {
            console.error("No active chat user");
            return;
        }

        const chatInput = document.getElementById('chat-input') as HTMLInputElement;
        if (!chatInput) {
            console.error("Chat input not found");
            return;
        }

        const messageText = chatInput.value.trim();
        if (!messageText) {
            console.error("Empty message");
            return;
        }

        console.log(`🟢 FriendsBox: Sending message to ${this.activeChatUser}: ${messageText}`);

        // Get current user info
        const userData = localStorage.getItem('ft_pong_user_data');
        const user = userData ? JSON.parse(userData) : null;

        if (!user || !user.userName) {
            console.error('User not logged in');
            return;
        }

        // Clear input immediately
        chatInput.value = '';

        // Dispatch event for socket service to handle
        console.log('🟢 FriendsBox: Dispatching send-message-request event');
        window.dispatchEvent(new CustomEvent('send-message-request', {
            detail: {
                recipient: this.activeChatUser,
                message: messageText,
                sender: user.userName
            }
        }));
    }

    private saveMessagesToStorage(): void {
        try {
            const messagesObj: {[key: string]: any[]} = {};
            this.chatMessages.forEach((messages, username) => {
                // Convert timestamps to strings for storage
                messagesObj[username] = messages.map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp.toISOString()
                }));
            });
            localStorage.setItem('ft_pong_chat_messages', JSON.stringify(messagesObj));
        } catch (error) {
            console.error('Error saving messages to storage:', error);
        }
    }

    private loadMessagesFromStorage(): void {
        try {
            const stored = localStorage.getItem('ft_pong_chat_messages');
            if (stored) {
                const messagesObj = JSON.parse(stored);
                Object.entries(messagesObj).forEach(([username, messages]) => {
                    // Convert timestamp strings back to Date objects
                    const parsedMessages = (messages as any[]).map(msg => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    }));
                    this.chatMessages.set(username, parsedMessages);
                });
                console.log('💾 Chat messages loaded from storage');
            }
        } catch (error) {
            console.error('Error loading stored messages:', error);
        }
    }

    public handleReconnection(): void {
        console.log('🔄 Handling reconnection - reloading messages');
        this.loadMessagesFromStorage();
        if (this.activeChatUser) {
            this.renderChatMessages();
        }
    }

    private showLoginModal(): void {
        if ((window as any).modalService && (window as any).modalService.showLoginModal) {
            (window as any).modalService.showLoginModal();
        } else {
            console.error("Modal service not available");
            alert(t('Login - Modal service not loaded'));
        }
    }

    private async showRequestsModal(): Promise<void> {
        const me = this.getCurrentUser();
        if (!me?.userName) {
            alert(t('Please sign in first.'));
            return;
        }

        await this.requestModal.showRequests();
    }

    private async handleRemoveFriend(friendUsername: string): Promise<void> {
        const me = this.getCurrentUser();
        if (!me?.userName) {
            alert(t('Please sign in first.'));
            return;
        }

        if (!confirm(t('Are you sure you want to remove') + ` ${friendUsername}?`)) {
            return;
        }

        try {
            const response = await authService.removeFriend(me.userName, friendUsername);

            if (response.success) {
                alert(t('Friend removed'));
                await this.loadAndRenderFriends();
            } else {
                if (response.message?.includes('404')) {
                    alert(t('Friend not found or already removed'));
                } else {
                    alert(t('Failed to remove friend:') + ' ' + response.message);
                }
            }
        } catch (err: any) {
            console.error('Error removing friend:', err);
            alert(t('Failed to remove friend:') + ' ' + err.message);
        }
    }

    updateAuthState(_isAuthenticated: boolean): void {
        if (!this.isRendered) return;
        this.updateContent();
        this.setupEventListeners();
        this.loadAndRenderFriends().catch(() => {});
    }

    private async loadAndRenderFriends(): Promise<void> {
        const me = this.getCurrentUser();
        if (!me?.id || !this.container) return;

        const listEl = this.container.querySelector("#friends-list");
        const emptyEl = this.container.querySelector("#friends-empty") as HTMLElement | null;
        if (!listEl) return;

        // Clear existing friend cards
        listEl.querySelectorAll(".friend-card").forEach((n) => n.remove());

        try {
            const response = await authService.getFriendsList(me.id);

            if (response.success && response.data) {
                const friends = Array.isArray(response.data) ? response.data : [];

                // Remove duplicates based on username before storing
                const uniqueFriends = friends.filter((friend, index, self) =>
                    index === self.findIndex(f => f.username === friend.username)
                );

                this.friendsData = uniqueFriends;

                if (uniqueFriends.length === 0) {
                    if (emptyEl) {
                        emptyEl.style.display = "block";
                        emptyEl.textContent = t('No friends yet.');
                    }
                    return;
                }

                if (emptyEl) emptyEl.style.display = "none";

                for (const friend of uniqueFriends) {
                    const card = this.renderFriendCard(friend);
                    listEl.insertAdjacentHTML("beforeend", card);
                }

                this.setupFriendCardListeners();

                // Update message indicators
                this.pendingMessages.forEach((count, username) => {
                    if (count > 0) {
                        this.updateFriendMessageIndicator(username);
                    }
                });
            } else {
                if (emptyEl) {
                    emptyEl.style.display = "block";
                    emptyEl.textContent = t('No friends yet.');
                }
            }
        } catch (e) {
            console.error("Failed to load friends:", e);
            if (emptyEl) {
                emptyEl.style.display = "block";
                emptyEl.textContent = t("Could not load friends.");
            }
        }
    }

private setupFriendCardListeners(): void {
    // Setup remove friend listeners
    const removeButtons = this.container?.querySelectorAll('.remove-friend-btn') || [];
    removeButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const username = btn.getAttribute('data-username');
            if (username) {
                this.handleRemoveFriend(username);
            }
        });
    });

    // Setup chat listeners
    const chatButtons = this.container?.querySelectorAll('.chat-friend-btn') || [];
    chatButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            // Check if button is disabled (offline user)
            if ((btn as HTMLButtonElement).disabled) {
                return;
            }

            const username = btn.getAttribute('data-username');
            if (username) {
                this.handleChatFriend(username);
            }
        });
    });

    // Setup statistics listeners
    const statsButtons = this.container?.querySelectorAll('.stats-friend-btn') || [];
    statsButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const friendId = btn.getAttribute('data-friend-id');
            const friendUsername = btn.getAttribute('data-username');
            if (friendId && friendUsername) {
                this.handleViewFriendStats(friendId, friendUsername);
            }
        });
    });

    // NEW: Setup block user listeners
    const blockButtons = this.container?.querySelectorAll('.block-friend-btn') || [];
    blockButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const username = btn.getAttribute('data-username');
            if (username) {
                this.handleBlockFriend(username);
            }
        });
    });
}

private renderFriendCard(friend: any): string {
    const username = (friend.username || "").toString();
    const friendId = (friend.id || friend.userId || "").toString();
    const firstName = (friend.firstName || "").toString();
    const lastName = (friend.lastName || "").toString();
    const profilePath = friend.profilePath;
    const status = (friend.status || "offline").toString().toLowerCase();

    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || username || "Unknown";
    const initials = this.initialsFrom(displayName);
    const isOnline = status === "online";
    const pendingCount = this.pendingMessages.get(username) || 0;
    const isChatActive = this.activeChatUser === username;

    const color = this.colorFor(username);

    // Create avatar display (keep existing avatar code)
    let avatarHtml = '';
    if (profilePath) {
        const fullAvatarPath = profilePath.startsWith('avatars/') ? profilePath : `avatars/${profilePath}`;
        avatarHtml = `
            <img src="${this.escape(fullAvatarPath)}"
                alt="${this.escape(displayName)}"
                class="w-8 h-8 rounded-full object-cover"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="w-8 h-8 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm" style="display: none;">
                ${initials}
            </div>
        `;
    } else {
        avatarHtml = `
            <div class="w-8 h-8 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm">
                ${initials}
            </div>
        `;
    }

    return `
        <div class="friend-card flex items-center justify-between bg-gray-700 p-3 rounded ${isChatActive ? 'ring-2 ring-lime-500' : ''}">
            <div class="flex items-center">
                <div class="status-circle w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} mr-3"></div>
                ${avatarHtml}
                <div class="ml-3">
                    <p class="friend-name text-sm font-medium text-white">${this.escape(displayName)}</p>
                    <p class="friend-username text-xs text-gray-400">@${this.escape(username)}</p>
                </div>
            </div>

            <div class="friend-actions flex items-center gap-2">
                ${pendingCount > 0 ? `
                    <div class="message-indicator bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        ${pendingCount}
                    </div>
                ` : ''}

                <button
                    class="stats-friend-btn p-1 hover:opacity-70 transition-opacity duration-300 text-purple-400"
                    data-friend-id="${this.escape(friendId)}"
                    data-username="${this.escape(username)}"
                    title="${t('View Statistics')}"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                </button>

                <button
                    class="chat-friend-btn p-1 transition-opacity duration-300 ${!isOnline ? 'opacity-50 cursor-not-allowed text-red-400' : (isChatActive ? 'text-lime-400 hover:opacity-70' : 'text-blue-400 hover:opacity-70')}"
                    data-username="${this.escape(username)}"
                    title="${isOnline ? t('Chat') : t('User is offline')}"
                    ${!isOnline ? 'disabled' : ''}
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                </button>

                <!-- NEW BLOCK BUTTON -->
                <button
                    class="block-friend-btn p-1 hover:opacity-70 transition-opacity duration-300 text-orange-400"
                    data-username="${this.escape(username)}"
                    title="${t('Block User')}"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                    </svg>
                </button>

                <button
                    class="remove-friend-btn p-1 hover:opacity-70 transition-opacity duration-300"
                    data-username="${this.escape(username)}"
                    title="${t('Remove Friend')}"
                >
                    <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

    private initialsFrom(name: string): string {
        return name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0]?.toUpperCase() || "")
            .join("");
    }

    private colorFor(identifier: string): string {
        const colors = ["bg-lime-500", "bg-purple-500", "bg-blue-500", "bg-red-500", "bg-yellow-500"];
        if (!identifier) return colors[0];

        let hash = 0;
        for (let i = 0; i < identifier.length; i++) {
            hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    private escape(s: string): string {
        return s.replace(/[&<>"']/g, (c) => {
            switch (c) {
                case "&": return "&amp;";
                case "<": return "&lt;";
                case ">": return "&gt;";
                case '"': return "&quot;";
                case "'": return "&#39;";
                default: return c;
            }
        });
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

 destroy(): void {
        if (this.unsubscribeLanguageChange) {
            this.unsubscribeLanguageChange();
        }

        window.removeEventListener('friend-status-change', this.boundHandleFriendStatusChange);
        window.removeEventListener('direct-message-received', this.boundHandleDirectMessageReceived);
        window.removeEventListener('direct-message-sent', this.boundHandleDirectMessageSent);
        window.removeEventListener('friends-list-changed', this.boundHandleFriendsListChanged);
        window.removeEventListener('theme-changed', this.boundHandleThemeChange);
        window.removeEventListener('socket-reconnected', this.boundHandleSocketReconnected);

        if (this.requestModal) {
            this.requestModal.destroy();
        }
        if (this.blockedUsersModal) {
            this.blockedUsersModal.destroy();
        }

        this.activeChatUser = null;
        this.chatMessages.clear();
        this.pendingMessages.clear();
        this.processedMessageIds.clear();

        if (this.container) {
            this.container.innerHTML = "";
        }
        this.isRendered = false;
    }

    private async handleBlockFriend(friendUsername: string): Promise<void> {
    const me = this.getCurrentUser();
    if (!me?.userName) {
        alert(t('Please sign in first.'));
        return;
    }

    if (!confirm(t('Are you sure you want to block') + ` ${friendUsername}? ${t('This will remove them from your friends list and prevent them from contacting you.')}`)) {
        return;
    }

    try {
        const response = await authService.blockUserFromRequest(me.userName, friendUsername);

        if (response.success) {
            this.showNotification(t('User blocked successfully'), 'success');

            // Close chat if blocking the active chat user
            if (this.activeChatUser === friendUsername) {
                this.closeChatInterface();
            }

            // Refresh friends list
            await this.loadAndRenderFriends();

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('friends-list-changed'));
        } else {
            if (response.message?.includes('404')) {
                this.showNotification(t('User not found'), 'error');
            } else {
                this.showNotification(t('Failed to block user:') + ' ' + response.message, 'error');
            }
        }
    } catch (err: any) {
        console.error('Error blocking user:', err);
        this.showNotification(t('Failed to block user:') + ' ' + err.message, 'error');
    }
}

private handleCloseChatIfActive(event: Event): void {
    const customEvent = event as CustomEvent;
    const { username } = customEvent.detail;

    // Check if the chat is currently active with this user
    if (this.activeChatUser === username) {
        this.closeChatInterface();

        // Show a notification to inform the user
        this.showNotification(`Chat closed: ${username} is now offline`, 'info');
    }
}
}
