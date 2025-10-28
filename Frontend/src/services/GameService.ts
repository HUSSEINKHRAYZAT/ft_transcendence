import {
  GameRealistic as GameState,
  GameSettings,
  GameDifficulty,
  GameMode,
  GameTheme,
  Score,
  GameResult,
  PlayerType } from '../types/Game';
import { GAME_CONFIG, STORAGE_KEYS } from '../utils/Constants';
import { globalEventManager, AppEvent } from '../utils/EventManager';

export class GameService {
  private state: GameState;
  private gameStartTime: Date | null = null;

  constructor() {
    this.state = this.getDefaultGameState();
    this.loadSettingsFromStorage();
  }

  private getDefaultGameState(): GameState {
    return {
      isPlaying: false,
      isPaused: false,
      isGameOver: false,
      isLoading: false,
      score: {
        player1: 0,
        player2: 0,
        winningScore: GAME_CONFIG.SCORE.WIN_CONDITION,
      },
      settings: {
        difficulty: GameDifficulty.MEDIUM,
        gameMode: GameMode.SINGLE_PLAYER,
        ballSpeed: GAME_CONFIG.BALL.SPEED,
        paddleSpeed: GAME_CONFIG.PADDLE.SPEED,
        soundEnabled: true,
        musicEnabled: true,
        theme: GameTheme.LIME,
      },
      timer: {
        startTime: null,
        endTime: null,
        duration: 0,
        elapsedTime: 0,
      }
    };
  }

