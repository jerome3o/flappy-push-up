/**
 * Canvas renderer for the Flappy Push-up game
 * Draws video background, game elements, and pose skeleton
 */

import { GameState } from './game.js';

export class Renderer {
    constructor(canvas, video) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.video = video;

        // Colors
        this.colors = {
            bird: '#FFD700',           // Gold
            birdOutline: '#FFA500',    // Orange
            pipeTop: '#228B22',        // Forest green
            pipeBottom: '#228B22',
            pipeHighlight: '#32CD32',  // Lime green
            pipeShadow: '#006400',     // Dark green
            ground: '#8B4513',         // Saddle brown
            groundGrass: '#228B22',
            sky: 'rgba(135, 206, 235, 0.3)', // Semi-transparent sky blue
            text: '#FFFFFF',
            textShadow: '#000000',
            skeleton: 'rgba(0, 255, 0, 0.7)',
            skeletonPoints: 'rgba(255, 0, 0, 0.8)'
        };

        // Debug mode for skeleton
        this.showSkeleton = true;

        // Pose results for skeleton drawing
        this.poseResults = null;
    }

    /**
     * Set pose results for skeleton rendering
     */
    setPoseResults(results) {
        this.poseResults = results;
    }

    /**
     * Toggle skeleton visibility
     */
    toggleSkeleton() {
        this.showSkeleton = !this.showSkeleton;
    }

    /**
     * Resize canvas to match container
     */
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    /**
     * Main render function
     */
    render(gameState) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw mirrored video frame as background
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(this.video, -width, 0, width, height);
        ctx.restore();

        // Draw semi-transparent overlay for better visibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, width, height);

        // Draw pose skeleton mirrored (if enabled and available)
        if (this.showSkeleton && this.poseResults?.poseLandmarks) {
            this.drawSkeleton(this.poseResults.poseLandmarks);
        }

        // Draw game elements (not mirrored)
        this.drawGround(gameState);
        this.drawPipes(gameState);
        this.drawBird(gameState);

        // Draw UI based on game state (not mirrored)
        switch (gameState.state) {
            case GameState.WAITING:
                this.drawWaitingScreen(gameState);
                break;
            case GameState.PLAYING:
                this.drawScore(gameState);
                break;
            case GameState.GAME_OVER:
                this.drawGameOverScreen(gameState);
                break;
        }
    }

    /**
     * Draw pose skeleton overlay (mirrored to match video)
     */
    drawSkeleton(landmarks) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Helper to mirror X coordinate
        const mirrorX = (x) => width - (x * width);

        // Connection pairs for skeleton
        const connections = [
            [11, 12], // Shoulders
            [11, 13], [13, 15], // Left arm
            [12, 14], [14, 16], // Right arm
            [11, 23], [12, 24], // Torso sides
            [23, 24], // Hips
            [23, 25], [25, 27], // Left leg
            [24, 26], [26, 28]  // Right leg
        ];

        // Draw connections
        ctx.strokeStyle = this.colors.skeleton;
        ctx.lineWidth = 3;

        for (const [start, end] of connections) {
            const p1 = landmarks[start];
            const p2 = landmarks[end];

            if (p1 && p2 && p1.visibility > 0.5 && p2.visibility > 0.5) {
                ctx.beginPath();
                ctx.moveTo(mirrorX(p1.x), p1.y * height);
                ctx.lineTo(mirrorX(p2.x), p2.y * height);
                ctx.stroke();
            }
        }

        // Draw landmark points
        ctx.fillStyle = this.colors.skeletonPoints;

        for (let i = 11; i < 29; i++) { // Body landmarks only
            const landmark = landmarks[i];
            if (landmark && landmark.visibility > 0.5) {
                ctx.beginPath();
                ctx.arc(mirrorX(landmark.x), landmark.y * height, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Highlight shoulders (used for game control)
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        if (leftShoulder && rightShoulder) {
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.arc(mirrorX(leftShoulder.x), leftShoulder.y * height, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(mirrorX(rightShoulder.x), rightShoulder.y * height, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Draw the bird
     */
    drawBird(gameState) {
        const ctx = this.ctx;
        const bird = gameState.bird;

        // Bird body (circle)
        ctx.fillStyle = this.colors.bird;
        ctx.strokeStyle = this.colors.birdOutline;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(bird.x + bird.radius * 0.3, bird.y - bird.radius * 0.2,
                bird.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(bird.x + bird.radius * 0.4, bird.y - bird.radius * 0.2,
                bird.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#FF6347';
        ctx.beginPath();
        ctx.moveTo(bird.x + bird.radius, bird.y);
        ctx.lineTo(bird.x + bird.radius + 15, bird.y + 5);
        ctx.lineTo(bird.x + bird.radius, bird.y + 10);
        ctx.closePath();
        ctx.fill();

        // Wing
        ctx.fillStyle = this.colors.birdOutline;
        ctx.beginPath();
        ctx.ellipse(bird.x - bird.radius * 0.2, bird.y + bird.radius * 0.1,
                   bird.radius * 0.5, bird.radius * 0.3, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw pipes
     */
    drawPipes(gameState) {
        const ctx = this.ctx;
        const height = this.canvas.height;

        for (const pipe of gameState.pipes) {
            // Top pipe
            this.drawPipe(pipe.x, 0, gameState.pipeWidth, pipe.gapTop, true);

            // Bottom pipe
            this.drawPipe(pipe.x, pipe.gapBottom, gameState.pipeWidth,
                         height - pipe.gapBottom - gameState.groundHeight, false);
        }
    }

    /**
     * Draw a single pipe
     */
    drawPipe(x, y, width, height, isTop) {
        const ctx = this.ctx;
        const capHeight = 30;
        const capOverhang = 8;

        // Main pipe body
        const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
        gradient.addColorStop(0, this.colors.pipeShadow);
        gradient.addColorStop(0.3, this.colors.pipeTop);
        gradient.addColorStop(0.7, this.colors.pipeHighlight);
        gradient.addColorStop(1, this.colors.pipeShadow);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);

        // Pipe cap
        const capY = isTop ? y + height - capHeight : y;
        ctx.fillStyle = gradient;
        ctx.fillRect(x - capOverhang, capY, width + capOverhang * 2, capHeight);

        // Cap border
        ctx.strokeStyle = this.colors.pipeShadow;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - capOverhang, capY, width + capOverhang * 2, capHeight);
    }

    /**
     * Draw ground
     */
    drawGround(gameState) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const groundY = height - gameState.groundHeight;

        // Ground
        ctx.fillStyle = this.colors.ground;
        ctx.fillRect(0, groundY, width, gameState.groundHeight);

        // Grass strip
        ctx.fillStyle = this.colors.groundGrass;
        ctx.fillRect(0, groundY, width, 10);
    }

    /**
     * Draw current score
     */
    drawScore(gameState) {
        const ctx = this.ctx;
        const width = this.canvas.width;

        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';

        // Shadow
        ctx.fillStyle = this.colors.textShadow;
        ctx.fillText(gameState.score.toString(), width / 2 + 3, 63);

        // Main text
        ctx.fillStyle = this.colors.text;
        ctx.fillText(gameState.score.toString(), width / 2, 60);
    }

    /**
     * Draw waiting screen
     */
    drawWaitingScreen(gameState) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);

        // Title
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.colors.text;
        ctx.fillText('FLAPPY PUSH-UP', width / 2, height / 3);

        // Instructions
        ctx.font = '24px Arial';
        ctx.fillText('Do push-ups to control the bird!', width / 2, height / 2);
        ctx.fillText('Move up and down to start', width / 2, height / 2 + 40);

        // High score
        if (gameState.highScore > 0) {
            ctx.font = '20px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`High Score: ${gameState.highScore}`, width / 2, height / 2 + 100);
        }

        // Pose status
        ctx.font = '18px Arial';
        ctx.fillStyle = this.poseResults?.poseLandmarks ? '#00FF00' : '#FF6347';
        const poseStatus = this.poseResults?.poseLandmarks ?
            'Pose detected - Start moving!' : 'Position yourself in frame...';
        ctx.fillText(poseStatus, width / 2, height - 100);
    }

    /**
     * Draw game over screen
     */
    drawGameOverScreen(gameState) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);

        // Game Over text
        ctx.font = 'bold 56px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF6347';
        ctx.fillText('GAME OVER', width / 2, height / 3);

        // Score
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = this.colors.text;
        ctx.fillText(`Score: ${gameState.score}`, width / 2, height / 2);

        // High score
        if (gameState.score >= gameState.highScore && gameState.score > 0) {
            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('NEW HIGH SCORE!', width / 2, height / 2 + 50);
        } else {
            ctx.font = '24px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`High Score: ${gameState.highScore}`, width / 2, height / 2 + 50);
        }

        // Restart instruction
        ctx.font = '24px Arial';
        ctx.fillStyle = this.colors.text;
        ctx.fillText('Do a push-up to restart', width / 2, height / 2 + 120);
    }
}
