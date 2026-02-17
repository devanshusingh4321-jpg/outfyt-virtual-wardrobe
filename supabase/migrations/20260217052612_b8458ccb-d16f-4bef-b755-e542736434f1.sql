
-- Create table for saved try-on photos
CREATE TABLE public.tryon_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  outfit_id UUID REFERENCES public.outfits(id) ON DELETE SET NULL,
  outfit_name TEXT,
  size TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tryon_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tryon photos" ON public.tryon_photos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tryon photos" ON public.tryon_photos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own tryon photos" ON public.tryon_photos FOR DELETE USING (user_id = auth.uid());
