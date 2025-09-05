import { t } from '../../langs/LanguageManager';

export class ToastMessageModal {
	private container: HTMLElement | null = null;
	private targetUsername: string | null = null;
	private isVisible: boolean = false;

	constructor(targetUsername?: string) {
		this.targetUsername = targetUsername || null;
		this.setupSocketListeners();
	}

	private setupSocketListeners(): void {
		// Listen for received messages to show temporary toast
		window.addEventListener('direct-message-received', this.handleMessageReceived.bind(this));
	}

	private handleMessageReceived(event: CustomEvent): void {
		const { from, text, timestamp } = event.detail;

		console.log('Toast received message from:', from);

		if (this.targetUsername && from !== this.targetUsername) {
			return;
		}

		this.showReceivedMessageToast(from, text);
	}

	private showReceivedMessageToast(from: string, text: string): void {
		const toastId = 'received-msg-' + Date.now();
		const toast = document.createElement('div');
		toast.id = toastId;
		toast.className = 'fixed top-20 left-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 opacity-0 translate-x-[-100%]';

		toast.innerHTML = `
			<div class="flex items-start gap-3">
				<div class="flex-shrink-0">
					<svg class="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
					</svg>
				</div>
				<div class="flex-1">
					<p class="font-medium text-sm">${t('Message from')} ${this.escapeHtml(from)}</p>
					<p class="text-sm text-blue-100 mt-1 break-words">${this.escapeHtml(text)}</p>
				</div>
				<button class="flex-shrink-0 text-blue-200 hover:text-white" onclick="this.parentElement.parentElement.remove()">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
		`;

		document.body.appendChild(toast);

		// Animate in
		setTimeout(() => {
			toast.style.transform = 'translateX(0)';
			toast.style.opacity = '1';
		}, 10);

		// Auto-remove after 5 seconds
		setTimeout(() => {
			if (document.getElementById(toastId)) {
				toast.style.transform = 'translateX(-100%)';
				toast.style.opacity = '0';
				setTimeout(() => {
					if (toast.parentNode) {
						toast.parentNode.removeChild(toast);
					}
				}, 300);
			}
		}, 5000);
	}

	public show(): void {
		if (this.isVisible || !this.targetUsername) return;

		console.log('Showing chat input for:', this.targetUsername);

		this.createModal();
		this.setupEventListeners();
		this.isVisible = true;

		// Focus on input
		setTimeout(() => {
			const messageInput = this.container?.querySelector('#message-content') as HTMLTextAreaElement;
			if (messageInput) {
				messageInput.focus();
			}
		}, 100);
	}

	public close(): void {
		if (!this.isVisible || !this.container) return;

		console.log('Closing chat input modal');

		this.container.style.transform = 'translateX(-100%)';
		this.container.style.opacity = '0';

		setTimeout(() => {
			if (this.container && this.container.parentNode) {
				this.container.parentNode.removeChild(this.container);
			}
			this.container = null;
			this.isVisible = false;
		}, 300);
	}

    private createModal(): void {
        if (!this.targetUsername) {
            console.error('Cannot create modal without target username');
            return;
        }

        // Remove any existing modal for this user
        const existing = document.querySelector('.message-toast-modal');
        if (existing) {
            existing.remove();
        }

        this.container = document.createElement('div');
        this.container.className = 'message-toast-modal fixed top-4 left-4 z-50 w-80 bg-gray-800 rounded-lg shadow-2xl border border-gray-600 transform transition-all duration-300 opacity-0 -translate-x-full';

        this.container.innerHTML = this.getModalContent();

        document.body.appendChild(this.container);

        // Animate in after a longer delay to prevent auto-close
        setTimeout(() => {
            if (this.container) {
                this.container.style.transform = 'translateX(0)';
                this.container.style.opacity = '1';
            }
        }, 50);
    }

    private getModalContent(): string {
        const username = this.targetUsername || 'Unknown';
        const titleText = t('Chat with {username}', { username: username });

        return `
            <div class="p-4">
                <!-- Header -->
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-lime-500">${titleText}</h3>
                    <button id="toast-close-btn" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Info Message -->
                <div class="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                    <p class="text-sm text-gray-300">${t('Type your message below. Received messages will appear as notifications.')}</p>
                </div>

                <!-- Message Input Form -->
                <form id="send-message-form" class="send-message-form">
                    <div class="mb-3">
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
                    </div>
                </form>
            </div>
        `;
    }

