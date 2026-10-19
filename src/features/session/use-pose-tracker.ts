"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PoseFrame } from "@/core/engine/types";
import { assessFraming, type Framing } from "@/core/pose/framing";
import { createPoseLandmarker, type Delegate } from "./pose/create-landmarker";
import { drawPose } from "./pose/draw-pose";

export type Facing = "user" | "environment";
export type TrackerStatus = "idle" | "starting" | "running" | "error";

export interface TrackerStats {
  fps: number;
  framing: Framing;
  delegate: Delegate | null;
}

interface Options {
  enabled: boolean;
  facing: Facing;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Called for every processed video frame; `null` means no person was detected. */
  onFrame?: (frame: PoseFrame | null, t: number) => void;
}

const HUD_INTERVAL_MS = 250;
const INITIAL_STATS: TrackerStats = { fps: 0, framing: "no-person", delegate: null };

function describeError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
        return "Camera permission was denied. Allow camera access in your browser settings and try again.";
      case "NotFoundError":
        return "No camera was found on this device.";
      case "NotReadableError":
        return "The camera is in use by another app.";
      case "OverconstrainedError":
        return "This camera doesn't support the requested mode.";
    }
  }
  return error instanceof Error ? error.message : "Something went wrong starting the camera.";
}

/**
 * Owns the camera stream, the MediaPipe landmarker and the per-frame loop.
 * Landmarks are drawn straight onto the canvas and never enter React state:
 * only a throttled HUD snapshot does, so we avoid re-rendering at video rate.
 */
export function usePoseTracker({ enabled, facing, videoRef, canvasRef, onFrame }: Options) {
  // Latest callback without restarting the camera when the handler identity changes.
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    onFrameRef.current = onFrame;
  });
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TrackerStats>(INITIAL_STATS);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!enabled || !video || !canvas) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let landmarkerHandle: Awaited<ReturnType<typeof createPoseLandmarker>> | null = null;
    let frameHandle = 0;
    const useVideoFrames = "requestVideoFrameCallback" in HTMLVideoElement.prototype;

    async function start() {
      setStatus("starting");
      setError(null);
      try {
        // Load the model while the camera permission prompt is showing.
        // allSettled (not all): if one side fails, e.g. the camera is denied, the other must still be
        // released, otherwise every retry would leak a WASM landmarker or a live camera stream.
        const [cameraResult, landmarkerResult] = await Promise.allSettled([
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: facing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            },
          }),
          createPoseLandmarker(),
        ]);
        if (cameraResult.status === "rejected" || landmarkerResult.status === "rejected") {
          if (cameraResult.status === "fulfilled") {
            for (const track of cameraResult.value.getTracks()) track.stop();
          }
          if (landmarkerResult.status === "fulfilled") landmarkerResult.value.landmarker.close();
          throw cameraResult.status === "rejected"
            ? cameraResult.reason
            : (landmarkerResult as PromiseRejectedResult).reason;
        }
        const mediaStream = cameraResult.value;
        const handle = landmarkerResult.value;
        if (cancelled) {
          for (const track of mediaStream.getTracks()) track.stop();
          handle.landmarker.close();
          return;
        }
        stream = mediaStream;
        landmarkerHandle = handle;

        video!.srcObject = mediaStream;
        await video!.play();
        if (cancelled) return;

        const ctx = canvas!.getContext("2d");
        if (!ctx) throw new Error("Canvas is not supported in this browser.");

        setStatus("running");
        let lastVideoTime = -1;
        let lastFrameAt = 0;
        let fps = 0;
        let lastHudAt = 0;

        const tick = () => {
          if (cancelled) return;
          const { landmarker, delegate } = handle;
          if (video!.readyState >= 2 && video!.videoWidth > 0 && video!.currentTime !== lastVideoTime) {
            lastVideoTime = video!.currentTime;
            if (canvas!.width !== video!.videoWidth || canvas!.height !== video!.videoHeight) {
              canvas!.width = video!.videoWidth;
              canvas!.height = video!.videoHeight;
            }

            const now = performance.now();
            const result = landmarker.detectForVideo(video!, now);
            const landmarks = result.landmarks[0];
            drawPose(ctx, landmarks, handle.connections);
            onFrameRef.current?.(
              landmarks
                ? {
                    t: now,
                    image: landmarks,
                    world: result.worldLandmarks[0],
                    aspect: video!.videoWidth / video!.videoHeight,
                  }
                : null,
              now,
            );

            if (lastFrameAt) {
              const instant = 1000 / (now - lastFrameAt);
              fps = fps ? fps * 0.9 + instant * 0.1 : instant;
            }
            lastFrameAt = now;

            if (now - lastHudAt > HUD_INTERVAL_MS) {
              lastHudAt = now;
              setStats({ fps: Math.round(fps), framing: assessFraming(landmarks), delegate });
            }
          }
          schedule();
        };

        const schedule = () => {
          frameHandle = useVideoFrames
            ? video!.requestVideoFrameCallback(tick)
            : requestAnimationFrame(tick);
        };
        schedule();
      } catch (e) {
        if (cancelled) return;
        setError(describeError(e));
        setStatus("error");
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (useVideoFrames) video.cancelVideoFrameCallback(frameHandle);
      else cancelAnimationFrame(frameHandle);
      if (stream) for (const track of stream.getTracks()) track.stop();
      video.srcObject = null;
      landmarkerHandle?.landmarker.close();
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      setStatus("idle");
      setStats(INITIAL_STATS);
    };
  }, [enabled, facing, videoRef, canvasRef]);

  return { status, error, stats };
}
