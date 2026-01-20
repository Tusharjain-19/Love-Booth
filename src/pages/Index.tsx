import { useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import { CaptureMode } from "@/components/CaptureMode";
import { PhotoStripPreview } from "@/components/PhotoStripPreview";

type AppState = "landing" | "capture" | "preview";

export default function Index() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<string>("strip-3");

  const handleStart = () => {
    setAppState("capture");
  };

  const handlePhotosReady = (capturedPhotos: string[], layout: string) => {
    setPhotos(capturedPhotos);
    setSelectedLayout(layout);
    setAppState("preview");
  };

  const handleBack = () => {
    setAppState("landing");
    setPhotos([]);
  };

  const handleBackToCapture = () => {
    setAppState("capture");
  };

  if (appState === "capture") {
    return (
      <CaptureMode
        onPhotosReady={handlePhotosReady}
        onBack={handleBack}
      />
    );
  }

  if (appState === "preview") {
    return (
      <PhotoStripPreview
        photos={photos}
        layout={selectedLayout}
        onBack={handleBackToCapture}
        onStartOver={handleBack}
      />
    );
  }

  return <LandingPage onStart={handleStart} />;
}
