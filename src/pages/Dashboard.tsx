import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, Link2, Ruler, Shirt, ChevronRight } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AddProduct from "@/components/AddProduct";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("clothing_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems(data || []));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 glass sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <a href="/" className="font-display text-xl font-bold text-gradient">OUTFYT</a>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/measurements")} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Ruler className="w-4 h-4" /> Measurements
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Your Drip Dashboard 🔥</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add products, build outfits, and get smart size recommendations.
          </p>
        </div>

        {/* Add Product Section */}
        <AddProduct />

        {/* Saved Items */}
        {items.length > 0 && (
          <div>
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <Shirt className="w-5 h-5 text-accent" />
              Your Closet ({items.length} items)
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <div key={item.id} className="glass rounded-xl overflow-hidden group">
                  {item.image_url && (
                    <div className="aspect-square bg-secondary/30 overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    {item.brand && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-primary">{item.brand}</span>
                    )}
                    <p className="text-sm font-medium truncate mt-0.5">{item.name}</p>
                    {item.price && <p className="text-xs text-muted-foreground mt-1">{item.price}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
