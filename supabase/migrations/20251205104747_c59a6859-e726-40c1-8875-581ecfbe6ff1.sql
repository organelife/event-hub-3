-- Create enum types
CREATE TYPE public.team_role AS ENUM ('admin', 'official', 'volunteer');
CREATE TYPE public.payment_type AS ENUM ('participant', 'other');
CREATE TYPE public.registration_type AS ENUM ('stall_counter', 'employment_booking', 'employment_registration');

-- Programs table
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue TEXT NOT NULL,
  location_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'volunteer',
  mobile TEXT,
  email TEXT,
  responsibilities TEXT,
  shift_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stalls table
CREATE TABLE public.stalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_name TEXT NOT NULL UNIQUE,
  participant_name TEXT NOT NULL,
  mobile TEXT,
  email TEXT,
  is_verified BOOLEAN DEFAULT false,
  registration_fee NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products table (per stall)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stall_id UUID REFERENCES public.stalls(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  event_margin NUMERIC(5,2) DEFAULT 20.00,
  selling_price NUMERIC(10,2) GENERATED ALWAYS AS (cost_price * (1 + event_margin/100)) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Billing transactions table
CREATE TABLE public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stall_id UUID REFERENCES public.stalls(id) ON DELETE CASCADE NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Registrations table
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_type registration_type NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT,
  category TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  receipt_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type payment_type NOT NULL,
  stall_id UUID REFERENCES public.stalls(id) ON DELETE SET NULL,
  total_billed NUMERIC(10,2) DEFAULT 0,
  margin_deducted NUMERIC(10,2) DEFAULT 0,
  amount_paid NUMERIC(10,2) NOT NULL,
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (for now, since no auth is implemented)
CREATE POLICY "Allow public read" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.programs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.programs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.programs FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.team_members FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.team_members FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.stalls FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.stalls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.stalls FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.stalls FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.billing_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.billing_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.billing_transactions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.billing_transactions FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.registrations FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.registrations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.registrations FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.payments FOR DELETE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stalls_updated_at BEFORE UPDATE ON public.stalls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();