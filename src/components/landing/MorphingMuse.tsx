import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const outfits = [
  {
    src: "https://images.unsplash.com/photo-1608234808654-2a8875faa7fd?w=600&h=900&fit=crop",
    label: "Structured Wool",
    hue: "warm",
  },
  {
    src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=900&fit=crop",
    label: "Silk Elegance",
    hue: "cool",
  },
  {
    src: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=900&fit=crop",
    label: "Neon Streetwear",
    hue: "neon",
  },
  {
    src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=900&fit=crop",
    label: "Gossamer Flow",
    hue: "ethereal",
  },
];

const MorphingMuse = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Map scroll to outfit index
  const activeIndex = useTransform(scrollYProgress, [0, 1], [0, outfits.length - 0.01]);

  return (
    <div ref={containerRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Outfit images with crossfade */}
        <div className="relative w-[320px] h-[480px] md:w-[400px] md:h-[600px] lg:w-[440px] lg:h-[660px]">
          {outfits.map((outfit, i) => (
            <MorphImage
              key={i}
              src={outfit.src}
              label={outfit.label}
              index={i}
              activeIndex={activeIndex}
            />
          ))}

          {/* Overlay shimmer */}
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background:
                "linear-gradient(180deg, transparent 60%, hsl(var(--background)) 100%)",
            }}
          />
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xs text-muted-foreground tracking-widest uppercase font-medium">
            Scroll to morph
          </span>
          <motion.div
            className="w-px h-8 bg-gradient-to-b from-primary/60 to-transparent"
            animate={{ scaleY: [1, 1.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </div>
  );
};

const MorphImage = ({
  src,
  label,
  index,
  activeIndex,
}: {
  src: string;
  label: string;
  index: number;
  activeIndex: ReturnType<typeof useTransform>;
}) => {
  const opacity = useTransform(activeIndex, (v: number) => {
    const dist = Math.abs(v - index);
    return Math.max(0, 1 - dist * 1.8);
  });

  const scale = useTransform(activeIndex, (v: number) => {
    const dist = Math.abs(v - index);
    return 1 + Math.max(0, 0.05 - dist * 0.05);
  });

  const labelOpacity = useTransform(activeIndex, (v: number) => {
    const dist = Math.abs(v - index);
    return dist < 0.4 ? 1 : 0;
  });

  return (
    <motion.div className="absolute inset-0" style={{ opacity }}>
      <motion.img
        src={src}
        alt={label}
        className="w-full h-full object-cover rounded-2xl"
        style={{ scale }}
        loading={index === 0 ? "eager" : "lazy"}
      />
      <motion.div
        className="absolute top-6 left-1/2 -translate-x-1/2"
        style={{ opacity: labelOpacity }}
      >
        <span className="px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase glass text-foreground">
          {label}
        </span>
      </motion.div>
    </motion.div>
  );
};

export default MorphingMuse;
