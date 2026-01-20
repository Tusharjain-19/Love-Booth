/**
 * PhotoStripPreview Component
 * 
 * Handles photo strip preview and download with:
 * - Canvas to Blob conversion for reliable downloads
 * - WebView (Median.co) compatible download handling
 * - Memory-safe object URL management
 * - User-gesture triggered downloads only
 */
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, RotateCcw, Palette, MessageSquare, CheckCircle2, ExternalLink, Printer, Bluetooth, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useImageDownload } from "@/hooks/useImageDownload";
import type { BluetoothDevice } from "@/types/bluetooth.d";
interface PhotoStripPreviewProps {
  photos: string[];
  layout: string;
  onBack: () => void;
  onStartOver: () => void;
}

type ColorMode = "color" | "bw";

export function PhotoStripPreview({
  photos,
  layout,
  onBack,
  onStartOver,
}: PhotoStripPreviewProps) {
  const [colorMode, setColorMode] = useState<ColorMode>("color");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // Use the download hook for WebView-compatible downloads
  const { downloadImage } = useImageDownload();

  const isGrayscale = colorMode === "bw";

  /**
   * Generate high quality strip image using Canvas
   * Returns a data URL that can be converted to Blob for download
   */
  const generateHighQualityStrip = useCallback(async (): Promise<string> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    // High resolution settings (8K quality)
    const scale = 4; // 4x scale for ultra HD
    const padding = 40 * scale;
    const photoGap = 20 * scale;

    let canvasWidth: number;
    let canvasHeight: number;
    let photoWidth: number;
    let photoHeight: number;

    // Calculate dimensions based on layout
    if (layout === "strip-3" || layout === "strip-4") {
      // Vertical strip (2x6 inches at 300 DPI = 600x1800)
      photoWidth = 600 * scale;
      photoHeight = 600 * scale;
      canvasWidth = photoWidth + padding * 2;
      canvasHeight = padding * 2 + photos.length * photoHeight + (photos.length - 1) * photoGap;
    } else if (layout === "grid-4") {
      // Grid layout (4x6 inches)
      photoWidth = 450 * scale;
      photoHeight = 450 * scale;
      canvasWidth = padding * 2 + 2 * photoWidth + photoGap;
      canvasHeight = padding * 2 + 2 * photoHeight + photoGap;
    } else {
      // Wide layout (4x6 inches)
      photoWidth = 800 * scale;
      photoHeight = 300 * scale;
      canvasWidth = photoWidth + padding * 2;
      canvasHeight = padding * 2 + photos.length * photoHeight + (photos.length - 1) * photoGap;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Load all images with error handling
    const loadedImages = await Promise.all(
      photos.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            // Required for canvas operations with data URLs
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = src;
          })
      )
    );

    // Draw images with high quality settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    loadedImages.forEach((img, index) => {
      let x: number, y: number, w: number, h: number;

      if (layout === "strip-3" || layout === "strip-4") {
        x = padding;
        y = padding + index * (photoHeight + photoGap);
        w = photoWidth;
        h = photoHeight;
      } else if (layout === "grid-4") {
        const col = index % 2;
        const row = Math.floor(index / 2);
        x = padding + col * (photoWidth + photoGap);
        y = padding + row * (photoHeight + photoGap);
        w = photoWidth;
        h = photoHeight;
      } else {
        x = padding;
        y = padding + index * (photoHeight + photoGap);
        w = photoWidth;
        h = photoHeight;
      }

      ctx.drawImage(img, x, y, w, h);
    });

    // Apply grayscale filter if needed
    if (isGrayscale) {
      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // Add watermark
    ctx.fillStyle = isGrayscale ? "#666666" : "#e91e63";
    ctx.font = `${20 * scale}px 'Inter', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Love Booth", canvasWidth / 2, canvasHeight - padding / 2);

    // Return as PNG data URL with maximum quality
    return canvas.toDataURL("image/png", 1.0);
  }, [photos, layout, isGrayscale]);

  /**
   * Handle download - MUST be called from user gesture (click)
   * Uses Blob-based download for WebView compatibility
   */
  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      // Generate the high quality image
      const dataUrl = await generateHighQualityStrip();

      // Generate filename with timestamp for uniqueness
      const filename = `love-booth-${Date.now()}.png`;

      // Use the download hook for WebView-compatible download
      const success = await downloadImage(dataUrl, filename);

      if (success) {
        // Show success toast with "View in Gallery" hint
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Photo downloaded! View in Gallery</span>
          </div>,
          { duration: 4000 }
        );
      } else {
        toast.error("Download failed. Please try again.");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to generate image. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Check if Web Bluetooth is supported
   */
  const isBluetoothSupported = () => {
    return 'bluetooth' in navigator;
  };

  /**
   * Scan for nearby Bluetooth printers and connect
   */
  const handleScanBluetooth = async () => {
    if (!isBluetoothSupported()) {
      toast.error("Bluetooth not supported. Use Chrome or Edge browser.");
      return;
    }

    setIsScanning(true);
    try {
      // Request Bluetooth device - filter for common printer services
      const nav = navigator as Navigator & { bluetooth: any };
      const device = await nav.bluetooth.requestDevice({
        // Accept all devices to find printers
        acceptAllDevices: true,
        optionalServices: [
          // Common printer service UUIDs
          '000018f0-0000-1000-8000-00805f9b34fb', // Generic printer
          '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Thermal printer
        ]
      });

      if (device) {
        setConnectedDevice(device);
        toast.success(`Connected to ${device.name || 'Bluetooth Device'}`);

        // Auto-print after connection
        await handleBluetoothPrint(device);
      }
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        toast.info("No device selected");
      } else {
        console.error("Bluetooth error:", error);
        toast.error("Failed to connect. Make sure Bluetooth is enabled.");
      }
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Print via connected Bluetooth device
   */
  const handleBluetoothPrint = async (device: BluetoothDevice) => {
    setIsPrinting(true);
    try {
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error("Could not connect to device");
      }

      // Generate the image
      const dataUrl = await generateHighQualityStrip();

      // Convert to binary for printing
      const base64 = dataUrl.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Try to find a writable characteristic
      const services = await server.getPrimaryServices();
      let printed = false;

      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              // Send data in chunks (most BLE has 512 byte limit)
              const chunkSize = 512;
              for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.slice(i, i + chunkSize);
                await char.writeValue(chunk);
              }
              printed = true;
              break;
            }
          }
          if (printed) break;
        } catch (e) {
          continue;
        }
      }

      if (printed) {
        toast.success("Sent to printer!");
      } else {
        // Fallback to system print dialog
        toast.info("Direct print not supported. Opening print dialog...");
        await handleSystemPrint();
      }

      server.disconnect();
    } catch (error) {
      console.error("Bluetooth print error:", error);
      toast.info("Opening system print dialog instead...");
      await handleSystemPrint();
    } finally {
      setIsPrinting(false);
    }
  };

  /**
   * Fallback to system print dialog
   */
  const handleSystemPrint = async () => {
    try {
      const dataUrl = await generateHighQualityStrip();

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Please allow popups to print");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Photo Strip</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh;
                background: white;
              }
              img { 
                max-width: 100%; 
                max-height: 100vh; 
                object-fit: contain;
              }
              @media print {
                body { margin: 0; }
                img { 
                  width: 100%; 
                  height: auto; 
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="Photo Strip" onload="window.print(); window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to print. Please try again.");
    }
  };

  /**
   * Handle print button - scan if no device, otherwise print
   */
  const handlePrint = async () => {
    if (isPrinting || isScanning) return;

    if (connectedDevice && connectedDevice.gatt?.connected) {
      await handleBluetoothPrint(connectedDevice);
    } else {
      await handleScanBluetooth();
    }
  };

  /**
   * Open feedback form/email
   */
  const handleFeedback = () => {
    // Opens email client for feedback
    window.open("mailto:feedback.lumina@gmail.com?subject=Love%20Booth%20Feedback", "_blank");
  };

  const renderStrip = () => {
    const photoClass = cn(
      "w-full object-cover",
      isGrayscale && "grayscale-filter"
    );

    if (layout === "strip-3" || layout === "strip-4") {
      return (
        <div className="photo-strip p-3 rounded-lg w-32 mx-auto" ref={stripRef}>
          <div className="flex flex-col gap-2">
            {photos.map((photo, i) => (
              <img
                key={i}
                src={photo}
                alt={`Photo ${i + 1}`}
                className={cn(photoClass, "aspect-square rounded")}
              />
            ))}
          </div>
          <div className="block text-center text-[10px] text-muted-foreground mt-2">
            Love Booth
          </div>
        </div>
      );
    }

    if (layout === "grid-4") {
      return (
        <div className="photo-strip p-3 rounded-lg w-56 mx-auto" ref={stripRef}>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo, i) => (
              <img
                key={i}
                src={photo}
                alt={`Photo ${i + 1}`}
                className={cn(photoClass, "aspect-square rounded")}
              />
            ))}
          </div>
          <div className="block text-center text-[10px] text-muted-foreground mt-2">
            Love Booth
          </div>
        </div>
      );
    }

    // wide-3
    return (
      <div className="photo-strip p-3 rounded-lg w-64 mx-auto" ref={stripRef}>
        <div className="flex flex-col gap-2">
          {photos.map((photo, i) => (
            <img
              key={i}
              src={photo}
              alt={`Photo ${i + 1}`}
              className={cn(photoClass, "aspect-[16/6] rounded")}
            />
          ))}
        </div>
        <div className="block text-center text-[10px] text-muted-foreground mt-2">
          Love Booth
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <Button variant="ghost" onClick={onStartOver}>
          <RotateCcw className="w-5 h-5 mr-2" />
          Start Over
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-display font-bold mb-6">Your Photo Strip</h2>

        {/* Color Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={colorMode === "color" ? "default" : "outline"}
            size="sm"
            onClick={() => setColorMode("color")}
            className="rounded-full"
          >
            <Palette className="w-4 h-4 mr-2" />
            Color
          </Button>
          <Button
            variant={colorMode === "bw" ? "default" : "outline"}
            size="sm"
            onClick={() => setColorMode("bw")}
            className="rounded-full"
          >
            B&W
          </Button>
        </div>

        {/* Preview */}
        <div className="mb-8">{renderStrip()}</div>

        {/* Download & Print Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            size="sm"
            className="rounded-full px-4 text-xs"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isDownloading ? "Saving..." : "Download"}
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isPrinting || isScanning}
            size="sm"
            variant="outline"
            className="rounded-full px-4 text-xs"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Bluetooth className="w-4 h-4 mr-1.5" />
            )}
            {isScanning ? "Scanning..." : isPrinting ? "Printing..." : "Print"}
          </Button>
        </div>

        {connectedDevice && (
          <p className="text-xs text-primary mt-2">
            Connected: {connectedDevice.name || "Bluetooth Device"}
          </p>
        )}

        <p className="text-sm text-muted-foreground mt-4">
          High quality PNG • Print-ready
        </p>



        {/* Action buttons after download */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={onStartOver}
            className="rounded-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>

        {/* Feedback Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFeedback}
          className="mt-6 text-muted-foreground"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Send Feedback
        </Button>
      </main>
    </div>
  );
}
