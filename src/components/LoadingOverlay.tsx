import { motion } from "framer-motion";

const LoadingOverlay = () => (
  <motion.div
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6 }}
  >
    <div className="mb-8 h-px w-64 overflow-hidden bg-border">
      <div
        className="h-full w-1/2 animate-shimmer bg-primary"
      />
    </div>

    <p className="eyebrow">Creating your try-on</p>
    <p className="mt-3 max-w-xs text-center text-sm text-muted-foreground">This uses the real AI request and may take a moment.</p>
  </motion.div>
);

export default LoadingOverlay;
