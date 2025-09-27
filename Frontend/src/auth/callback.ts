import { authService } from "../services";
import { globalEventManager, AppEvent } from "../utils/EventManager";
import { mapBackendUserToUser } from "../services/AuthService";
import { STORAGE_KEYS } from "../utils/Constants"; // Import the storage keys

export async function handleOAuthCallback(): Promise<void> {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("token");

    if (!token) return;

    window.history.replaceState({}, "", window.location.pathname);

    const rawUser = await authService.fetchAuthMe(token);
    console.log("Raw /auth/me response:", JSON.stringify(rawUser, null, 2));

    if (rawUser) {
        const user = mapBackendUserToUser(rawUser);

        // 🔑 Use the same storage keys that AuthService expects
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

        await authService.setAuthState(token, user);

        // 🔑 notify UI
        globalEventManager.emit(AppEvent.AUTH_LOGIN, user);

        window.location.href = "/home";
    } else {
        console.error("Error fetching token, try again later!");
    }
}
