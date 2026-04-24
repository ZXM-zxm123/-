import { PuzzleGame } from './game';
import { FireworksSystem } from './fireworks';
import { GameState, Theme, Difficulty } from './types';

class PuzzleApp {
    private game: PuzzleGame;
    private fireworks: FireworksSystem;
    
    private gameBoard: HTMLDivElement;
    private movesDisplay: HTMLSpanElement;
    private timerDisplay: HTMLSpanElement;
    private difficultySelect: HTMLSelectElement;
    private themeSelect: HTMLSelectElement;
    private shuffleButton: HTMLButtonElement;
    private undoButton: HTMLButtonElement;
    private resetButton: HTMLButtonElement;
    private victoryMessage: HTMLDivElement;
    private finalMoves: HTMLSpanElement;
    private finalTime: HTMLSpanElement;
    private playAgainButton: HTMLButtonElement;

    private dragStartRow: number = -1;
    private dragStartCol: number = -1;
    private isDragging: boolean = false;

    constructor() {
        this.game = new PuzzleGame();
        this.fireworks = new FireworksSystem('fireworks-canvas');
        
        this.gameBoard = document.getElementById('game-board') as HTMLDivElement;
        this.movesDisplay = document.getElementById('moves') as HTMLSpanElement;
        this.timerDisplay = document.getElementById('timer') as HTMLSpanElement;
        this.difficultySelect = document.getElementById('difficulty') as HTMLSelectElement;
        this.themeSelect = document.getElementById('theme') as HTMLSelectElement;
        this.shuffleButton = document.getElementById('shuffle-btn') as HTMLButtonElement;
        this.undoButton = document.getElementById('undo-btn') as HTMLButtonElement;
        this.resetButton = document.getElementById('reset-btn') as HTMLButtonElement;
        this.victoryMessage = document.getElementById('victory-message') as HTMLDivElement;
        this.finalMoves = document.getElementById('final-moves') as HTMLSpanElement;
        this.finalTime = document.getElementById('final-time') as HTMLSpanElement;
        this.playAgainButton = document.getElementById('play-again-btn') as HTMLButtonElement;

        this.init();
    }

    private init(): void {
        if (!this.game.loadFromLocalStorage()) {
            this.game.shuffle();
        }

        this.setupEventListeners();
        this.updateUI(this.game.getState());
    }

    private setupEventListeners(): void {
        this.shuffleButton.addEventListener('click', () => this.handleShuffle());
        this.undoButton.addEventListener('click', () => this.handleUndo());
        this.resetButton.addEventListener('click', () => this.handleReset());
        this.playAgainButton.addEventListener('click', () => this.handlePlayAgain());

        this.difficultySelect.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            const size = parseInt(target.value) as Difficulty;
            this.handleChangeDifficulty(size);
        });

        this.themeSelect.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            const theme = target.value as Theme;
            this.handleChangeTheme(theme);
        });

        this.game.setStateChangeListener((state) => this.updateUI(state));
        this.game.setWinListener(() => this.handleWin());
    }

    private updateUI(state: GameState): void {
        this.updateStats(state);
        this.renderBoard(state);
        this.updateButtons(state);
        this.updateTheme(state.theme);
    }

    private updateStats(state: GameState): void {
        this.movesDisplay.textContent = state.moves.toString();
        this.timerDisplay.textContent = this.formatTime(state.time);
    }

    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    private renderBoard(state: GameState): void {
        const size = state.size;
        this.gameBoard.innerHTML = '';
        
        this.gameBoard.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        this.gameBoard.style.gridTemplateRows = `repeat(${size}, 1fr)`;

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const tile = this.game.getTile(row, col);
                const tileElement = this.createTileElement(tile);
                this.gameBoard.appendChild(tileElement);
            }
        }
    }

    private createTileElement(tile: { value: number | null; row: number; col: number; isEmpty: boolean; isCorrect: boolean }): HTMLDivElement {
        const tileElement = document.createElement('div');
        tileElement.className = 'tile';
        tileElement.dataset.row = tile.row.toString();
        tileElement.dataset.col = tile.col.toString();

        if (tile.isEmpty) {
            tileElement.classList.add('tile-empty');
            return tileElement;
        }

        if (tile.isCorrect) {
            tileElement.classList.add('correct');
        }

        const numberSpan = document.createElement('span');
        numberSpan.className = 'tile-number';
        numberSpan.textContent = tile.value!.toString();
        tileElement.appendChild(numberSpan);

        tileElement.addEventListener('click', () => this.handleTileClick(tile.row, tile.col));
        
        tileElement.addEventListener('mousedown', (e) => this.handleDragStart(e, tile.row, tile.col));
        tileElement.addEventListener('touchstart', (e) => this.handleDragStart(e, tile.row, tile.col), { passive: true });

        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: true });
        document.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        document.addEventListener('touchend', (e) => this.handleDragEnd(e));

        return tileElement;
    }

    private handleTileClick(row: number, col: number): void {
        this.game.moveTile(row, col);
    }

    private handleDragStart(e: MouseEvent | TouchEvent, row: number, col: number): void {
        this.isDragging = true;
        this.dragStartRow = row;
        this.dragStartCol = col;
    }

    private handleDragMove(e: MouseEvent | TouchEvent): void {
        if (!this.isDragging) return;

        const target = document.elementFromPoint(
            'touches' in e ? e.touches[0].clientX : e.clientX,
            'touches' in e ? e.touches[0].clientY : e.clientY
        );

        if (target && target.classList.contains('tile-empty')) {
            const emptyRow = parseInt(target.dataset.row!);
            const emptyCol = parseInt(target.dataset.col!);

            if (this.game.isAdjacentToEmpty(this.dragStartRow, this.dragStartCol)) {
                this.isDragging = false;
                this.game.moveTile(this.dragStartRow, this.dragStartCol);
            }
        }
    }

    private handleDragEnd(e: MouseEvent | TouchEvent): void {
        this.isDragging = false;
        this.dragStartRow = -1;
        this.dragStartCol = -1;
    }

    private updateButtons(state: GameState): void {
        this.undoButton.disabled = !this.game.canUndo();
        this.difficultySelect.value = state.size.toString();
        this.themeSelect.value = state.theme;
    }

    private updateTheme(theme: Theme): void {
        document.body.className = `theme-${theme}`;
    }

    private handleShuffle(): void {
        this.game.shuffle();
        this.hideVictoryMessage();
    }

    private handleUndo(): void {
        this.game.undo();
    }

    private handleReset(): void {
        this.game.reset();
        this.hideVictoryMessage();
    }

    private handlePlayAgain(): void {
        this.game.shuffle();
        this.hideVictoryMessage();
    }

    private handleChangeDifficulty(size: Difficulty): void {
        this.game.changeSize(size);
        this.hideVictoryMessage();
    }

    private handleChangeTheme(theme: Theme): void {
        this.game.setTheme(theme);
    }

    private handleWin(): void {
        const state = this.game.getState();
        
        this.finalMoves.textContent = state.moves.toString();
        this.finalTime.textContent = this.formatTime(state.time);
        
        this.showVictoryMessage();
        this.fireworks.start();
    }

    private showVictoryMessage(): void {
        this.victoryMessage.classList.remove('hidden');
    }

    private hideVictoryMessage(): void {
        this.victoryMessage.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PuzzleApp();
});
