import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Copy, Check, Share2 } from "lucide-react";

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

export function SurveyCreate() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    panchayath_id: "",
    ward_id: ""
  });
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: panchayaths } = useQuery({
    queryKey: ['panchayaths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panchayaths')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Panchayath[];
    },
  });

  const { data: wards } = useQuery({
    queryKey: ['wards', formData.panchayath_id],
    queryFn: async () => {
      if (!formData.panchayath_id) return [];
      const { data, error } = await supabase
        .from('wards')
        .select('*')
        .eq('panchayath_id', formData.panchayath_id)
        .order('ward_number');
      if (error) throw error;
      return data as Ward[];
    },
    enabled: !!formData.panchayath_id,
  });

  const shareMutation = useMutation({
    mutationFn: async (shareData: { name: string; mobile: string; panchayath_id: string; ward_id: string }) => {
      const { error } = await supabase
        .from('survey_shares')
        .insert(shareData);
      if (error) throw error;
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectedPanchayath = panchayaths?.find(p => p.id === formData.panchayath_id);
  const selectedWard = wards?.find(w => w.id === formData.ward_id);

  const generateLink = async () => {
    if (!formData.name || !formData.mobile || !formData.panchayath_id || !formData.ward_id) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to generate the link.",
        variant: "destructive"
      });
      return;
    }

    // Save the share to database
    try {
      await shareMutation.mutateAsync({
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        panchayath_id: formData.panchayath_id,
        ward_id: formData.ward_id
      });
    } catch (error) {
      console.error('Error saving share:', error);
    }

    // Create the view page URL with query params
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      name: formData.name.trim(),
      panchayath: selectedPanchayath?.name || '',
      ward: selectedWard?.ward_number || ''
    });
    const viewUrl = `${baseUrl}/survey-view?${params.toString()}`;
    
    setGeneratedLink(viewUrl);
    
    toast({
      title: "Link Generated!",
      description: "Your survey link has been created successfully."
    });
  };

  const getWhatsAppLink = () => {
    const message = encodeURIComponent(
      `🎉 Check out our event!\n\n` +
      `👤 Shared by: ${formData.name}\n` +
      `📍 ${selectedPanchayath?.name || ''}, Ward ${selectedWard?.ward_number || ''}\n\n` +
      `View details here:\n${generatedLink}`
    );
    return `https://wa.me/?text=${message}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Create Survey Link
          </CardTitle>
          <CardDescription>
            Fill in your details to generate a personalized WhatsApp share link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              name="mobile"
              type="tel"
              placeholder="Enter your mobile number"
              value={formData.mobile}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="panchayath">Panchayath</Label>
            <Select 
              value={formData.panchayath_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, panchayath_id: value, ward_id: '' }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select panchayath" />
              </SelectTrigger>
              <SelectContent>
                {panchayaths?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="ward">Ward</Label>
            <Select 
              value={formData.ward_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, ward_id: value }))}
              disabled={!formData.panchayath_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.panchayath_id ? "Select ward" : "Select panchayath first"} />
              </SelectTrigger>
              <SelectContent>
                {wards?.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    Ward {w.ward_number} {w.ward_name ? `- ${w.ward_name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={generateLink} className="w-full" disabled={shareMutation.isPending}>
            {shareMutation.isPending ? 'Generating...' : 'Generate Link'}
          </Button>
          
          {generatedLink && (
            <div className="mt-6 space-y-4 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Generated Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button
                asChild
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Share on WhatsApp
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
