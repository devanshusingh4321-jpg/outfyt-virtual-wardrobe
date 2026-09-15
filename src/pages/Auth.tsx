import { useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import editorialHero from "@/assets/outfyt-editorial-hero.jpg.asset.json";

const Auth = () => {
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const [isLogin, setIsLogin] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="editorial-page flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading account" /></div>;
  if (session) return <Navigate to={nextPath ?? "/dashboard"} replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (forgotMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast({ title: "Reset link sent", description: "Check your email for the reset link." });
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName }, emailRedirectTo: nextPath ? `${window.location.origin}${nextPath}` : window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "Use the confirmation link to finish creating your account." });
      }
    } catch (error: any) {
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const title = forgotMode ? "Reset your password" : isLogin ? "Welcome back" : "Create your account";
  const subtitle = forgotMode ? "We’ll send a secure reset link to your inbox." : isLogin ? "Return to your private fitting room." : "Save outfits, fit details, and private try-on results.";

  return (
    <main className="editorial-page grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden lg:block">
        <img src={editorialHero.url} alt="Editorial Outfyt sample" className="absolute inset-0 h-full w-full object-cover" width={1440} height={1800} />
        <div className="absolute inset-0 bg-foreground/20" />
        <Link to="/" className="wordmark absolute left-10 top-8 text-background">Outfyt</Link>
        <div className="absolute bottom-10 left-10 max-w-md text-background">
          <p className="eyebrow text-background/75">Private by design</p>
          <p className="mt-4 font-display text-4xl leading-tight">Your wardrobe, fit profile, and try-ons in one place.</p>
        </div>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/" className="wordmark mb-14 inline-block lg:hidden">Outfyt</Link>
          <p className="eyebrow">Outfyt account</p>
          <h1 className="mt-4 text-4xl font-normal sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-4">
            <AnimatePresence initial={false}>
              {!isLogin && !forgotMode && (
                <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="block overflow-hidden">
                  <span className="mb-2 block text-xs font-medium">Display name</span>
                  <span className="relative block"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pl-10" autoComplete="name" required /></span>
                </motion.label>
              )}
            </AnimatePresence>
            <label className="block"><span className="mb-2 block text-xs font-medium">Email address</span><span className="relative block"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" autoComplete="email" required /></span></label>
            {!forgotMode && <label className="block"><span className="mb-2 block text-xs font-medium">Password</span><span className="relative block"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" autoComplete={isLogin ? "current-password" : "new-password"} minLength={6} required /></span></label>}
            <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full">{submitting ? <Loader2 className="animate-spin" /> : <>{forgotMode ? "Send reset link" : isLogin ? "Sign in" : "Create account"}<ArrowRight /></>}</Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-center text-sm text-muted-foreground">
            {isLogin && !forgotMode && <button onClick={() => setForgotMode(true)} className="hover:text-foreground">Forgot your password?</button>}
            <button onClick={() => { setIsLogin(!isLogin); setForgotMode(false); }} className="hover:text-foreground">
              {forgotMode ? "Back to sign in" : isLogin ? "New to Outfyt? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </section>
    </main>
  );
};

export default Auth;