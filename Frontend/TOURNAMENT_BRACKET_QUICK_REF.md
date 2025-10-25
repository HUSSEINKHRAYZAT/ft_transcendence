# Tournament Bracket - Quick Reference

## 🚀 Installation

1. Import the CSS:
```html
<link rel="stylesheet" href="src/styles/tournament-bracket.css">
```

2. Import the component:
```typescript
import { TournamentBracket, createMockTournament } from './src/tournament-bracket';
```

## 📦 Core API

### TournamentBracket

```typescript
new TournamentBracket({
  tournament: Tournament,              // Required: tournament data
  config?: {
    enableKeyboardNav: boolean,        // Default: true
    enableAnimations: boolean,         // Default: true
    enableConnectors: boolean,         // Default: true
    autoScroll: boolean,               // Default: true
    theme: BracketTheme               // Dark/light theme
  },
  onStartMatch?: (matchId) => void,   // Match start callback
  onViewMatch?: (matchId) => void,    // View match callback
  onRefresh?: () => void              // Refresh callback
})
```

#### Methods
- `getElement()` - Returns HTMLElement to mount
- `update(tournament)` - Update with new tournament data
- `refresh()` - Refresh connector positions
- `destroy()` - Clean up and remove

### Utility Functions

```typescript
// Generate bracket from players
generateBracketStructure(
  tournamentId: string,
  tournamentName: string,
  size: 4 | 8,
  players: MatchPlayer[],
  currentUserId?: string
): Tournament

// Update match winner
updateMatchWinner(
  tournament: Tournament,
  matchId: string,
  winnerId: string,
  player1Score: number,
  player2Score: number
): Tournament

// Get round info
getRoundInfo(size: 4 | 8, round: number): { name: string, emoji: string }

// Create test data
createMockTournament(size: 4 | 8, currentUserId?: string): Tournament
```

## 📋 Data Structures

### Minimal Tournament Example

```typescript
const tournament: Tournament = {
  id: 'tourn-123',
  code: 'ABC123',
  name: 'Championship',
  subtitle: '8-player elimination • Round 1 of 3',
  size: 8,
  status: 'active',
  currentRound: 1,
  totalRounds: 3,
  playerCount: 8,
  maxPlayers: 8,
  createdBy: 'Host',
  createdAt: new Date().toISOString(),
  rounds: [/* Round[] */]
};
```

### Player Example

```typescript
const player: MatchPlayer = {
  id: '1',
  name: 'Alice',
  avatar: '/avatars/alice.png',  // Optional
  isAI: false,
  isYou: true,                    // Highlight as current user
  isOnline: true,
  substatus: 'Online',            // Optional substatus text
  score: 5,                       // Set when match complete
  isWinner: true                  // Set when match complete
};
```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `J` or `↓` | Next match |
| `K` or `↑` | Previous match |
| `→` | Next round |
| `←` | Previous round |
| `Enter` | Start/View match |

## 🎨 CSS Custom Properties

Override theme colors:

```css
.tournament-bracket {
  --color-background: #0b1220;
  --color-surface: rgba(30, 41, 59, 0.88);
  --color-border: rgba(148, 163, 184, 0.2);
  --color-text-primary: #e5e7eb;
  --color-text-secondary: #94a3b8;
  --color-lime: #84cc16;
  --color-sky: #38bdf8;
  --color-orange: #f97316;
  --color-green: #22c55e;
  --color-red: #ef4444;
}
```

## 🎯 Common Patterns

### 1. Basic Usage
```typescript
const tournament = createMockTournament(8);
const bracket = new TournamentBracket({ tournament });
document.getElementById('app').appendChild(bracket.getElement());
```

### 2. With Callbacks
```typescript
const bracket = new TournamentBracket({
  tournament,
  onStartMatch: (id) => navigateToGame(id),
  onViewMatch: (id) => openSpectator(id)
});
```

### 3. Real-time Updates
```typescript
socket.on('tournament:update', (data) => {
  bracket.update(data);
});
```

### 4. Complete Match
```typescript
const updated = updateMatchWinner(tournament, matchId, winnerId, 5, 3);
bracket.update(updated);
```

### 5. Theme Toggle
```typescript
let theme = 'dark';
function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  bracket.update({ ...tournament, config: { theme: { mode: theme } } });
}
```

## 🎭 Match States

| State | Visual | Use Case |
|-------|--------|----------|
| `pending` | Gray, dashed | Waiting for players |
| `ready` | Blue glow | Both players present |
| `active` | Orange pulse | Match in progress |
| `completed` | Green | Match finished |
| `is-user-match` | Lime glow | Current user's match |

## 📱 Responsive Classes

Automatic responsive behavior:
- Desktop: Full width columns, large fonts
- Tablet: Compressed columns
- Mobile: Horizontal scroll, larger tap targets

## 🔧 Advanced Configuration

### Custom Theme
```typescript
const bracket = new TournamentBracket({
  tournament,
  config: {
    theme: {
      mode: 'dark',
      colors: {
        background: '#1a1a2e',
        surface: 'rgba(22, 27, 34, 0.9)',
        lime: '#00ff88',
        // ... other colors
      }
    }
  }
});
```

### Disable Features
```typescript
const bracket = new TournamentBracket({
  tournament,
  config: {
    enableKeyboardNav: false,
    enableAnimations: false,
    enableConnectors: false
  }
});
```

## 🐛 Troubleshooting

### Connectors Not Showing
- Ensure `enableConnectors: true`
- Check container has position context
- Verify rounds have matches

### Styles Not Applied
- Import CSS file
- Check CSS custom properties
- Verify theme mode attribute

### Keyboard Nav Not Working
- Ensure `enableKeyboardNav: true`
- Check focus is within bracket
- Verify no input fields focused

## 📚 Full Documentation

See `TOURNAMENT_BRACKET_README.md` for complete documentation.

## 🎮 Demo

Open `demo-bracket.html` for interactive examples.

---

**Happy coding! 🏆**
