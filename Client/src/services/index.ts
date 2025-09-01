// =============================================================================
// SERVICES BARREL EXPORT
// =============================================================================

export { authService } from './AuthService';
export { ApiService } from './ApiService';
export { GameService } from './GameService';
export { SocketManager } from './SocketManager';

// Re-export types/interfaces from services if any
export type * from './AuthService';
export type * from './ApiService';
export type * from './GameService';
