-- Create storage bucket for AI-generated documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-documents', 'generated-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to the bucket
CREATE POLICY "Authenticated users can upload generated documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow anyone to read (download) generated documents
CREATE POLICY "Generated documents are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-documents');

-- Allow users to delete their own generated documents
CREATE POLICY "Users can delete their own generated documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);