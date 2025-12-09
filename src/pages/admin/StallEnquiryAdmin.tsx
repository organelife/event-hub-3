import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Store, Construction } from 'lucide-react';

export default function StallEnquiryAdmin() {
  const { admin, isLoading } = useAdminAuth();
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Stall Enquiry Management
            </CardTitle>
            <CardDescription>Manage stall enquiries from the public</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Construction className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-muted-foreground max-w-md">
                Stall enquiry management features will be available here. You'll be able to view and manage enquiries from potential stall vendors.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
