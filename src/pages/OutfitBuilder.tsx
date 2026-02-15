import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, Save, Shirt, Footprints,
  Wind, Crown, Layers, GripVertical, ShoppingBag, Edit2, Check, X
} from "lucide-react";

type ClothingItem = {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  category: string | null;
  price: string | null;
  selected_color: string | null;
  selected_size: string | null;
};

type BodyZone = "topwear" | "bottomwear" | "outerwear" | "footwear" | "accessory";

const ZONE_CONFIG: Record<BodyZone, { label: string; icon: React.ReactNode; order: number }> = {
  outerwear: { label: "Outerwear", icon: <Wind className="w-4 h-4" />, order: 0 },
  topwear: { label: "Topwear", icon: <Shirt className="w-4 h-4" />, order: 1 },
  bottomwear: { label: "Bottomwear", icon: <Layers className="w-4 h-4" />, order: 2 },
  footwear: { label: "Footwear", icon: <Footprints className="w-4 h-4" />, order: 3 },
  accessory: { label: "Accessories", icon: <Crown className="w-4 h-4" />, order: 4 },
};

const OutfitBuilder = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { outfitId } = useParams();

  const [outfitName, setOutfitName] = useState("Untitled Outfit");
  const [editingName, setEditingName] = useState(false);
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [outfitItems, setOutfitItems] = useState<ClothingItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCloset, setShowCloset] = useState(false);
  const [filterZone, setFilterZone] = useState<BodyZone | "all">("all");

  // Load user closet items
  useEffect(() => {
    if (!user) return;
    supabase
      .from("clothing_items")
      .select("id, name, brand, image_url, category, price, selected_color, selected_size")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setClosetItems(data || []));
  }, [user]);

  // Load existing outfit if editing
  useEffect(() => {
    if (!user || !outfitId) return;
    const loadOutfit = async () => {
      const { data: outfit } = await supabase
        .from("outfits")
        .select("name")
        .eq("id", outfitId)
        .single();
      if (outfit) setOutfitName(outfit.name);

      const { data: items } = await supabase
        .from("outfit_items")
        .select("clothing_item_id, layer_order")
        .eq("outfit_id", outfitId)
        .order("layer_order");

      if (items && items.length > 0) {
        const itemIds = items.map((i) => i.clothing_item_id);
        const { data: clothing } = await supabase
          .from("clothing_items")
          .select("id, name, brand, image_url, category, price, selected_color, selected_size")
          .in("id", itemIds);

        if (clothing) {
          // Preserve layer order
          const ordered = items
            .map((oi) => clothing.find((c) => c.id === oi.clothing_item_id))
            .filter(Boolean) as ClothingItem[];
          setOutfitItems(ordered);
        }
      }
    };
    loadOutfit();
  }, [user, outfitId]);

  const addItem = (item: ClothingItem) => {
    if (outfitItems.find((i) => i.id === item.id)) {
      toast({ title: "Already in outfit", variant: "destructive" });
      return;
    }
    setOutfitItems((prev) => [...prev, item]);
    setShowCloset(false);
    toast({ title: `Added ${item.name}` });
  };

  const removeItem = (id: string) => {
    setOutfitItems((prev) => prev.filter((i) => i.id !== id));
  };

  const saveOutfit = async () => {
    if (!user || outfitItems.length === 0) return;
    setSaving(true);

    try {
      let id = outfitId;

      if (id) {
        // Update existing
        await supabase.from("outfits").update({ name: outfitName }).eq("id", id);
        await supabase.from("outfit_items").delete().eq("outfit_id", id);
      } else {
        // Create new
        const { data, error } = await supabase
          .from("outfits")
          .insert({ user_id: user.id, name: outfitName })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }

      // Insert outfit items with layer order
      const inserts = outfitItems.map((item, idx) => ({
        outfit_id: id!,
        clothing_item_id: item.id,
        layer_order: idx,
      }));
      const { error: itemsError } = await supabase.from("outfit_items").insert(inserts);
      if (itemsError) throw itemsError;

      toast({ title: "Outfit saved! 🔥" });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Group items by zone
  const groupedItems = outfitItems.reduce<Record<string, ClothingItem[]>>((acc, item) => {
    const zone = (item.category as BodyZone) || "accessory";
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(item);
    return acc;
  }, {});

  const sortedZones = Object.keys(groupedItems).sort(
    (a, b) => (ZONE_CONFIG[a as BodyZone]?.order ?? 99) - (ZONE_CONFIG[b as BodyZone]?.order ?? 99)
  );

  const filteredCloset =
    filterZone === "all" ? closetItems : closetItems.filter((i) => i.category === filterZone);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 glass sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
          <a href="/" className="font-display text-xl font-bold text-gradient">OUTFYT</a>
          <Button
            onClick={saveOutfit}
            disabled={saving || outfitItems.length === 0}
            className="glow-purple bg-primary hover:bg-primary/90 font-display gap-1.5"
            size="sm"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </nav>

      <div className="container py-8 space-y-8">
        {/* Outfit Name */}
        <div className="flex items-center gap-3">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                className="font-display text-2xl font-bold bg-secondary/50 border-border/50 h-12 max-w-sm"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              />
              <Button size="icon" variant="ghost" onClick={() => setEditingName(false)}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setEditingName(true)}>
              <h1 className="font-display text-2xl font-bold">{outfitName}</h1>
              <Edit2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Body Zone Layers */}
        <div className="space-y-4">
          {outfitItems.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No items yet. Add pieces from your closet to build an outfit.</p>
            </div>
          ) : (
            sortedZones.map((zone) => {
              const config = ZONE_CONFIG[zone as BodyZone] || { label: zone, icon: <Layers className="w-4 h-4" />, order: 99 };
              return (
                <div key={zone} className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-primary">{config.icon}</span>
                    <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {config.label}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <AnimatePresence>
                      {groupedItems[zone].map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative group rounded-xl overflow-hidden bg-secondary/30 border border-border/30"
                        >
                          {item.image_url ? (
                            <div className="aspect-square overflow-hidden">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            </div>
                          ) : (
                            <div className="aspect-square flex items-center justify-center">
                              <Shirt className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="p-2">
                            {item.brand && (
                              <span className="text-[9px] font-medium uppercase tracking-wider text-primary">{item.brand}</span>
                            )}
                            <p className="text-xs font-medium truncate">{item.name}</p>
                            {item.price && <p className="text-[10px] text-muted-foreground">{item.price}</p>}
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add From Closet */}
        <Button
          onClick={() => setShowCloset(!showCloset)}
          variant="outline"
          className="w-full border-dashed border-2 border-border/50 h-14 text-muted-foreground hover:text-foreground hover:border-primary/50 font-display gap-2"
        >
          <Plus className="w-5 h-5" /> Add from Closet
        </Button>

        {/* Closet Picker */}
        <AnimatePresence>
          {showCloset && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold">Your Closet</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowCloset(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Zone Filter */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={filterZone === "all" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFilterZone("all")}
                  >
                    All
                  </Badge>
                  {(Object.keys(ZONE_CONFIG) as BodyZone[]).map((z) => (
                    <Badge
                      key={z}
                      variant={filterZone === z ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => setFilterZone(z)}
                    >
                      {ZONE_CONFIG[z].label}
                    </Badge>
                  ))}
                </div>

                {filteredCloset.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {closetItems.length === 0
                      ? "Your closet is empty. Add products from the dashboard first!"
                      : "No items in this category."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto">
                    {filteredCloset.map((item) => {
                      const inOutfit = outfitItems.some((o) => o.id === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => !inOutfit && addItem(item)}
                          disabled={inOutfit}
                          className={`rounded-xl overflow-hidden bg-secondary/30 border text-left transition-all ${
                            inOutfit
                              ? "border-primary/50 opacity-50 cursor-not-allowed"
                              : "border-border/30 hover:border-primary/50 hover:scale-[1.02]"
                          }`}
                        >
                          {item.image_url ? (
                            <div className="aspect-square overflow-hidden">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            </div>
                          ) : (
                            <div className="aspect-square flex items-center justify-center">
                              <Shirt className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{item.name}</p>
                            {inOutfit && (
                              <Badge variant="secondary" className="text-[9px] mt-1">Added</Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Total Cost */}
        {outfitItems.length > 0 && (
          <div className="glass rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Outfit Summary</p>
              <p className="font-display text-lg font-semibold mt-1">{outfitItems.length} pieces</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost</p>
              <p className="font-display text-lg font-bold text-primary mt-1">
                {(() => {
                  const total = outfitItems.reduce((sum, item) => {
                    const num = parseFloat((item.price || "").replace(/[^0-9.]/g, ""));
                    return sum + (isNaN(num) ? 0 : num);
                  }, 0);
                  return total > 0 ? `$${total.toFixed(2)}` : "—";
                })()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutfitBuilder;
