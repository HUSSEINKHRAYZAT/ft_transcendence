// Event management utilities for FT_PONG

type EventCallback = (...args: any[]) => void;

export class EventManager {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    return () => this.off(event, callback);
  }


  once(event: string, callback: EventCallback): () => void {
    const onceCallback = (...args: any[]) => {
      callback(...args);
      this.off(event, onceCallback);
    };

    return this.on(event, onceCallback);
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

    emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: string): number {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.size : 0;
  }

  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}

export const globalEventManager = new EventManager();

export class DOMEventManager {
  private eventHandlers: Map<Element, Map<string, EventListenerOrEventListenerObject[]>> = new Map();

  addEventListener(
    element: Element,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options);

    if (!this.eventHandlers.has(element)) {
      this.eventHandlers.set(element, new Map());
    }

    const elementEvents = this.eventHandlers.get(element)!;
    if (!elementEvents.has(event)) {
      elementEvents.set(event, []);
    }

    elementEvents.get(event)!.push(handler);
  }

  removeEventListener(
    element: Element,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    element.removeEventListener(event, handler, options);

    const elementEvents = this.eventHandlers.get(element);
    if (elementEvents) {
      const handlers = elementEvents.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }

        if (handlers.length === 0) {
          elementEvents.delete(event);
        }
      }

      if (elementEvents.size === 0) {
        this.eventHandlers.delete(element);
      }
    }
  }

  removeAllListeners(element: Element): void {
    const elementEvents = this.eventHandlers.get(element);
    if (elementEvents) {
      elementEvents.forEach((handlers, event) => {
        handlers.forEach(handler => {
          element.removeEventListener(event, handler);
        });
      });
      this.eventHandlers.delete(element);
    }
  }

  cleanup(): void {
    this.eventHandlers.forEach((events, element) => {
      this.removeAllListeners(element);
    });
    this.eventHandlers.clear();
  }
}

export const globalDOMEventManager = new DOMEventManager();

export class KeyboardManager {
  private keys: Set<string> = new Set();
  private keyBindings: Map<string, EventCallback[]> = new Map();
  private isListening: boolean = false;

  start(): void {
    if (this.isListening) return;

    this.isListening = true;
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  stop(): void {
    if (!this.isListening) return;

    this.isListening = false;
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.keys.clear();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.code || event.key;

    if (!this.keys.has(key)) {
      this.keys.add(key);
      this.triggerCallbacks(key, 'keydown');
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.code || event.key;

    if (this.keys.has(key)) {
      this.keys.delete(key);
      this.triggerCallbacks(key, 'keyup');
    }
  };

  onKeyDown(key: string, callback: EventCallback): () => void {
    return this.bindKey(key, 'keydown', callback);
  }

  onKeyUp(key: string, callback: EventCallback): () => void {
    return this.bindKey(key, 'keyup', callback);
  }

  private bindKey(key: string, type: string, callback: EventCallback): () => void {
    const bindingKey = `${key}:${type}`;

    if (!this.keyBindings.has(bindingKey)) {
      this.keyBindings.set(bindingKey, []);
    }

    this.keyBindings.get(bindingKey)!.push(callback);

    return () => {
      const callbacks = this.keyBindings.get(bindingKey);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }

        if (callbacks.length === 0) {
          this.keyBindings.delete(bindingKey);
        }
      }
    };
  }

  private triggerCallbacks(key: string, type: string): void {
    const bindingKey = `${key}:${type}`;
    const callbacks = this.keyBindings.get(bindingKey);

    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(key);
        } catch (error) {
          console.error(`Error in key binding for '${bindingKey}':`, error);
        }
      });
    }
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  getPressedKeys(): string[] {
    return Array.from(this.keys);
  }

  clearBindings(): void {
    this.keyBindings.clear();
  }
}

export const globalKeyboardManager = new KeyboardManager();

export enum AppEvent {
  AUTH_LOGIN = 'auth:login',
  AUTH_LOGOUT = 'auth:logout',
  AUTH_SIGNUP = 'auth:signup',
  AUTH_ERROR = 'auth:error',

  MODAL_OPEN = 'modal:open',
  MODAL_CLOSE = 'modal:close',

  AUTH_PROFILE_UPDATE = 'auth:profile-update',

  GAME_START = 'game:start',
  GAME_PAUSE = 'game:pause',
  GAME_RESUME = 'game:resume',
  GAME_END = 'game:end',
  GAME_SCORE_UPDATE = 'game:score-update',

  ROUTE_CHANGE = 'route:change',
  THEME_CHANGE = 'theme:change',
  NOTIFICATION_SHOW = 'notification:show',
  NOTIFICATION_HIDE = 'notification:hide',

  STATISTICS_UPDATED = 'statistics_updated',
  SETTINGS_UPDATED = 'settings_updated',
}

export function cleanupEventManagers(): void {
  globalEventManager.removeAllListeners();
  globalDOMEventManager.cleanup();
  globalKeyboardManager.stop();
}
