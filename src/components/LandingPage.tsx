import { Button } from "@/components/ui/button";
import { Heart, Camera } from "lucide-react";
import iconCamera from "@/assets/icon-camera.png";
import iconSecure from "@/assets/icon-secure.png";
import iconDownload from "@/assets/icon-download.png";
import appBackground from "@/assets/app-background.png";
import loveboothLogo from "@/assets/lovebooth-logo.png";

interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div
      className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat relative pt-safe pb-safe pl-safe pr-safe"
      style={{ backgroundImage: `url(${appBackground})` }}
    >
      {/* Fade overlay */}
      <div className="absolute inset-0 bg-background/85" />
      {/* Header */}
      <header className="p-6 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <img src={loveboothLogo} alt="Love Booth" className="h-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20 relative z-10">
        <div className="text-center max-w-md">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Turn moments into photo strips.
          </h1>

          <Button
            onClick={onStart}
            size="lg"
            className="text-lg px-8 py-6 rounded-full"
          >
            <Camera className="w-5 h-5 mr-2" />
            Make a Photo Strip
          </Button>

          {/* Features */}
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center">
              <img src={iconCamera} alt="Camera" className="w-10 h-10 mb-2" />
              <p className="text-sm text-muted-foreground">Upload or Camera</p>
            </div>
            <div className="flex flex-col items-center">
              <img src={iconSecure} alt="Secure" className="w-10 h-10 mb-2" />
              <p className="text-sm text-muted-foreground">Secure & Private</p>
            </div>
            <div className="flex flex-col items-center">
              <img
                src={iconDownload}
                alt="Download"
                className="w-10 h-10 mb-2"
              />
              <p className="text-sm text-muted-foreground">HD Download</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center space-y-2 relative z-10">
        <p className="text-sm text-muted-foreground">Made by Love Booth</p>
        <p className="text-xs text-muted-foreground">
          <a
            href="https://lovebooth-sigma.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            lovebooth-sigma.vercel.app
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Love Booth. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground">
          For feedback, mail to{" "}
          <a
            href="mailto:feedback.lumina@gmail.com"
            className="text-primary hover:underline"
          >
            feedback.lumina@gmail.com
          </a>
        </p>
      </footer>
    </div>
  );
}
