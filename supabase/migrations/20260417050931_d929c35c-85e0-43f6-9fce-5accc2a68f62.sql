
-- Roles enum + table (separate from profiles to prevent privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text,
  gstin text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  gstin text,
  total_invoices int NOT NULL DEFAULT 0,
  matched_invoices int NOT NULL DEFAULT 0,
  mismatch_rate numeric NOT NULL DEFAULT 0,
  filing_consistency numeric NOT NULL DEFAULT 100,
  risk_score numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'low',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gstin)
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  invoice_number text,
  invoice_date date,
  vendor_name text,
  vendor_gstin text,
  buyer_gstin text,
  taxable_amount numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  igst numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  invoice_type text NOT NULL DEFAULT 'purchase', -- 'purchase' | 'sales'
  status text NOT NULL DEFAULT 'pending', -- pending | matched | mismatched | missing | flagged
  confidence_score numeric DEFAULT 0,
  raw_ocr_text text,
  validation_issues jsonb DEFAULT '[]'::jsonb,
  fraud_flags jsonb DEFAULT '[]'::jsonb,
  file_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_user ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(user_id, status);
CREATE INDEX idx_invoices_vendor_gstin ON public.invoices(vendor_gstin);

-- Mock GSTR-2B records (vendor-side filings as per government)
CREATE TABLE public.gst_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date date,
  vendor_name text,
  vendor_gstin text NOT NULL,
  taxable_amount numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  igst numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'GSTR-2B',
  filing_period text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gst_records_user ON public.gst_records(user_id);
CREATE INDEX idx_gst_records_lookup ON public.gst_records(user_id, vendor_gstin, invoice_number);

CREATE TABLE public.reconciliation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  gst_record_id uuid REFERENCES public.gst_records(id) ON DELETE SET NULL,
  match_type text NOT NULL, -- matched | mismatched | missing_in_books | missing_in_gst
  difference jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recon_user ON public.reconciliation_results(user_id);

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info', -- info | warning | critical
  category text NOT NULL DEFAULT 'general', -- compliance | fraud | deadline | mismatch | itc
  is_read boolean NOT NULL DEFAULT false,
  related_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_user ON public.alerts(user_id, is_read);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto create profile + role + seed demo data on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := NEW.id;
