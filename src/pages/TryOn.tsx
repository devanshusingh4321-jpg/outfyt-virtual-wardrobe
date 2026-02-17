import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Upload, Camera, Shirt, Layers, Sparkles, X, Eye, Loader2, Save, Check
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClothingItem = {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  category: string | null;
  price: string | null;
  colors: string[] | null;
};

type Outfit = {
  id: string;
  name: string;
  items: ClothingItem[];
};

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

// Track per-item color overrides
type ColorOverrides = Record<string, string>;

const TryOn = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [sizeSimulation, setSizeSimulation] = useState("M");
  const [showOverlay, setShowOverlay] = useState(false);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [colorOverrides, setColorOverrides] = useState<ColorOverrides>({});
  const [savingTryon, setSavingTryon] = useState(false);
  const [tryonSaved, setTryonSaved] = useState(false);

  // Load outfits with their items
  useEffect(() => {
    if (!user) return;
    const loadOutfits = async () => {
      const { data: outfitRows } = await supabase
        .from("outfits")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!outfitRows || outfitRows.length === 0) return;

      const loaded: Outfit[] = [];
      for (const o of outfitRows) {
        const { data: oi } = await supabase
          .from("outfit_items")
          .select("clothing_item_id")
          .eq("outfit_id", o.id);
        if (oi && oi.length > 0) {
          const ids = oi.map((i) => i.clothing_item_id);
          const { data: clothes } = await supabase
            .from("clothing_items")
            .select("id, name, brand, image_url, category, price, colors")
            .in("id", ids);
          loaded.push({ ...o, items: (clothes || []) as ClothingItem[] });
        } else {
          loaded.push({ ...o, items: [] });
        }
      }
      setOutfits(loaded);
    };
    loadOutfits();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/tryon-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("tryon-photos").upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("tryon-photos").getPublicUrl(path);
      setPhoto(urlData.publicUrl);
      setShowOverlay(false);
      setCompositeUrl(null);
      toast({ title: "Photo uploaded! 📸" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const generateOverlay = async () => {
    if (!photo || !selectedOutfit) return;
    setGenerating(true);
    setShowOverlay(false);
    setCompositeUrl(null);
    setTryonSaved(false);

    try {
      const { data, error } = await supabase.functions.invoke('generate-tryon', {
        body: {
          photoUrl: photo,
          outfitItems: selectedOutfit.items.map(i => ({
            name: i.name,
            brand: i.brand,
            image_url: i.image_url,
            category: i.category,
            color: colorOverrides[i.id] || (i.colors && i.colors.length > 0 ? i.colors[0] : null),
          })),
          size: sizeSimulation,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Generation failed');

      const resultUrl = data.imageUrl || data.imageBase64;
      if (resultUrl) {
        setCompositeUrl(resultUrl);
        setShowOverlay(true);
        toast({ title: "Try-on generated! ✨" });
      } else {
        throw new Error('No image returned');
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };
  const saveTryonPhoto = async () => {
    if (!compositeUrl || !user || !selectedOutfit) return;
    setSavingTryon(true);
    try {
      const { error } = await supabase.from("tryon_photos" as any).insert({
        user_id: user.id,
        image_url: compositeUrl,
        outfit_id: selectedOutfit.id,
        outfit_name: selectedOutfit.name,
        size: sizeSimulation,
      });
      if (error) throw error;
      setTryonSaved(true);
      toast({ title: "Try-on saved to your closet! 💾" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSavingTryon(false);
    }
  };


  const sizeScale: Record<string, number> = {
    XS: 0.85, S: 0.92, M: 1, L: 1.08, XL: 1.15, XXL: 1.22,
  };

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
          <div className="w-20" />
        </div>
      </nav>

      <div className="container py-8 space-y-8 max-w-4xl">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" /> Virtual Try-On
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your photo, select an outfit, and see how it looks on you.
          </p>
        </div>

        {/* Step 1: Upload Photo */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> Step 1 — Upload Your Photo
          </h2>

          {photo ? (
            <div className="relative max-w-xs mx-auto">
              <img src={photo} alt="Your photo" className="rounded-xl w-full aspect-[3/4] object-cover border border-border/50" />
              <button
                onClick={() => { setPhoto(null); setShowOverlay(false); setCompositeUrl(null); }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/80 text-destructive-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-border/50 hover:border-primary/50 rounded-xl p-12 flex flex-col items-center gap-3 transition-colors group"
            >
              <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors font-display">
                {uploading ? "Uploading..." : "Click to upload a full-body photo"}
              </span>
              <span className="text-xs text-muted-foreground">JPG, PNG — Max 5MB</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Step 2: Select Outfit */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Step 2 — Select an Outfit
          </h2>

          {outfits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No outfits yet. <button onClick={() => navigate("/outfit/new")} className="text-primary underline">Create one first</button>.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {outfits.map((outfit) => (
                <button
                  key={outfit.id}
                  onClick={() => { setSelectedOutfit(outfit); setColorOverrides({}); }}
                  className={`rounded-xl p-4 text-left transition-all border ${
                    selectedOutfit?.id === outfit.id
                      ? "border-primary bg-primary/10 glow-purple"
                      : "border-border/30 bg-secondary/20 hover:border-primary/50"
                  }`}
                >
                  <p className="font-display text-sm font-semibold truncate">{outfit.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{outfit.items.length} pieces</p>
                  {/* Thumbnail strip */}
                  <div className="flex gap-1 mt-2">
                    {outfit.items.slice(0, 3).map((item) =>
                      item.image_url ? (
                        <img
                          key={item.id}
                          src={item.image_url}
                          alt={item.name}
                          className="w-8 h-8 rounded object-contain bg-secondary/50"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div key={item.id} className="w-8 h-8 rounded bg-secondary/50 flex items-center justify-center">
                          <Shirt className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )
                    )}
                    {outfit.items.length > 3 && (
                      <div className="w-8 h-8 rounded bg-secondary/50 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                        +{outfit.items.length - 3}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2.5: Color Selection */}
        {selectedOutfit && selectedOutfit.items.some(i => i.colors && i.colors.length > 1) && (
          <div className="glass rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Shirt className="w-4 h-4 text-primary" /> Choose Colors
            </h2>
            <div className="space-y-3">
              {selectedOutfit.items.filter(i => i.colors && i.colors.length > 0).map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium truncate min-w-[120px] max-w-[180px]">{item.name}</span>
                  <div className="flex gap-2 flex-wrap">
                    {(item.colors || []).map((color) => {
                      const isSelected = (colorOverrides[item.id] || (item.colors && item.colors[0])) === color;
                      return (
                        <button
                          key={color}
                          onClick={() => setColorOverrides(prev => ({ ...prev, [item.id]: color }))}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                            isSelected
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Size Simulation */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Step 3 — Size Simulation
          </h2>

          <div className="flex items-center gap-4">
            <Select value={sizeSimulation} onValueChange={setSizeSimulation}>
              <SelectTrigger className="w-32 bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              {SIZE_OPTIONS.map((s) => (
                <Badge
                  key={s}
                  variant={sizeSimulation === s ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSizeSimulation(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {sizeSimulation === "XS" || sizeSimulation === "S"
              ? "Tight / fitted look"
              : sizeSimulation === "M"
              ? "Regular / true to size"
              : "Oversized / relaxed look"}
          </p>
        </div>

        {/* Generate Try-On */}
        <Button
          onClick={generateOverlay}
          disabled={!photo || !selectedOutfit || generating}
          className="w-full h-14 glow-purple bg-primary hover:bg-primary/90 font-display text-base gap-2"
        >
          {generating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Generating AI Try-On...</>
          ) : (
            <><Eye className="w-5 h-5" /> Generate Try-On Preview</>
          )}
        </Button>

        {/* Result: Overlay + Slider */}
        <AnimatePresence>
          {showOverlay && photo && selectedOutfit && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              {/* Before / After Slider */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Before / After
                </h3>
                <BeforeAfterSlider
                  beforeSrc={photo}
                  afterSrc={compositeUrl || photo}
                  beforeLabel="You"
                  afterLabel={`You + ${selectedOutfit.name}`}
                />
                {/* Save Try-On Button */}
                <Button
                  onClick={saveTryonPhoto}
                  disabled={savingTryon || tryonSaved}
                  variant={tryonSaved ? "secondary" : "default"}
                  className="w-full gap-2 font-display"
                >
                  {tryonSaved ? (
                    <><Check className="w-4 h-4" /> Saved to Closet</>
                  ) : savingTryon ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Try-On to Closet</>
                  )}
                </Button>
              </div>

              {/* Outfit Items Overlay Grid */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Outfit Pieces — {selectedOutfit.name}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {selectedOutfit.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl overflow-hidden bg-secondary/30 border border-border/30 group"
                    >
                      {item.image_url ? (
                        <div className="aspect-square overflow-hidden flex items-center justify-center bg-secondary/20">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-contain transition-transform"
                            style={{ transform: `scale(${sizeScale[sizeSimulation] || 1})` }}
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
                        <Badge variant="secondary" className="text-[9px] mt-1">{sizeSimulation}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Integration Note */}
              <div className="glass rounded-xl p-4 flex items-start gap-3 border-primary/20">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-display font-semibold text-primary">AI Try-On Coming Soon</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Full AI-powered virtual try-on with realistic clothing placement is on the roadmap. 
                    This MVP shows your outfit pieces scaled to your selected size.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TryOn;
