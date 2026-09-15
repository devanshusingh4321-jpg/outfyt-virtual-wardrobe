import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Shirt, Plus, Layers, Globe } from "lucide-react";
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
import EditorialNav from "@/components/EditorialNav";

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
    <div className="editorial-page">
      <EditorialNav authenticated onSignOut={signOut} />

      <div className="container space-y-12 px-4 py-10 sm:px-8 sm:py-14">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow">Your studio</p>
            <h1 className="mt-3 text-4xl font-normal sm:text-5xl">Build, preview, refine.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Add products, build outfits, check fit guidance, and take your finished looks into the virtual fitting room.
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
            <Button onClick={() => navigate("/outfit/new")} size="sm">
              <Plus /> New outfit
            </Button>
          </div>
          {outfits.length === 0 ? (
            <div className="editorial-card rounded-lg p-10 text-center">
              <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No outfits yet. Create one from pieces in your closet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {outfits.map((outfit) => (
                <button
                  key={outfit.id}
                  onClick={() => navigate(`/outfit/${outfit.id}`)}
                  className="editorial-card-hover rounded-lg p-5 text-left group"
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
                <div key={item.id} className="editorial-card-hover overflow-hidden rounded-lg group">
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
