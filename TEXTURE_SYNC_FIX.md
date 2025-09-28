# Texture Synchronization Fix for Remote Games

## Problem
When playing remotely, floor and obstacle textures differed between players because each client was using `Math.random()` to select textures independently, resulting in visual inconsistency.

## Solution
Implemented deterministic texture selection based on game/room configuration and obstacle positions to ensure all clients render identical textures.

## Changes Made

### 1. Added Utility Methods (`Pong3D.ts`)
- `hashString(str: string): number` - Creates consistent hash from string input
- `hsvToRgb(h, s, v): Color3` - Converts HSV to RGB for better color distribution

### 2. Floor Texture Synchronization (`Pong3D.ts`)
**Before:**
```typescript
const randomTex = textures[Math.floor(Math.random() * textures.length)];
```

**After:**
```typescript
const floorSeed = this.config.roomId ? this.hashString(this.config.roomId) : 0;
this.floorTextureIndex = floorSeed % textures.length;
const randomTex = textures[this.floorTextureIndex];
```

### 3. Obstacle Texture Synchronization (`Pong3D.ts`)
**Before:**
```typescript
const randomTexture = textures[Math.floor(Math.random() * textures.length)];
```

**After:**
```typescript
const actualTextureIndex = textureIndex !== undefined 
  ? textureIndex 
  : this.hashString(`${x.toFixed(3)}-${z.toFixed(3)}`) % textures.length;
const randomTexture = textures[actualTextureIndex];
```

### 4. Ball Color Synchronization (`Pong3D.ts`)
**Before:**
```typescript
const randomColor = new Color3(Math.random(), Math.random(), Math.random());
```

**After:**
```typescript
const ballSeed = this.config.roomId ? this.hashString(this.config.roomId + "ball") : 42;
const hue = (ballSeed % 360) / 360;
const randomColor = this.hsvToRgb(hue, 0.8, 1.0);
```

### 5. Extended Network Protocol (`Type.ts`)
Added optional `textureIndex` field to obstacle data for explicit synchronization:
```typescript
obstacles: {
  x: number; z: number; radius: number;
  color: [number, number, number];
  cap: [number, number, number];
  shape?: ObstacleShape;
  textureIndex?: number; // NEW: for explicit texture synchronization
}[];
```

### 6. Updated Constants (`constants.ts`)
Simplified to only support "box" shape since other shapes were commented out:
```typescript
export const SHAPES: ObstacleShape[] = ["box"];
export const SHAPE_WEIGHTS: number[] = [1];
```

## How It Works

1. **Host/Local Games**: Generate deterministic texture indices based on room ID and obstacle positions
2. **Remote Games**: 
   - Host sends obstacle data including calculated `textureIndex` 
   - Guests use received `textureIndex` or fall back to position-based calculation
   - Floor textures use room ID for consistency
   - Ball colors use room ID + "ball" suffix for deterministic generation

## Benefits

- ✅ All players see identical floor textures in remote games
- ✅ All players see identical obstacle textures in remote games  
- ✅ All players see identical ball colors in remote games
- ✅ Maintains backward compatibility (textureIndex is optional)
- ✅ No performance impact - calculations are done once per game
- ✅ Works for both 2-player and 4-player games

## Testing

The fix ensures that for the same room ID:
- `hashString("ROOM123")` will always return the same value
- `hashString("1.234-5.678")` will always return the same value for obstacle at position (1.234, 5.678)
- All clients will select the same texture from the texture arrays

This eliminates the random texture discrepancy issue in remote multiplayer games.
