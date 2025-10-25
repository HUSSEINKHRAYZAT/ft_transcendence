# Tournament Bracket System 🏆

A premium esports-grade tournament bracket interface with a sleek glass + neon aesthetic. Built with TypeScript and vanilla JavaScript for maximum performance and flexibility.

## ✨ Features

### 🎨 Visual Design
- **Glass + Neon Aesthetic**: Translucent cards with vibrant neon accents
- **Dark/Light Themes**: First-class support for both themes
- **Premium Animations**: Smooth micro-interactions and state transitions
- **Responsive Layout**: Optimized for desktop, tablet, and mobile
- **Accessibility**: Full keyboard navigation and ARIA labels

### 🎮 Interactive Elements
- **Match Cards**: Display players, scores, and status with rich visual states
- **Player Rows**: Avatars, badges (YOU/AI), substatus, and animated scores
- **Connector Lines**: Neon-tinted SVG paths linking matches across rounds
- **Status Indicators**: Real-time badges for match states (Pending, Ready, Live, Complete)

### ⌨️ Keyboard Navigation
- `J` or `↓` - Navigate to next match
- `K` or `↑` - Navigate to previous match
- `→` - Jump to next round
- `←` - Jump to previous round
- `Enter` - Start/View match or open details

### 🎯 Match States
- **Pending**: Waiting for players to advance
- **Ready**: Both players present, can start
- **Active**: Match in progress with live indicator
- **Completed**: Winner highlighted, loser dimmed
- **User Match**: Special glow for your matches

## 📁 File Structure

```
Frontend/
├── src/
│   ├── types/
│   │   └── tournament-bracket.ts          # TypeScript type definitions
│   ├── components/
│   │   └── tournament/
│   │       ├── TournamentBracket.ts       # Main bracket component
│   │       ├── MatchCard.ts               # Individual match card
│   │       ├── PlayerRow.ts               # Player display subcomponent
│   │       └── BracketConnectors.ts       # SVG connector lines
│   ├── utils/
│   │   └── tournament-bracket-utils.ts    # Helper functions
│   ├── styles/
│   │   └── tournament-bracket.css         # Complete styling system
│   └── examples/
│       └── tournament-bracket-examples.ts # Usage examples
└── demo-bracket.html                      # Interactive demo
```

## 🚀 Quick Start

### 1. Basic Usage

```typescript
import { TournamentBracket } from './components/tournament/TournamentBracket';
import { createMockTournament } from './utils/tournament-bracket-utils';
import './styles/tournament-bracket.css';

// Create tournament data
const tournament = createMockTournament(8, 'current-user-id');

// Initialize bracket
const bracket = new TournamentBracket({
  tournament,
  onStartMatch: (matchId) => {
    console.log('Starting match:', matchId);
    // Navigate to game screen
  },
  onViewMatch: (matchId) => {
    console.log('Viewing match:', matchId);
    // Open spectator view
  }
});

// Mount to DOM
document.getElementById('bracket-container').appendChild(bracket.getElement());
```

### 2. Custom Configuration

```typescript
const bracket = new TournamentBracket({
  tournament,
  config: {
    enableKeyboardNav: true,
    enableAnimations: true,
    enableConnectors: true,
    autoScroll: true,
    theme: {
      mode: 'dark', // or 'light'
      colors: {
        background: '#0b1220',
        surface: 'rgba(30, 41, 59, 0.88)',
        border: 'rgba(148, 163, 184, 0.2)',
        textPrimary: '#e5e7eb',
        textSecondary: '#94a3b8',
        lime: '#84cc16',
        sky: '#38bdf8',
        orange: '#f97316',
        green: '#22c55e',
        red: '#ef4444'
      }
    }
  }
});
```

### 3. Update Tournament State

```typescript
import { updateMatchWinner } from './utils/tournament-bracket-utils';

// After a match completes
const updatedTournament = updateMatchWinner(
  tournament,
  matchId,
  winnerId,
  player1Score,
  player2Score
);

// Update bracket display
bracket.update(updatedTournament);
```

## 📐 Tournament Structure

### Data Types

```typescript
interface Tournament {
  id: string;
  code: string;              // 6-character code
  name: string;
  subtitle: string;          // e.g., "8-player elimination • Round 1 of 3"
  size: 4 | 8;              // Tournament size
  status: 'waiting' | 'active' | 'completed';
  currentRound: number;
  totalRounds: number;
  playerCount: number;
  maxPlayers: number;
  spectatorCount?: number;
  winnerId?: string;
  winnerName?: string;
  createdBy: string;
  createdAt: string;
  rounds: Round[];
  isSpectator?: boolean;
}

interface Match {
  id: string;
  matchNumber: number;
  round: number;
  roundName: string;        // "Quarterfinals", "Semifinals", "Final"
  status: 'pending' | 'ready' | 'active' | 'completed';
  player1?: MatchPlayer;
  player2?: MatchPlayer;
  winnerId?: string;
  gameId?: string;
  isUserMatch?: boolean;
  isYourTurn?: boolean;
  startedAt?: string;
  completedAt?: string;
}

interface MatchPlayer {
  id: string;
  name: string;
  avatar?: string;
  isAI: boolean;
  isYou?: boolean;
  isOnline: boolean;
  substatus?: string;       // "Medium bot", "Offline", etc.
  score?: number;
  isWinner?: boolean;
}
```

