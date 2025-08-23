// User authentication state
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: User | null;
}

// User profile information
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userName : string;
  avatar?: string;
  profilePath?: string;
  createdAt: Date;
  updatedAt: Date;
  gameStats?: GameStats;
}

// Game statistics for user
export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalScore: number;
  highestScore: number;
  winRate: number;
  averageScore: number;
}

// Login form data
export interface LoginCredentials {
  email: string;
  password: string;
}

// Signup form data
export interface SignupCredentials {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

// API response for authentication
export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  errors?: ValidationError[];
}

// Form validation errors
export interface ValidationError {
  field: string;
  message: string;
}

// Friend relationship
export interface Friend {
  id: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  status: FriendStatus;
  createdAt: Date;
}

// Friend request status
export enum FriendStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
}

// User notification
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>;
}

// Types of notifications
export enum NotificationType {
  FRIEND_REQUEST = 'friend_request',
  GAME_INVITE = 'game_invite',
  GAME_RESULT = 'game_result',
  SYSTEM = 'system',
}

// User settings/preferences
export interface UserSettings {
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  gameSettings: {
    difficulty: 'easy' | 'medium' | 'hard';
    paddleSpeed: number;
    ballSpeed: number;
  };
}

export interface UpdateProfileData {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  profilePath: string | null;
}
