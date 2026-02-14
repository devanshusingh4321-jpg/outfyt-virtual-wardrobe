import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Save, Tag, Palette, Ruler } from "lucide-react";
import type { ProductData } from "@/lib/product-service";

type Props = {
  product: ProductData & { product_url: string };
  onSave: () => void;
};

const ProductCard = ({ product, onSave }: Props) => {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Image */}
      {product.image_url && (
        <div className="aspect-square max-h-72 overflow-hidden bg-secondary/30">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Name & Brand */}
        <div>
          {product.brand && (
            <span className="text-xs font-medium uppercase tracking-wider text-primary">{product.brand}</span>
          )}
          <h3 className="font-display text-lg font-semibold mt-1">{product.name}</h3>
        </div>

        {/* Price & Category */}
        <div className="flex items-center gap-3">
          {product.price && (
            <span className="text-xl font-bold text-foreground">{product.price}</span>
          )}
          {product.category && (
            <Badge variant="secondary" className="capitalize">
              <Tag className="w-3 h-3 mr-1" />
              {product.category}
            </Badge>
          )}
        </div>

        {/* Colors */}
        {product.colors.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <Palette className="w-3 h-3" /> Colors
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.colors.map((c) => (
                <Badge key={c} variant="outline" className="text-xs">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Sizes */}
        {product.sizes.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <Ruler className="w-3 h-3" /> Sizes
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.map((s) => (
                <Badge key={s} variant="outline" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={onSave} className="flex-1 glow-purple bg-primary hover:bg-primary/90 font-display gap-2">
            <Save className="w-4 h-4" /> Save to Closet
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a href={product.product_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
