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
     * Draw the vitamin C bottle (replaces bird)
     */
    drawBird(gameState) {
        const ctx = this.ctx;
        const bird = gameState.bird;

        // Scale bottle based on bird radius
        const scale = bird.radius / 25;
        const bottleWidth = 50 * scale;
        const bottleHeight = 70 * scale;
        const capHeight = 10 * scale;
        const cornerRadius = 8 * scale;

        // Center the bottle on bird position
        const x = bird.x - bottleWidth / 2;
        const y = bird.y - bottleHeight / 2;

        // Colors matching the vitamin C bottle
        const tealColor = '#2A8B8B';
        const tealDark = '#1F6B6B';
        const orangeColor = '#F5A623';
        const orangeDark = '#E09000';
        const capColor = '#1F6B6B';

        ctx.save();

        // Draw bottle cap
        ctx.fillStyle = capColor;
        this.roundedRect(ctx, x + bottleWidth * 0.15, y - capHeight, bottleWidth * 0.7, capHeight + 2, cornerRadius / 2, cornerRadius / 2, 0, 0);
        ctx.fill();

        // Draw cap rim
        ctx.fillStyle = tealDark;
        ctx.fillRect(x + bottleWidth * 0.1, y, bottleWidth * 0.8, 3 * scale);

        // Draw main bottle body - teal upper section (60% of bottle)
        const tealHeight = bottleHeight * 0.6;
        ctx.fillStyle = tealColor;
        this.roundedRect(ctx, x, y, bottleWidth, tealHeight + 5, cornerRadius, cornerRadius, 0, 0);
        ctx.fill();

        // Draw orange lower section (40% of bottle)
        const orangeY = y + tealHeight;
        const orangeHeight = bottleHeight * 0.4;
        ctx.fillStyle = orangeColor;
        this.roundedRect(ctx, x, orangeY - 5, bottleWidth, orangeHeight + 5, 0, 0, cornerRadius, cornerRadius);
        ctx.fill();

        // Add subtle bottle outline
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        this.roundedRect(ctx, x, y, bottleWidth, bottleHeight, cornerRadius, cornerRadius, cornerRadius, cornerRadius);
        ctx.stroke();

        // Draw "H&B" logo
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${10 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('H&B', bird.x, y + 14 * scale);

        // Draw "HIGH STRENGTH" text
        ctx.font = `${5 * scale}px Arial`;
        ctx.fillText('HIGH STRENGTH', bird.x, y + 22 * scale);

        // Draw "Vitamin C" text
        ctx.font = `bold ${8 * scale}px Arial`;
        ctx.fillText('Vitamin C', bird.x, y + 32 * scale);

        // Draw "1000mg" text
        ctx.font = `bold ${9 * scale}px Arial`;
        ctx.fillText('1000mg', bird.x, y + 42 * scale);

        // Draw "1 A DAY" text on orange section
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${5 * scale}px Arial`;
        ctx.fillText('1 A DAY', bird.x, orangeY + 10 * scale);

        // Draw "240 TABLETS" text
        ctx.font = `bold ${6 * scale}px Arial`;
        ctx.fillText('240 TABLETS', bird.x, orangeY + 18 * scale);

        // Draw "VEGAN" badge
        ctx.fillStyle = tealColor;
        const badgeWidth = 22 * scale;
        const badgeHeight = 6 * scale;
        const badgeX = bird.x - badgeWidth / 2;
        const badgeY = orangeY + 22 * scale;
        this.roundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 2, 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${4 * scale}px Arial`;
        ctx.fillText('VEGAN', bird.x, badgeY + 5 * scale);

        ctx.restore();
    }

    /**
     * Helper to draw rounded rectangles with different corner radii
     */
    roundedRect(ctx, x, y, width, height, tlRadius, trRadius, brRadius, blRadius) {
        ctx.beginPath();
        ctx.moveTo(x + tlRadius, y);
        ctx.lineTo(x + width - trRadius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + trRadius);
        ctx.lineTo(x + width, y + height - brRadius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - brRadius, y + height);
        ctx.lineTo(x + blRadius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - blRadius);
        ctx.lineTo(x, y + tlRadius);
        ctx.quadraticCurveTo(x, y, x + tlRadius, y);
        ctx.closePath();
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
        ctx.fillText('Do push-ups to control the vitamin bottle!', width / 2, height / 2);
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
     * Draw game over screen with leaderboard
     */
    drawGameOverScreen(gameState) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, width, height);

        // Layout: left side = score info, right side = leaderboard
        const leftX = width * 0.28;
        const rightX = width * 0.72;

        // === LEFT SIDE: Score Info ===

        // Game Over text
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF6347';
        ctx.fillText('GAME OVER', leftX, 80);

        // Score
        ctx.font = 'bold 64px Arial';
        ctx.fillStyle = this.colors.text;
        ctx.fillText(gameState.score.toString(), leftX, 160);

        ctx.font = '20px Arial';
        ctx.fillStyle = '#888888';
        ctx.fillText('SCORE', leftX, 185);

        // Percentile (if available)
        if (gameState.percentile !== null && gameState.percentile !== undefined) {
            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#00FFAA';
            ctx.fillText(`You beat ${gameState.percentile}% of players!`, leftX, 240);
        }

        // Rank (if made leaderboard)
        if (gameState.rank) {
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`#${gameState.rank} on leaderboard!`, leftX, 280);
        }

        // High score
        ctx.font = '20px Arial';
        if (gameState.score >= gameState.highScore && gameState.score > 0) {
            ctx.fillStyle = '#FFD700';
            ctx.fillText('NEW PERSONAL BEST!', leftX, 330);
        } else {
            ctx.fillStyle = '#888888';
            ctx.fillText(`Personal Best: ${gameState.highScore}`, leftX, 330);
        }

        // Submit status
        ctx.font = '18px Arial';
        if (gameState.scoreSubmitted) {
            ctx.fillStyle = '#00FF00';
            ctx.fillText('Score submitted!', leftX, 380);
        }

        // Restart instruction
        ctx.font = '22px Arial';
        ctx.fillStyle = this.colors.text;
        ctx.fillText('Push up to play again', leftX, height - 40);

        // === RIGHT SIDE: Leaderboard ===

        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('LEADERBOARD', rightX, 80);

        const leaderboard = gameState.leaderboard || [];
        const startY = 120;
        const lineHeight = 32;
        const maxDisplay = Math.min(leaderboard.length, 10);

        if (leaderboard.length === 0) {
            ctx.font = '18px Arial';
            ctx.fillStyle = '#888888';
            ctx.fillText('No scores yet!', rightX, startY + 20);
            ctx.fillText('Be the first!', rightX, startY + 50);
        } else {
            for (let i = 0; i < maxDisplay; i++) {
                const entry = leaderboard[i];
                const y = startY + i * lineHeight;
                const isCurrentPlayer = gameState.rank === i + 1;

                // Highlight current player's entry
                if (isCurrentPlayer) {
                    ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
                    ctx.fillRect(rightX - 140, y - 20, 280, lineHeight);
                }

                // Rank
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'right';
                ctx.fillStyle = i < 3 ? '#FFD700' : '#FFFFFF';
                ctx.fillText(`${i + 1}.`, rightX - 100, y);

                // Name
                ctx.font = '18px Arial';
                ctx.textAlign = 'left';
                ctx.fillStyle = isCurrentPlayer ? '#00FFAA' : '#FFFFFF';
                const displayName = entry.name.length > 12 ? entry.name.slice(0, 12) + '...' : entry.name;
                ctx.fillText(displayName, rightX - 90, y);

                // Score
                ctx.textAlign = 'right';
                ctx.fillStyle = isCurrentPlayer ? '#00FFAA' : '#AAAAAA';
                ctx.fillText(entry.score.toString(), rightX + 130, y);
            }

            // Show "and X more" if there are more entries
            if (leaderboard.length > maxDisplay) {
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#666666';
                ctx.fillText(`and ${leaderboard.length - maxDisplay} more...`, rightX, startY + maxDisplay * lineHeight + 10);
            }
        }

        // Reset text align
        ctx.textAlign = 'center';
    }
}
