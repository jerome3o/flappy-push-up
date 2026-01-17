/**
 * Main entry point for Flappy Push-up
 * Handles initialization, game loop, and state management
 */

import { PoseDetector } from './pose.js';
import { FlappyGame, GameState } from './game.js';
import { Renderer } from './renderer.js';

class FlappyPushupApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');

        this.poseDetector = null;
        this.game = null;
        this.renderer = null;

        this.lastFrameTime = 0;
        this.isRunning = false;

        // Movement detection for game start/restart
        this.movementThreshold = 0.05;
        this.lastShoulderY = 0.5;
        this.movementDetected = false;
        this.movementCooldown = 0;

        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    async initialize() {
        try {
            console.log('Initializing Flappy Push-up...');

            // Set up canvas size
            this.handleResize();
            window.addEventListener('resize', this.handleResize);

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

        if (state === GameState.WAITING && this.movementDetected) {
            // Start game when movement detected in waiting state
            this.game.start();
            this.movementDetected = false;
        } else if (state === GameState.GAME_OVER && this.movementDetected) {
            // Restart game when movement detected in game over state
            this.game.reset();
            this.movementDetected = false;
        }
    }

    render() {
        const gameState = this.game.getState();
        this.renderer.render(gameState);
    }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new FlappyPushupApp();
    app.initialize();
});
