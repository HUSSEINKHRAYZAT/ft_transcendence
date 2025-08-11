import { ModalType } from '@/utils/Constants';

// Base modal configuration
export interface ModalConfig {
  id: string;
  type: ModalType;
  title: string;
  content?: string;
  size?: ModalSize;
  closable?: boolean;
  backdrop?: boolean;
  className?: string;
}

// Modal size options
export enum ModalSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra-large',
}

// Modal state management
export interface ModalState {
  isOpen: boolean;
  isAnimating: boolean;
  config: ModalConfig | null;
}

// Modal event handlers
export interface ModalEventHandlers {
  onOpen?: () => void;
  onClose?: () => void;
  onSubmit?: (data?: any) => void;
  onCancel?: () => void;
}

// Form modal specific configuration
export interface FormModalConfig extends ModalConfig {
  fields: FormField[];
  submitText?: string;
  cancelText?: string;
  validation?: FormValidation;
}

// Form field definition
export interface FormField {
  name: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  validation?: FieldValidation;
  className?: string;
}

// Form field types
export enum FormFieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PASSWORD = 'password',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
}

// Field validation rules
export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => string | null;
}

// Form validation configuration
export interface FormValidation {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showErrorsImmediately?: boolean;
}

// Form submission data
export interface FormData {
  [key: string]: any;
}

// Form validation result
export interface ValidationResult {
  isValid: boolean;
  errors: FormErrors;
}

// Form errors
export interface FormErrors {
  [fieldName: string]: string;
}

// Modal animation states
export enum ModalAnimation {
  FADE_IN = 'fade-in',
  FADE_OUT = 'fade-out',
  SLIDE_IN = 'slide-in',
  SLIDE_OUT = 'slide-out',
  SCALE_IN = 'scale-in',
  SCALE_OUT = 'scale-out',
}

// Toast notification (similar to modal but different use case)
export interface ToastConfig {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  closable?: boolean;
  actions?: ToastAction[];
}

// Toast types
export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

// Toast action buttons
export interface ToastAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary';
}
