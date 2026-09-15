import { motion } from "framer-motion";
import { ArrowRight, Check, ImagePlus, Layers3, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EditorialNav from "@/components/EditorialNav";
import editorialHero from "@/assets/outfyt-editorial-hero.jpg.asset.json";

const workflow = [
  { number: "01", icon: ImagePlus, title: "Upload your photo", copy: "Choose a clear, full-body photo. Your image stays private and is used only for your try-on." },
  { number: "02", icon: Layers3, title: "Select an outfit", copy: "Build a look from products saved to your closet, then choose the size and available styling options." },
  { number: "03", icon: Sparkles, title: "Generate your preview", copy: "Run the real AI try-on, compare before and after, then save the result to your closet." },
];

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: (index: number) => ({ opacity: 1, y: 0, transition: { delay: index * 0.1, duration: 0.5, ease: "easeOut" as const } }),
};

const BrandNewDay = () => (
  <main className="editorial-page overflow-hidden">
    <EditorialNav />

    <section className="container grid min-h-[calc(100svh-4rem)] grid-cols-1 items-center gap-8 px-4 py-8 sm:px-8 md:grid-cols-12 md:py-12">
      <div className="relative z-10 md:col-span-7 md:pr-8">
        <motion.p custom={0} initial="hidden" animate="visible" variants={reveal} className="eyebrow mb-6">AI virtual try-on studio</motion.p>
        <motion.h1 custom={1} initial="hidden" animate="visible" variants={reveal} className="max-w-[9ch] text-5xl font-normal leading-[0.98] sm:text-7xl lg:text-8xl">
          Your next look. <span className="italic text-primary">Before you buy.</span>
        </motion.h1>
        <motion.p custom={2} initial="hidden" animate="visible" variants={reveal} className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          Upload a photo, choose an outfit from your closet, and generate a private AI preview before making the purchase.
        </motion.p>
        <motion.div custom={3} initial="hidden" animate="visible" variants={reveal} className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" asChild><Link to="/try-on">Try it on <ArrowRight /></Link></Button>
          <Button size="lg" variant="outline" asChild><Link to="/auth">Sign in</Link></Button>
        </motion.div>
      </div>

      <motion.figure initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }} className="relative md:col-span-5">
        <div className="overflow-hidden rounded-lg bg-secondary aspect-[4/5]">
          <img src={editorialHero.url} alt="Editorial sample outfit with a charcoal blazer and ivory shirt" width={1440} height={1800} className="h-full w-full object-cover" />
        </div>
        <figcaption className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-md border border-background/60 bg-background/90 px-4 py-3 backdrop-blur-sm">
          <div><p className="eyebrow text-foreground">Sample preview</p><p className="mt-1 text-xs text-muted-foreground">Editorial illustration, not a user result</p></div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground"><Check className="h-4 w-4" /></span>
        </figcaption>
      </motion.figure>
    </section>

    <section id="how-it-works" className="border-y border-border bg-card py-20 sm:py-28">
      <div className="container px-4 sm:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 max-w-[8ch] text-4xl font-normal leading-tight sm:text-5xl">From photo to fitting room.</h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:col-span-8 md:grid-cols-3">
            {workflow.map((step, index) => (
              <motion.article key={step.number} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.35 }} custom={index} variants={reveal} className="bg-card p-6 sm:p-8">
                <div className="flex items-center justify-between"><span className="eyebrow">{step.number}</span><step.icon className="h-5 w-5 text-primary" /></div>
                <h3 className="mt-16 text-xl font-normal">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="container grid gap-8 px-4 py-20 sm:px-8 sm:py-28 md:grid-cols-12 md:items-end">
      <div className="md:col-span-8"><p className="eyebrow">Your private fitting room</p><h2 className="mt-4 text-4xl font-normal sm:text-6xl">See the outfit on you, then decide.</h2></div>
      <div className="md:col-span-4 md:text-right"><Button size="lg" asChild><Link to="/try-on">Open try-on <ArrowRight /></Link></Button></div>
    </section>
  </main>
);

export default BrandNewDay;