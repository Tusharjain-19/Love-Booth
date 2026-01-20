import { cn } from "@/lib/utils";

export interface StripLayout {
  id: string;
  name: string;
  photoCount: number;
  aspectRatio: string;
  preview: React.ReactNode;
}

export const STRIP_LAYOUTS: StripLayout[] = [
  {
    id: "strip-3",
    name: "Classic 3",
    photoCount: 3,
    aspectRatio: "2x6",
    preview: (
      <div className="w-8 h-24 bg-foreground/30 rounded flex flex-col gap-1 p-1">
        <div className="flex-1 bg-foreground/50 rounded-sm" />
        <div className="flex-1 bg-foreground/50 rounded-sm" />
        <div className="flex-1 bg-foreground/50 rounded-sm" />
      </div>
    ),
  },
  {
    id: "strip-4",
    name: "Classic 4",
    photoCount: 4,
    aspectRatio: "2x6",
    preview: (
      <div className="w-8 h-24 bg-foreground/30 rounded flex flex-col gap-1 p-1">
        <div className="flex-1 bg-foreground/50 rounded-sm" />
        <div className="flex-1 bg-foreground/50 rounded-sm" />
        <div className="flex-1 bg-foreground/50 rounded-sm" />
        <div className="flex-1 bg-foreground/50 rounded-sm" />
      </div>
    ),
  },
  {
    id: "grid-4",
    name: "Grid 4",
    photoCount: 4,
    aspectRatio: "4x6",
    preview: (
      <div className="w-16 h-20 bg-foreground/30 rounded grid grid-cols-2 gap-1 p-1">
        <div className="bg-foreground/50 rounded-sm" />
        <div className="bg-foreground/50 rounded-sm" />
        <div className="bg-foreground/50 rounded-sm" />
        <div className="bg-foreground/50 rounded-sm" />
      </div>
    ),
  },
  {
    id: "wide-3",
    name: "Wide 3",
    photoCount: 3,
    aspectRatio: "4x6",
    preview: (
      <div className="w-20 h-16 bg-foreground/30 rounded flex flex-col gap-1 p-1">
        <div className="flex-1 bg-foreground/50 rounded-sm" />
        <div className="flex-1 bg-foreground/50 rounded-sm" />
        <div className="flex-1 bg-foreground/50 rounded-sm" />
      </div>
    ),
  },
];

interface StripLayoutSelectorProps {
  selectedLayout: StripLayout;
  onSelectLayout: (layout: StripLayout) => void;
}

export function StripLayoutSelector({
  selectedLayout,
  onSelectLayout,
}: StripLayoutSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {STRIP_LAYOUTS.map((layout) => (
        <button
          key={layout.id}
          onClick={() => onSelectLayout(layout)}
          className={cn(
            "flex flex-col items-center p-3 rounded-xl border-2 transition-all",
            selectedLayout.id === layout.id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          {layout.preview}
          <span className="text-xs mt-2 font-medium text-foreground">{layout.name}</span>
        </button>
      ))}
    </div>
  );
}
