import { BaseModal } from './BaseModal';
import { findElement } from '../../utils/DOMHelpers';
import { t } from '../../langs/LanguageManager';

export class MessageFriendsModal extends BaseModal {
	private messages: Array<{id: string, username: string, message: string, timestamp: Date, isSent: boolean}> = [];

	constructor() {
		super();
	}

	protected getModalTitle(): string {
		return t('Messages');
	}

	protected getModalContent(): string {
		return `
			<div class="message-friends-container">
				<!-- Messages Display Area -->
				<div id="messages-container" class="messages-area bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4 h-64 overflow-y-auto">
					<div id="no-messages" class="text-gray-400 text-center py-8 text-sm">
						${t('No messages yet')}
					</div>
				</div>

				<!-- Message Input Form -->
				<form id="send-message-form" class="send-message-form">
					<div class="mb-3">
						<label class="block text-sm font-medium text-gray-300 mb-2">${t('Send to')}</label>
						<input type="text" id="recipient-username" required
							class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
							placeholder="${t('Enter username')}">
					</div>
					<div class="mb-3">
						<label class="block text-sm font-medium text-gray-300 mb-2">${t('Message')}</label>
						<textarea id="message-content" required rows="3"
							class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300 resize-none"
							placeholder="${t('Type your message...')}"></textarea>
					</div>
					<div id="send-error" class="hidden mb-3 p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>
					<div class="flex gap-2">
						<button type="submit" id="send-message-btn"
							class="flex-1 bg-lime-500 hover:bg-lime-600 text-white font-bold py-2 px-4 rounded transition-all duration-300">
							${t('Send Message')}
						</button>
						<button type="button" id="clear-messages-btn"
							class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all duration-300">
							${t('Clear')}
						</button>
					</div>
				</form>
			</div>
		`;
	}

	protected setupEventListeners(): void {
		const form = findElement('#send-message-form') as HTMLFormElement;
		const clearBtn = findElement('#clear-messages-btn');

		if (form) {
			form.addEventListener('submit', (e) => this.handleSendMessage(e));
		}

		if (clearBtn) {
			clearBtn.addEventListener('click', () => this.clearMessages());
		}

		// Focus on recipient input when modal opens
		setTimeout(() => {
			const recipientInput = findElement('#recipient-username') as HTMLInputElement;
			if (recipientInput) {
				recipientInput.focus();
			}
		}, 100);
	}

	/**
	 * Display a received message from a friend
	 * @param message - The message content
	 * @param username - The sender's username
	 */
	public showReceivedMessage(message: string, username: string): void {
		console.log('📥 Received message from:', username, '- Message:', message);

		const messageObj = {
			id: this.generateMessageId(),
			username: username,
			message: message,
			timestamp: new Date(),
			isSent: false
		};

		this.messages.unshift(messageObj); // Add to beginning for newest first
		this.updateMessagesDisplay();

		// Show toast notification for received message
		this.showToast('info', t('New Message'), t('Message from {username}', { username }));
	}

	/**
	 * Handle sending a message
	 */
	private async handleSendMessage(event: Event): Promise<void> {
		event.preventDefault();

		const recipientInput = findElement('#recipient-username') as HTMLInputElement;
		const messageInput = findElement('#message-content') as HTMLTextAreaElement;
		const sendBtn = findElement('#send-message-btn') as HTMLButtonElement;
		const errorDiv = findElement('#send-error') as HTMLElement;

		if (!recipientInput || !messageInput || !sendBtn) {
			console.error('❌ Required form elements not found');
			return;
		}

		const recipient = recipientInput.value.trim();
		const messageContent = messageInput.value.trim();

		// Clear previous errors
		errorDiv?.classList.add('hidden');

		if (!recipient || !messageContent) {
			this.showError('send-error', t('Please fill in all fields'));
			return;
		}

		// Disable send button during processing
		sendBtn.disabled = true;
		sendBtn.textContent = t('Sending...');

		try {
			console.log('📤 Sending message to:', recipient, '- Message:', messageContent);

			// For now, just simulate sending (you'll implement actual sending later)
			await this.simulateSendMessage(recipient, messageContent);

			// Add to sent messages
			const messageObj = {
				id: this.generateMessageId(),
				username: recipient,
				message: messageContent,
				timestamp: new Date(),
				isSent: true
			};

			this.messages.unshift(messageObj);
			this.updateMessagesDisplay();

			// Clear form
			messageInput.value = '';
			recipientInput.value = '';

			// Show success toast
			this.showToast('success', t('Message Sent'), t('Message sent to {username}', { username: recipient }));

			console.log('✅ Message sent successfully');

		} catch (error) {
			console.error('❌ Send message error:', error);
			this.showError('send-error', t('Failed to send message. Please try again.'));
		} finally {
			sendBtn.disabled = false;
			sendBtn.textContent = t('Send Message');
		}
	}

