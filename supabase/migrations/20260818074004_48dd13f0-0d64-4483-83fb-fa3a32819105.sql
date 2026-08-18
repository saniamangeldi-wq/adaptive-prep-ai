CREATE TABLE public.generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_images_user_created ON public.generated_images (user_id, created_at DESC);

GRANT SELECT ON public.generated_images TO authenticated;
GRANT ALL ON public.generated_images TO service_role;

ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated images"
ON public.generated_images FOR SELECT TO authenticated
USING (auth.uid() = user_id);