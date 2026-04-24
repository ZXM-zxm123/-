(function() {
    'use strict';

    const PuzzleGame = (function() {
        function createInitialState(size, theme) {
            return {
                grid: createSolvedGrid(size),
                size: size,
                moves: 0,
                time: 0,
                isPlaying: false,
                isWon: false,
                history: [],
                theme: theme
            };
        }

        function createSolvedGrid(size) {
            const grid = [];
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

        function cloneGrid(grid) {
            return grid.map(row => [...row]);
        }

        function Game(size, theme) {
            this.state = createInitialState(size || 3, theme || 'classic');
            this.onStateChange = null;
            this.onWin = null;
            this.timerInterval = null;
        }

        Game.prototype.setStateChangeListener = function(callback) {
            this.onStateChange = callback;
        };

        Game.prototype.setWinListener = function(callback) {
            this.onWin = callback;
        };

        Game.prototype.getState = function() {
            return {
                grid: cloneGrid(this.state.grid),
                size: this.state.size,
                moves: this.state.moves,
                time: this.state.time,
                isPlaying: this.state.isPlaying,
                isWon: this.state.isWon,
                history: this.state.history.map(h => ({ grid: cloneGrid(h.grid), moves: h.moves })),
                theme: this.state.theme
            };
        };

        Game.prototype.getSize = function() {
            return this.state.size;
        };

        Game.prototype.getMoves = function() {
            return this.state.moves;
        };

        Game.prototype.getTime = function() {
            return this.state.time;
        };

        Game.prototype.isPlaying = function() {
            return this.state.isPlaying;
        };

        Game.prototype.isWon = function() {
            return this.state.isWon;
        };

        Game.prototype.getEmptyPosition = function() {
            for (let row = 0; row < this.state.size; row++) {
                for (let col = 0; col < this.state.size; col++) {
                    if (this.state.grid[row][col] === null) {
                        return { row: row, col: col };
                    }
                }
            }
            throw new Error('Empty tile not found');
        };

        Game.prototype.getTile = function(row, col) {
            const value = this.state.grid[row][col];
            const correctValue = row * this.state.size + col + 1;
            const isCorrect = value === correctValue;

            return {
                value: value,
                row: row,
                col: col,
                isEmpty: value === null,
                isCorrect: isCorrect
            };
        };

        Game.prototype.isAdjacentToEmpty = function(row, col) {
            const emptyPos = this.getEmptyPosition();
            const rowDiff = Math.abs(row - emptyPos.row);
            const colDiff = Math.abs(col - emptyPos.col);

            return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
        };

        Game.prototype.moveTile = function(row, col) {
            if (this.state.isWon || !this.isAdjacentToEmpty(row, col)) {
                return false;
            }

            const emptyPos = this.getEmptyPosition();
            
            this.state.history.push({
                grid: cloneGrid(this.state.grid),
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
        };

        Game.prototype.getAdjacentPositions = function(pos) {
            const positions = [];
            const size = this.state.size;

            if (pos.row > 0) positions.push({ row: pos.row - 1, col: pos.col });
            if (pos.row < size - 1) positions.push({ row: pos.row + 1, col: pos.col });
            if (pos.col > 0) positions.push({ row: pos.row, col: pos.col - 1 });
            if (pos.col < size - 1) positions.push({ row: pos.row, col: pos.col + 1 });

            return positions;
        };

        Game.prototype.shuffle = function() {
            this.stopTimer();
            
            this.state.grid = createSolvedGrid(this.state.size);
            this.state.moves = 0;
            this.state.time = 0;
            this.state.isPlaying = false;
            this.state.isWon = false;
            this.state.history = [];

            const shuffleMoves = this.state.size * this.state.size * 100;
            let lastMovedPos = null;

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
        };

        Game.prototype.undo = function() {
            if (this.state.history.length === 0 || this.state.isWon) {
                return false;
            }

            const lastState = this.state.history.pop();
            this.state.grid = cloneGrid(lastState.grid);
            this.state.moves = lastState.moves;

            if (this.state.moves === 0) {
                this.state.isPlaying = false;
                this.state.time = 0;
                this.stopTimer();
            }

            this.notifyStateChange();
            this.saveToLocalStorage();

            return true;
        };

        Game.prototype.canUndo = function() {
            return this.state.history.length > 0 && !this.state.isWon;
        };

        Game.prototype.reset = function() {
            this.stopTimer();
            this.state = createInitialState(this.state.size, this.state.theme);
            this.notifyStateChange();
            this.saveToLocalStorage();
        };

        Game.prototype.changeSize = function(size) {
            if (size === this.state.size) return;

            this.stopTimer();
            this.state = createInitialState(size, this.state.theme);
            this.notifyStateChange();
            this.saveToLocalStorage();
        };

        Game.prototype.setTheme = function(theme) {
            this.state.theme = theme;
            this.notifyStateChange();
            this.saveToLocalStorage();
        };

        Game.prototype.getTheme = function() {
            return this.state.theme;
        };

        Game.prototype.startTimer = function() {
            if (this.timerInterval) return;

            const self = this;
            this.state.isPlaying = true;
            this.timerInterval = window.setInterval(function() {
                self.state.time++;
                self.notifyStateChange();
            }, 1000);
        };

        Game.prototype.stopTimer = function() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        };

        Game.prototype.isSolved = function() {
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
        };

        Game.prototype.notifyStateChange = function() {
            if (this.onStateChange) {
                this.onStateChange(this.getState());
            }
        };

        Game.prototype.saveToLocalStorage = function() {
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
        };

        Game.prototype.loadFromLocalStorage = function() {
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
        };

        Game.prototype.saveScore = function() {
            try {
                const score = {
                    size: this.state.size,
                    moves: this.state.moves,
                    time: this.state.time,
                    date: new Date().toISOString()
                };

                const scores = this.getScores();
                scores.push(score);
                
                scores.sort(function(a, b) {
                    if (a.moves !== b.moves) return a.moves - b.moves;
                    return a.time - b.time;
                });

                const filteredScores = scores.filter(function(s) { return s.size === this.state.size; }.bind(this)).slice(0, 10);
                const otherScores = scores.filter(function(s) { return s.size !== this.state.size; }.bind(this));
                
                const allScores = otherScores.concat(filteredScores);
                localStorage.setItem('puzzleGameScores', JSON.stringify(allScores));
            } catch (e) {
                console.error('Failed to save score:', e);
            }
        };

        Game.prototype.getScores = function() {
            try {
                const scoresData = localStorage.getItem('puzzleGameScores');
                return scoresData ? JSON.parse(scoresData) : [];
            } catch (e) {
                console.error('Failed to get scores:', e);
                return [];
            }
        };

        Game.prototype.getBestScore = function(size) {
            const scores = this.getScores().filter(function(s) { return s.size === size; });
            if (scores.length === 0) return null;

            scores.sort(function(a, b) {
                if (a.moves !== b.moves) return a.moves - b.moves;
                return a.time - b.time;
            });

            return scores[0];
        };

        return Game;
    })();

    const FireworksSystem = (function() {
        const COLORS = [
            '#ff0000', '#00ff00', '#0000ff',
            '#ffff00', '#ff00ff', '#00ffff',
            '#ff6600', '#9900ff', '#ff0099',
            '#66ff00', '#00ff66', '#ff9900'
        ];

        function System(canvasId) {
            this.canvas = document.getElementById(canvasId);
            this.ctx = this.canvas.getContext('2d');
            this.fireworks = [];
            this.particles = [];
            this.animationFrameId = null;
            this.isRunning = false;

            this.resize();
            const self = this;
            window.addEventListener('resize', function() { self.resize(); });
        }

        System.prototype.resize = function() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        };

        System.prototype.start = function() {
            if (this.isRunning) return;

            this.isRunning = true;
            this.fireworks = [];
            this.particles = [];
            this.animate();

            const self = this;
            const launchFirework = function() {
                if (!self.isRunning) return;

                self.launch();
                setTimeout(launchFirework, Math.random() * 500 + 200);
            };

            launchFirework();

            setTimeout(function() { self.stop(); }, 5000);
        };

        System.prototype.stop = function() {
            this.isRunning = false;
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        };

        System.prototype.launch = function() {
            const firework = {
                x: Math.random() * this.canvas.width,
                y: this.canvas.height,
                targetY: Math.random() * (this.canvas.height * 0.5) + 50,
                vx: (Math.random() - 0.5) * 4,
                vy: -12 - Math.random() * 4,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                particles: [],
                exploded: false
            };

            this.fireworks.push(firework);
        };

        System.prototype.animate = function() {
            if (!this.isRunning) return;

            const self = this;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.updateFireworks();
            this.updateParticles();

            this.animationFrameId = requestAnimationFrame(function() { self.animate(); });
        };

        System.prototype.updateFireworks = function() {
            for (let i = this.fireworks.length - 1; i >= 0; i--) {
                const fw = this.fireworks[i];
                
                fw.x += fw.vx;
                fw.y += fw.vy;
                fw.vy += 0.15;

                if (!fw.exploded && fw.vy >= -2) {
                    this.explode(fw);
                    this.fireworks.splice(i, 1);
                } else if (!fw.exploded) {
                    this.drawFirework(fw);
                }
            }
        };

        System.prototype.explode = function(firework) {
            const particleCount = 80 + Math.floor(Math.random() * 40);
            
            for (let i = 0; i < particleCount; i++) {
                const angle = (Math.PI * 2 * i) / particleCount;
                const speed = Math.random() * 6 + 2;
                
                const particle = {
                    x: firework.x,
                    y: firework.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: firework.color,
                    life: 1,
                    maxLife: 1,
                    size: Math.random() * 3 + 1
                };

                this.particles.push(particle);
            }

            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 3 + 1;
                
                const particle = {
                    x: firework.x,
                    y: firework.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: '#ffffff',
                    life: 1,
                    maxLife: 1,
                    size: Math.random() * 2 + 0.5
                };

                this.particles.push(particle);
            }
        };

        System.prototype.updateParticles = function() {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05;
                p.life -= 0.015;

                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                } else {
                    this.drawParticle(p);
                }
            }
        };

        System.prototype.drawFirework = function(firework) {
            this.ctx.save();
            
            const gradient = this.ctx.createRadialGradient(
                firework.x, firework.y, 0,
                firework.x, firework.y, 15
            );
            
            gradient.addColorStop(0, firework.color);
            gradient.addColorStop(0.5, firework.color + '80');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(firework.x, firework.y, 15, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(firework.x, firework.y, 2, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        };

        System.prototype.drawParticle = function(particle) {
            this.ctx.save();
            
            const alpha = Math.floor(particle.life * 255).toString(16).padStart(2, '0');
            
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 2
            );
            
            gradient.addColorStop(0, particle.color + alpha);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        };

        return System;
    })();

    const PuzzleApp = (function() {
        function App() {
            this.game = new PuzzleGame();
            this.fireworks = new FireworksSystem('fireworks-canvas');
            
            this.gameBoard = document.getElementById('game-board');
            this.movesDisplay = document.getElementById('moves');
            this.timerDisplay = document.getElementById('timer');
            this.difficultySelect = document.getElementById('difficulty');
            this.themeSelect = document.getElementById('theme');
            this.shuffleButton = document.getElementById('shuffle-btn');
            this.undoButton = document.getElementById('undo-btn');
            this.resetButton = document.getElementById('reset-btn');
            this.victoryMessage = document.getElementById('victory-message');
            this.finalMoves = document.getElementById('final-moves');
            this.finalTime = document.getElementById('final-time');
            this.playAgainButton = document.getElementById('play-again-btn');

            this.dragStartRow = -1;
            this.dragStartCol = -1;
            this.isDragging = false;

            this.init();
        }

        App.prototype.init = function() {
            if (!this.game.loadFromLocalStorage()) {
                this.game.shuffle();
            }

            this.setupEventListeners();
            this.updateUI(this.game.getState());
        };

        App.prototype.setupEventListeners = function() {
            const self = this;

            this.shuffleButton.addEventListener('click', function() { self.handleShuffle(); });
            this.undoButton.addEventListener('click', function() { self.handleUndo(); });
            this.resetButton.addEventListener('click', function() { self.handleReset(); });
            this.playAgainButton.addEventListener('click', function() { self.handlePlayAgain(); });

            this.difficultySelect.addEventListener('change', function(e) {
                const size = parseInt(e.target.value);
                self.handleChangeDifficulty(size);
            });

            this.themeSelect.addEventListener('change', function(e) {
                const theme = e.target.value;
                self.handleChangeTheme(theme);
            });

            this.game.setStateChangeListener(function(state) { self.updateUI(state); });
            this.game.setWinListener(function() { self.handleWin(); });
        };

        App.prototype.updateUI = function(state) {
            this.updateStats(state);
            this.renderBoard(state);
            this.updateButtons(state);
            this.updateTheme(state.theme);
        };

        App.prototype.updateStats = function(state) {
            this.movesDisplay.textContent = state.moves.toString();
            this.timerDisplay.textContent = this.formatTime(state.time);
        };

        App.prototype.formatTime = function(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
        };

        App.prototype.renderBoard = function(state) {
            const size = state.size;
            this.gameBoard.innerHTML = '';
            
            this.gameBoard.style.gridTemplateColumns = 'repeat(' + size + ', 1fr)';
            this.gameBoard.style.gridTemplateRows = 'repeat(' + size + ', 1fr)';

            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    const tile = this.game.getTile(row, col);
                    const tileElement = this.createTileElement(tile);
                    this.gameBoard.appendChild(tileElement);
                }
            }
        };

        App.prototype.createTileElement = function(tile) {
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
            numberSpan.textContent = tile.value.toString();
            tileElement.appendChild(numberSpan);

            const self = this;
            tileElement.addEventListener('click', function() { self.handleTileClick(tile.row, tile.col); });
            
            tileElement.addEventListener('mousedown', function(e) { self.handleDragStart(e, tile.row, tile.col); });
            tileElement.addEventListener('touchstart', function(e) { self.handleDragStart(e, tile.row, tile.col); }, { passive: true });

            document.addEventListener('mousemove', function(e) { self.handleDragMove(e); });
            document.addEventListener('touchmove', function(e) { self.handleDragMove(e); }, { passive: true });
            document.addEventListener('mouseup', function(e) { self.handleDragEnd(e); });
            document.addEventListener('touchend', function(e) { self.handleDragEnd(e); });

            return tileElement;
        };

        App.prototype.handleTileClick = function(row, col) {
            this.game.moveTile(row, col);
        };

        App.prototype.handleDragStart = function(e, row, col) {
            this.isDragging = true;
            this.dragStartRow = row;
            this.dragStartCol = col;
        };

        App.prototype.handleDragMove = function(e) {
            if (!this.isDragging) return;

            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const target = document.elementFromPoint(clientX, clientY);

            if (target && target.classList.contains('tile-empty')) {
                const emptyRow = parseInt(target.dataset.row);
                const emptyCol = parseInt(target.dataset.col);

                if (this.game.isAdjacentToEmpty(this.dragStartRow, this.dragStartCol)) {
                    this.isDragging = false;
                    this.game.moveTile(this.dragStartRow, this.dragStartCol);
                }
            }
        };

        App.prototype.handleDragEnd = function(e) {
            this.isDragging = false;
            this.dragStartRow = -1;
            this.dragStartCol = -1;
        };

        App.prototype.updateButtons = function(state) {
            this.undoButton.disabled = !this.game.canUndo();
            this.difficultySelect.value = state.size.toString();
            this.themeSelect.value = state.theme;
        };

        App.prototype.updateTheme = function(theme) {
            document.body.className = 'theme-' + theme;
        };

        App.prototype.handleShuffle = function() {
            this.game.shuffle();
            this.hideVictoryMessage();
        };

        App.prototype.handleUndo = function() {
            this.game.undo();
        };

        App.prototype.handleReset = function() {
            this.game.reset();
            this.hideVictoryMessage();
        };

        App.prototype.handlePlayAgain = function() {
            this.game.shuffle();
            this.hideVictoryMessage();
        };

        App.prototype.handleChangeDifficulty = function(size) {
            this.game.changeSize(size);
            this.hideVictoryMessage();
        };

        App.prototype.handleChangeTheme = function(theme) {
            this.game.setTheme(theme);
        };

        App.prototype.handleWin = function() {
            const state = this.game.getState();
            
            this.finalMoves.textContent = state.moves.toString();
            this.finalTime.textContent = this.formatTime(state.time);
            
            this.showVictoryMessage();
            this.fireworks.start();
        };

        App.prototype.showVictoryMessage = function() {
            this.victoryMessage.classList.remove('hidden');
        };

        App.prototype.hideVictoryMessage = function() {
            this.victoryMessage.classList.add('hidden');
        };

        return App;
    })();

    document.addEventListener('DOMContentLoaded', function() {
        new PuzzleApp();
    });

})();
