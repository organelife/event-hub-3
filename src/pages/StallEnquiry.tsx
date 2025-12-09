import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Store, Send, CheckCircle } from 'lucide-react';

interface EnquiryField {
  id: string;
  field_label: string;
  field_type: string;
  options: string[] | null;
  is_required: boolean;
  display_order: number;
  show_conditional_on: string | null;
  conditional_value: string | null;
}

interface Panchayath {
  id: string;
  name: string;
}

interface Ward {
  id: string;
  ward_number: string;
  ward_name: string | null;
  panchayath_id: string;
}

export default function StallEnquiry() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedPanchayath, setSelectedPanchayath] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fetch form fields
  const { data: fields = [] } = useQuery({
    queryKey: ['stall-enquiry-fields'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stall_enquiry_fields')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as EnquiryField[];
    }
  });

  // Fetch panchayaths
  const { data: panchayaths = [] } = useQuery({
    queryKey: ['panchayaths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panchayaths')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Panchayath[];
    }
  });

  // Fetch wards for selected panchayath
  const { data: wards = [] } = useQuery({
    queryKey: ['wards', selectedPanchayath],
    queryFn: async () => {
      if (!selectedPanchayath) return [];
      const { data, error } = await supabase
        .from('wards')
        .select('*')
        .eq('panchayath_id', selectedPanchayath)
        .order('ward_number');
      if (error) throw error;
      return data as Ward[];
    },
    enabled: !!selectedPanchayath
  });

  // Reset ward when panchayath changes
  useEffect(() => {
    setSelectedWard('');
  }, [selectedPanchayath]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('stall_enquiries')
        .insert({
          name,
          mobile,
          panchayath_id: selectedPanchayath || null,
          ward_id: selectedWard || null,
          responses
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({ title: 'അപേക്ഷ സമർപ്പിച്ചു!', description: 'നിങ്ങളുടെ അപേക്ഷ വിജയകരമായി സമർപ്പിച്ചു.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleResponseChange = (fieldId: string, value: string) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const shouldShowField = (field: EnquiryField) => {
    if (!field.show_conditional_on) return true;
    return responses[field.show_conditional_on] === field.conditional_value;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({ title: 'പേര് നൽകുക', variant: 'destructive' });
      return;
    }
    if (!mobile.trim() || mobile.length < 10) {
      toast({ title: 'സാധുവായ മൊബൈൽ നമ്പർ നൽകുക', variant: 'destructive' });
      return;
    }
    if (!selectedPanchayath) {
      toast({ title: 'പഞ്ചായത്ത് തിരഞ്ഞെടുക്കുക', variant: 'destructive' });
      return;
    }
    if (!selectedWard) {
      toast({ title: 'വാർഡ് തിരഞ്ഞെടുക്കുക', variant: 'destructive' });
      return;
    }

    // Check required fields
    for (const field of fields) {
      if (field.is_required && shouldShowField(field) && !responses[field.id]) {
        toast({ title: `${field.field_label} നൽകുക`, variant: 'destructive' });
        return;
      }
    }

    submitMutation.mutate();
  };

  if (isSubmitted) {
    return (
      <PageLayout>
        <div className="container py-8 max-w-2xl mx-auto">
          <Card className="text-center">
            <CardContent className="pt-12 pb-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">അപേക്ഷ സമർപ്പിച്ചു!</h2>
              <p className="text-muted-foreground mb-6">
                നിങ്ങളുടെ സ്റ്റാൾ അന്വേഷണം വിജയകരമായി സമർപ്പിച്ചു. ഞങ്ങൾ ഉടൻ നിങ്ങളെ ബന്ധപ്പെടും.
              </p>
              <Button onClick={() => window.location.reload()}>
                പുതിയ അപേക്ഷ സമർപ്പിക്കുക
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              സ്റ്റാൾ അന്വേഷണ ഫോം
            </CardTitle>
            <CardDescription>
              സംരംഭക മേളയിൽ സ്റ്റാൾ അന്വേഷണത്തിനായി താഴെയുള്ള ഫോം പൂരിപ്പിക്കുക
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Fixed fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">പേര് *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="നിങ്ങളുടെ പേര്"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="mobile">മൊബൈൽ നമ്പർ *</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="നിങ്ങളുടെ മൊബൈൽ നമ്പർ"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="panchayath">പഞ്ചായത്ത് *</Label>
                  <Select value={selectedPanchayath} onValueChange={setSelectedPanchayath}>
                    <SelectTrigger>
                      <SelectValue placeholder="പഞ്ചായത്ത് തിരഞ്ഞെടുക്കുക" />
                    </SelectTrigger>
                    <SelectContent>
                      {panchayaths.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ward">വാർഡ് *</Label>
                  <Select value={selectedWard} onValueChange={setSelectedWard} disabled={!selectedPanchayath}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedPanchayath ? "വാർഡ് തിരഞ്ഞെടുക്കുക" : "ആദ്യം പഞ്ചായത്ത് തിരഞ്ഞെടുക്കുക"} />
                    </SelectTrigger>
                    <SelectContent>
                      {wards.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          വാർഡ് {w.ward_number} {w.ward_name ? `- ${w.ward_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic fields from database */}
              <div className="space-y-4 pt-4 border-t">
                {fields.map((field) => {
                  if (!shouldShowField(field)) return null;

                  return (
                    <div key={field.id}>
                      <Label>
                        {field.field_label} {field.is_required && '*'}
                      </Label>
                      
                      {field.field_type === 'text' && (
                        <Input
                          value={responses[field.id] || ''}
                          onChange={(e) => handleResponseChange(field.id, e.target.value)}
                          placeholder={field.field_label}
                        />
                      )}

                      {field.field_type === 'textarea' && (
                        <Textarea
                          value={responses[field.id] || ''}
                          onChange={(e) => handleResponseChange(field.id, e.target.value)}
                          placeholder={field.field_label}
                        />
                      )}

                      {field.field_type === 'radio' && field.options && (
                        <RadioGroup
                          value={responses[field.id] || ''}
                          onValueChange={(value) => handleResponseChange(field.id, value)}
                          className="mt-2"
                        >
                          {(field.options as string[]).map((option) => (
                            <div key={option} className="flex items-center space-x-2">
                              <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                              <Label htmlFor={`${field.id}-${option}`} className="font-normal cursor-pointer">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {field.field_type === 'select' && field.options && (
                        <Select
                          value={responses[field.id] || ''}
                          onValueChange={(value) => handleResponseChange(field.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="തിരഞ്ഞെടുക്കുക" />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options as string[]).map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {submitMutation.isPending ? 'സമർപ്പിക്കുന്നു...' : 'സമർപ്പിക്കുക'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
