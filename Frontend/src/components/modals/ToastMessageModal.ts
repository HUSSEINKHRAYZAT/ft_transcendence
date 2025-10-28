import { BaseModal } from './BaseModal';
import { findElement } from '../../utils/DOMHelpers';
import { t } from '../../langs/LanguageManager';

interface Message {
    id: string;
    from: string;
    to: string;
    text: string;
    timestamp: Date;
    isRead: boolean;
}

export class ToastMessageModal extends BaseModal {
    private targetUser: string | null = null;
    private messages: Message[] = [];
    private maxMessages: number = 5;
    private unreadCount: number = 0;
    private isModalOpen: boolean = false;
	private processedMessages: Set<string> = new Set();

    // Bound event handlers with proper typing
    private boundHandleDirectMessageReceived: (event: Event) => void;
    private boundHandleDirectMessageSent: (event: Event) => void;

    constructor(targetUser?: string) {
        super();
        this.targetUser = targetUser || null;

        // Bind event handlers with proper type casting
        this.boundHandleDirectMessageReceived = this.handleDirectMessageReceived.bind(this);
        this.boundHandleDirectMessageSent = this.handleDirectMessageSent.bind(this);

        // Listen for incoming messages
        window.addEventListener('direct-message-received', this.boundHandleDirectMessageReceived);
        window.addEventListener('direct-message-sent', this.boundHandleDirectMessageSent);

    }

    protected getModalTitle(): string {
        return this.targetUser ?
            t('Chat with {user}', { user: this.targetUser }) :
            t('Messages');
    }

