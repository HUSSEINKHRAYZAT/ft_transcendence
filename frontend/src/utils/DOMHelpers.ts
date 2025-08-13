// DOM manipulation utilities for FT_PONG

/**
 * Create an HTML element with specified tag, classes, and attributes
 */
export function createElement<T extends keyof HTMLElementTagNameMap>(
  tag: T,
  options: {
    className?: string;
    id?: string;
    textContent?: string;
    innerHTML?: string;
    attributes?: Record<string, string>;
    dataset?: Record<string, string>;
  } = {}
): HTMLElementTagNameMap[T] {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.id) {
    element.id = options.id;
  }

  if (options.textContent) {
    element.textContent = options.textContent;
  }

  if (options.innerHTML) {
    element.innerHTML = options.innerHTML;
  }

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      element.dataset[key] = value;
    });
  }

  return element;
}

/**
 * Find element by selector with optional parent context
 */
export function findElement<T extends Element = Element>(
  selector: string,
  parent: Element | Document = document
): T | null {
  return parent.querySelector<T>(selector);
}

/**
 * Find all elements by selector with optional parent context
 */
export function findElements<T extends Element = Element>(
  selector: string,
  parent: Element | Document = document
): NodeListOf<T> {
  return parent.querySelectorAll<T>(selector);
}

/**
 * Add multiple CSS classes to an element
 */
export function addClass(element: Element, ...classes: string[]): void {
  element.classList.add(...classes);
}

/**
 * Remove multiple CSS classes from an element
 */
export function removeClass(element: Element, ...classes: string[]): void {
  element.classList.remove(...classes);
}

/**
 * Toggle CSS classes on an element
 */
export function toggleClass(element: Element, className: string, force?: boolean): boolean {
  return element.classList.toggle(className, force);
}

/**
 * Check if element has a specific CSS class
 */
export function hasClass(element: Element, className: string): boolean {
  return element.classList.contains(className);
}

/**
 * Set multiple attributes on an element
 */
export function setAttributes(element: Element, attributes: Record<string, string>): void {
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

/**
 * Remove multiple attributes from an element
 */
export function removeAttributes(element: Element, ...attributes: string[]): void {
  attributes.forEach(attr => element.removeAttribute(attr));
}

/**Replace existing classes in the DOM when theme changes
 * Clear all children from an element
 */
export function clearElement(element: Element): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Append multiple children to an element
 */
export function appendChildren(parent: Element, ...children: (Element | string)[]): void {
  children.forEach(child => {
    if (typeof child === 'string') {
      parent.appendChild(document.createTextNode(child));
    } else {
      parent.appendChild(child);
    }
  });
}

/**
 * Insert element after a reference element
 */
export function insertAfter(newElement: Element, referenceElement: Element): void {
  const parent = referenceElement.parentNode;
  if (parent) {
    parent.insertBefore(newElement, referenceElement.nextSibling);
  }
}

/**
 * Check if element is visible in viewport
 */
export function isElementInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Smooth scroll to an element
 */
export function scrollToElement(element: Element, options: ScrollIntoViewOptions = {}): void {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest',
    ...options,
  });
}

/**
 * Get element's position relative to document
 */
export function getElementPosition(element: Element): { top: number; left: number } {
  const rect = element.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  return {
    top: rect.top + scrollTop,
    left: rect.left + scrollLeft,
  };
}

/**
 * Wait for DOM content to be loaded
 */
export function waitForDOM(): Promise<void> {
  console.log('🔍 waitForDOM called, checking document state...');
  console.log('📄 Current document.readyState:', document.readyState);

  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      console.log('⏳ Document still loading, adding DOMContentLoaded listener...');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOMContentLoaded fired in waitForDOM!');
        resolve();
      });
    } else {
      console.log('✅ Document already ready, resolving immediately...');
      resolve();
    }
  });
}

/**
 * Create a loading spinner element
 */
export function createLoadingSpinner(size: 'small' | 'medium' | 'large' = 'medium'): HTMLElement {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return createElement('div', {
    className: `${sizeClasses[size]} border-2 border-lime-500 border-t-transparent rounded-full animate-spin`,
  });
}

/**
 * Create a button with lime theme
 */
export function createButton(
  text: string,
  type: 'primary' | 'secondary' | 'outline' = 'primary',
  options: {
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
    id?: string;
  } = {}
): HTMLButtonElement {
  const baseClasses = 'px-4 py-2 rounded font-bold transition-all duration-300 focus:outline-none focus:ring-2';

  const typeClasses = {
    primary: 'bg-lime-500 hover:bg-lime-600 text-white focus:ring-lime-300',
    secondary: 'bg-dark-green-600 hover:bg-dark-green-700 text-white focus:ring-dark-green-300',
    outline: 'border-2 border-lime-500 text-lime-500 hover:bg-lime-500 hover:text-white focus:ring-lime-300',
  };

  const button = createElement('button', {
    textContent: text,
    className: `${baseClasses} ${typeClasses[type]} ${options.className || ''}`,
    id: options.id,
    attributes: {
      type: 'button',
      ...(options.disabled && { disabled: 'true' }),
    },
  });

  if (options.onClick) {
    button.addEventListener('click', options.onClick);
  }

  return button;
}

/**
 * Create an input field with lime theme
 */
export function createInput(
  type: string = 'text',
  options: {
    placeholder?: string;
    value?: string;
    className?: string;
    id?: string;
    required?: boolean;
    onChange?: (value: string) => void;
  } = {}
): HTMLInputElement {
  const baseClasses = 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500';

  const input = createElement('input', {
    className: `${baseClasses} ${options.className || ''}`,
    id: options.id,
    attributes: {
      type,
      ...(options.placeholder && { placeholder: options.placeholder }),
      ...(options.value && { value: options.value }),
      ...(options.required && { required: 'true' }),
    },
  });

  if (options.onChange) {
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      options.onChange!(target.value);
    });
  }

  return input;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Animation frame helper
 */
export function nextFrame(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

/**
 * Wait for specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
