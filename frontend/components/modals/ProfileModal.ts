import { BaseModal } from './BaseModal';
import { authService } from '../../services/AuthService';
import { findElement } from '../../utils/DOMHelpers';
import { t } from '../../langs/LanguageManager';

export class ProfileModal extends BaseModal {
    private static instance: ProfileModal | null = null;
    private availableAvatars = [
        'bear.png', 'cat.png', 'chicken.png', 'dog.png',
        'gorilla.png', 'meerkat.png', 'panda.png', 'rabbit.png',
        'owl.png', 'koala.png', 'shark.png'
    ];

    constructor() {
        super();
        // Singleton pattern
        if (ProfileModal.instance) {
            return ProfileModal.instance;
        }
        ProfileModal.instance = this;
    }

    protected getModalTitle(): string {
        return `👤 ${t('Edit Profile')}`;
    }

protected getModalContent(): string {
    const user = authService.getUser();

    // Check what's in localStorage directly
    const userDataFromStorage = localStorage.getItem('ft_pong_user_data');
    console.log('🔍 DEBUG localStorage user data:', userDataFromStorage);

    // Check AuthService internal state
    const authState = authService.getState();

    if (!user) {
        return `
        <div class="text-center text-red-400">
            <p>${t('Please login to view your profile')}</p>
        </div>
        <button id="close-profile-btn" class="w-full btn-lime mt-4">
            ${t('Close')}
        </button>
        `;
    }

    const currentAvatar = user.avatar || user.profilePath;
    console.log('🔍 DEBUG Final currentAvatar value:', currentAvatar);

    // Get 2FA status - handle both boolean and number types from backend
    const is2FAEnabled = user.enable2fa === true || user.enable2fa === 1;

    return `
        <form id="profile-form" class="space-y-6">
            <!-- Current Avatar Display -->
            <div class="text-center mb-6">
                <div class="relative inline-block">
                    <div id="current-avatar" class="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-lime-500 overflow-hidden bg-gray-700 flex items-center justify-center">
                        ${currentAvatar ?
                            `<img src="/avatars/${currentAvatar}" alt="Avatar" class="w-full h-full object-cover">` :
                            `<div class="w-full h-full bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center text-white text-2xl font-bold">
                                ${(user.firstName?.[0] || user.userName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                            </div>`
                        }
                    </div>
                    <div class="absolute -bottom-1 -right-1 bg-lime-500 rounded-full p-1">
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Avatar Selection -->
            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-300 mb-3">${t('Choose Avatar')}</label>
                <div class="grid grid-cols-4 gap-3">
                    <!-- Default Avatar Option -->
                    <div class="avatar-option ${!currentAvatar ? 'selected' : ''}" data-avatar="">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer border-2 border-transparent hover:border-lime-400 transition-all duration-300">
                            ${(user.firstName?.[0] || user.userName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                        </div>
                    </div>
                    ${this.availableAvatars.map(avatar => `
                        <div class="avatar-option ${currentAvatar === avatar ? 'selected' : ''}" data-avatar="${avatar}">
                            <img src="/avatars/${avatar}" alt="${avatar}"
                                 class="w-12 h-12 rounded-full object-cover cursor-pointer border-2 border-transparent hover:border-lime-400 transition-all duration-300">
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Personal Information -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">${t('First Name')}</label>
                    <input type="text" id="profile-firstName" required
                           value="${user.firstName || ''}"
                           class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                           placeholder="${t('Enter first name')}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">${t('Last Name')}</label>
                    <input type="text" id="profile-lastName" required
                        value="${user.lastName || ''}"
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                        placeholder="${t('Enter last name')}">
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">${t('Username')}</label>
                <input type="text" id="profile-username" required
                       value="${user.userName || ''}"
                       class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                       placeholder="${t('Enter username')}">
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">${t('Email')}</label>
                <input type="email" id="profile-email" required
                       value="${user.email || ''}"
                       class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                       placeholder="${t('Enter email')}">
            </div>

            <!-- 2FA Toggle Section -->
            <div class="border-t border-gray-600 pt-4">
                <div class="flex items-center justify-between">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-1">${t('Two-Factor Authentication')}</label>
                        <p class="text-xs text-gray-400">${t('Add an extra layer of security to your account')}</p>
                    </div>
                    <div class="relative">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="profile-enable2fa"
                                   ${is2FAEnabled ? 'checked' : ''}
                                   class="sr-only peer">
                            <div class="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-500"></div>
                        </label>
                    </div>
                </div>

                <!-- 2FA Status Indicator -->
                <div class="mt-3 flex items-center text-xs">
                    <div class="flex items-center ${is2FAEnabled ? 'text-green-400' : 'text-gray-400'}">
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            ${is2FAEnabled ?
                                `<path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>` :
                                `<path fill-rule="evenodd" d="M10 1C4.477 1 0 5.477 0 11s4.477 10 10 10 10-4.477 10-10S15.523 1 10 1zM8.293 14.707a1 1 0 01-1.414-1.414L10.586 9.5 6.879 5.793a1 1 0 011.414-1.414L12 8.086l3.707-3.707a1 1 0 011.414 1.414L13.414 9.5l3.707 3.707a1 1 0 01-1.414 1.414L12 11.914l-3.707 3.793z" clip-rule="evenodd"></path>`
                            }
                        </svg>
                        <span>${is2FAEnabled ? t('2FA Enabled') : t('2FA Disabled')}</span>
                    </div>
                </div>
            </div>

            <!-- Error Display -->
            <div id="profile-error" class="hidden p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>

            <!-- Success Display -->
            <div id="profile-success" class="hidden p-3 bg-green-900/50 border border-green-500 rounded text-green-200 text-sm"></div>

            <!-- Action Buttons -->
            <div class="flex gap-3 pt-4">
                <button type="button" id="cancel-profile-btn" class="flex-1 btn-outline">
                    ${t('Cancel')}
                </button>
                <button type="submit" id="save-profile-btn" class="flex-1 btn-lime">
                    ${t('Save Changes')}
                </button>
            </div>
        </form>
    `;
}

    protected setupEventListeners(): void {
        const form = findElement('#profile-form') as HTMLFormElement;
        const cancelBtn = findElement('#cancel-profile-btn');
        const avatarOptions = document.querySelectorAll('.avatar-option');

        // Handle form submission
        if (form) {
            form.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        // Handle cancel button
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }

        // Handle avatar selection
        avatarOptions.forEach(option => {
            option.addEventListener('click', () => this.selectAvatar(option));
        });

        // Focus first input
        setTimeout(() => {
            const firstInput = findElement('#profile-firstName') as HTMLInputElement;
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    private selectAvatar(selectedOption: Element): void {
        // Remove selected class from all options
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Add selected class to clicked option
        selectedOption.classList.add('selected');

        // Update current avatar display
        const avatarPath = selectedOption.getAttribute('data-avatar');
        const currentAvatarDiv = findElement('#current-avatar');
        const user = authService.getUser();

        if (currentAvatarDiv) {
            if (avatarPath) {
                currentAvatarDiv.innerHTML = `<img src="/avatars/${avatarPath}" alt="Avatar" class="w-full h-full object-cover">`;
            } else {
                // Default avatar
                currentAvatarDiv.innerHTML = `
                    <div class="w-full h-full bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center text-white text-2xl font-bold">
                        ${(user?.firstName?.[0] || user?.userName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </div>
                `;
            }
        }
    }

private async handleProfileUpdate(event: Event): Promise<void> {
    event.preventDefault();

    const firstNameInput = findElement('#profile-firstName') as HTMLInputElement;
    const lastNameInput = findElement('#profile-lastName') as HTMLInputElement;
    const usernameInput = findElement('#profile-username') as HTMLInputElement;
    const emailInput = findElement('#profile-email') as HTMLInputElement;
    const enable2faInput = findElement('#profile-enable2fa') as HTMLInputElement; // ✅ Add 2FA input
    const saveBtn = findElement('#save-profile-btn') as HTMLButtonElement;
    const errorDiv = findElement('#profile-error') as HTMLElement;
    const successDiv = findElement('#profile-success') as HTMLElement;

    if (!firstNameInput || !lastNameInput || !usernameInput || !emailInput || !enable2faInput || !saveBtn) {
        console.error('❌ Required form elements not found');
        return;
    }

    const selectedAvatarOption = document.querySelector('.avatar-option.selected');
    const selectedAvatar = selectedAvatarOption?.getAttribute('data-avatar') || null;

    // Collect form data
    const updateData = {
        firstName: firstNameInput.value.trim(),
        lastName: lastNameInput.value.trim(),
        userName: usernameInput.value.trim(),
        email: emailInput.value.trim(),
        profilePath: selectedAvatar,
        enable2fa: enable2faInput.checked  // ✅ Add 2FA field
    };

    // Hide previous messages
    errorDiv?.classList.add('hidden');
    successDiv?.classList.add('hidden');

    // Validate data
    if (!updateData.firstName || !updateData.lastName || !updateData.userName || !updateData.email) {
        this.showProfileError('Please fill in all required fields');
        return;
    }

    if (!this.isValidEmail(updateData.email)) {
        this.showProfileError('Please enter a valid email address');
        return;
    }

    // Disable form during submission
    saveBtn.disabled = true;
    saveBtn.textContent = t('Saving...');

    try {
        console.log('💾 Updating profile with data:', updateData);

        const result = await authService.updateProfile(updateData);
        console.log('🔍 DEBUG Profile update result:', result);

        if (result.success && result.user) {
            console.log('✅ Profile updated successfully');
            console.log('👤 Updated user from backend:', result.user);

            // Check AuthService state after update
            const currentState = authService.getState();
            console.log('🔍 DEBUG AuthService state after update:', currentState);
            console.log('🔍 DEBUG AuthService user after update:', currentState.user);

            this.showProfileSuccess('Profile updated successfully!');
            this.forceUIUpdate(result.user);

            setTimeout(() => {
                this.close();
            }, 2000);
        } else {
            console.error('❌ Profile update failed:', result.message);
            this.showProfileError(result.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('❌ Profile update error:', error);
        this.showProfileError('An unexpected error occurred while updating your profile');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = t('Save Changes');
    }
}

    // Add this new method to ProfileModal class:
    private forceUIUpdate(updatedUser: any): void {
    console.log('🔄 forceUIUpdate called with user:', updatedUser);

    // Check what's in AuthService before dispatch
    const beforeState = authService.getState();
    console.log('🔍 DEBUG AuthService state BEFORE dispatch:', beforeState);

    // Dispatch auth state change event
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
        detail: { isAuthenticated: true, user: updatedUser }
    }));

    console.log('🔍 DEBUG Dispatched auth-state-changed event with:', { isAuthenticated: true, user: updatedUser });

    // Force navbar update after a short delay
    setTimeout(() => {
        console.log('🔄 Updating navbar...');

        // Check AuthService state after dispatch
        const afterState = authService.getState();
        console.log('🔍 DEBUG AuthService state AFTER dispatch:', afterState);

        if (typeof (window as any).addBasicNavbar === 'function') {
        console.log('🔍 DEBUG Calling addBasicNavbar()');
        (window as any).addBasicNavbar();
        } else {
        console.log('❌ DEBUG addBasicNavbar function not found');
        }

        if (typeof (window as any).updateJumbotronButton === 'function') {
        console.log('🔍 DEBUG Calling updateJumbotronButton()');
        (window as any).updateJumbotronButton();
        } else {
        console.log('❌ DEBUG updateJumbotronButton function not found');
        }

        // Log the current auth state for debugging
        const currentAuthState = authService.getState();
        console.log('📊 Current auth state after update:', {
        user: currentAuthState.user,
        avatar: currentAuthState.user?.avatar || currentAuthState.user?.profilePath
        });
    }, 100);
}

    private showProfileError(message: string): void {
        const errorDiv = findElement('#profile-error') as HTMLElement;
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }

    private showProfileSuccess(message: string): void {
        const successDiv = findElement('#profile-success') as HTMLElement;
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.classList.remove('hidden');
        }
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Show profile modal
     */
    public static show(): void {
        console.log('👤 ProfileModal.show() called');
        const modal = new ProfileModal();
        modal.showModal();
    }

    /**
     * Close profile modal
     */
    public static close(): void {
        const modal = ProfileModal.instance;
        if (modal) {
            modal.close();
        }
    }

    /**
     * Check if modal is currently open
     */
    public static isOpen(): boolean {
        return ProfileModal.instance?.isOpen() || false;
    }

    showModal(): void {
        this.show('profile');
    }

    close(): Promise<void> {
        ProfileModal.instance = null;
        return super.close();
    }

    /**
     * Add a render method for compatibility with component initialization
     */
    async render(): Promise<void> {
        console.log('👤 ProfileModal render() called - use show() to display modal');
    }
}

// Add CSS for avatar selection
const style = document.createElement('style');
style.textContent = `
    .avatar-option.selected img,
    .avatar-option.selected > div {
        border-color: #84cc16 !important;
        box-shadow: 0 0 0 2px rgba(132, 204, 22, 0.3);
    }

    .avatar-option:hover img,
    .avatar-option:hover > div {
        transform: scale(1.05);
    }
`;
document.head.appendChild(style);

// Make ProfileModal globally available
(window as any).ProfileModal = ProfileModal;

export default ProfileModal;
