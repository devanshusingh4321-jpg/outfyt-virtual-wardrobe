import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Shirt, Layers, Footprints, Wind, Crown,
  Trash2, Search, Grid3X3, LayoutList, ExternalLink, Eye, ShoppingCart
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ClothingItem = {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  category: string | null;
  price: string | null;
  colors: any;
  sizes: any;
  product_url: string | null;
  created_at: string;
};

type CategoryFilter = "all" | "topwear" | "bottomwear" | "outerwear" | "footwear" | "accessory";

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  topwear: { label: "Topwear", icon: <Shirt className="w-4 h-4" /> },
  bottomwear: { label: "Bottomwear", icon: <Layers className="w-4 h-4" /> },
  outerwear: { label: "Outerwear", icon: <Wind className="w-4 h-4" /> },
  footwear: { label: "Footwear", icon: <Footprints className="w-4 h-4" /> },
  accessory: { label: "Accessories", icon: <Crown className="w-4 h-4" /> },
};

const Closet = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<ClothingItem[]>([]);
  const [tryonPhotos, setTryonPhotos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deleteTarget, setDeleteTarget] = useState<ClothingItem | null>(null);
  const [deletingTryon, setDeletingTryon] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("clothing_items")
      .select("id, name, brand, image_url, category, price, colors, sizes, product_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as ClothingItem[]) || []));

    supabase
      .from("tryon_photos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setTryonPhotos(data || []));
  }, [user]);

  const deleteTryonPhoto = async (id: string) => {
    const { error } = await supabase.from("tryon_photos").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      setTryonPhotos((prev) => prev.filter((p: any) => p.id !== id));
      toast({ title: "Try-on photo removed" });
    }
    setDeletingTryon(null);
  };

  const deleteItem = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("clothing_items").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast({ title: "Item removed from closet" });
    }
    setDeleteTarget(null);
  };

  const filtered = items.filter((item) => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.brand || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || item.category === filter;
    return matchesSearch && matchesFilter;
  });

  const categoryCounts = items.reduce<Record<string, number>>((acc, item) => {
    const cat = item.category || "accessory";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="webbed-page min-h-screen">
      <nav className="border-b border-border/50 glass sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
          <a href="/" className="font-display text-xl font-bold text-gradient">OUTFYT</a>
          <div className="w-20" />
        </div>
      </nav>

      <div className="container py-8 space-y-6 max-w-5xl">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Shirt className="w-6 h-6 text-primary" /> Your Closet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} items saved — your gear, ready when duty calls.
          </p>
        </div>

        {/* Search & Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="pl-9 bg-secondary/50 border-border/50"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filter === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter("all")}
          >
            🕸️ All ({items.length})
          </Badge>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <Badge
              key={key}
              variant={filter === key ? "default" : "outline"}
              className="cursor-pointer gap-1"
              onClick={() => setFilter(key as CategoryFilter)}
            >
              {config.icon} {config.label} ({categoryCounts[key] || 0})
            </Badge>
          ))}
        </div>

        {/* Items */}
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Shirt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {items.length === 0 ? "Your spidey sense is tingling — nothing here yet. Add products from the dashboard!" : "No items match your search."}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass rounded-xl overflow-hidden group relative"
                >
                  {item.image_url ? (
                    <div className="aspect-square bg-secondary/30 overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center bg-secondary/30">
                      <Shirt className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-3 space-y-1">
                    {item.brand && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-primary">{item.brand}</span>
                    )}
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <div className="flex items-center justify-between">
                      {item.price && item.price !== "null" && (
                        <span className="text-xs text-muted-foreground">{item.price}</span>
                      )}
                      {item.category && (
                        <Badge variant="secondary" className="text-[9px] capitalize">{item.category}</Badge>
                      )}
                    </div>
                    {item.colors && Array.isArray(item.colors) && item.colors.length > 0 && (
                      <div className="flex gap-1 pt-1">
                        {(item.colors as string[]).slice(0, 4).map((c) => (
                          <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Buy button — always visible if product_url exists */}
                  {item.product_url && (
                    <a
                      href={item.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-[3.75rem] inset-x-0 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold bg-primary/90 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ShoppingCart className="w-3 h-3" /> Buy This Item
                    </a>
                  )}
                  {/* Hover actions */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 rounded-full bg-destructive/80 text-destructive-foreground hover:bg-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="glass rounded-xl p-4 flex items-center gap-4 group">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-contain bg-secondary/30 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-secondary/30 flex items-center justify-center shrink-0">
                    <Shirt className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.brand && <span className="text-[10px] text-primary uppercase tracking-wider font-medium">{item.brand}</span>}
                    {item.category && <Badge variant="secondary" className="text-[9px] capitalize">{item.category}</Badge>}
                    {item.price && item.price !== "null" && <span className="text-xs text-muted-foreground">{item.price}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.product_url && (
                    <a href={item.product_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="h-8 gap-1.5 text-xs font-display bg-primary hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ShoppingCart className="w-3 h-3" /> Buy
                      </Button>
                    </a>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteTarget(item)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Try-On Photos Section */}
        {tryonPhotos.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Saved Try-Ons ({tryonPhotos.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {tryonPhotos.map((tp: any) => (
                <div key={tp.id} className="glass rounded-xl overflow-hidden group relative">
                  <div className="aspect-[3/4] bg-secondary/30 overflow-hidden">
                    <img
                      src={tp.image_url}
                      alt={tp.outfit_name || "Try-on"}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-sm font-medium truncate">{tp.outfit_name || "Try-on"}</p>
                    <div className="flex items-center gap-2">
                      {tp.size && <Badge variant="secondary" className="text-[9px]">Size {tp.size}</Badge>}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(tp.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTryonPhoto(tp.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from closet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and remove it from any outfits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Closet;
