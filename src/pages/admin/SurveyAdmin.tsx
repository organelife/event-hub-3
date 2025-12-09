import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { PanchayathManagement } from '@/components/admin/survey/PanchayathManagement';
import { SurveyResults } from '@/components/admin/survey/SurveyResults';
import { SurveyContentManagement } from '@/components/admin/survey/SurveyContentManagement';
import { MapPin, BarChart3, FileVideo } from 'lucide-react';

export default function SurveyAdmin() {
  const { admin, isLoading, isSuperAdmin } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !admin) {
      navigate('/admin-login');
    }
  }, [admin, isLoading, navigate]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  if (!admin) return null;

  return (
    <PageLayout>
      <div className="container py-8">
        <Tabs defaultValue="panchayath" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="panchayath" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Panchayath & Wards
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Survey Results
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileVideo className="h-4 w-4" />
              View Page Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="panchayath">
            <PanchayathManagement />
          </TabsContent>

          <TabsContent value="results">
            <SurveyResults />
          </TabsContent>

          <TabsContent value="content">
            <SurveyContentManagement />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
