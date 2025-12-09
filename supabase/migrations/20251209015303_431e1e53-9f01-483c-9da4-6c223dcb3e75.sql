-- Create panchayaths table
CREATE TABLE public.panchayaths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wards table
CREATE TABLE public.wards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panchayath_id UUID NOT NULL REFERENCES public.panchayaths(id) ON DELETE CASCADE,
  ward_number TEXT NOT NULL,
  ward_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(panchayath_id, ward_number)
);

-- Create survey_shares table to track shares
CREATE TABLE public.survey_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  panchayath_id UUID NOT NULL REFERENCES public.panchayaths(id) ON DELETE CASCADE,
  ward_id UUID NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  view_count INTEGER DEFAULT 0
);

-- Create survey_content table for videos, posters, writeups
CREATE TABLE public.survey_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'poster', 'writeup')),
  title TEXT NOT NULL,
  content_url TEXT,
  content_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.panchayaths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_content ENABLE ROW LEVEL SECURITY;

-- RLS policies for panchayaths (public read, admin write)
CREATE POLICY "Allow public read panchayaths" ON public.panchayaths FOR SELECT USING (true);
CREATE POLICY "Allow public insert panchayaths" ON public.panchayaths FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update panchayaths" ON public.panchayaths FOR UPDATE USING (true);
CREATE POLICY "Allow public delete panchayaths" ON public.panchayaths FOR DELETE USING (true);

-- RLS policies for wards (public read, admin write)
CREATE POLICY "Allow public read wards" ON public.wards FOR SELECT USING (true);
CREATE POLICY "Allow public insert wards" ON public.wards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update wards" ON public.wards FOR UPDATE USING (true);
CREATE POLICY "Allow public delete wards" ON public.wards FOR DELETE USING (true);

-- RLS policies for survey_shares (public read/insert for tracking)
CREATE POLICY "Allow public read survey_shares" ON public.survey_shares FOR SELECT USING (true);
CREATE POLICY "Allow public insert survey_shares" ON public.survey_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update survey_shares" ON public.survey_shares FOR UPDATE USING (true);
CREATE POLICY "Allow public delete survey_shares" ON public.survey_shares FOR DELETE USING (true);

-- RLS policies for survey_content (public read, admin write)
CREATE POLICY "Allow public read survey_content" ON public.survey_content FOR SELECT USING (true);
CREATE POLICY "Allow public insert survey_content" ON public.survey_content FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update survey_content" ON public.survey_content FOR UPDATE USING (true);
CREATE POLICY "Allow public delete survey_content" ON public.survey_content FOR DELETE USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_panchayaths_updated_at BEFORE UPDATE ON public.panchayaths FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wards_updated_at BEFORE UPDATE ON public.wards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_survey_content_updated_at BEFORE UPDATE ON public.survey_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();