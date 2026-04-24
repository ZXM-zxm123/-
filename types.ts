export interface Tile {
    value: number | null;
    row: number;
    col: number;
    isEmpty: boolean;
    isCorrect: boolean;
}

export interface GameState {
    grid: (number | null)[][];
    size: number;
    moves: number;
    time: number;
    isPlaying: boolean;
    isWon: boolean;
    history: HistoryEntry[];
    theme: Theme;
}

export interface HistoryEntry {
    grid: (number | null)[][];
    moves: number;
}

export interface Score {
    size: number;
    moves: number;
    time: number;
    date: string;
}

export type Theme = 'classic' | 'ocean' | 'forest' | 'sunset';

export type Difficulty = 3 | 4 | 5 | 6;

export interface Position {
    row: number;
    col: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    maxLife: number;
    size: number;
}

export interface Firework {
    x: number;
    y: number;
    targetY: number;
    vx: number;
    vy: number;
    color: string;
    particles: Particle[];
    exploded: boolean;
}
