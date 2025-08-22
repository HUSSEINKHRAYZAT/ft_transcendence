// Application Constants
export const APP_CONFIG = {
  name: 'FT_PONG',
  version: '1.0.0',
  description: 'A lime-themed Pong game',
} as const;

// Theme Colors
export const COLORS = {
  PRIMARY: {
    lime: '#84cc16',
    limeHover: '#65a30d',
    limeLight: '#a3e635',
    limeDark: '#4d7c0f',
  },
  SECONDARY: {
    darkGreen: '#16a34a',
    darkGreenHover: '#15803d',
    darkGreenLight: '#22c55e',
    darkGreenDark: '#14532d',
  },
  NEUTRAL: {
    gray900: '#111827',
    gray800: '#1f2937',
    gray700: '#374151',
    gray600: '#4b5563',
    white: '#ffffff',
  }
} as const;

// Modal Types
export enum ModalType {
  LOGIN = 'login',
  SIGNUP = 'signup',
  HOME_INFO = 'home-info',
  ABOUT_INFO = 'about-info',
  PROJECT_INFO = 'project-info',
}

// Navigation Items
export const NAV_ITEMS = [
  { id: 'home', label: 'HOME', modalType: ModalType.HOME_INFO },
  { id: 'about', label: 'ABOUT US', modalType: ModalType.ABOUT_INFO },
  { id: 'project', label: 'PROJECT', modalType: ModalType.PROJECT_INFO },
] as const;

// API Endpoints (placeholder for future backend)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    LOGOUT: '/api/auth/logout',
    VERIFY: '/api/auth/verify',
  },
  USER: {
    PROFILE: '/api/user/profile',
    FRIENDS: '/api/user/friends',
    NOTIFICATIONS: '/api/user/notifications',
  },
  GAME: {
    START: '/api/game/start',
    SCORE: '/api/game/score',
    LEADERBOARD: '/api/game/leaderboard',
  }
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'ft_pong_auth_token',
  USER_DATA: 'ft_pong_user_data',
  GAME_SETTINGS: 'ft_pong_game_settings',
  THEME_PREFERENCE: 'ft_pong_theme',
} as const;

// Game Settings
export const GAME_CONFIG = {
  CANVAS: {
    WIDTH: 800,
    HEIGHT: 400,
    BACKGROUND_COLOR: '#111827',
  },
  PADDLE: {
    WIDTH: 10,
    HEIGHT: 80,
    SPEED: 5,
    COLOR: '#84cc16',
  },
  BALL: {
    RADIUS: 8,
    SPEED: 4,
    COLOR: '#16a34a',
  },
  SCORE: {
    WIN_CONDITION: 11,
    FONT_SIZE: 48,
    COLOR: '#ffffff',
  }
} as const;

// Animation Durations
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 1000,
} as const;

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// Z-Index Layers
export const Z_INDEX = {
  DROPDOWN: 10,
  MODAL_BACKDROP: 40,
  MODAL: 50,
  TOAST: 60,
  LOADING: 70,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred. Please try again.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_REQUIRED: 'Email is required.',
  PASSWORD_REQUIRED: 'Password is required.',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  SIGNUP_FAILED: 'Registration failed. Please try again.',
  LOGIN_REQUIRED: 'Please log in to access this feature.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in!',
  SIGNUP_SUCCESS: 'Account created successfully!',
  LOGOUT_SUCCESS: 'Successfully logged out!',
  PROFILE_UPDATE_SUCCESS: "Profile updated successfully",
} as const;

// Modal Content
export const MODAL_CONTENT = {
  [ModalType.HOME_INFO]: {
    title: 'Welcome to FT_PONG',
    content: 'This is the home page where you can start playing our lime-themed Pong game. Get ready for some retro gaming fun!'
  },
  [ModalType.ABOUT_INFO]: {
    title: 'About FT_PONG',
    content: 'FT_PONG is a modern take on the classic Pong game, featuring a fresh lime theme and built with cutting-edge web technologies including TypeScript and Tailwind CSS.'
  },
  [ModalType.PROJECT_INFO]: {
    title: 'Project Information',
    content: 'This project showcases modern web development practices with a focus on clean architecture, responsive design, and engaging user experience.'
  }
} as const;
