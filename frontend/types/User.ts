export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: User | null;
}

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
  enable2fa?: number | boolean;
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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  errors?: ValidationError[];
  requires2FA?: boolean;
  tempToken?: string;
  conflict?: string;
  suggestions?: string[];
  statusCode?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface Friend {
  id: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  status: FriendStatus;
  createdAt: Date;
}

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

export enum NotificationType {
  FRIEND_REQUEST = 'friend_request',
  GAME_INVITE = 'game_invite',
  GAME_RESULT = 'game_result',
  SYSTEM = 'system',
}

export interface UserSettings {
  theme: string;
  backgroundTheme: string;
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  notificationsEnabled: boolean;
  language: string;
}

// ✅ UPDATED: Enhanced UpdateProfileData with 2FA support
export interface UpdateProfileData {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  profilePath: string | null;
  enable2fa: boolean;
}


export interface GameSettings {
  theme: string;
  backgroundTheme: string;
  language: string;
  musicVolume: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface MusicTrack {
  name: string;
  url: string;
  duration?: number;
  artist?: string;
}

export interface MusicPlayerState {
  isPlaying: boolean;
  currentTrackIndex: number;
  volume: number;
  playlist: MusicTrack[];
}
