
-- Create clothing_items table
CREATE TABLE public.clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  price TEXT,
  image_url TEXT,
  product_url TEXT,
  category TEXT CHECK (category IN ('topwear', 'bottomwear', 'outerwear', 'footwear', 'accessory')),
  colors JSONB DEFAULT '[]'::jsonb,
  sizes JSONB DEFAULT '[]'::jsonb,
  size_chart JSONB DEFAULT '{}'::jsonb,
  selected_size TEXT,
  selected_color TEXT,
  fit_score NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items" ON public.clothing_items FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own items" ON public.clothing_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own items" ON public.clothing_items FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own items" ON public.clothing_items FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_clothing_items_updated_at BEFORE UPDATE ON public.clothing_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create outfits table
CREATE TABLE public.outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Outfit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outfits" ON public.outfits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own outfits" ON public.outfits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own outfits" ON public.outfits FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own outfits" ON public.outfits FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_outfits_updated_at BEFORE UPDATE ON public.outfits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create outfit_items junction table
CREATE TABLE public.outfit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  clothing_item_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  layer_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(outfit_id, clothing_item_id)
);

ALTER TABLE public.outfit_items ENABLE ROW LEVEL SECURITY;

-- Use a security definer function to check outfit ownership
CREATE OR REPLACE FUNCTION public.owns_outfit(_outfit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.outfits WHERE id = _outfit_id AND user_id = auth.uid()
  )
$$;

CREATE POLICY "Users can view own outfit items" ON public.outfit_items FOR SELECT TO authenticated USING (public.owns_outfit(outfit_id));
CREATE POLICY "Users can insert own outfit items" ON public.outfit_items FOR INSERT TO authenticated WITH CHECK (public.owns_outfit(outfit_id));
CREATE POLICY "Users can update own outfit items" ON public.outfit_items FOR UPDATE TO authenticated USING (public.owns_outfit(outfit_id));
CREATE POLICY "Users can delete own outfit items" ON public.outfit_items FOR DELETE TO authenticated USING (public.owns_outfit(outfit_id));
