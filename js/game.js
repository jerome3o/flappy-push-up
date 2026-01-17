/**
 * Flappy Bird game logic
 * Controls bird movement, pipe generation, collision detection, and scoring
 */

export const GameState = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    GAME_OVER: 'game_over'
};

export class FlappyGame {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;

        // Game state
        this.state = GameState.WAITING;
        this.score = 0;
        this.highScore = this.loadHighScore();

        // Bird properties
        this.bird = {
            x: canvasWidth * 0.2,  // Bird stays at 20% from left
            y: canvasHeight / 2,
            radius: 25,
            targetY: canvasHeight / 2  // Where the bird should move to
        };

        // Bird movement smoothing
        this.birdSmoothingFactor = 0.15;

        // Pipe properties
        this.pipes = [];
        this.pipeWidth = 80;
        this.pipeGap = 180;  // Gap between top and bottom pipes
        this.pipeSpeed = 3;  // Pixels per frame
        this.pipeSpawnInterval = 2000;  // Milliseconds
        this.lastPipeSpawn = 0;
        this.minPipeHeight = 50;

        // Difficulty scaling
        this.basePipeSpeed = 3;
        this.basePipeGap = 180;
        this.difficultyIncreaseRate = 0.1; // Per point scored

        // Boundaries
        this.groundHeight = 50;
        this.ceilingHeight = 0;
    }

    /**
     * Update bird's target Y position based on shoulder height
     * @param {number} normalizedY - 0 (up/high push-up) to 1 (down/low push-up)
     */
    setBirdTargetFromPose(normalizedY) {
        // Map pose Y to bird Y position
        // When shoulders are UP (normalizedY = 0), bird goes UP (lower Y value)
        // When shoulders are DOWN (normalizedY = 1), bird goes DOWN (higher Y value)
        const playableHeight = this.height - this.groundHeight - this.ceilingHeight;
        const padding = this.bird.radius * 2;

        this.bird.targetY = this.ceilingHeight + padding +
                          normalizedY * (playableHeight - padding * 2);
    }

    /**
     * Main game update loop
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime) {
        if (this.state !== GameState.PLAYING) {
            // Still update bird position smoothly even when not playing
            this.updateBirdPosition();
            return;
        }

        // Update bird position
        this.updateBirdPosition();

        // Update pipes
        this.updatePipes(deltaTime);

        // Check collisions
        if (this.checkCollisions()) {
            this.gameOver();
        }

        // Spawn new pipes
        this.spawnPipes(deltaTime);
    }

    updateBirdPosition() {
        // Smoothly move bird towards target position
        this.bird.y += (this.bird.targetY - this.bird.y) * this.birdSmoothingFactor;
    }

    updatePipes(deltaTime) {
        // Calculate current speed based on difficulty
        const currentSpeed = this.pipeSpeed + (this.score * this.difficultyIncreaseRate);

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];

            // Move pipe left
            pipe.x -= currentSpeed;

            // Check if bird passed the pipe (for scoring)
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
                this.updateDifficulty();
            }

            // Remove pipes that are off screen
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
            }
        }
    }

    spawnPipes(deltaTime) {
        this.lastPipeSpawn += deltaTime;

        if (this.lastPipeSpawn >= this.pipeSpawnInterval) {
            this.lastPipeSpawn = 0;

            // Calculate current gap size (gets smaller as score increases)
            const currentGap = Math.max(120, this.basePipeGap - (this.score * 2));

            // Random gap position
            const playableHeight = this.height - this.groundHeight - this.ceilingHeight;
            const maxGapTop = playableHeight - currentGap - this.minPipeHeight;
            const gapTop = this.minPipeHeight + Math.random() * maxGapTop;

            this.pipes.push({
                x: this.width,
                gapTop: gapTop,
                gapBottom: gapTop + currentGap,
                passed: false
            });
        }
    }

    checkCollisions() {
        const bird = this.bird;

        // Check ceiling and ground collision
        if (bird.y - bird.radius < this.ceilingHeight ||
            bird.y + bird.radius > this.height - this.groundHeight) {
            return true;
        }

        // Check pipe collisions
        for (const pipe of this.pipes) {
            // Check if bird is horizontally within pipe
            if (bird.x + bird.radius > pipe.x &&
                bird.x - bird.radius < pipe.x + this.pipeWidth) {

                // Check if bird hits top or bottom pipe
                if (bird.y - bird.radius < pipe.gapTop ||
                    bird.y + bird.radius > pipe.gapBottom) {
                    return true;
                }
            }
        }

        return false;
    }

    updateDifficulty() {
        // Increase speed and decrease gap as score increases
        this.pipeSpeed = this.basePipeSpeed + (this.score * this.difficultyIncreaseRate);
    }

    /**
     * Start or restart the game
     */
    start() {
        this.state = GameState.PLAYING;
        this.score = 0;
        this.pipes = [];
        this.lastPipeSpawn = 0;
        this.pipeSpeed = this.basePipeSpeed;
    }

    /**
     * End the game
     */
    gameOver() {
        this.state = GameState.GAME_OVER;

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
    }

    /**
     * Reset to waiting state
     */
    reset() {
        this.state = GameState.WAITING;
        this.score = 0;
        this.pipes = [];
        this.lastPipeSpawn = 0;
        this.pipeSpeed = this.basePipeSpeed;
    }

    /**
     * Resize game dimensions
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.bird.x = width * 0.2;

        // Adjust pipe gap for screen size
        this.pipeGap = Math.min(180, height * 0.25);
        this.basePipeGap = this.pipeGap;
    }

    /**
     * Load high score from localStorage
     */
    loadHighScore() {
        try {
            return parseInt(localStorage.getItem('flappyPushupHighScore') || '0', 10);
        } catch {
            return 0;
        }
    }

    /**
     * Save high score to localStorage
     */
    saveHighScore() {
        try {
            localStorage.setItem('flappyPushupHighScore', this.highScore.toString());
        } catch {
            // Ignore storage errors
        }
    }

    /**
     * Get current game state
     */
    getState() {
        return {
            state: this.state,
            score: this.score,
            highScore: this.highScore,
            bird: { ...this.bird },
            pipes: this.pipes.map(p => ({ ...p })),
            pipeWidth: this.pipeWidth,
            groundHeight: this.groundHeight,
            ceilingHeight: this.ceilingHeight
        };
    }
}
