import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { Navigate } from "react-router-dom";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 glass sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <a href="/" className="font-display text-xl font-bold text-gradient">OUTFYT</a>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{user.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Content placeholder */}
      <div className="container py-16 text-center">
        <h1 className="font-display text-3xl font-bold mb-4">Your Drip Dashboard 🔥</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Welcome to OUTFYT. Start building outfits by pasting product links, or set up your body measurements for smart size recommendations.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
