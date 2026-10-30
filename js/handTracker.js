import {
  FilesetResolver,
  HandLandmarker
} from "../public/vision_bundle.mjs";

export class HandTracker {
  constructor(video, onPoint) {
    this.video = video;
    this.onPoint = onPoint;

    this.landmarker = null;
    this.running = false;

    this.lastVideoTime = -1;
    this.lastInference = 0;

    // Detección más frecuente.
    this.intervalMs = 33;

    this.loopId = 0;
    this.smooth = null;
  }

  async init() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "./public/wasm/"
      );

      const options = {
        baseOptions: {
          modelAssetPath:
            "./public/models/hand_landmarker.task"
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.5
      };

      // Primero intenta GPU.
      try {
        this.landmarker =
          await HandLandmarker.createFromOptions(
            vision,
            {
              ...options,
              baseOptions: {
                ...options.baseOptions,
                delegate: "GPU"
              }
            }
          );

        console.log("MediaPipe funcionando con GPU.");

      } catch (gpuError) {

        console.warn(
          "GPU no disponible. Se utilizará CPU.",
          gpuError
        );

        this.landmarker =
          await HandLandmarker.createFromOptions(
            vision,
            {
              ...options,
              baseOptions: {
                ...options.baseOptions,
                delegate: "CPU"
              }
            }
          );

        console.log("MediaPipe funcionando con CPU.");
      }

      this.running = true;
      this.loop();

      console.log("Detector de manos iniciado.");

    } catch (error) {
      console.error(
        "Error al iniciar MediaPipe:",
        error
      );

      throw error;
    }
  }

  loop = () => {
    if (!this.running) return;

    const now = performance.now();

    if (
      this.video.readyState >= 2 &&
      this.video.currentTime !== this.lastVideoTime &&
      now - this.lastInference >= this.intervalMs
    ) {
      this.lastVideoTime = this.video.currentTime;
      this.lastInference = now;

      try {
        const result =
          this.landmarker.detectForVideo(
            this.video,
            now
          );

        const hand = result.landmarks?.[0];

        if (hand?.[8]) {

          const raw = {
            x: 1 - hand[8].x,
            y: hand[8].y
          };

          if (!this.smooth) {
            this.smooth = { ...raw };

          } else {

            const dx = raw.x - this.smooth.x;
            const dy = raw.y - this.smooth.y;

            const distance = Math.sqrt(
              dx * dx + dy * dy
            );

            // Cuanto más rápido se mueve el dedo,
            // menos suavizado y más respuesta.
            const alpha = Math.min(
              0.96,
              0.78 + distance * 2.5
            );

            this.smooth.x += dx * alpha;
            this.smooth.y += dy * alpha;
          }

          this.onPoint({
            x: this.smooth.x,
            y: this.smooth.y,
            active: true
          });

        } else {
          this.smooth = null;
          this.onPoint(null);
        }

      } catch (error) {
        console.error(
          "Error detectando la mano:",
          error
        );
      }
    }

    this.loopId = requestAnimationFrame(
      this.loop
    );
  };

  stop() {
    this.running = false;

    cancelAnimationFrame(this.loopId);

    this.landmarker?.close();
    this.landmarker = null;

    this.smooth = null;
  }
}