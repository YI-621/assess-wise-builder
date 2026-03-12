import { FileSearch, Clock, Sparkles } from "lucide-react";

export function PendingModerationScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Animated icon cluster */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <FileSearch className="h-10 w-10 text-primary" />
        </div>
        {/* Orbiting sparkles */}
        <div className="absolute -top-2 -right-2 animate-bounce" style={{ animationDelay: "0s", animationDuration: "2s" }}>
          <Sparkles className="h-5 w-5 text-warning" />
        </div>
        <div className="absolute -bottom-1 -left-3 animate-bounce" style={{ animationDelay: "0.7s", animationDuration: "2.5s" }}>
          <Sparkles className="h-4 w-4 text-primary/60" />
        </div>
        <div className="absolute top-0 -left-5 animate-bounce" style={{ animationDelay: "1.3s", animationDuration: "2.2s" }}>
          <Clock className="h-4 w-4 text-info" />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-foreground mb-2">Waiting for Moderation</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        Your assessment is being reviewed by the system. This might take a moment — hang tight! ✨
      </p>

      {/* Progress dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce"
            style={{ animationDelay: `${i * 0.2}s`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  );
}
