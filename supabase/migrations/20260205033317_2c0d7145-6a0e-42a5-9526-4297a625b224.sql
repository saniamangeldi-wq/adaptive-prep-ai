-- Create conversation attachments table
CREATE TABLE public.conversation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'document', 'url', 'web_search')),
  file_name TEXT,
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  extracted_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_attachments_conversation ON public.conversation_attachments(conversation_id);
CREATE INDEX idx_attachments_user ON public.conversation_attachments(user_id);

-- Enable RLS
ALTER TABLE public.conversation_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own attachments"
ON public.conversation_attachments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attachments"
ON public.conversation_attachments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments"
ON public.conversation_attachments FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for conversation uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-uploads',
  'conversation-uploads',
  true,
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for the bucket
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'conversation-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view conversation uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'conversation-uploads');

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'conversation-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);