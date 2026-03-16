import { motion, useScroll, useTransform } from "framer-motion";
import { Zap, Layers, Palette, Sparkles, Eye, ArrowRight, Link, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { lazy, Suspense, useRef, useState, useEffect } from "react";
import GenerativeBokeh from "@/components/landing/GenerativeBokeh";
import CursorThread from "@/components/landing/CursorThread";
import MorphingMuse from "@/components/landing/MorphingMuse";
import FabricPlayground from "@/components/landing/FabricPlayground";

const steps = [
  {
    icon: Link,
    title: "Add The Pieces",
    description: "Paste any product link — Amazon, Zara, Nike, H&M. We extract everything.",
  },
  {
    icon: Shirt,
    title: "Pick Your Fit",
    description: "Get AI-powered size recommendations with a confidence score.",
  },
  {
    icon: Eye,
    title: "See The Drip",
    description: "Virtual try-on, outfit builder, and style suggestions — all in one place.",
  },
];

const features = [
  { icon: Zap, label: "Smart Size Engine", desc: "AI-powered fit scoring & size recommendations" },
  { icon: Layers, label: "Outfit Builder", desc: "Layer tops, bottoms, outerwear & footwear" },
  { icon: Palette, label: "Multi-Color Preview", desc: "Switch between color variants instantly" },
  { icon: Sparkles, label: "AI Stylist", desc: "Get \"Complete The Fit\" suggestions" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const Index = () => {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: pageRef });
  const bokehProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={pageRef} className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {/* Generative Bokeh Background */}
      <BokehWrapper progress={bokehProgress} />

      {/* Cursor Thread */}
      <CursorThread />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <span className="font-display text-xl font-bold tracking-tight text-gradient">
            OUTFYT
          </span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => navigate("/auth")}>
              Log in
            </Button>
            <Button size="sm" className="glow-blue bg-primary hover:bg-primary/90 font-display transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_hsl(var(--neon-blue)/0.5)]" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Intro */}
      <section className="relative pt-32 pb-12 md:pt-44 md:pb-20">
        <div className="container relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block mb-6 px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase glass text-muted-foreground">
              AI-Powered Fashion
            </span>
          </motion.div>

          <motion.h1
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Build Your Drip
            <br />
            <span className="text-gradient glow-text">With AI.</span>
          </motion.h1>

          <motion.p
            className="max-w-lg mx-auto text-lg text-muted-foreground mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Paste any product link. Get smart size recommendations. Build full outfits. Try them on virtually.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            <Button
              size="lg"
              className="glow-blue bg-primary hover:bg-primary/90 font-display text-base px-8 h-12 gap-2 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_hsl(var(--neon-blue)/0.5)]"
              onClick={() => navigate("/auth")}
            >
              Start Building <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg" className="font-display text-base px-8 h-12 border-border/50 hover:bg-surface-hover transition-all duration-300">
              See How It Works
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Morphing Muse - Scroll-based outfit transitions */}
      <MorphingMuse />

      {/* 3-Step Flow */}
      <section className="py-24 relative z-10">
        <div className="container">
          <motion.h2
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            Three Steps to Your Perfect Fit
          </motion.h2>
          <motion.p
            className="text-muted-foreground text-center mb-16 max-w-md mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={1}
          >
            From link to full outfit in minutes.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                className="glass-hover rounded-2xl p-8 text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i + 2}
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Step {i + 1}
                </span>
                <h3 className="font-display text-xl font-semibold mt-2 mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fabric Playground + Features */}
      <section className="py-24 relative z-10">
        <div className="container">
          <motion.h2
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            Feel the <span className="text-gradient">Digital Fabric</span>
          </motion.h2>
          <motion.p
            className="text-muted-foreground text-center mb-16 max-w-md mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={1}
          >
            Our real-time physics engine brings clothing to life.
          </motion.p>

          <div className="flex flex-col lg:flex-row items-center gap-12 max-w-5xl mx-auto">
            <div className="flex-shrink-0">
              <FabricPlayground />
            </div>

            <div className="grid sm:grid-cols-2 gap-5 flex-1">
              {features.map((f, i) => (
                <motion.div
                  key={f.label}
                  className="glass-hover rounded-xl p-6"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  custom={i}
                >
                  <f.icon className="w-5 h-5 text-primary mb-3" />
                  <h3 className="font-display font-semibold mb-1">{f.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative z-10">
        <div className="container">
          <motion.div
            className="max-w-2xl mx-auto text-center glass rounded-3xl p-12 md:p-16 relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 relative z-10">
              Ready to Build Your Drip?
            </h2>
            <p className="text-muted-foreground mb-8 relative z-10">
              Join the future of fashion. No more guessing sizes. No more returns.
            </p>
            <Button
              size="lg"
              className="glow-blue bg-primary hover:bg-primary/90 font-display text-base px-10 h-12 gap-2 relative z-10 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_hsl(var(--neon-blue)/0.5)]"
              onClick={() => navigate("/auth")}
            >
              Get Started Free <Sparkles className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 relative z-10">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-sm font-bold text-gradient">OUTFYT</span>
          <p className="text-xs text-muted-foreground">© 2026 OUTFYT. Build Your Drip.</p>
        </div>
      </footer>
    </div>
  );
};


const BokehWrapper = ({ progress }: { progress: ReturnType<typeof useTransform> }) => {
  const [val, setVal] = useState(0);

  useEff(() => {
    return progress.on("change", (v: number) => setVal(v));
  }, [progress]);

  return <GenerativeBokeh scrollProgress={val} />;
};

export default Index;
