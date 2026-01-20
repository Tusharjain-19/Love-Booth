/**
 * Camera Hook for WebView (Median.co) and Browser Compatibility
 * 
 * This hook handles camera permissions and stream management with:
 * - Proper permission flow triggered by user gesture
 * - WebView-specific constraints for Android compatibility
 * - Error handling for all permission states
 * - Automatic cleanup on unmount
 */

import { useState, useCallback, useRef, useEffect } from "react";

export type CameraPermissionState = 
  | "prompt"      // Not yet requested
  | "requesting"  // Currently requesting
  | "granted"     // Permission granted, stream active
  | "denied"      // User denied permission
  | "blocked"     // Permission permanently blocked
  | "unavailable" // Camera not available/supported
  | "error";      // Generic error state

interface UseCameraReturn {
  stream: MediaStream | null;
  permissionState: CameraPermissionState;
  errorMessage: string | null;
  requestCamera: () => Promise<boolean>;
  stopCamera: () => void;
  retryCamera: () => Promise<boolean>;
}

/**
 * Detects if running in a WebView environment (Median.co or similar)
 */
function isWebView(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  // Median.co WebView detection
  return (
    ua.includes("median") ||
    ua.includes("gonative") ||
    // Generic Android WebView detection
    (ua.includes("android") && ua.includes("wv")) ||
    // iOS WebView detection
    (ua.includes("iphone") && !ua.includes("safari"))
  );
}

/**
 * Checks if camera API is supported
 */
function isCameraSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

export function useCamera(): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<CameraPermissionState>("prompt");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Stops all camera tracks and cleans up the stream
   */
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    if (isMounted.current) {
      setStream(null);
      // Reset to prompt state so user can retry
      setPermissionState("prompt");
      setErrorMessage(null);
    }
  }, [stream]);

  /**
   * Request camera permission and start stream
   * MUST be called from a user gesture (click) for WebView compatibility
   */
  const requestCamera = useCallback(async (): Promise<boolean> => {
    // Check if camera is supported
    if (!isCameraSupported()) {
      if (isMounted.current) {
        setPermissionState("unavailable");
        setErrorMessage("Camera is not supported on this device or browser.");
      }
      return false;
    }

    if (isMounted.current) {
      setPermissionState("requesting");
      setErrorMessage(null);
    }

    try {
      // WebView-optimized constraints
      // Use simpler constraints for better WebView compatibility
      const constraints: MediaStreamConstraints = {
        video: isWebView()
          ? {
              // Simpler constraints for WebView
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : {
              // Full constraints for browsers
              facingMode: "user",
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
            },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (isMounted.current) {
        setStream(mediaStream);
        setPermissionState("granted");
        setErrorMessage(null);
      } else {
        // Component unmounted during request, cleanup stream
        mediaStream.getTracks().forEach((track) => track.stop());
      }

      return true;
    } catch (error) {
      if (!isMounted.current) return false;

      const err = error as DOMException;
      
      // Handle specific error types
      switch (err.name) {
        case "NotAllowedError":
          // User denied permission or it's blocked
          // Check if it's a permanent block (varies by browser)
          if (err.message.includes("denied") || err.message.includes("dismissed")) {
            setPermissionState("denied");
            setErrorMessage("Camera access denied. Please allow camera access to take photos.");
          } else {
            setPermissionState("blocked");
            setErrorMessage("Camera access is blocked. Please enable it in your device settings.");
          }
          break;

        case "NotFoundError":
          setPermissionState("unavailable");
          setErrorMessage("No camera found on this device.");
          break;

        case "NotReadableError":
        case "AbortError":
          // Camera is in use by another app or hardware error
          setPermissionState("error");
          setErrorMessage("Camera is in use by another app. Please close other apps and try again.");
          break;

        case "OverconstrainedError":
          // Try again with minimal constraints
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            if (isMounted.current) {
              setStream(fallbackStream);
              setPermissionState("granted");
              setErrorMessage(null);
            }
            return true;
          } catch {
            setPermissionState("error");
            setErrorMessage("Camera configuration error. Please try again.");
          }
          break;

        case "SecurityError":
          // HTTPS required or insecure context
          setPermissionState("error");
          setErrorMessage("Camera requires a secure connection (HTTPS).");
          break;

        default:
          setPermissionState("error");
          setErrorMessage("Unable to access camera. Please try again.");
      }

      return false;
    }
  }, []);

  /**
   * Retry camera access - can be called after an error
   */
  const retryCamera = useCallback(async (): Promise<boolean> => {
    // Stop any existing stream first
    stopCamera();
    // Small delay to ensure cleanup is complete
    await new Promise((resolve) => setTimeout(resolve, 100));
    return requestCamera();
  }, [stopCamera, requestCamera]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    permissionState,
    errorMessage,
    requestCamera,
    stopCamera,
    retryCamera,
  };
}
