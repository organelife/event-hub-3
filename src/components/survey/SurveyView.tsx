import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Video, Image, FileText } from "lucide-react";

interface SurveyContent {
  id: string;
  content_type: string;
  title: string;
  content_url: string | null;
  content_text: string | null;
  display_order: number;
  is_active: boolean;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
}

export function SurveyView() {
  const { data: videos } = useQuery({
    queryKey: ['survey-content', 'video'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_content')
        .select('*')
        .eq('content_type', 'video')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as SurveyContent[];
    },
  });

  const { data: posters } = useQuery({
    queryKey: ['survey-content', 'poster'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_content')
        .select('*')
        .eq('content_type', 'poster')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as SurveyContent[];
    },
  });

  const { data: writeups } = useQuery({
    queryKey: ['survey-content', 'writeup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_content')
        .select('*')
        .eq('content_type', 'writeup')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as SurveyContent[];
    },
  });

  return (
    <div className="space-y-8">
      {/* Video Ad Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Video Advertisement
          </CardTitle>
          <CardDescription>
            Watch our promotional videos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {videos && videos.length > 0 ? (
            videos.map((video) => {
              const embedUrl = video.content_url ? getYouTubeEmbedUrl(video.content_url) : null;
              return (
                <div key={video.id}>
                  <h4 className="font-medium mb-2">{video.title}</h4>
                  <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : video.content_url ? (
                      <video 
                        src={video.content_url} 
                        controls 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Video className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </AspectRatio>
                </div>
              );
            })
          ) : (
            <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="text-center space-y-2">
                  <Video className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No videos available yet
                  </p>
                </div>
              </div>
            </AspectRatio>
          )}
        </CardContent>
      </Card>

      {/* Poster Ad Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Poster Gallery
          </CardTitle>
          <CardDescription>
            View our event posters and promotional materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posters && posters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posters.map((poster) => (
                <div key={poster.id}>
                  <h4 className="font-medium mb-2 text-sm">{poster.title}</h4>
                  <AspectRatio ratio={3 / 4} className="bg-muted rounded-lg overflow-hidden">
                    {poster.content_url ? (
                      <img
                        src={poster.content_url}
                        alt={poster.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Image className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </AspectRatio>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((index) => (
                <AspectRatio key={index} ratio={3 / 4} className="bg-muted rounded-lg overflow-hidden">
                  <div className="flex items-center justify-center h-full bg-gradient-to-br from-accent/10 to-accent/5">
                    <div className="text-center space-y-2">
                      <Image className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No poster available
                      </p>
                    </div>
                  </div>
                </AspectRatio>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Write-ups Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Campaign Write-ups
          </CardTitle>
          <CardDescription>
            Learn more about our event and initiatives
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {writeups && writeups.length > 0 ? (
            writeups.map((writeup) => (
              <div key={writeup.id} className="p-4 bg-muted rounded-lg space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {writeup.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {writeup.content_text}
                </p>
              </div>
            ))
          ) : (
            <div className="prose prose-sm max-w-none">
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Welcome to Our Grand Event!
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We are excited to invite you to our upcoming celebration! This event promises to be a memorable experience 
                  filled with entertainment, food, and community spirit. Join us as we come together to celebrate our 
                  traditions and create lasting memories.
                </p>
                
                <h4 className="text-md font-semibold text-foreground mt-4">
                  Event Highlights
                </h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Cultural performances and entertainment</li>
                  <li>Delicious food from various stalls</li>
                  <li>Games and activities for all ages</li>
                  <li>Special programs and ceremonies</li>
                  <li>Community gathering and networking</li>
                </ul>
                
                <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-foreground font-medium">
                    📅 Don't miss out! Mark your calendars and join us for an unforgettable experience.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
