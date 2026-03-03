import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Shirt, Footprints, Wind, Crown, Layers, Tag, Plus } from "lucide-react";

type OutfitItem = {
  name: string;
  brand: string | null;
  category: string | null;
  price: string | null;
};

type Suggestion = {
  category: string;
  brand?: string;
  item_name: string;
  color: string;
  reason: string;
  price_range?: string;
};

type StylingResult = {
  suggestions: Suggestion[];
  style_notes: string;
};

const ZONE_ICONS: Record<string, React.ReactNode> = {
  topwear: <Shirt className="w-4 h-4" />,
  bottomwear: <Layers className="w-4 h-4" />,
  outerwear: <Wind className="w-4 h-4" />,
  footwear: <Footprints className="w-4 h-4" />,
  accessory: <Crown className="w-4 h-4" />,
};

const ALL_ZONES = ["topwear", "bottomwear", "outerwear", "footwear", "accessory"];

type Props = {
  outfitItems: OutfitItem[];
  onAddSuggestion?: (suggestion: Suggestion) => void;
  addingIndex?: number | null;
};

const StyleSuggestions = ({ outfitItems, onAddSuggestion, addingIndex }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StylingResult | null>(null);

  const getSuggestions = async () => {
    if (outfitItems.length === 0) {
      toast({ title: "Add items first", description: "Add at least one piece to get suggestions.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const presentZones = new Set(outfitItems.map((i) => i.category).filter(Boolean));
      const missingZones = ALL_ZONES.filter((z) => !presentZones.has(z));

      const { data, error } = await supabase.functions.invoke("style-suggestions", {
        body: { outfitItems, missingZones },
      });

      if (error) throw new Error(error.message || "Failed to get suggestions");
      if (!data?.success) throw new Error(data?.error || "AI styling failed");

      setResult(data.data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={getSuggestions}
        disabled={loading || outfitItems.length === 0}
        variant="outline"
        className="w-full h-12 border-accent/30 text-accent hover:bg-accent/10 hover:text-accent font-display gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {loading ? "Analyzing your fit..." : "Complete The Fit ✨"}
      </Button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-4"
          >
            {/* Style Notes */}
            {result.style_notes && (
              <div className="glass rounded-xl p-4">
                <p className="text-xs uppercase tracking-widest text-accent mb-2 font-display">Style Notes</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{result.style_notes}</p>
              </div>
            )}

            {/* Suggestions */}
            <div className="space-y-3">
              {result.suggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-accent">
                        {ZONE_ICONS[s.category] || <Tag className="w-4 h-4" />}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          {s.brand && <span className="text-primary">{s.brand} </span>}
                          {s.item_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{s.category}</Badge>
                          <Badge variant="outline" className="text-[10px]">{s.color}</Badge>
                          {s.price_range && (
                            <span className="text-[10px] text-muted-foreground">{s.price_range}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.reason}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StyleSuggestions;
