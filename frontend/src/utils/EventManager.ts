// Event management utilities for FT_PONG

type EventCallback = (...args: any[]) => void;

/**
 * Custom event emitter for application-wide events
 */
export class EventManager {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event (one-time only)
   */
  once(event: string, callback: EventCallback): () => void {
    const onceCallback = (...args: any[]) => {
      callback(...args);
      this.off(event, onceCallback);
    };

    return this.on(event, onceCallback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: EventCallback): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event
   */
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

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}

/**
 * Global event manager instance
 */
export const globalEventManager = new EventManager();

/**
 * DOM event handler manager for cleanup
 */
export class DOMEventManager {
  private eventHandlers: Map<Element, Map<string, EventListenerOrEventListenerObject[]>> = new Map();

  /**
   * Add event listener with automatic cleanup tracking
   */
  addEventListener(
    element: Element,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options);

    // Track for cleanup
    if (!this.eventHandlers.has(element)) {
      this.eventHandlers.set(element, new Map());
    }

    const elementEvents = this.eventHandlers.get(element)!;
    if (!elementEvents.has(event)) {
      elementEvents.set(event, []);
    }

    elementEvents.get(event)!.push(handler);
  }

  /**
   * Remove specific event listener
   */
  removeEventListener(
    element: Element,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    element.removeEventListener(event, handler, options);

    // Update tracking
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

  /**
   * Remove all event listeners for an element
   */
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

  /**
   * Clean up all tracked event listeners
   */
  cleanup(): void {
    this.eventHandlers.forEach((events, element) => {
      this.removeAllListeners(element);
    });
    this.eventHandlers.clear();
  }
}

/**
 * Global DOM event manager instance
 */
export const globalDOMEventManager = new DOMEventManager();

/**
 * Keyboard event manager for game controls
 */
export class KeyboardManager {
  private keys: Set<string> = new Set();
  private keyBindings: Map<string, EventCallback[]> = new Map();
  private isListening: boolean = false;

  /**
   * Start listening for keyboard events
   */
  start(): void {
    if (this.isListening) return;

    this.isListening = true;
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Stop listening for keyboard events
   */
  stop(): void {
    if (!this.isListening) return;

    this.isListening = false;
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.keys.clear();
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.code || event.key;

    if (!this.keys.has(key)) {
      this.keys.add(key);
      this.triggerCallbacks(key, 'keydown');
    }
  };

  /**
   * Handle keyup events
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.code || event.key;

    if (this.keys.has(key)) {
      this.keys.delete(key);
      this.triggerCallbacks(key, 'keyup');
    }
  };

  /**
   * Bind callback to key press
   */
  onKeyDown(key: string, callback: EventCallback): () => void {
    return this.bindKey(key, 'keydown', callback);
  }

  /**
   * Bind callback to key release
   */
  onKeyUp(key: string, callback: EventCallback): () => void {
    return this.bindKey(key, 'keyup', callback);
  }

  /**
   * Bind callback to key
   */
  private bindKey(key: string, type: string, callback: EventCallback): () => void {
    const bindingKey = `${key}:${type}`;

    if (!this.keyBindings.has(bindingKey)) {
      this.keyBindings.set(bindingKey, []);
    }

    this.keyBindings.get(bindingKey)!.push(callback);

    // Return unbind function
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

  /**
   * Trigger callbacks for key event
   */
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

  /**
   * Check if key is currently pressed
   */
  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  /**
   * Get all currently pressed keys
   */
  getPressedKeys(): string[] {
    return Array.from(this.keys);
  }

  /**
   * Clear all key bindings
   */
  clearBindings(): void {
    this.keyBindings.clear();
  }
}

/**
 * Global keyboard manager instance
 */
export const globalKeyboardManager = new KeyboardManager();

/**
 * Application events enum
 */
export enum AppEvent {
  // Authentication events
  AUTH_LOGIN = 'auth:login',
  AUTH_LOGOUT = 'auth:logout',
  AUTH_SIGNUP = 'auth:signup',
  AUTH_ERROR = 'auth:error',

  // Modal events
  MODAL_OPEN = 'modal:open',
  MODAL_CLOSE = 'modal:close',

  // Game events
  GAME_START = 'game:start',
  GAME_PAUSE = 'game:pause',
  GAME_RESUME = 'game:resume',
  GAME_END = 'game:end',
  GAME_SCORE_UPDATE = 'game:score-update',

  // UI events
  ROUTE_CHANGE = 'route:change',
  THEME_CHANGE = 'theme:change',
  NOTIFICATION_SHOW = 'notification:show',
  NOTIFICATION_HIDE = 'notification:hide',
}

/**
 * Cleanup function for all event managers
 */
export function cleanupEventManagers(): void {
  globalEventManager.removeAllListeners();
  globalDOMEventManager.cleanup();
  globalKeyboardManager.stop();
}