BEGIN
  INSERT INTO public.profiles (user_id, email, business_name, gstin)
  VALUES (v_uid, NEW.email, COALESCE(NEW.raw_user_meta_data->>'business_name','My Business'), '27AAAPL1234C1ZV');
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'user');

  -- Seed mock GSTR-2B records
  INSERT INTO public.gst_records (user_id, invoice_number, invoice_date, vendor_name, vendor_gstin, taxable_amount, cgst, sgst, igst, total_amount, filing_period) VALUES
  (v_uid,'INV-2024-001','2024-10-05','Reliable Supplies Pvt Ltd','29AABCR1234M1Z5',50000,4500,4500,0,59000,'Oct-2024'),
  (v_uid,'INV-2024-002','2024-10-08','Mumbai Traders LLP','27AAACM5678N1Z3',25000,0,0,4500,29500,'Oct-2024'),
  (v_uid,'INV-2024-003','2024-10-12','Bharat Steel Industries','24AAACB9012P1Z7',120000,10800,10800,0,141600,'Oct-2024'),
  (v_uid,'INV-2024-004','2024-10-15','Delhi Office Solutions','07AABCD3456Q1Z9',8000,720,720,0,9440,'Oct-2024'),
  (v_uid,'INV-2024-005','2024-10-18','South Tech Components','33AAACS7890R1Z1',75000,0,0,13500,88500,'Oct-2024'),
  (v_uid,'INV-2024-006','2024-10-22','Gujarat Fabricators','24AAACG2345S1Z3',42000,3780,3780,0,49560,'Oct-2024'),
  (v_uid,'INV-2024-007','2024-10-25','Bangalore IT Services','29AABCB6789T1Z5',95000,8550,8550,0,112100,'Oct-2024'),
  (v_uid,'INV-2024-008','2024-10-28','Chennai Logistics Co','33AAACC1234U1Z7',18000,0,0,3240,21240,'Oct-2024'),
  (v_uid,'INV-2024-009','2024-11-02','Pune Electronics Hub','27AAACP5678V1Z9',62000,5580,5580,0,73160,'Nov-2024'),
  (v_uid,'INV-2024-010','2024-11-05','Hyderabad Marketing','36AAACH9012W1Z1',15000,1350,1350,0,17700,'Nov-2024'),
  (v_uid,'INV-2024-011','2024-11-10','Kolkata Imports','19AAACK3456X1Z3',88000,0,0,15840,103840,'Nov-2024'),
  (v_uid,'INV-2024-012','2024-11-14','Ahmedabad Textiles','24AAACA7890Y1Z5',35000,3150,3150,0,41300,'Nov-2024'),
  (v_uid,'INV-2024-013','2024-11-18','Jaipur Crafts Co','08AAACJ1234Z1Z7',22000,1980,1980,0,25960,'Nov-2024'),
  (v_uid,'INV-2024-014','2024-11-22','Lucknow Suppliers','09AAACL5678A1Z9',47000,0,0,8460,55460,'Nov-2024'),
  (v_uid,'INV-2024-015','2024-11-26','Indore Machinery','23AAACI9012B1Z1',155000,13950,13950,0,182900,'Nov-2024');

  -- Seed sample invoices: matched, mismatched, missing scenarios
  INSERT INTO public.invoices (user_id, invoice_number, invoice_date, vendor_name, vendor_gstin, taxable_amount, cgst, sgst, igst, total_amount, status, confidence_score) VALUES
  -- These will match GST records
  (v_uid,'INV-2024-001','2024-10-05','Reliable Supplies Pvt Ltd','29AABCR1234M1Z5',50000,4500,4500,0,59000,'matched',0.98),
  (v_uid,'INV-2024-002','2024-10-08','Mumbai Traders LLP','27AAACM5678N1Z3',25000,0,0,4500,29500,'matched',0.96),
  (v_uid,'INV-2024-003','2024-10-12','Bharat Steel Industries','24AAACB9012P1Z7',120000,10800,10800,0,141600,'matched',0.99),
  (v_uid,'INV-2024-005','2024-10-18','South Tech Components','33AAACS7890R1Z1',75000,0,0,13500,88500,'matched',0.97),
  (v_uid,'INV-2024-007','2024-10-25','Bangalore IT Services','29AABCB6789T1Z5',95000,8550,8550,0,112100,'matched',0.98),
  -- Mismatched amounts
  (v_uid,'INV-2024-004','2024-10-15','Delhi Office Solutions','07AABCD3456Q1Z9',8500,765,765,0,10030,'mismatched',0.92),
  (v_uid,'INV-2024-009','2024-11-02','Pune Electronics Hub','27AAACP5678V1Z9',62000,5400,5400,0,72800,'mismatched',0.89),
  -- User-only (missing in GST)
  (v_uid,'INV-2024-100','2024-11-08','Unknown Vendor Co','27ABCDE1234F1Z5',30000,2700,2700,0,35400,'missing',0.85),
  (v_uid,'INV-2024-101','2024-11-15','Cash Vendor','',12000,1080,1080,0,14160,'flagged',0.65),
  (v_uid,'INV-2024-011','2024-11-10','Kolkata Imports','19AAACK3456X1Z3',88000,0,0,15840,103840,'matched',0.95);

  -- Seed alerts
  INSERT INTO public.alerts (user_id, title, message, severity, category) VALUES
  (v_uid, 'GSTR-3B filing due', 'Your GSTR-3B for November 2024 is due on 20th December.', 'warning', 'deadline'),
  (v_uid, 'Mismatch detected', '2 invoices have amount mismatches with GSTR-2B records.', 'warning', 'mismatch'),
  (v_uid, 'Missing GSTIN', 'Invoice INV-2024-101 was uploaded without a vendor GSTIN.', 'critical', 'compliance'),
  (v_uid, 'Potential ITC missed', '5 GSTR-2B invoices have no matching purchase entry in your books.', 'info', 'itc');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own roles select" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "own vendors all" ON public.vendors FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own invoices all" ON public.invoices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own gst_records all" ON public.gst_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own recon all" ON public.reconciliation_results FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own alerts all" ON public.alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices','invoices', false) ON CONFLICT DO NOTHING;
CREATE POLICY "users read own invoice files" ON storage.objects FOR SELECT USING (bucket_id='invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users upload own invoice files" ON storage.objects FOR INSERT WITH CHECK (bucket_id='invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own invoice files" ON storage.objects FOR DELETE USING (bucket_id='invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
