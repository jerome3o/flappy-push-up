/**
 * Main entry point for Flappy Push-up
 * Handles initialization, game loop, and state management
 */

import { PoseDetector } from './pose.js';
import { FlappyGame, GameState } from './game.js';
import { Renderer } from './renderer.js';
import { LeaderboardAPI } from './leaderboard.js';

class FlappyPushupApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');

        this.poseDetector = null;
        this.game = null;
        this.renderer = null;
        this.leaderboardAPI = new LeaderboardAPI();

        this.lastFrameTime = 0;
        this.isRunning = false;

        // Movement detection for game start/restart
        this.movementThreshold = 0.05;
        this.lastShoulderY = 0.5;
        this.movementDetected = false;
        this.movementCooldown = 0;

        // Game over cooldown (frames to wait before allowing restart)
        this.gameOverCooldown = 0;
        this.GAME_OVER_COOLDOWN_FRAMES = 120; // ~2 seconds at 60fps
        this.lastGameState = null;

        // Leaderboard state
        this.leaderboard = [];
        this.percentile = null;
        this.rank = null;
        this.scoreSubmitted = false;
        this.leaderboardFetched = false;

        // Submit form elements
        this.submitForm = document.getElementById('submit-form');
        this.nameInput = document.getElementById('name-input');
        this.submitBtn = document.getElementById('submit-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');

        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handlePlayAgain = this.handlePlayAgain.bind(this);
    }

    async initialize() {
        try {
            console.log('Initializing Flappy Push-up...');

            // Set up canvas size
            this.handleResize();
            window.addEventListener('resize', this.handleResize);

            // Set up submit form event listeners
            this.submitBtn.addEventListener('click', this.handleSubmit);
            this.nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSubmit();
            });

            // Play again button
            this.playAgainBtn.addEventListener('click', this.handlePlayAgain);

            // Load saved name
            this.nameInput.value = localStorage.getItem('flappyPushupName') || '';

            // Initialize game and renderer
            this.game = new FlappyGame(this.canvas.width, this.canvas.height);
            this.renderer = new Renderer(this.canvas, this.video);

            // Show loading message
            this.showLoadingMessage('Initializing pose detection...');

            // Initialize pose detection
            this.poseDetector = new PoseDetector();

            // Set up pose results callback for skeleton rendering
            this.poseDetector.setResultsCallback((results) => {
                this.renderer.setPoseResults(results);
            });

            await this.poseDetector.initialize(this.video);

            console.log('Pose detection initialized');

            // Pre-fetch leaderboard
            this.fetchLeaderboard();

            // Start game loop
            this.isRunning = true;
            this.lastFrameTime = performance.now();
            requestAnimationFrame(this.gameLoop);

            // Hide loading message
            console.log('Flappy Push-up ready!');

        } catch (error) {
            console.error('Initialization failed:', error);
            this.showErrorMessage(error.message);
        }
    }

    async fetchLeaderboard() {
        try {
            console.log('Fetching leaderboard...');
            this.leaderboard = await this.leaderboardAPI.getLeaderboard();
            this.leaderboardFetched = true;
            console.log('Leaderboard fetched:', this.leaderboard.length, 'entries');
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            this.leaderboardFetched = true; // Mark as fetched even on error to prevent retry spam
        }
    }

    showLoadingMessage(message) {
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
    }

    showErrorMessage(message) {
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF6347';
        ctx.fillText('Error', this.canvas.width / 2, this.canvas.height / 2 - 40);

        ctx.font = '18px Arial';
        ctx.fillStyle = '#FFFFFF';

        // Word wrap the error message
        const words = message.split(' ');
        let line = '';
        let y = this.canvas.height / 2;

        for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > this.canvas.width - 40) {
                ctx.fillText(line, this.canvas.width / 2, y);
                line = word + ' ';
                y += 25;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, this.canvas.width / 2, y);

        ctx.fillStyle = '#888888';
        ctx.fillText('Please ensure camera access is allowed', this.canvas.width / 2, y + 60);
    }

    handleResize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        if (this.game) {
            this.game.resize(this.canvas.width, this.canvas.height);
        }

        if (this.renderer) {
            this.renderer.resize();
        }
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;

        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Update game logic
        this.update(deltaTime);

        // Render
        this.render();

        // Continue loop
        requestAnimationFrame(this.gameLoop);
    }

    update(deltaTime) {
        // Get current shoulder position from pose detector
        if (this.poseDetector && this.poseDetector.isPoseDetected()) {
            const normalizedY = this.poseDetector.getNormalizedShoulderY();

            // Update bird position
            this.game.setBirdTargetFromPose(normalizedY);

            // Detect movement for game start/restart
            this.detectMovement(normalizedY);
        }

        // Update game state
        this.game.update(deltaTime);

        // Handle game state transitions
        this.handleStateTransitions();
    }

    detectMovement(currentY) {
        // Reduce cooldown
        if (this.movementCooldown > 0) {
            this.movementCooldown--;
            return;
        }

        // Check if significant movement occurred
        const movement = Math.abs(currentY - this.lastShoulderY);

        if (movement > this.movementThreshold) {
            this.movementDetected = true;
            this.movementCooldown = 30; // Frames to wait before detecting again
        }

        this.lastShoulderY = currentY;
    }

    handleStateTransitions() {
        const state = this.game.state;

        // Detect state change to GAME_OVER
        if (state === GameState.GAME_OVER && this.lastGameState !== GameState.GAME_OVER) {
            // Just entered game over - start cooldown
            this.gameOverCooldown = this.GAME_OVER_COOLDOWN_FRAMES;
            this.movementDetected = false; // Clear any pending movement
            console.log('Game over - cooldown started');

            // Fetch leaderboard if not already fetched
            if (!this.leaderboardFetched) {
                this.fetchLeaderboard();
            }
        }
        this.lastGameState = state;

        // Decrease game over cooldown
        if (this.gameOverCooldown > 0) {
            this.gameOverCooldown--;
        }

        if (state === GameState.WAITING) {
            // Hide UI elements when waiting
            this.submitForm.classList.add('hidden');
            this.playAgainBtn.classList.add('hidden');

            if (this.movementDetected) {
                // Start game when movement detected in waiting state
                this.game.start();
                this.movementDetected = false;
                // Reset leaderboard state for new game
                this.scoreSubmitted = false;
                this.percentile = null;
                this.rank = null;
            }
        } else if (state === GameState.PLAYING) {
            // Hide UI elements while playing
            this.submitForm.classList.add('hidden');
            this.playAgainBtn.classList.add('hidden');
        } else if (state === GameState.GAME_OVER) {
            // Show submit form if score > 0 and not yet submitted
            if (this.game.score > 0 && !this.scoreSubmitted) {
                this.submitForm.classList.remove('hidden');
            } else {
                this.submitForm.classList.add('hidden');
            }

            // Show play again button after cooldown
            if (this.gameOverCooldown === 0) {
                this.playAgainBtn.classList.remove('hidden');
            } else {
                this.playAgainBtn.classList.add('hidden');
            }
        }
    }

    handlePlayAgain() {
        this.game.reset();
        this.scoreSubmitted = false;
        this.percentile = null;
        this.rank = null;
        this.submitForm.classList.add('hidden');
        this.playAgainBtn.classList.add('hidden');
    }

    async handleSubmit() {
        const name = this.nameInput.value.trim();
        if (!name) {
            this.nameInput.focus();
            return;
        }

        // Save name for next time
        localStorage.setItem('flappyPushupName', name);

        // Disable button during submission
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Submitting...';

        try {
            const result = await this.leaderboardAPI.submitScore(name, this.game.score);

            this.percentile = result.percentile;
            this.rank = result.rank;
            this.leaderboard = result.leaderboard || this.leaderboard;
            this.scoreSubmitted = true;

            // Hide form after successful submit
            this.submitForm.classList.add('hidden');

        } catch (error) {
            console.error('Failed to submit score:', error);
        }

        this.submitBtn.disabled = false;
        this.submitBtn.textContent = 'Submit Score';
    }

    render() {
        const gameState = this.game.getState();

        // Add leaderboard data to game state for rendering
        gameState.leaderboard = this.leaderboard;
        gameState.percentile = this.percentile;
        gameState.rank = this.rank;
        gameState.scoreSubmitted = this.scoreSubmitted;

        this.renderer.render(gameState);
    }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new FlappyPushupApp();
    app.initialize();
});
