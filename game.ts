import { 
    GameState, 
    Tile, 
    HistoryEntry, 
    Score, 
    Theme, 
    Difficulty, 
    Position 
} from './types';

export class PuzzleGame {
    private state: GameState;
    private onStateChange: ((state: GameState) => void) | null = null;
    private onWin: (() => void) | null = null;
    private timerInterval: number | null = null;

    constructor(size: Difficulty = 3, theme: Theme = 'classic') {
        this.state = this.createInitialState(size, theme);
    }

    private createInitialState(size: Difficulty, theme: Theme): GameState {
        return {
            grid: this.createSolvedGrid(size),
            size,
            moves: 0,
            time: 0,
            isPlaying: false,
            isWon: false,
            history: [],
            theme
        };
    }

    private createSolvedGrid(size: number): (number | null)[][] {
        const grid: (number | null)[][] = [];
        let value = 1;

        for (let row = 0; row < size; row++) {
            grid[row] = [];
            for (let col = 0; col < size; col++) {
                if (row === size - 1 && col === size - 1) {
                    grid[row][col] = null;
                } else {
                    grid[row][col] = value++;
                }
            }
        }

        return grid;
    }

    public setStateChangeListener(callback: (state: GameState) => void): void {
        this.onStateChange = callback;
    }

    public setWinListener(callback: () => void): void {
        this.onWin = callback;
    }

    public getState(): GameState {
        return { ...this.state };
    }

    public getSize(): number {
        return this.state.size;
    }

    public getMoves(): number {
        return this.state.moves;
    }

    public getTime(): number {
        return this.state.time;
    }

    public isPlaying(): boolean {
        return this.state.isPlaying;
    }

    public isWon(): boolean {
        return this.state.isWon;
    }

    public getEmptyPosition(): Position {
        for (let row = 0; row < this.state.size; row++) {
            for (let col = 0; col < this.state.size; col++) {
                if (this.state.grid[row][col] === null) {
                    return { row, col };
                }
            }
        }
        throw new Error('Empty tile not found');
    }

    public getTile(row: number, col: number): Tile {
        const value = this.state.grid[row][col];
        const correctValue = row * this.state.size + col + 1;
        const isCorrect = value === correctValue;

        return {
            value,
            row,
            col,
            isEmpty: value === null,
            isCorrect
        };
    }