    private setupEventListeners(): void {
        if (!this.container) return;

        // Close button
        const closeBtn = this.container.querySelector('#toast-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Send message form
        const form = this.container.querySelector('#send-message-form') as HTMLFormElement;
        if (form) {
            form.addEventListener('submit', (e) => this.handleSendMessage(e));
        }

        // Enter to send (Ctrl+Enter for new line)
        const messageInput = this.container.querySelector('#message-content') as HTMLTextAreaElement;
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.ctrlKey) {
                    e.preventDefault();
                    this.handleSendMessage(e);
                }
            });
        }

        // Remove the outside click handler that was causing auto-close
        // document.addEventListener('click', this.handleOutsideClick.bind(this));
    }

	private handleOutsideClick = (event: Event): void => {
		if (this.container && !this.container.contains(event.target as Node)) {
			this.close();
		}
	};

	private async handleSendMessage(event: Event): Promise<void> {
		event.preventDefault();

		if (!this.targetUsername) {
			console.error('Cannot send message - no target username');
			return;
		}

		const messageInput = this.container?.querySelector('#message-content') as HTMLTextAreaElement;
		const sendBtn = this.container?.querySelector('#send-message-btn') as HTMLButtonElement;
		const errorDiv = this.container?.querySelector('#send-error') as HTMLElement;

		if (!messageInput || !sendBtn) {
			console.error('Required form elements not found');
			return;
		}

		const messageContent = messageInput.value.trim();

		// Clear previous errors
		errorDiv?.classList.add('hidden');

		if (!messageContent) {
			this.showError('send-error', t('Please enter a message'));
			return;
		}

		// Disable send button during processing
		sendBtn.disabled = true;
		sendBtn.textContent = t('Sending...');

		try {
			console.log('Sending message to:', this.targetUsername, '- Message:', messageContent);

			// Dispatch event that socket service will handle
			window.dispatchEvent(new CustomEvent('send-message-request', {
				detail: {
					recipient: this.targetUsername,
					message: messageContent
				}
			}));

			// Clear form after successful send
			messageInput.value = '';

			// Show success toast
			this.showSuccessToast('Message sent to ' + this.targetUsername);

			console.log('Message sent successfully');

		} catch (error) {
			console.error('Send message error:', error);
			this.showError('send-error', t('Failed to send message. Please try again.'));
		} finally {
			sendBtn.disabled = false;
			sendBtn.textContent = t('Send Message');
		}
	}

	private showSuccessToast(message: string): void {
		// Use the global notification system if available
		if ((window as any).notifyBox) {
			(window as any).notifyBox.addNotification(message, 'success');
		} else {
			// Fallback: create temporary success toast
			const toast = document.createElement('div');
			toast.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white p-3 rounded shadow-lg transform transition-all duration-300 opacity-0 translate-x-full';
			toast.textContent = message;

			document.body.appendChild(toast);

			setTimeout(() => {
				toast.style.transform = 'translateX(0)';
				toast.style.opacity = '1';
			}, 10);

			setTimeout(() => {
				toast.style.transform = 'translateX(100%)';
				toast.style.opacity = '0';
				setTimeout(() => {
					if (toast.parentNode) {
						toast.parentNode.removeChild(toast);
					}
				}, 300);
			}, 3000);
		}
	}

	private escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	private showError(errorId: string, message: string): void {
		const errorDiv = this.container?.querySelector(`#${errorId}`) as HTMLElement;
		if (errorDiv) {
			errorDiv.textContent = message;
			errorDiv.classList.remove('hidden');
		}
	}

	public destroy(): void {
		// Remove event listeners
		window.removeEventListener('direct-message-received', this.handleMessageReceived.bind(this));
		document.removeEventListener('click', this.handleOutsideClick);

		this.close();
	}

	public isOpen(): boolean {
		return this.isVisible;
	}

	public getTargetUsername(): string | null {
		return this.targetUsername;
	}
}
