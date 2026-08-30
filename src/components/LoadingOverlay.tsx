import { motion } from "framer-motion";

const LoadingOverlay = () => (
  <motion.div
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6 }}
  >
    {/* Shimmer bar */}
    <div className="w-64 h-1 rounded-full bg-muted overflow-hidden mb-8">
      <div
        className="h-full w-1/2 rounded-full animate-shimmer"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(var(--neon-blue) / 0.6), transparent)",
          backgroundSize: "200% 100%",
        }}
      />
    </div>

    <p className="font-display text-lg text-muted-foreground tracking-wide">
      Web-slinging your look with AI
      <span className="inline-flex ml-1">
        <span className="animate-pulse" style={{ animationDelay: "0s" }}>.</span>
        <span className="animate-pulse" style={{ animationDelay: "0.3s" }}>.</span>
        <span className="animate-pulse" style={{ animationDelay: "0.6s" }}>.</span>
      </span>
    </p>
  </motion.div>
);

export default LoadingOverlay;