## 🎨 Design System

### Typography
- **Font**: Inter (sans-serif)
- **Title**: 28-36px / 900 weight
- **Subtitle**: 12px / 700 weight / uppercase / letter-spacing
- **Card Title**: 11px / 900 weight / uppercase
- **Player Names**: 15px / 800 weight

### Colors (Dark Theme)
- **Background**: `#0b1220` → `#0f172a` gradient
- **Surface**: `rgba(30, 41, 59, 0.88)` with 1.5-2px border
- **Accents**: 
  - Lime: `#84cc16` (user matches, success)
  - Sky: `#38bdf8` (ready state, info)
  - Orange: `#f97316` (active/live state)
  - Green: `#22c55e` (completed, winner)
- **Text**: `#e5e7eb` primary, `#94a3b8` secondary

### Spacing & Radius
- **Border Radius**: 12-20px for cards and chips
- **Gutters**: 3-4rem between rounds (desktop), 2rem (tablet), 1.5rem (mobile)
- **Card Padding**: 1.5rem (desktop), 1rem (mobile)

### Animations
- **Duration**: 150-300ms
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`
- **Hover**: 4-6px elevation, border glow
- **Active State**: Slow pulse (2-3s)
- **Focus**: Auto-scroll to center

## 🔧 Utility Functions

### Generate Bracket Structure
```typescript
import { generateBracketStructure } from './utils/tournament-bracket-utils';

const tournament = generateBracketStructure(
  'TOURN-123',
  'Championship',
  8,              // size: 4 or 8
  players,        // MatchPlayer[]
  'user-id'       // current user (optional)
);
```

### Complete a Match
```typescript
const updatedTournament = updateMatchWinner(
  tournament,
  'match-id',
  'winner-id',
  5,  // player1 score
  3   // player2 score
);
```

### Get Round Information
```typescript
import { getRoundInfo, getTotalRounds } from './utils/tournament-bracket-utils';

const info = getRoundInfo(8, 1);  // { name: "Quarterfinals", emoji: "🎮" }
const rounds = getTotalRounds(8);  // 3
```

## 📱 Responsive Breakpoints

- **≥1280px**: Spacious grid, wide gutters, 360px columns
- **768-1279px**: Compressed columns, 280px width
- **≤767px**: Horizontal scroll with snap, 260px columns, larger tap targets (44px)

## 🎯 Usage Examples

See `src/examples/tournament-bracket-examples.ts` for complete examples:

1. **Basic 8-player tournament**
2. **4-player with light theme**
3. **Updating match winners**
4. **Real-time updates (WebSocket)**
5. **Spectator mode**
6. **API integration**
7. **Complete app integration**

## 🧪 Demo

Open `demo-bracket.html` in a browser to see an interactive demo with:
- Toggle between 4 and 8-player tournaments
- Switch between dark and light themes
- Simulate match completion
- Test keyboard navigation
- View all match states

## 🔌 Integration with Your App

### With API
```typescript
import { TournamentBracketManager } from './examples/tournament-bracket-examples';

const manager = new TournamentBracketManager('bracket-container', tournamentId);
await manager.initialize();
```

### With WebSocket Updates
```typescript
socket.on('tournament:update', (data) => {
  bracket.update(data);
});

socket.on('match:complete', ({ matchId, winnerId, scores }) => {
  const updated = updateMatchWinner(tournament, matchId, winnerId, scores[0], scores[1]);
  bracket.update(updated);
});
```

## 🎭 States & Badges

### Tournament Status
- ⏳ **Waiting for players** (gray)
- 🎮 **Round N** (orange, pulsing)
- 🏆 **Tournament completed** (green)

### Match Status
- ⌛ **Pending** (gray)
- ✅ **Ready** (blue)
- 🚀 **Your turn** (lime, pulsing)
- 🎮 **Live** (orange, pulsing)
- 🏆 **Complete** (green)

### Player Badges
- **YOU** (lime gradient)
- **AI** (sky gradient)

## ♿ Accessibility

- Full keyboard navigation
- Proper ARIA labels and roles
- Focus indicators
- Screen reader friendly
- Color contrast compliant

## 🎬 Performance

- Lazy component mounting
- CSS transforms for animations
- Debounced resize observers
- Shallow DOM structure
- Optimized SVG connectors

## 📄 License

Part of the ft_transcendence project.

---

**Built with ❤️ for competitive gaming**
