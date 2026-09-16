import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import EditorialNav from "@/components/EditorialNav";

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast({ title: "Password updated successfully! 🎉" });
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isRecovery && !done) {
    return (
      <main className="editorial-page flex min-h-dvh items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Invalid or expired reset link.</p>
          <Button variant="link" onClick={() => navigate("/auth")} className="mt-4 text-primary">
            Back to login
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="editorial-page min-h-dvh">
      <EditorialNav backTo="/auth" />
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md items-center px-4 py-12 sm:px-8">
        <div className="w-full">
        <div className="text-center mb-8">
          <p className="wordmark inline-block">Outfyt</p>
          <p className="text-muted-foreground mt-2 text-sm">Set your new password</p>
        </div>

        <div className="editorial-card rounded-lg p-8">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-primary mx-auto" />
              <p className="text-foreground font-medium">Password updated!</p>
              <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                <label className="relative block">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    aria-label="New password"
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 h-11"
                  minLength={6}
                  required
                />
                </label>
              <label className="relative block">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    aria-label="Confirm new password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 h-11"
                  minLength={6}
                  required
                />
                </label>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 glow-blue bg-primary hover:bg-primary/90 font-display gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Update Password <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
        </div>
      </div>
    </main>
  );
};

export default ResetPassword;
