/**
 * Pose detection module using MediaPipe Pose
 * Tracks shoulder position for push-up detection
 */

export class PoseDetector {
    constructor() {
        this.pose = null;
        this.camera = null;
        this.onResultsCallback = null;
        this.isInitialized = false;

        // Shoulder landmarks indices in MediaPipe Pose
        this.LANDMARKS = {
            LEFT_SHOULDER: 11,
            RIGHT_SHOULDER: 12,
            LEFT_ELBOW: 13,
            RIGHT_ELBOW: 14,
            LEFT_WRIST: 15,
            RIGHT_WRIST: 16,
            LEFT_HIP: 23,
            RIGHT_HIP: 24
        };

        // Smoothed shoulder Y position (0 = top, 1 = bottom)
        this.shoulderY = 0.5;
        this.smoothingFactor = 0.3; // Lower = smoother but more latency

        // Track calibration
        this.minShoulderY = null;
        this.maxShoulderY = null;
        this.calibrationSamples = [];
        this.isCalibrating = false;
    }

    async initialize(videoElement) {
        return new Promise((resolve, reject) => {
            try {
                // Create MediaPipe Pose instance
                this.pose = new window.Pose({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
                    }
                });

                // Configure pose detection
                this.pose.setOptions({
                    modelComplexity: 1, // 0, 1, or 2 (higher = more accurate but slower)
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                // Set up results callback
                this.pose.onResults((results) => this.handleResults(results));

                // Initialize camera
                this.camera = new window.Camera(videoElement, {
                    onFrame: async () => {
                        if (this.pose) {
                            await this.pose.send({ image: videoElement });
                        }
                    },
                    width: 640,
                    height: 480
                });

                this.camera.start().then(() => {
                    this.isInitialized = true;
                    resolve();
                }).catch(reject);

            } catch (error) {
                reject(error);
            }
        });
    }

    handleResults(results) {
        if (results.poseLandmarks) {
            // Get shoulder positions
            const leftShoulder = results.poseLandmarks[this.LANDMARKS.LEFT_SHOULDER];
            const rightShoulder = results.poseLandmarks[this.LANDMARKS.RIGHT_SHOULDER];

            // Average shoulder Y position
            const rawShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

            // Apply smoothing
            this.shoulderY = this.shoulderY * (1 - this.smoothingFactor) +
                            rawShoulderY * this.smoothingFactor;

            // Update calibration if active
            if (this.isCalibrating) {
                this.calibrationSamples.push(rawShoulderY);
            }

            // Update min/max for dynamic calibration
            if (this.minShoulderY === null) {
                this.minShoulderY = rawShoulderY;
                this.maxShoulderY = rawShoulderY;
            } else {
                // Slowly adapt to new ranges
                if (rawShoulderY < this.minShoulderY) {
                    this.minShoulderY = rawShoulderY;
                }
                if (rawShoulderY > this.maxShoulderY) {
                    this.maxShoulderY = rawShoulderY;
                }
            }
        }

        // Call external callback if set
        if (this.onResultsCallback) {
            this.onResultsCallback(results);
        }
    }

    /**
     * Get normalized shoulder Y position (0 = top/up, 1 = bottom/down)
     * Maps to push-up position: down = lower, up = higher
     */
    getNormalizedShoulderY() {
        if (this.minShoulderY === null || this.maxShoulderY === null) {
            return 0.5;
        }

        const range = this.maxShoulderY - this.minShoulderY;
        if (range < 0.05) {
            // Not enough range detected yet
            return 0.5;
        }

        // Normalize to 0-1 range with some padding
        const normalized = (this.shoulderY - this.minShoulderY) / range;
        return Math.max(0, Math.min(1, normalized));
    }

    /**
     * Get raw shoulder Y (0-1 where 0 is top of frame)
     */
    getRawShoulderY() {
        return this.shoulderY;
    }

    /**
     * Start calibration period
     */
    startCalibration() {
        this.isCalibrating = true;
        this.calibrationSamples = [];
        this.minShoulderY = null;
        this.maxShoulderY = null;
    }

    /**
     * End calibration and set min/max from samples
     */
    endCalibration() {
        this.isCalibrating = false;
        if (this.calibrationSamples.length > 0) {
            this.minShoulderY = Math.min(...this.calibrationSamples);
            this.maxShoulderY = Math.max(...this.calibrationSamples);
        }
    }

    /**
     * Check if pose is currently detected
     */
    isPoseDetected() {
        return this.minShoulderY !== null;
    }

    /**
     * Set callback for raw pose results (for rendering skeleton)
     */
    setResultsCallback(callback) {
        this.onResultsCallback = callback;
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.camera) {
            this.camera.stop();
        }
        if (this.pose) {
            this.pose.close();
        }
    }
}