  private loadSettingsFromStorage(): void {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEYS.GAME_SETTINGS);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        this.state.settings = { ...this.state.settings, ...parsedSettings };
      }
    } catch (error) {

    }
  }

  private saveSettingsToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(this.state.settings));
    } catch (error) {

    }
  }

  getState(): GameState {
    return { ...this.state };
  }

  getSettings(): GameSettings {
    return { ...this.state.settings };
  }

  updateSettings(newSettings: Partial<GameSettings>): void {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.saveSettingsToStorage();
    globalEventManager.emit('game:settings-updated', this.state.settings);
  }

  startGame(gameMode: GameMode = GameMode.SINGLE_PLAYER): void {
    if (this.state.isPlaying) {

      return;
    }

    this.state = {
      ...this.state,
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      isLoading: false,
      score: {
        player1: 0,
        player2: 0,
        winningScore: this.state.score.winningScore,
      },
      timer: {
        startTime: new Date(),
        endTime: null,
        duration: 0,
        elapsedTime: 0,
      }
    };

    this.state.settings.gameMode = gameMode;
    this.gameStartTime = new Date();

    globalEventManager.emit(AppEvent.GAME_START, {
      gameMode,
      settings: this.state.settings,
    });
  }

  pauseGame(): void {
    if (!this.state.isPlaying || this.state.isPaused) {
      return;
    }

    this.state.isPaused = true;
    globalEventManager.emit(AppEvent.GAME_PAUSE);
  }

  resumeGame(): void {
    if (!this.state.isPlaying || !this.state.isPaused) {
      return;
    }

    this.state.isPaused = false;
    globalEventManager.emit(AppEvent.GAME_RESUME);
  }

  endGame(winner?: 'player1' | 'player2' | null): GameResult {
    if (!this.state.isPlaying) {
      throw new Error('No game in progress to end');
    }

    const endTime = new Date();
    const duration = this.gameStartTime ?
      Math.floor((endTime.getTime() - this.gameStartTime.getTime()) / 1000) : 0;

    const result: GameResult = {
    winner: winner === 'player1' ? PlayerType.PLAYER1 :
            winner === 'player2' ? PlayerType.PLAYER2 : null,
      finalScore: { ...this.state.score },
      duration,
      totalHits: 0, // Will be tracked by game canvas
      maxBallSpeed: this.state.settings.ballSpeed,
      gameMode: this.state.settings.gameMode,
      difficulty: this.state.settings.difficulty,
    };

    this.state = {
      ...this.state,
      isPlaying: false,
      isPaused: false,
      isGameOver: true,
      timer: {
        ...this.state.timer,
        endTime,
        duration,
      }
    };

    globalEventManager.emit(AppEvent.GAME_END, result);
    return result;
  }

  resetGame(): void {
    this.state = {
      ...this.getDefaultGameState(),
      settings: this.state.settings,
    };
    this.gameStartTime = null;
  }

  updateScore(player: 'player1' | 'player2', points: number = 1): void {
    if (!this.state.isPlaying || this.state.isPaused) {
      return;
    }

    this.state.score[player] += points;

    if (this.state.score[player] >= this.state.score.winningScore) {
      this.endGame(player);
    }

    globalEventManager.emit(AppEvent.GAME_SCORE_UPDATE, {
      score: { ...this.state.score },
      scoringPlayer: player,
    });
  }

  getScore(): Score {
    return { ...this.state.score };
  }

  isGameInProgress(): boolean {
    return this.state.isPlaying && !this.state.isGameOver;
  }

  isGamePaused(): boolean {
    return this.state.isPaused;
  }

  isGameOver(): boolean {
    return this.state.isGameOver;
  }

  getGameDuration(): number {
    if (!this.gameStartTime) return 0;

    const endTime = this.state.timer.endTime || new Date();
    return Math.floor((endTime.getTime() - this.gameStartTime.getTime()) / 1000);
  }

  eElapsedTime(): void {
    if (this.state.isPlaying && !this.state.isPaused && this.gameStartTime) {
      this.state.timer.elapsedTime = Math.floor((Date.now() - this.gameStartTime.getTime()) / 1000);
    }
  }

  setDifficulty(difficulty: GameDifficulty): void {
    this.state.settings.difficulty = difficulty;

    // Adjust speed based on difficulty
    switch (difficulty) {
      case GameDifficulty.EASY:
        this.state.settings.ballSpeed = GAME_CONFIG.BALL.SPEED * 0.8;
        this.state.settings.paddleSpeed = GAME_CONFIG.PADDLE.SPEED * 1.2;
        break;
      case GameDifficulty.MEDIUM:
        this.state.settings.ballSpeed = GAME_CONFIG.BALL.SPEED;
        this.state.settings.paddleSpeed = GAME_CONFIG.PADDLE.SPEED;
        break;
      case GameDifficulty.HARD:
        this.state.settings.ballSpeed = GAME_CONFIG.BALL.SPEED * 1.3;
        this.state.settings.paddleSpeed = GAME_CONFIG.PADDLE.SPEED * 0.9;
        break;
      case GameDifficulty.EXPERT:
        this.state.settings.ballSpeed = GAME_CONFIG.BALL.SPEED * 1.6;
        this.state.settings.paddleSpeed = GAME_CONFIG.PADDLE.SPEED * 0.8;
        break;
    }

    this.saveSettingsToStorage();
  }

  setTheme(theme: GameTheme): void {
    this.state.settings.theme = theme;
    this.saveSettingsToStorage();
    globalEventManager.emit('game:theme-changed', theme);
  }

  toggleSound(): void {
    this.state.settings.soundEnabled = !this.state.settings.soundEnabled;
    this.saveSettingsToStorage();
  }

  toggleMusic(): void {
    this.state.settings.musicEnabled = !this.state.settings.musicEnabled;
    this.saveSettingsToStorage();
  }

  getHighScore(): number {
    try {
      const highScore = localStorage.getItem('ft_pong_high_score');
      return highScore ? parseInt(highScore, 10) : 0;
    } catch (error) {

      return 0;
    }
  }

  saveHighScore(score: number): void {
    try {
      const currentHighScore = this.getHighScore();
      if (score > currentHighScore) {
        localStorage.setItem('ft_pong_high_score', score.toString());
        globalEventManager.emit('game:new-high-score', score);
      }
    } catch (error) {

    }
  }

  getGameStats(): {
    gamesPlayed: number;
    gamesWon: number;
    totalPlayTime: number;
  }{
    try {
      const stats = localStorage.getItem('ft_pong_game_stats');
      return stats ? JSON.parse(stats) : {
        gamesPlayed: 0,
        gamesWon: 0,
        totalPlayTime: 0,
      };
    } catch (error) {

      return {
        gamesPlayed: 0,
        gamesWon: 0,
        totalPlayTime: 0,
      };
    }
  }

  updateGameStats(result: GameResult): void {
    try {
      const stats = this.getGameStats();
      stats.gamesPlayed++;
      stats.totalPlayTime += result.duration;
      if (result.winner === 'player1') {
        stats.gamesWon++;
      }

      localStorage.setItem('ft_pong_game_stats', JSON.stringify(stats));
    } catch (error) {

    }
  }

  getBallSpeed(): number {
    return this.state.settings.ballSpeed;
  }

  getPaddleSpeed(): number {
    return this.state.settings.paddleSpeed;
  }

  isSoundEnabled(): boolean {
    return this.state.settings.soundEnabled;
  }

  isMusicEnabled(): boolean {
    return this.state.settings.musicEnabled;
  }

  getCurrentTheme(): GameTheme {
    return this.state.settings.theme;
  }
}

export const gameService = new GameService();