    protected getModalContent(): string {
        return `
            <div class="conversation-container flex flex-col h-96">
                <!-- Messages Display Area -->
                <div id="messages-display" class="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4 overflow-y-auto">
                    <div id="no-messages" class="text-gray-400 text-center py-8 text-sm">
                        ${this.targetUser ?
                            t('No messages with {user} yet', { user: this.targetUser }) :
                            t('No messages yet')
                        }
                    </div>
                    <div id="messages-list" class="space-y-2"></div>
                </div>

                <!-- Message Input Form (only show if targetUser is specified) -->
                ${this.targetUser ? `
                <form id="send-message-form" class="send-message-form border-t border-gray-600 pt-3">
                    <div class="flex gap-2">
                        <textarea id="message-input"
                            class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300 resize-none"
                            placeholder="${t('Type your message...')}"
                            rows="2"
                            maxlength="500"></textarea>
                        <button type="submit" id="send-btn"
                            class="bg-lime-500 hover:bg-lime-600 text-white font-bold px-4 rounded transition-all duration-300 self-end">
                            ${t('Send')}
                        </button>
                    </div>
                    <div id="send-error" class="hidden mt-2 p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>
                </form>
                ` : ''}

                <!-- Clear Messages Button -->
                <div class="mt-3 flex justify-between items-center">
                    <button type="button" id="clear-messages-btn"
                        class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all duration-300">
                        ${t('Clear Chat')}
                    </button>
                    ${!this.targetUser ? `
                    <span class="text-sm text-gray-400">
                        ${t('General message inbox')}
                    </span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    protected setupEventListeners(): void {
        const form = findElement('#send-message-form') as HTMLFormElement;
        const clearBtn = findElement('#clear-messages-btn');
        const messageInput = findElement('#message-input') as HTMLTextAreaElement;

        if (form) {
            form.addEventListener('submit', (e) => this.handleSendMessage(e));
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearMessages());
        }

        if (messageInput) {
            // Handle Enter key to send message (Shift+Enter for new line)
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const formEvent = new Event('submit', { cancelable: true });
                    form?.dispatchEvent(formEvent);
                }
            });

            // Focus on input when modal opens
            setTimeout(() => messageInput.focus(), 100);
        }
    }

    private handleDirectMessageReceived(data: any): void {
            // Backend sends: { "type": "direct-message", "from": "username", "text": "message" }
            const from = data.from;
            const text = data.text;
            const messageId = data.id || `${from}_${text}_${Date.now()}`;

            if (!from || !text) {
                return;
            }

            // Check if we've already processed this message
            if (this.processedMessages.has(messageId)) {
                return;
            }

            // Mark message as processed
            this.processedMessages.add(messageId);

            // Limit the size of the processed messages set
            if (this.processedMessages.size > 100) {
                const iterator = this.processedMessages.values();
                this.processedMessages.delete(iterator.next().value);
            }

            // Show toast notification for received messages
            this.showToast('info', 'New Message', `${from}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);

            window.dispatchEvent(new CustomEvent('direct-message-received', {
                detail: {
                    from: from,
                    text: text,
                    timestamp: new Date(),
                    messageId: messageId
                }
            }));
    }

    private handleDirectMessageSent(event: Event): void {
        const customEvent = event as CustomEvent;
        const { to, text, timestamp } = customEvent.detail;

        // If this is a targeted modal and message is not to target user, ignore
        if (this.targetUser && to !== this.targetUser) {
            return;
        }

        const message: Message = {
            id: this.generateMessageId(),
            from: 'me',
            to: to,
            text: text,
            timestamp: timestamp || new Date(),
            isRead: true // Sent messages are always "read"
        };

        this.addMessage(message);
    }

    private addMessage(message: Message): void {
        // Add to beginning of array (newest first)
        this.messages.unshift(message);

        // Keep only last maxMessages messages (increased from 5 to 20)
        if (this.messages.length > this.maxMessages) {
            this.messages = this.messages.slice(0, this.maxMessages);
        }

        // Update display if modal is open
        if (this.isModalOpen) {
            this.updateMessagesDisplay();
            this.markAllAsRead();
        }
    }

    private updateMessagesDisplay(): void {
        const messagesList = findElement('#messages-list');
        const noMessages = findElement('#no-messages');

        if (!messagesList) return;

        if (this.messages.length === 0) {
            if (noMessages) noMessages.classList.remove('hidden');
            messagesList.innerHTML = '';
            return;
        }

        if (noMessages) noMessages.classList.add('hidden');

        // Create messages HTML (reverse order to show newest at bottom)
        const messagesHtml = this.messages
            .slice()
            .reverse()
            .map(msg => this.renderMessage(msg))
            .join('');

        messagesList.innerHTML = messagesHtml;

        // Scroll to bottom to show newest message
        const messagesDisplay = findElement('#messages-display');
        if (messagesDisplay) {
            messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
        }
    }

    private renderMessage(message: Message): string {
        const timeStr = message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        const isSent = message.from === 'me';
        const displayName = isSent ? t('You') : message.from;
        const alignment = isSent ? 'ml-auto text-right' : 'mr-auto text-left';
        const bgColor = isSent ? 'bg-lime-600' : 'bg-blue-600';
        const readStatus = message.isRead ? '' : 'opacity-75 border-l-4 border-yellow-400';

        return `
            <div class="message-bubble mb-2 ${alignment}">
                <div class="max-w-xs ${bgColor} rounded-lg p-3 text-white ${readStatus}">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium text-sm">${this.escapeHtml(displayName)}</span>
                        <span class="text-xs text-gray-200 opacity-75">${timeStr}</span>
                    </div>
                    <div class="text-sm break-words">${this.escapeHtml(message.text)}</div>
                </div>
            </div>
        `;
    }

    private async handleSendMessage(event: Event): Promise<void> {
        event.preventDefault();

        if (!this.targetUser) {
            this.showError('send-error', t('No recipient specified'));
            return;
        }

        const messageInput = findElement('#message-input') as HTMLTextAreaElement;
        const sendBtn = findElement('#send-btn') as HTMLButtonElement;

        if (!messageInput) return;

        const messageText = messageInput.value.trim();
        if (!messageText) {
            this.showError('send-error', t('Please enter a message'));
            return;
        }

        // Disable send button during processing
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.textContent = t('Sending...');
        }

        try {

            // Get current user info
            const userData = localStorage.getItem('ft_pong_user_data');
            const user = userData ? JSON.parse(userData) : null;

            if (!user || !user.userName) {
                throw new Error('User not logged in');
            }

            // Dispatch event for socket service to handle
            window.dispatchEvent(new CustomEvent('send-message-request', {
                detail: {
                    recipient: this.targetUser,
                    message: messageText,
                    sender: user.userName
                }
            }));

            // Clear input
            messageInput.value = '';

            // Focus on the input for next message
            messageInput.focus();

            // Hide any error messages
            const errorDiv = findElement('#send-error');
            if (errorDiv) {
                errorDiv.classList.add('hidden');
            }

        } catch (error) {

            this.showError('send-error', t('Failed to send message. Please try again.'));
        } finally {
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = t('Send');
            }
        }
    }

    private clearMessages(): void {
        this.messages = [];
        this.unreadCount = 0;
        this.updateMessagesDisplay();

        // Show success message
        this.showToast('info', t('Chat Cleared'), t('All messages have been cleared'));
    }

    private markAllAsRead(): void {
        this.messages.forEach(msg => {
            msg.isRead = true;
        });
        this.unreadCount = 0;
    }

    private showMissedMessageNotification(from: string, text: string): void {
        // Show notification in NotificationBox
        if ((window as any).notifyBox) {
            const notifyBox = (window as any).notifyBox;
            const truncatedText = text.length > 30 ? text.substring(0, 30) + '...' : text;
            notifyBox.addNotification(
                t('New message from {user}: {message}', {
                    user: from,
                    message: truncatedText
                }),
                'info'
            );
        }
    }

    public showWithMissedMessage(from: string, text: string): void {
        // Add the missed message to the conversation
        const message: Message = {
            id: this.generateMessageId(),
            from: from,
            to: 'me',
            text: text,
            timestamp: new Date(),
            isRead: false
        };

        this.addMessage(message);

        // Show the modal
        this.show('toast-message-modal');

        // Mark as read after showing
        setTimeout(() => {
            this.markAllAsRead();
            this.updateMessagesDisplay();
        }, 500);
    }

    // Override BaseModal show method
    public async show(modalId?: string): Promise<void> {
        this.isModalOpen = true;
        await super.show(modalId || 'toast-message-modal');

        // Mark all messages as read when modal opens
        this.markAllAsRead();

        // Update display
        setTimeout(() => {
            this.updateMessagesDisplay();

            // Position modal as toast (override BaseModal positioning)
            if (this.backdropElement) {
                this.backdropElement.classList.remove('items-center', 'justify-center');
                this.backdropElement.classList.add('items-start', 'justify-start');

                const modalContent = this.backdropElement.querySelector('.transform') as HTMLElement;
                if (modalContent) {
                    modalContent.style.margin = '20px';
                    modalContent.style.maxWidth = '500px';
                    modalContent.style.minWidth = '400px';
                }
            }

            // Focus on message input if it exists
            setTimeout(() => {
                const messageInput = findElement('#message-input') as HTMLTextAreaElement;
                if (messageInput) {
                    messageInput.focus();
                }
            }, 100);
        }, 10);
    }

    // Override BaseModal close method
    public async close(): Promise<void> {
        this.isModalOpen = false;
        await super.close();
    }

    public isOpen(): boolean {
        return this.isModalOpen;
    }

    public getUnreadCount(): number {
        return this.unreadCount;
    }

    public hasUnreadMessages(): boolean {
        return this.unreadCount > 0;
    }

    private generateMessageId(): string {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Override BaseModal destroy method
    public destroy(): void {
        // Remove event listeners with proper typing
        window.removeEventListener('direct-message-received', this.boundHandleDirectMessageReceived);
        window.removeEventListener('direct-message-sent', this.boundHandleDirectMessageSent);

        // Clear messages
        this.messages = [];
        this.isModalOpen = false;

        // Call parent destroy
        super.destroy();
    }
}

// Make it available globally
(window as any).ToastMessageModal = ToastMessageModal;

export default ToastMessageModal;
