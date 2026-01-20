/**
 * Image Download Hook for WebView (Median.co) and Browser Compatibility
 * 
 * This hook handles image downloads with:
 * - Canvas to Blob conversion for reliable downloads
 * - Proper memory cleanup (revoking object URLs)
 * - WebView-specific handling for Android
 * - User-gesture triggered downloads only
 */

import { useCallback, useRef } from "react";

interface UseImageDownloadReturn {
  downloadImage: (dataUrl: string, filename: string) => Promise<boolean>;
  isDownloading: boolean;
}

/**
 * Detects if running in Median.co WebView
 */
function isMedianWebView(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("median") || ua.includes("gonative");
}

/**
 * Converts a data URL to a Blob for more reliable downloads
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export function useImageDownload(): UseImageDownloadReturn {
  const isDownloadingRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);

  /**
   * Clean up any existing object URL to prevent memory leaks
   */
  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  /**
   * Download image - MUST be called from a user gesture (click)
   * This is required for both browser and WebView compatibility
   */
  const downloadImage = useCallback(
    async (dataUrl: string, filename: string): Promise<boolean> => {
      if (isDownloadingRef.current) {
        return false;
      }

      isDownloadingRef.current = true;

      try {
        // Clean up any previous object URL
        cleanupObjectUrl();

        // Convert data URL to Blob for more reliable downloads
        // This works better in WebViews and handles large images
        const blob = dataUrlToBlob(dataUrl);

        // Create object URL from blob
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;

        // Create anchor element for download
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;

        // For Median WebView, we need to handle downloads differently
        if (isMedianWebView()) {
          // Median WebView: Use the standard approach but ensure
          // the download attribute is set properly
          link.setAttribute("download", filename);
          link.setAttribute("target", "_blank");
          
          // Some WebViews need the link to be in the DOM
          link.style.display = "none";
          document.body.appendChild(link);
          
          // Trigger click
          link.click();
          
          // Remove from DOM after a short delay
          setTimeout(() => {
            document.body.removeChild(link);
            cleanupObjectUrl();
          }, 100);
        } else {
          // Standard browser download
          link.click();
          
          // Clean up object URL after download starts
          // Use a timeout to ensure download has started
          setTimeout(() => {
            cleanupObjectUrl();
          }, 1000);
        }

        return true;
      } catch (error) {
        console.error("Download failed:", error);
        cleanupObjectUrl();
        return false;
      } finally {
        isDownloadingRef.current = false;
      }
    },
    [cleanupObjectUrl]
  );

  return {
    downloadImage,
    isDownloading: isDownloadingRef.current,
  };
}
