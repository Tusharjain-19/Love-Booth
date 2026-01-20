/**
 * CaptureMode Component
 * 
 * Handles photo capture with:
 * - WebView (Median.co) compatible camera access
 * - Proper permission handling with user feedback
 * - Retry logic for denied/blocked permissions
 * - Memory-safe image processing
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, ArrowLeft, Timer, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { StripLayoutSelector, StripLayout, STRIP_LAYOUTS } from "@/components/StripLayoutSelector";
import { cn } from "@/lib/utils";
import { useCamera, CameraPermissionState } from "@/hooks/useCamera";
import appBackground from "@/assets/app-background.png";

interface CaptureModeProps {
  onPhotosReady: (photos: string[], layout: string) => void;
  onBack: () => void;
}

type Mode = "choose" | "upload" | "camera";
type TimerOption = 3 | 5 | 10;

export function CaptureMode({ onPhotosReady, onBack }: CaptureModeProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const [selectedLayout, setSelectedLayout] = useState<StripLayout>(STRIP_LAYOUTS[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerDuration, setTimerDuration] = useState<TimerOption>(3);
  const [cameraReady, setCameraReady] = useState(false);
  
  // Use the camera hook for WebView-compatible camera access
  const { 
    stream, 
    permissionState, 
    errorMessage, 
    requestCamera, 
    stopCamera: stopCameraHook,
    retryCamera 
  } = useCamera();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track object URLs for cleanup to prevent memory leaks
  const objectUrlsRef = useRef<string[]>([]);

  const requiredPhotos = selectedLayout.photoCount;

  /**
   * Attach stream to video element when both are ready
   * WebView-safe: Uses onloadedmetadata for reliable detection
   */
  useEffect(() => {
    if (stream && videoRef.current && mode === "camera") {
      const video = videoRef.current;
      video.srcObject = stream;
      
      // WebView compatibility: Use onloadedmetadata instead of onloadeddata
      video.onloadedmetadata = () => {
        setCameraReady(true);
        // Ensure video plays (required for some WebViews)
        video.play().catch(() => {
          // Autoplay may be blocked, but video should still work on interaction
        });
      };

      // Handle stream ending unexpectedly (e.g., permission revoked)
      const tracks = stream.getTracks();
      tracks.forEach((track) => {
        track.onended = () => {
          if (mode === "camera") {
            toast.error("Camera was disconnected. Please try again.");
            stopCamera();
          }
        };
      });
    }
  }, [stream, mode]);

  /**
   * Cleanup function for camera and object URLs
   */
  const stopCamera = useCallback(() => {
    stopCameraHook();
    setCameraReady(false);
    setMode("choose");
    setPhotos([]);
    
    // Clean up any object URLs to prevent memory leaks
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, [stopCameraHook]);

  /**
   * Start camera with user gesture (click)
   * This is REQUIRED for WebView permission to work properly
   */
  const startCamera = async () => {
    const success = await requestCamera();
    if (success) {
      setMode("camera");
    } else {
      // Error message is handled by the hook, show toast
      toast.error(errorMessage || "Unable to access camera.");
    }
  };

  /**
   * Retry camera after permission error
   */
  const handleRetryCamera = async () => {
    const success = await retryCamera();
    if (success) {
      setMode("camera");
    }
  };

  const startCountdown = () => {
    if (countdown !== null) return;
    
    setCountdown(timerDuration);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(interval);
          capturePhoto();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (ctx && video.videoWidth > 0) {
      // High quality capture
      canvas.width = 1000;
      canvas.height = 1000;
      
      const size = Math.min(video.videoWidth, video.videoHeight);
      const x = (video.videoWidth - size) / 2;
      const y = (video.videoHeight - size) / 2;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(video, x, y, size, size, 0, 0, 1000, 1000);
      
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      
      setPhotos(prev => {
        const newPhotos = [...prev, dataUrl];
        toast.success(`Photo ${newPhotos.length}/${requiredPhotos} captured!`);
        return newPhotos;
      });
    }
  };

  const deletePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    toast.success("Photo deleted. Take another!");
  };

  const handleDone = () => {
    if (photos.length === requiredPhotos) {
      stopCamera();
      onPhotosReady(photos, selectedLayout.id);
    }
  };

  /**
   * Handle file upload with proper memory management
   * Cleans up object URLs after use to prevent memory leaks
   */
  /**
   * Handle file upload with proper memory management
   * Supports mobile gallery (including HEIC) and various image formats
   * Uses FileReader for better WebView/mobile compatibility
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) {
      return; // User cancelled
    }
    
    if (files.length !== requiredPhotos) {
      toast.error(`Please select exactly ${requiredPhotos} photos`);
      // Reset input to allow re-selection
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Accept common image MIME types including those from mobile galleries
    const validFiles = files.filter(f => 
      f.type.startsWith("image/") || 
      // Some mobile galleries don't set proper MIME types
      /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/i.test(f.name)
    );
    
    if (validFiles.length !== files.length) {
      toast.error("Please select only image files");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    toast.info("Processing images...");

    // Process images using FileReader for better mobile compatibility
    Promise.all(
      validFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          
          reader.onload = (readerEvent) => {
            const dataUrl = readerEvent.target?.result as string;
            if (!dataUrl) {
              resolve("");
              return;
            }
            
            const img = new Image();
            
            img.onload = () => {
              try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                  // Fallback: use original if canvas fails
                  resolve(dataUrl);
                  return;
                }

                canvas.width = 1000;
                canvas.height = 1000;
                
                const size = Math.min(img.width, img.height);
                const x = (img.width - size) / 2;
                const y = (img.height - size) / 2;
                
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, x, y, size, size, 0, 0, 1000, 1000);
                
                resolve(canvas.toDataURL("image/png", 1.0));
              } catch {
                // Fallback: use original dataUrl if processing fails
                resolve(dataUrl);
              }
            };
            
            img.onerror = () => {
              console.error("Failed to load image:", file.name);
              resolve("");
            };
            
            img.src = dataUrl;
          };
          
          reader.onerror = () => {
            console.error("Failed to read file:", file.name);
            resolve("");
          };
          
          // Read as data URL for maximum compatibility
          reader.readAsDataURL(file);
        });
      })
    ).then(processedPhotos => {
      // Reset input for future uploads
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Filter out any empty strings from failed loads
      const validPhotos = processedPhotos.filter(p => p !== "");
      if (validPhotos.length === requiredPhotos) {
        onPhotosReady(validPhotos, selectedLayout.id);
        toast.success("Photos uploaded successfully!");
      } else {
        toast.error(`Only ${validPhotos.length} of ${requiredPhotos} photos loaded. Please try again.`);
      }
    });
  };

  /**
   * Get camera status message based on permission state
   */
  const getCameraStatusMessage = (): string => {
    switch (permissionState) {
      case "requesting":
        return "Requesting camera access...";
      case "denied":
        return "Camera access denied";
      case "blocked":
        return "Camera access blocked";
      case "unavailable":
        return "Camera not available";
      case "error":
        return errorMessage || "Camera error";
      default:
        return "Loading camera...";
    }
  };

  // Camera Mode
  if (mode === "camera") {
    return (
      <div 
        className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url(${appBackground})` }}
      >
        {/* Fade overlay */}
        <div className="absolute inset-0 bg-background/85" />
        <header className="p-4 flex items-center justify-between relative z-10">
          <Button variant="ghost" onClick={stopCamera}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <span className="text-sm font-medium text-foreground">
            {photos.length}/{requiredPhotos} photos
          </span>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative z-10">
          {/* Timer Options */}
          <div className="flex gap-2 mb-2">
            {([3, 5, 10] as TimerOption[]).map((t) => (
              <Button
                key={t}
                variant={timerDuration === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTimerDuration(t)}
                className="rounded-full"
              >
                {t}s
              </Button>
            ))}
          </div>

          {/* Camera Preview */}
          <div className="relative w-full max-w-md aspect-square bg-muted rounded-2xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Camera loading/error state - shows permission status */}
            {(!cameraReady || permissionState === "denied" || permissionState === "blocked" || permissionState === "error") && (
              <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center gap-3 p-4">
                <span className="text-muted-foreground text-center text-sm">
                  {getCameraStatusMessage()}
                </span>
                {/* Show retry button for recoverable errors */}
                {(permissionState === "denied" || permissionState === "error") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryCamera}
                    className="rounded-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
              </div>
            )}
            
            {countdown !== null && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <span className="text-8xl font-bold text-primary animate-pulse">{countdown}</span>
              </div>
            )}
          </div>

          {/* Photo Thumbnails with Delete */}
          <div className="flex gap-3 justify-center flex-wrap">
            {Array.from({ length: requiredPhotos }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "relative w-16 h-16 rounded-lg border-2 overflow-hidden",
                  photos[i] ? "border-primary" : "border-muted-foreground/30 bg-muted"
                )}
              >
                {photos[i] ? (
                  <>
                    <img src={photos[i]} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => deletePhoto(i)}
                      className="absolute inset-0 bg-destructive/80 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-5 h-5 text-destructive-foreground" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">{i + 1}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-2">
            {photos.length < requiredPhotos ? (
              <Button
                onClick={startCountdown}
                disabled={countdown !== null || !cameraReady}
                size="lg"
                className="rounded-full px-8"
              >
                <Timer className="w-5 h-5 mr-2" />
                Take Photo ({photos.length + 1}/{requiredPhotos})
              </Button>
            ) : (
              <Button
                onClick={handleDone}
                size="lg"
                className="rounded-full px-8"
              >
                Continue to Preview
              </Button>
            )}
          </div>
        </main>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Choose Mode (Default)
  return (
    <div 
      className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${appBackground})` }}
    >
      {/* Fade overlay */}
      <div className="absolute inset-0 bg-background/85" />
      <header className="p-4 relative z-10">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-display font-bold text-center mb-2">
            Choose Layout
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            Select a strip pattern for your photos
          </p>

          <StripLayoutSelector
            selectedLayout={selectedLayout}
            onSelectLayout={setSelectedLayout}
          />

          <div className="mt-8 space-y-3">
            <Button
              onClick={startCamera}
              size="lg"
              className="w-full rounded-xl"
            >
              <Camera className="w-5 h-5 mr-2" />
              Use Camera ({requiredPhotos} photos)
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="lg"
              className="w-full rounded-xl"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload {requiredPhotos} Photos
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </main>
    </div>
  );
}