    public isAdjacentToEmpty(row: number, col: number): boolean {
        const emptyPos = this.getEmptyPosition();
        const rowDiff = Math.abs(row - emptyPos.row);
        const colDiff = Math.abs(col - emptyPos.col);

        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    public moveTile(row: number, col: number): boolean {
        if (this.state.isWon || !this.isAdjacentToEmpty(row, col)) {
            return false;
        }

        const emptyPos = this.getEmptyPosition();
        
        this.state.history.push({
            grid: this.cloneGrid(this.state.grid),
            moves: this.state.moves
        });

        this.state.grid[emptyPos.row][emptyPos.col] = this.state.grid[row][col];
        this.state.grid[row][col] = null;
        this.state.moves++;

        if (!this.state.isPlaying) {
            this.startTimer();
        }

        if (this.isSolved()) {
            this.state.isWon = true;
            this.stopTimer();
            this.saveScore();
            if (this.onWin) {
                this.onWin();
            }
        }

        this.notifyStateChange();
        this.saveToLocalStorage();

        return true;
    }

    public shuffle(): void {
        this.stopTimer();
        
        this.state.grid = this.createSolvedGrid(this.state.size);
        this.state.moves = 0;
        this.state.time = 0;
        this.state.isPlaying = false;
        this.state.isWon = false;
        this.state.history = [];

        const shuffleMoves = this.state.size * this.state.size * 100;
        let lastMovedPos: Position | null = null;

        for (let i = 0; i < shuffleMoves; i++) {
            const emptyPos = this.getEmptyPosition();
            const adjacentPositions = this.getAdjacentPositions(emptyPos);
            
            const validPositions = adjacentPositions.filter(pos => {
                if (!lastMovedPos) return true;
                return !(pos.row === lastMovedPos.row && pos.col === lastMovedPos.col);
            });

            const positions = validPositions.length > 0 ? validPositions : adjacentPositions;
            const randomPos = positions[Math.floor(Math.random() * positions.length)];

            this.state.grid[emptyPos.row][emptyPos.col] = this.state.grid[randomPos.row][randomPos.col];
            this.state.grid[randomPos.row][randomPos.col] = null;
            lastMovedPos = emptyPos;
        }

        while (this.isSolved()) {
            this.shuffle();
        }

        this.notifyStateChange();
        this.saveToLocalStorage();
    }

    private getAdjacentPositions(pos: Position): Position[] {
        const positions: Position[] = [];
        const size = this.state.size;

        if (pos.row > 0) positions.push({ row: pos.row - 1, col: pos.col });
        if (pos.row < size - 1) positions.push({ row: pos.row + 1, col: pos.col });
        if (pos.col > 0) positions.push({ row: pos.row, col: pos.col - 1 });
        if (pos.col < size - 1) positions.push({ row: pos.row, col: pos.col + 1 });

        return positions;
    }

    public undo(): boolean {
        if (this.state.history.length === 0 || this.state.isWon) {
            return false;
        }

        const lastState = this.state.history.pop()!;
        this.state.grid = lastState.grid;
        this.state.moves = lastState.moves;

        if (this.state.moves === 0) {
            this.state.isPlaying = false;
            this.state.time = 0;
            this.stopTimer();
        }

        this.notifyStateChange();
        this.saveToLocalStorage();

        return true;
    }

    public canUndo(): boolean {
        return this.state.history.length > 0 && !this.state.isWon;
    }

    public reset(): void {
        this.stopTimer();
        this.state = this.createInitialState(this.state.size as Difficulty, this.state.theme);
        this.notifyStateChange();
        this.saveToLocalStorage();
    }

    public changeSize(size: Difficulty): void {
        if (size === this.state.size) return;

        this.stopTimer();
        this.state = this.createInitialState(size, this.state.theme);
        this.notifyStateChange();
        this.saveToLocalStorage();
    }

    public setTheme(theme: Theme): void {
        this.state.theme = theme;
        this.notifyStateChange();
        this.saveToLocalStorage();
    }

    public getTheme(): Theme {
        return this.state.theme;
    }

    private startTimer(): void {
        if (this.timerInterval) return;

        this.state.isPlaying = true;
        this.timerInterval = window.setInterval(() => {
            this.state.time++;
            this.notifyStateChange();
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    private isSolved(): boolean {
        let value = 1;
        const size = this.state.size;

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (row === size - 1 && col === size - 1) {
                    return this.state.grid[row][col] === null;
                }
                if (this.state.grid[row][col] !== value++) {
                    return false;
                }
            }
        }

        return true;
    }

    private cloneGrid(grid: (number | null)[][]): (number | null)[][] {
        return grid.map(row => [...row]);
    }

    private notifyStateChange(): void {
        if (this.onStateChange) {
            this.onStateChange(this.getState());
        }
    }

    private saveToLocalStorage(): void {
        try {
            const saveData = {
                grid: this.state.grid,
                size: this.state.size,
                moves: this.state.moves,
                time: this.state.time,
                isPlaying: this.state.isPlaying,
                isWon: this.state.isWon,
                history: this.state.history,
                theme: this.state.theme,
                timestamp: Date.now()
            };
            localStorage.setItem('puzzleGameState', JSON.stringify(saveData));
        } catch (e) {
            console.error('Failed to save game state:', e);
        }
    }

    public loadFromLocalStorage(): boolean {
        try {
            const savedData = localStorage.getItem('puzzleGameState');
            if (!savedData) return false;

            const data = JSON.parse(savedData);
            const timestamp = data.timestamp || 0;
            
            if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
                localStorage.removeItem('puzzleGameState');
                return false;
            }

            this.state = {
                grid: data.grid,
                size: data.size,
                moves: data.moves,
                time: data.time,
                isPlaying: false,
                isWon: data.isWon,
                history: data.history || [],
                theme: data.theme || 'classic'
            };

            if (data.isPlaying && !data.isWon) {
                this.startTimer();
            }

            this.notifyStateChange();
            return true;
        } catch (e) {
            console.error('Failed to load game state:', e);
            return false;
        }
    }

    private saveScore(): void {
        try {
            const score: Score = {
                size: this.state.size,
                moves: this.state.moves,
                time: this.state.time,
                date: new Date().toISOString()
            };

            const scores = this.getScores();
            scores.push(score);
            
            scores.sort((a, b) => {
                if (a.moves !== b.moves) return a.moves - b.moves;
                return a.time - b.time;
            });

            const filteredScores = scores.filter(s => s.size === this.state.size).slice(0, 10);
            const otherScores = scores.filter(s => s.size !== this.state.size);
            
            const allScores = [...otherScores, ...filteredScores];
            localStorage.setItem('puzzleGameScores', JSON.stringify(allScores));
        } catch (e) {
            console.error('Failed to save score:', e);
        }
    }

    public getScores(): Score[] {
        try {
            const scoresData = localStorage.getItem('puzzleGameScores');
            return scoresData ? JSON.parse(scoresData) : [];
        } catch (e) {
            console.error('Failed to get scores:', e);
            return [];
        }
    }

    public getBestScore(size: number): Score | null {
        const scores = this.getScores().filter(s => s.size === size);
        if (scores.length === 0) return null;

        scores.sort((a, b) => {
            if (a.moves !== b.moves) return a.moves - b.moves;
            return a.time - b.time;
        });

        return scores[0];
    }
}
