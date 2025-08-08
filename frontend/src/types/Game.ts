// Game state management
export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  isLoading: boolean;
  score: Score;
  settings: GameSettings;
  timer: GameTimer;
}

// Game score tracking
export interface Score {
  player1: number;
  player2: number;
  winningScore: number;
}

// Game settings
export interface GameSettings {
  difficulty: GameDifficulty;
  gameMode: GameMode;
  ballSpeed: number;
  paddleSpeed: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  theme: GameTheme;
}

// Game difficulty levels
export enum GameDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

// Game modes
export enum GameMode {
  SINGLE_PLAYER = 'single-player',
  MULTIPLAYER = 'multiplayer',
  AI_OPPONENT = 'ai-opponent',
}

// Game themes
export enum GameTheme {
  LIME = 'lime',
  CLASSIC = 'classic',
  NEON = 'neon',
  RETRO = 'retro',
}

// Game timer
export interface GameTimer {
  startTime: Date | null;
  endTime: Date | null;
  duration: number; // in seconds
  elapsedTime: number;
}

// Game objects
export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

// Paddle object
export interface Paddle extends GameObject {
  speed: number;
  direction: PaddleDirection;
  player: PlayerType;
}

// Ball object
export interface Ball extends GameObject {
  radius: number;
  velocityX: number;
  velocityY: number;
  speed: number;
}

// Paddle movement direction
export enum PaddleDirection {
  UP = 'up',
  DOWN = 'down',
  IDLE = 'idle',
}

// Player types
export enum PlayerType {
  PLAYER1 = 'player1',
  PLAYER2 = 'player2',
  AI = 'ai',
}

// Game canvas dimensions
export interface CanvasDimensions {
  width: number;
  height: number;
}

// Game controls
export interface GameControls {
  player1: PlayerControls;
  player2: PlayerControls;
  general: GeneralControls;
}

// Player control mappings
export interface PlayerControls {
  up: string;
  down: string;
}

// General game control mappings
export interface GeneralControls {
  pause: string;
  restart: string;
  quit: string;
}

// Game events
export enum GameEvent {
  GAME_START = 'game-start',
  GAME_PAUSE = 'game-pause',
  GAME_RESUME = 'game-resume',
  GAME_END = 'game-end',
  SCORE_UPDATE = 'score-update',
  BALL_HIT = 'ball-hit',
  PADDLE_MOVE = 'paddle-move',
}

// Game event data
export interface GameEventData {
  type: GameEvent;
  timestamp: Date;
  data?: any;
}

// Game result
export interface GameResult {
  winner: PlayerType | null;
  finalScore: Score;
  duration: number;
  totalHits: number;
  maxBallSpeed: number;
  gameMode: GameMode;
  difficulty: GameDifficulty;
}

// AI player configuration
export interface AIConfig {
  difficulty: GameDifficulty;
  reactionTime: number; // in milliseconds
  accuracy: number; // 0-1, chance to hit the ball perfectly
  speed: number; // multiplier for paddle speed
}

// Collision detection
export interface CollisionInfo {
  occurred: boolean;
  side?: CollisionSide;
  point?: { x: number; y: number };
}

// Collision sides
export enum CollisionSide {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
}

// Game statistics for a session
export interface GameSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  result?: GameResult;
  settings: GameSettings;
  events: GameEventData[];
}
