import { Vector3 } from "@babylonjs/core";
import type { GameConfig } from "../types";

export class GameState {
  private _scores = [0, 0, 0, 0];
  private _lastScorer = -1;
  private _lastHitter = -1;
  private _touchedOnce = false;
  private _obstacleAfterHit = false;
  private _isPaused = false;
  private _matchReady = true;
  private _gameStarted = false;

  // AI state
  private _aiError: number[] = [0, 0, 0, 0];
  private _aiErrorRangePerPaddle: number[] = [2, 2, 2, 2];
  private _aiLerpPerPaddle: number[] = [0.08, 0.08, 0.08, 0.08];
  private _aiVel: number[] = [0, 0, 0, 0];

  // Control configuration
  private _control: ("human" | "ai" | "remoteGuest")[] = [];

  // Ball state
  private _ballVelocity = new Vector3();

  constructor(private config: GameConfig) {
    if (config.connection === "remoteHost" || config.connection === "remote4Host") {
      this._matchReady = false;
    }
  }

  // Getters
  get scores(): readonly number[] { return this._scores; }
  get lastScorer(): number { return this._lastScorer; }
  get lastHitter(): number { return this._lastHitter; }
  get touchedOnce(): boolean { return this._touchedOnce; }
  get obstacleAfterHit(): boolean { return this._obstacleAfterHit; }
  get isPaused(): boolean { return this._isPaused; }
  get matchReady(): boolean { return this._matchReady; }
  get gameStarted(): boolean { return this._gameStarted; }
  get control(): readonly string[] { return this._control; }
  get ballVelocity(): Vector3 { return this._ballVelocity; }
  get aiError(): readonly number[] { return this._aiError; }
  get aiErrorRangePerPaddle(): readonly number[] { return this._aiErrorRangePerPaddle; }
  get aiLerpPerPaddle(): readonly number[] { return this._aiLerpPerPaddle; }
  get aiVel(): readonly number[] { return this._aiVel; }

  // Setters
  set lastScorer(value: number) { this._lastScorer = value; }
  set lastHitter(value: number) { this._lastHitter = value; }
  set touchedOnce(value: boolean) { this._touchedOnce = value; }
  set obstacleAfterHit(value: boolean) { this._obstacleAfterHit = value; }
  set isPaused(value: boolean) { this._isPaused = value; }
  set matchReady(value: boolean) { this._matchReady = value; }
  set gameStarted(value: boolean) { this._gameStarted = value; }

  public setControl(control: ("human" | "ai" | "remoteGuest")[]): void {
    this._control = [...control];
  }

  public setBallVelocity(velocity: Vector3): void {
    this._ballVelocity.copyFrom(velocity);
  }

  public addScore(playerIndex: number): void {
    if (playerIndex >= 0 && playerIndex < this._scores.length) {
      this._scores[playerIndex]++;
    }
  }

  public subtractScore(playerIndex: number): void {
    if (playerIndex >= 0 && playerIndex < this._scores.length) {
      this._scores[playerIndex] = Math.max(0, this._scores[playerIndex] - 1);
    }
  }

  public setScores(scores: number[]): void {
    for (let i = 0; i < Math.min(scores.length, this._scores.length); i++) {
      this._scores[i] = scores[i];
    }
  }

  public resetBallState(): void {
    this._lastHitter = -1;
    this._touchedOnce = false;
    this._obstacleAfterHit = false;
  }

  public setAIError(index: number, error: number): void {
    if (index >= 0 && index < this._aiError.length) {
      this._aiError[index] = error;
    }
  }

  public setAIVelocity(index: number, velocity: number): void {
    if (index >= 0 && index < this._aiVel.length) {
      this._aiVel[index] = velocity;
    }
  }

  public applyAIDifficulty(indices: number[], difficulty: number): void {
    const t = Math.min(10, Math.max(1, difficulty));
    const s = (t - 1) / 9; // 0..1
    const errRange = this.lerp(2.2, 0.0, s);
    const lerpAmt = this.lerp(0.06, 0.18, s);
    
    indices.forEach((i) => {
      if (i >= 0 && i < this._aiErrorRangePerPaddle.length) {
        this._aiErrorRangePerPaddle[i] = errRange;
        this._aiLerpPerPaddle[i] = lerpAmt;
      }
    });
  }

  public isWinConditionMet(): { winner: number; hasWinner: boolean } {
    const target = this.config.winScore ?? 10;
    for (let i = 0; i < this._scores.length; i++) {
      if (this._scores[i] >= target) {
        return { winner: i, hasWinner: true };
      }
    }
    return { winner: -1, hasWinner: false };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}