-- Create table for stall enquiry form fields (configurable by admin)
CREATE TABLE public.stall_enquiry_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- text, textarea, select, radio
  options JSONB, -- for select/radio options
  is_required BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  show_conditional_on TEXT, -- field_id to show this field conditionally
  conditional_value TEXT, -- value that triggers showing this field
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for stall enquiry submissions
CREATE TABLE public.stall_enquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  panchayath_id UUID REFERENCES public.panchayaths(id),
  ward_id UUID REFERENCES public.wards(id),
  responses JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stall_enquiry_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stall_enquiries ENABLE ROW LEVEL SECURITY;

-- RLS policies for stall_enquiry_fields
CREATE POLICY "Allow public read stall_enquiry_fields" ON public.stall_enquiry_fields FOR SELECT USING (true);
CREATE POLICY "Allow public insert stall_enquiry_fields" ON public.stall_enquiry_fields FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update stall_enquiry_fields" ON public.stall_enquiry_fields FOR UPDATE USING (true);
CREATE POLICY "Allow public delete stall_enquiry_fields" ON public.stall_enquiry_fields FOR DELETE USING (true);

-- RLS policies for stall_enquiries
CREATE POLICY "Allow public read stall_enquiries" ON public.stall_enquiries FOR SELECT USING (true);
CREATE POLICY "Allow public insert stall_enquiries" ON public.stall_enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update stall_enquiries" ON public.stall_enquiries FOR UPDATE USING (true);
CREATE POLICY "Allow public delete stall_enquiries" ON public.stall_enquiries FOR DELETE USING (true);

-- Insert default fields based on user's requirements
INSERT INTO public.stall_enquiry_fields (field_label, field_type, options, display_order, is_required) VALUES
('കൊണ്ടുവരാൻ ഉദ്ദേശിക്കുന്ന ഉൽപ്പന്നം', 'text', NULL, 1, true),
('സ്വന്തമായി ഉണ്ടാക്കിയതാണോ?', 'radio', '["അതെ", "അല്ല"]', 2, true),
('നിങ്ങള്ക്ക് പരിശീലനം ലഭിച്ചിട്ടുണ്ടോ?', 'radio', '["അതെ", "അല്ല"]', 3, true),
('ഉൽപ്പന്നത്തിന് പ്രത്യേക ലൈസൻസ് നേടിയിട്ടുണ്ടോ?', 'radio', '["അതെ", "ഇല്ല"]', 4, true),
('നിങ്ങൾക്ക് മുൻപരിചയം ഉണ്ടോ?', 'radio', '["അതെ", "ഇല്ല"]', 5, true),
('ഉൽപ്പന്നത്തിന് ബ്രാൻഡ് നെയിം ഉണ്ടോ?', 'radio', '["അതെ", "ഇല്ല"]', 6, true),
('ഉൽപ്പന്നം വിൽക്കുന്നത്', 'radio', '["തൂക്കത്തിൽ", "എണ്ണത്തിൽ"]', 7, true),
('വിൽക്കുമ്പോൾ നിങ്ങൾക്ക് ലഭിക്കേണ്ട തുക (Cost Price)', 'text', NULL, 8, true),
('ഉപഭോക്താവിന് വിൽക്കുന്ന വില (Selling Price / MRP)', 'text', NULL, 9, true),
('നിങ്ങൾ വിലയിൽ വിട്ടുവീഴ്ചക്ക് തയ്യാറുണ്ടോ?', 'radio', '["അതെ", "ഇല്ല"]', 10, true),
('നിങ്ങള്ക്ക് പ്രത്യേകം എന്തെങ്കിലും സൗകര്യം ആവശ്യപ്പെടുന്നുണ്ടോ?', 'radio', '["അതെ", "ഇല്ല"]', 11, true),
('സൗകര്യത്തിന്റെ വിശദാംശങ്ങൾ', 'textarea', NULL, 12, false),
('നിങ്ങൾ എവിടെ നിന്നാണ് സംരംഭക മേളയെക്കുറിച്ച് അറിഞ്ഞത്?', 'radio', '["ഏജന്റ്മാർ വഴി", "WhatsApp പരസ്യം", "മറ്റുള്ളവ"]', 13, true);

-- Add trigger for updated_at
CREATE TRIGGER update_stall_enquiry_fields_updated_at
BEFORE UPDATE ON public.stall_enquiry_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stall_enquiries_updated_at
BEFORE UPDATE ON public.stall_enquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();