	/**
	 * Simulate sending a message (placeholder for actual implementation)
	 */
	private async simulateSendMessage(recipient: string, message: string): Promise<void> {
		// TODO: Replace this with actual socket/API call to send message
		// Example: this.socketService.sendMessage(recipient, message);

		return new Promise((resolve) => {
			setTimeout(() => {
				console.log('🔄 Message ready to send via socket:', { recipient, message });

				// Dispatch event that socket service can listen to
				window.dispatchEvent(new CustomEvent('send-message-request', {
					detail: { recipient, message }
				}));

				resolve();
			}, 200);
		});
	}

	/**
	 * Update the messages display
	 */
	private updateMessagesDisplay(): void {
		const messagesContainer = findElement('#messages-container');
		const noMessages = findElement('#no-messages');

		if (!messagesContainer) return;

		if (this.messages.length === 0) {
			noMessages?.classList.remove('hidden');
			return;
		}

		noMessages?.classList.add('hidden');

		// Create messages HTML
		const messagesHtml = this.messages.map(msg => {
			const timeStr = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			const messageClass = msg.isSent ? 'sent-message' : 'received-message';
			const bgColor = msg.isSent ? 'bg-lime-600' : 'bg-blue-600';
			const alignment = msg.isSent ? 'ml-auto' : 'mr-auto';
			const icon = msg.isSent ? '📤' : '📥';

			return `
				<div class="message-item mb-3 ${messageClass}">
					<div class="max-w-xs ${alignment} ${bgColor} rounded-lg p-3 text-white">
						<div class="flex items-center gap-2 mb-1">
							<span class="text-xs">${icon}</span>
							<span class="font-medium text-sm">${msg.isSent ? t('To') : t('From')}: ${msg.username}</span>
							<span class="text-xs text-gray-200 ml-auto">${timeStr}</span>
						</div>
						<div class="text-sm break-words">${this.escapeHtml(msg.message)}</div>
					</div>
				</div>
			`;
		}).join('');

		messagesContainer.innerHTML = `
			<div id="no-messages" class="text-gray-400 text-center py-8 text-sm hidden">
				${t('No messages yet')}
			</div>
			${messagesHtml}
		`;

		// Scroll to top to show newest messages
		messagesContainer.scrollTop = 0;
	}

	/**
	 * Clear all messages
	 */
	private clearMessages(): void {
		this.messages = [];
		this.updateMessagesDisplay();
		this.showToast('info', t('Messages Cleared'), t('All messages have been cleared'));
	}

	/**
	 * Generate a unique message ID
	 */
	private generateMessageId(): string {
		return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
	}

	/**
	 * Escape HTML to prevent XSS
	 */
	private escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	/**
	 * Override the show method to position as toast at top-left
	 */
	show(modalId?: string): void {
		super.show(modalId);

		// After modal is shown, reposition it as a toast
		setTimeout(() => {
			const modal = findElement('.modal-overlay');
			if (modal) {
				// Remove default centering and position at top-left
				modal.classList.remove('items-center', 'justify-center');
				modal.classList.add('items-start', 'justify-start');

				// Style the modal container for toast appearance
				const modalContent = modal.querySelector('.modal-content') as HTMLElement;
				if (modalContent) {
					modalContent.style.margin = '20px';
					modalContent.style.maxWidth = '400px';
					modalContent.style.minWidth = '350px';
				}
			}
		}, 10);
	}

	/**
	 * Show the modal (public interface)
	 */
	showModal(): void {
		this.show('message-friends');
	}

	/**
	 * Render method for compatibility
	 */
	async render(): Promise<void> {
		console.log('📱 MessageFriendsModal render() called - use showModal() to display modal');
	}
}

// Make it available globally
(window as any).MessageFriendsModal = MessageFriendsModal;

export default MessageFriendsModal;
