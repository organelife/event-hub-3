import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Video, Image, FileText, GripVertical } from 'lucide-react';

interface SurveyContent {
  id: string;
  content_type: string;
  title: string;
  content_url: string | null;
  content_text: string | null;
  display_order: number;
  is_active: boolean;
}

type ContentType = 'video' | 'poster' | 'writeup';

export function SurveyContentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ContentType>('video');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content_url: '',
    content_text: '',
  });

  const { data: contents, isLoading } = useQuery({
    queryKey: ['survey-content', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_content')
        .select('*')
        .eq('content_type', activeTab)
        .order('display_order');
      if (error) throw error;
      return data as SurveyContent[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: { title: string; content_url?: string; content_text?: string; content_type: string }) => {
      const maxOrder = contents?.reduce((max, c) => Math.max(max, c.display_order), 0) || 0;
      const { error } = await supabase
        .from('survey_content')
        .insert({ 
          ...content, 
          display_order: maxOrder + 1,
          content_url: content.content_url || null,
          content_text: content.content_text || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-content', activeTab] });
      setFormData({ title: '', content_url: '', content_text: '' });
      setIsAddOpen(false);
      toast({ title: 'Content added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding content', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('survey_content')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-content', activeTab] });
      toast({ title: 'Content updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating content', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('survey_content')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-content', activeTab] });
      toast({ title: 'Content deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting content', description: error.message, variant: 'destructive' });
    },
  });

  const handleAdd = () => {
    if (!formData.title.trim()) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }
    if (activeTab !== 'writeup' && !formData.content_url.trim()) {
      toast({ title: 'Please enter a URL', variant: 'destructive' });
      return;
    }
    if (activeTab === 'writeup' && !formData.content_text.trim()) {
      toast({ title: 'Please enter content text', variant: 'destructive' });
      return;
    }

    addMutation.mutate({
      title: formData.title.trim(),
      content_url: formData.content_url.trim() || undefined,
      content_text: formData.content_text.trim() || undefined,
      content_type: activeTab,
    });
  };

  const getIcon = (type: ContentType) => {
    switch (type) {
      case 'video': return Video;
      case 'poster': return Image;
      case 'writeup': return FileText;
    }
  };

  const ContentIcon = getIcon(activeTab);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ContentIcon className="h-5 w-5" />
          View Page Content
        </CardTitle>
        <CardDescription>Manage videos, posters, and writeups for the survey view page</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="video" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="poster" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Posters
              </TabsTrigger>
              <TabsTrigger value="writeup" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Writeups
              </TabsTrigger>
            </TabsList>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter title"
                    />
                  </div>
                  {activeTab !== 'writeup' && (
                    <div>
                      <Label htmlFor="url">
                        {activeTab === 'video' ? 'Video URL (YouTube, etc.)' : 'Image URL'}
                      </Label>
                      <Input
                        id="url"
                        value={formData.content_url}
                        onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                        placeholder={activeTab === 'video' ? 'https://youtube.com/...' : 'https://...'}
                      />
                    </div>
                  )}
                  {activeTab === 'writeup' && (
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={formData.content_text}
                        onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                        placeholder="Enter writeup content"
                        rows={6}
                      />
                    </div>
                  )}
                  <Button onClick={handleAdd} disabled={addMutation.isPending} className="w-full">
                    {addMutation.isPending ? 'Adding...' : 'Add Content'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : contents && contents.length > 0 ? (
              <div className="space-y-4">
                {contents.map((content) => (
                  <Card key={content.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <div className="flex-1">
                        <h4 className="font-medium">{content.title}</h4>
                        {content.content_url && (
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {content.content_url}
                          </p>
                        )}
                        {content.content_text && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {content.content_text}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${content.id}`} className="text-sm">Active</Label>
                          <Switch
                            id={`active-${content.id}`}
                            checked={content.is_active}
                            onCheckedChange={(is_active) => updateMutation.mutate({ id: content.id, is_active })}
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(content.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No {activeTab}s added yet. Click "Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}" to get started.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
