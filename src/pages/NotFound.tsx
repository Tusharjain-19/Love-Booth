import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background pt-safe pb-safe pl-safe pr-safe">
      <div className="p-4 flex flex-col items-center text-center">
        <Heart className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-6">Page not found</p>
        <Button asChild>
          <Link to="/">Back to Love Booth</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
