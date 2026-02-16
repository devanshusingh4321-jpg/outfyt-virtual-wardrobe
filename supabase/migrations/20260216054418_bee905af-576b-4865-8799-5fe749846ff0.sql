
-- Create storage bucket for try-on photos
INSERT INTO storage.buckets (id, name, public) VALUES ('tryon-photos', 'tryon-photos', true);

-- Users can upload their own photos
CREATE POLICY "Users can upload own tryon photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tryon-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own photos
CREATE POLICY "Users can view own tryon photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tryon-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own photos
CREATE POLICY "Users can delete own tryon photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'tryon-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
