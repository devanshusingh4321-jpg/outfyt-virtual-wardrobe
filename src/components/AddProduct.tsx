import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { scrapeAndParseProduct, calculateFitScore, recommendSize, type ProductData } from "@/lib/product-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link2, Loader2, Plus, ShoppingBag, X } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import FitScoreDisplay from "@/components/FitScoreDisplay";

type SavedItem = ProductData & { id?: string; product_url: string };

const AddProduct = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<SavedItem | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setProduct(null);

    try {
      const data = await scrapeAndParseProduct(url);
      setProduct({ ...data, product_url: url });

      // Fetch user profile for fit scoring
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(prof);
      }

      toast({ title: "Product extracted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!product || !user) return;

    try {
      const { error } = await supabase.from("clothing_items").insert({
        user_id: user.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        image_url: product.image_url,
        product_url: product.product_url,
        category: product.category,
        colors: product.colors as any,
        sizes: product.sizes as any,
        size_chart: product.size_chart as any,
      });

      if (error) throw error;
      toast({ title: "Saved to your closet" });
      setProduct(null);
      setUrl("");
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    }
  };

  // Calculate fit if we have profile measurements and size chart
  const fitData = product?.size_chart && profile?.chest
    ? (() => {
        const rec = recommendSize(
          { chest: profile.chest, waist: profile.waist, hips: profile.hips, height: profile.height },
          product.size_chart,
          profile.fit_preference || "regular"
        );
        const sizeKey = rec?.size || Object.keys(product.size_chart)[0];
        const measurements = product.size_chart[sizeKey];
        if (!measurements) return null;
        const score = calculateFitScore(
          { chest: profile.chest, waist: profile.waist, hips: profile.hips, height: profile.height },
          measurements,
          profile.fit_preference || "regular"
        );
        return { recommendation: rec, score };
      })()
    : null;

  return (
    <div className="space-y-8">
      {/* URL Input */}
      <section className="editorial-card rounded-lg p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold mb-2 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          Add a product link
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Paste a product page from a supported retailer to extract its details.
        </p>
        <form onSubmit={handleScrape} className="flex gap-3">
          <Input
            type="url"
            placeholder="https://www.zara.com/product/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-secondary/50 border-border/50 h-11 flex-1"
            required
          />
          <Button type="submit" disabled={loading} className="h-11 px-6">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Extract</>}
          </Button>
        </form>
      </section>

      {/* Loading state */}
      {loading && (
        <div className="editorial-card rounded-lg p-12 text-center" role="status" aria-live="polite">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Extracting product details…</p>
          <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Product Result */}
      {product && !loading && (
        <div className="grid lg:grid-cols-2 gap-6">
          <ProductCard product={product} onSave={handleSave} />
          {fitData && (
            <FitScoreDisplay
              score={fitData.score}
              recommendation={fitData.recommendation}
              sizes={product.sizes}
            />
          )}
          {!fitData && profile && Object.keys(product.size_chart).length === 0 && (
            <div className="editorial-card rounded-lg p-8 flex flex-col items-center justify-center text-center">
              <ShoppingBag className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No size chart found for this product.</p>
              <p className="text-xs text-muted-foreground mt-1">Fit scoring requires size chart data from the product page.</p>
            </div>
          )}
          {!profile?.chest && (
            <div className="editorial-card rounded-lg p-8 flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground text-sm">Set up your body measurements to see fit scores!</p>
              <a href="/measurements" className="text-primary text-sm mt-2 hover:underline">Set up measurements →</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddProduct;
