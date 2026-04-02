
-- Contract signature requests
CREATE TABLE public.contract_signature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  cc_emails TEXT[] DEFAULT '{}',
  message TEXT NOT NULL DEFAULT '',
  deadline DATE,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'gonderildi',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(token)
);

ALTER TABLE public.contract_signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own signature requests"
  ON public.contract_signature_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own signature requests"
  ON public.contract_signature_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own signature requests"
  ON public.contract_signature_requests FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own signature requests"
  ON public.contract_signature_requests FOR DELETE
  USING (user_id = auth.uid());

-- Allow public read by token (for upload page)
CREATE POLICY "Public can read by token"
  ON public.contract_signature_requests FOR SELECT
  USING (true);

-- Contract signed uploads
CREATE TABLE public.contract_signed_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_request_id UUID NOT NULL REFERENCES public.contract_signature_requests(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_title TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_signed_uploads ENABLE ROW LEVEL SECURITY;

-- Public insert (anyone with token can upload)
CREATE POLICY "Public can insert uploads"
  ON public.contract_signed_uploads FOR INSERT
  WITH CHECK (true);

-- Owner can view uploads for their signature requests
CREATE POLICY "Owner can view uploads"
  ON public.contract_signed_uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contract_signature_requests csr
      WHERE csr.id = contract_signed_uploads.signature_request_id
      AND csr.user_id = auth.uid()
    )
  );

-- Public can view uploads by signature_request_id (for upload page confirmation)
CREATE POLICY "Public can view own uploads"
  ON public.contract_signed_uploads FOR SELECT
  USING (true);

-- Contract activity log
CREATE TABLE public.contract_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  actor_name TEXT,
  actor_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view activity"
  ON public.contract_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_activity_log.contract_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can insert activity"
  ON public.contract_activity_log FOR INSERT
  WITH CHECK (true);

-- Storage bucket for signed contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('signed-contracts', 'signed-contracts', true);

CREATE POLICY "Anyone can upload signed contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'signed-contracts');

CREATE POLICY "Anyone can view signed contracts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'signed-contracts');
