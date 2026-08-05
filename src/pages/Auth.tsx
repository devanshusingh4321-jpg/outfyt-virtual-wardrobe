import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, User, ArrowRight, Loader2, Shield, Fingerprint } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Floating abstract shape component
const FloatingShape = ({ delay, x, y, size, rotation }: { delay: number; x: string; y: string; size: number; rotation: number }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{
      opacity: [0.04, 0.12, 0.04],
      scale: [0.8, 1.1, 0.8],
      rotate: [rotation, rotation + 60, rotation],
      y: [0, -30, 0],
    }}
    transition={{ duration: 12 + delay * 2, repeat: Infinity, delay, ease: "easeInOut" }}
  >
    <div
      className="rounded-full border border-primary/10"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(${rotation}deg, hsl(var(--neon-blue) / 0.08), hsl(var(--neon-purple) / 0.05), transparent)`,
        filter: "blur(1px)",
      }}
    />
  </motion.div>
);

// DNA-strand-like pattern shapes
const StrandShape = ({ delay, startX, startY }: { delay: number; startX: string; startY: string }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: startX, top: startY }}
    initial={{ opacity: 0 }}
    animate={{
      opacity: [0.03, 0.1, 0.03],
      rotateY: [0, 180, 360],
    }}
    transition={{ duration: 18, repeat: Infinity, delay, ease: "linear" }}
  >
    <div className="flex flex-col gap-3">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: 6 + i * 2,
            height: 6 + i * 2,
            background: `hsl(var(--neon-blue) / ${0.15 - i * 0.02})`,
            marginLeft: Math.sin(i * 1.2) * 20,
          }}
          animate={{ x: [0, Math.sin(i) * 15, 0] }}
          transition={{ duration: 6, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </div>
  </motion.div>
);

// ID Pulse effect
const IdPulse = ({ active }: { active: boolean }) => (
  <AnimatePresence>
    {active && (
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-primary/20"
            initial={{ width: 40, height: 40, opacity: 0.6 }}
            animate={{
              width: [40, 500 + i * 150],
              height: [40, 500 + i * 150],
              opacity: [0.4, 0],
            }}
            transition={{
              duration: 2,
              delay: i * 0.4,
              repeat: Infinity,
              repeatDelay: 1,
              ease: "easeOut",
            }}
            style={{
              background: `radial-gradient(circle, hsl(var(--neon-blue) / 0.1) 0%, transparent 70%)`,
            }}
          />
        ))}
      </motion.div>
    )}
  </AnimatePresence>
);

// Laser sweep scanning line
const LaserSweep = ({ active }: { active: boolean }) => (
  <AnimatePresence>
    {active && (
      <motion.div
        className="absolute left-0 right-0 h-[2px] z-50 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(var(--neon-blue) / 0.8), hsl(var(--neon-blue)), hsl(var(--neon-blue) / 0.8), transparent)",
          boxShadow: "0 0 30px 10px hsl(var(--neon-blue) / 0.4), 0 0 60px 20px hsl(var(--neon-blue) / 0.2)",
        }}
        initial={{ top: 0, opacity: 0 }}
        animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
    )}
  </AnimatePresence>
);

// Haptic feedback utility
const triggerHaptic = () => {
  if (navigator.vibrate) {
    navigator.vibrate(8);
  }
};

const Auth = () => {
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Handle input haptic feedback
  const handleKeyDown = useCallback(() => {
    triggerHaptic();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Shield className="w-8 h-8 text-primary" />
          </motion.div>
          <span className="text-sm text-muted-foreground font-display tracking-widest uppercase">
            Verifying Identity
          </span>
        </motion.div>
      </div>
    );
  }

  if (session) return <Navigate to={nextPath ?? "/dashboard"} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setScanning(true);

    try {
      if (forgotMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setScanning(false);
        toast({
          title: "Secure link sent",
          description: "Check your email for the reset link.",
        });
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Trigger the unfolding animation
        setAuthenticated(true);
        await new Promise((r) => setTimeout(r, 1200));
        toast({ title: "Identity Verified ✓" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: nextPath ? `${window.location.origin}${nextPath}` : window.location.origin,
          },
        });
        if (error) throw error;
        setScanning(false);
        toast({
          title: "Vault access pending",
          description: "Check your email to verify your identity.",
        });
      }
    } catch (error: any) {
      setScanning(false);
      toast({ title: "Access Denied", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Deep background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, hsl(var(--neon-blue) / 0.04) 0%, transparent 60%)",
        }}
      />

      {/* Floating abstract shapes - clothing pattern DNA strands */}
      <FloatingShape delay={0} x="10%" y="15%" size={120} rotation={30} />
      <FloatingShape delay={2} x="75%" y="20%" size={90} rotation={120} />
      <FloatingShape delay={4} x="85%" y="65%" size={140} rotation={210} />
      <FloatingShape delay={1} x="5%" y="70%" size={100} rotation={60} />
      <FloatingShape delay={3} x="60%" y="80%" size={70} rotation={300} />
      <FloatingShape delay={5} x="30%" y="5%" size={110} rotation={150} />

      <StrandShape delay={0} startX="15%" startY="25%" />
      <StrandShape delay={3} startX="80%" startY="40%" />
      <StrandShape delay={6} startX="50%" startY="75%" />
      <StrandShape delay={2} startX="25%" startY="60%" />

      {/* Grid overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--neon-blue) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neon-blue) / 0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* ID Pulse effect */}
      <IdPulse active={emailFocused} />

      {/* Laser sweep */}
      <LaserSweep active={scanning} />

      {/* Main content */}
      <AnimatePresence mode="wait">
        {!authenticated ? (
          <motion.div
            key="vault"
            className="w-full max-w-md relative z-10"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              // Unfolding origami crane effect
              scale: [1, 1.05, 3],
              opacity: [1, 0.8, 0],
              rotateX: [0, -5, -15],
              rotateY: [0, 5, 10],
              borderRadius: ["16px", "24px", "0px"],
            }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Vault header */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <motion.div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 relative"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--neon-blue) / 0.15), hsl(var(--neon-purple) / 0.1))",
                  border: "1px solid hsl(var(--neon-blue) / 0.2)",
                }}
                animate={{
                  boxShadow: [
                    "0 0 20px hsl(var(--neon-blue) / 0.1)",
                    "0 0 40px hsl(var(--neon-blue) / 0.2)",
                    "0 0 20px hsl(var(--neon-blue) / 0.1)",
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Fingerprint className="w-7 h-7 text-primary" />
              </motion.div>

              <a href="/" className="font-display text-2xl font-bold text-gradient inline-block">
                OUTFYT
              </a>

              <motion.div
                className="flex items-center justify-center gap-2 mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/30" />
                <span className="text-[11px] text-muted-foreground tracking-[0.25em] uppercase font-display">
                  {forgotMode ? "Identity Recovery" : isLogin ? "Secure Vault Access" : "Create Your Vault"}
                </span>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/30" />
              </motion.div>
            </motion.div>

            {/* Frosted Obsidian form container */}
            <motion.div
              ref={formRef}
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(145deg, hsl(var(--card) / 0.6), hsl(var(--card) / 0.3))",
                backdropFilter: "blur(40px) saturate(1.5)",
                border: "1px solid hsl(var(--border) / 0.4)",
                boxShadow: "0 8px 60px -12px hsl(var(--neon-blue) / 0.08), inset 0 1px 0 hsl(var(--foreground) / 0.03)",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
            >
              {/* Top glow line */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px"
                style={{
                  background: "linear-gradient(90deg, transparent, hsl(var(--neon-blue) / 0.5), transparent)",
                }}
              />

              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence mode="wait">
                    {!isLogin && !forgotMode && (
                      <motion.div
                        key="name-field"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Display name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="pl-11 bg-secondary/30 border-border/30 h-12 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:border-primary/40 focus:bg-secondary/50 transition-all duration-300"
                            required
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <Input
                      type="email"
                      placeholder="Secure email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      onKeyDown={handleKeyDown}
                      className="pl-11 bg-secondary/30 border-border/30 h-12 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:border-primary/40 focus:bg-secondary/50 transition-all duration-300"
                      required
                    />
                  </div>

                  <AnimatePresence mode="wait">
                    {!forgotMode && (
                      <motion.div
                        key="password-field"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Vault passphrase"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="pl-11 bg-secondary/30 border-border/30 h-12 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:border-primary/40 focus:bg-secondary/50 transition-all duration-300"
                            minLength={6}
                            required
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 rounded-xl font-display gap-2 text-sm tracking-wide relative overflow-hidden group"
                      style={{
                        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--neon-blue) / 0.8))",
                        boxShadow: "0 0 30px hsl(var(--neon-blue) / 0.2), 0 4px 20px hsl(var(--neon-blue) / 0.15)",
                      }}
                    >
                      {/* Button glow effect */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: "linear-gradient(135deg, hsl(var(--neon-blue) / 0.3), transparent, hsl(var(--neon-purple) / 0.2))",
                        }}
                      />
                      <span className="relative z-10 flex items-center gap-2">
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            {forgotMode ? "Send Recovery Link" : isLogin ? "Unlock Vault" : "Initialize Vault"}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </span>
                    </Button>
                  </motion.div>
                </form>

                {/* Forgot password */}
                {isLogin && !forgotMode && (
                  <motion.div
                    className="mt-5 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <button
                      onClick={() => setForgotMode(true)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wide"
                    >
                      Lost your passphrase? <span className="text-primary font-medium">Recover access</span>
                    </button>
                  </motion.div>
                )}

                {/* Toggle login/signup */}
                <motion.div
                  className="mt-4 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <button
                    onClick={() => { setIsLogin(!isLogin); setForgotMode(false); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wide"
                  >
                    {forgotMode ? "Back to " : isLogin ? "No vault yet? " : "Already have a vault? "}
                    <span className="text-primary font-medium">
                      {forgotMode ? "Vault access" : isLogin ? "Create one" : "Unlock it"}
                    </span>
                  </button>
                </motion.div>
              </div>

              {/* Bottom security badge */}
              <div
                className="px-8 py-3 flex items-center justify-center gap-2"
                style={{
                  borderTop: "1px solid hsl(var(--border) / 0.2)",
                  background: "hsl(var(--card) / 0.3)",
                }}
              >
                <Shield className="w-3 h-3 text-primary/60" />
                <span className="text-[10px] text-muted-foreground/60 tracking-[0.2em] uppercase font-display">
                  End-to-end encrypted
                </span>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* Post-authentication expanding state */
          <motion.div
            key="authenticated"
            className="flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1.2, 3] }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 1 }}
              >
                <Fingerprint className="w-16 h-16 text-primary mx-auto" />
              </motion.div>
              <p className="font-display text-sm text-primary mt-4 tracking-[0.3em] uppercase">
                Identity Verified
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
