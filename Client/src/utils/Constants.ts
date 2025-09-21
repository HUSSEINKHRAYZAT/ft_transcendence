export const APP_CONFIG = {
  name: 'FT_PONG',
  version: '1.0.0',
  description: 'A lime-themed Pong game',
} as const;

const HOSTNAME = window.location.hostname;

export const API_BASE_URL = `http://${HOSTNAME}:8080`;
export const WS_URL = `ws://${HOSTNAME}:3005/ws`;

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

export enum ModalType {
  LOGIN = 'login',
  SIGNUP = 'signup',
  HOME_INFO = 'home-info',
  ABOUT_INFO = 'about-info',
  PROJECT_INFO = 'project-info',
}

export const NAV_ITEMS = [
  { id: 'home', label: 'HOME', modalType: ModalType.HOME_INFO },
  { id: 'about', label: 'ABOUT US', modalType: ModalType.ABOUT_INFO },
  { id: 'project', label: 'PROJECT', modalType: ModalType.PROJECT_INFO },
] as const;

export const API_ENDPOINTS = {
  USER: {
    CREATE: '/users/',
    LIST: '/users/',
    SEND_VERIFICATION: '/users/send-verification',
    LOOKUP: '/users/lookup',
    GET_EMAIL: '/users/getEmail',
    VERIFY: '/users/verify',
    GET_BY_ID: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
    LOGIN: '/users/login',
    RESET_PASSWORD: '/users/reset-password',
    OAUTH_UPSERT: '/users/oauth-upsert',
  },
  STATISTICS: {
    GET: '/statistics/',
    GET_BY_USER: (userId: string) => `/statistics/${userId}`,
    UPDATE: (userId: string) => `/statistics/${userId}`,
  },
  RELATION: {
    CREATE: '/relation/',
    UPDATE: '/relation/',
    DELETE: '/relation/',
    FRIENDS: (userId: string) => `/relation/friends/${userId}`,
    REQUESTS: (userId: string) => `/relation/requests/${userId}`,
  },
  RELATION_TYPE: {
    LIST: '/relationType/',
    GET_ID: '/relationType/',
  },
  SETTINGS: {
    GET_BY_USERNAME: (username: string) => `/settings/${username}`,
    CREATE_UPDATE: '/settings/',
  },
  LANGUAGES: {
    LIST: '/languages/',
  },
  TOURNAMENT: {
    CREATE: '/tournament/',
    JOIN: '/tournament/join',
    LIST: '/tournament/',
    GET_BY_CODE: (code: string) => `/tournament/code/${code}`,
    GET_BY_ID: (id: string) => `/tournament/${id}`,
    UPDATE: (id: string) => `/tournament/${id}`,
    DELETE: (id: string) => `/tournament/${id}`,
  },
  DEFAULT: {
    OPENAPI: '/openapi.json',
    HEALTH: '/health',
  }
} as const;


export const STORAGE_KEYS = {
  AUTH_TOKEN: 'ft_pong_auth_token',
  USER_DATA: 'ft_pong_user_data',
  GAME_SETTINGS: 'ft_pong_game_settings',
  THEME_PREFERENCE: 'ft_pong_theme',
  USER_STATISTICS: 'ft_pong_statistics',
  WEB_SETTINGS: 'ft_pong_settings'
} as const;

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

export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 1000,
} as const;

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

export const Z_INDEX = {
  DROPDOWN: 10,
  MODAL_BACKDROP: 40,
  MODAL: 50,
  TOAST: 60,
  LOADING: 70,
} as const;

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

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in!',
  SIGNUP_SUCCESS: 'Account created successfully!',
  LOGOUT_SUCCESS: 'Successfully logged out!',
  PROFILE_UPDATE_SUCCESS: "Profile updated successfully",
} as const;

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
