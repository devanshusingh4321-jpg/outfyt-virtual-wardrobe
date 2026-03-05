import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Ruler, Shirt, Plus, Layers, Eye, Globe } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AddProduct from "@/components/AddProduct";
import { COUNTRIES, getCountryByCode } from "@/lib/countries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [country, setCountry] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("clothing_items")
        .select("id, name, brand, price, image_url, category, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("outfits")
        .select("id, name, created_at, outfit_items(clothing_item_id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("country")
        .eq("id", user.id)
        .single(),
    ]).then(([itemsRes, outfitsRes, profileRes]) => {
      setItems(itemsRes.data || []);
      setOutfits(outfitsRes.data || []);
      if (profileRes.data) setCountry((profileRes.data as any).country || "");
      setLoadingData(false);
    });
  }, [user]);

  const handleCountryChange = async (value: string) => {
    setCountry(value);
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ country: value } as any)
      .eq("id", user.id);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 glass sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <a href="/" className="font-display text-xl font-bold text-gradient">OUTFYT</a>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/try-on")} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Eye className="w-4 h-4" /> Try-On
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/closet")} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Shirt className="w-4 h-4" /> Closet
            </Button>
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
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold">Your Drip Dashboard 🔥</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add products, build outfits, and get smart size recommendations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={country} onValueChange={handleCountryChange}>
              <SelectTrigger className="w-[180px] bg-secondary/50 border-border/50 h-9 text-sm">
                <SelectValue placeholder="Choose country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Add Product Section */}
        <AddProduct />

        {/* Outfits Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent" />
              Your Outfits ({outfits.length})
            </h2>
            <Button onClick={() => navigate("/outfit/new")} size="sm" className="glow-purple bg-primary hover:bg-primary/90 font-display gap-1.5">
              <Plus className="w-4 h-4" /> New Outfit
            </Button>
          </div>
          {outfits.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No outfits yet. Create one to mix and match your pieces!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {outfits.map((outfit) => (
                <button
                  key={outfit.id}
                  onClick={() => navigate(`/outfit/${outfit.id}`)}
                  className="glass rounded-xl p-5 text-left hover:border-primary/50 transition-colors group"
                >
                  <h3 className="font-display font-semibold group-hover:text-primary transition-colors">{outfit.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {outfit.outfit_items?.length || 0} pieces
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

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
