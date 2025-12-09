import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { 
  Shield, Users, Settings, LogOut, UserPlus, Key, 
  Receipt, Calendar, Camera, UserCheck, UtensilsCrossed, Wallet,
  ClipboardList, Store
} from 'lucide-react';

type AppModule = 'billing' | 'team' | 'programs' | 'accounts' | 'food_court' | 'photos' | 'registrations';

const moduleConfig: Record<AppModule, { label: string; description: string; icon: typeof Shield; href: string; color: string }> = {
  billing: { label: 'Billing', description: 'Manage bills and transactions', icon: Receipt, href: '/billing', color: 'blue' },
  team: { label: 'Team', description: 'Manage team members', icon: Users, href: '/team', color: 'green' },
  programs: { label: 'Programs', description: 'Manage event programs', icon: Calendar, href: '/programs', color: 'purple' },
  accounts: { label: 'Accounts', description: 'Manage financial accounts', icon: Wallet, href: '/accounts', color: 'orange' },
  food_court: { label: 'Food Court', description: 'Manage food stalls', icon: UtensilsCrossed, href: '/food-court', color: 'red' },
  photos: { label: 'Photo Gallery', description: 'Manage event photos', icon: Camera, href: '/photo-gallery', color: 'pink' },
  registrations: { label: 'Registrations', description: 'Manage event registrations', icon: UserCheck, href: '/accounts', color: 'cyan' },
};

// Additional admin-only features (not permission based)
const additionalFeatures = [
  { label: 'Survey Management', description: 'Manage panchayaths, wards & survey content', icon: ClipboardList, href: '/admin/survey', color: 'emerald' },
  { label: 'Stall Enquiry', description: 'Manage stall enquiries', icon: Store, href: '/admin/stall-enquiry', color: 'amber' },
];

export default function AdminPanel() {
  const { admin, logout, isSuperAdmin, isLoading, hasPermission } = useAdminAuth();
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

  const handleLogout = () => {
    logout();
    navigate('/admin-login');
  };

  // Get modules the admin can access
  const accessibleModules = (Object.keys(moduleConfig) as AppModule[]).filter(
    module => isSuperAdmin() || hasPermission(module, 'read')
  );

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">Welcome, {admin.username}</span>
                <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                  {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Super Admin Management Section */}
        {isSuperAdmin() && (
          <>
            <h2 className="text-lg font-semibold mb-4">Admin Management</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Link to="/admin/manage-admins">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                      <UserPlus className="h-5 w-5 text-blue-500" />
                    </div>
                    <CardTitle className="text-lg">Manage Admins</CardTitle>
                    <CardDescription>Add, edit, or remove admin accounts</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link to="/admin/permissions">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-2">
                      <Key className="h-5 w-5 text-green-500" />
                    </div>
                    <CardTitle className="text-lg">Permission Management</CardTitle>
                    <CardDescription>Allocate permissions to admins</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              
              {/* Additional Features for Super Admin */}
              <h3 className="text-md font-medium text-muted-foreground mt-6 mb-4">Additional Features</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {additionalFeatures.map((feature) => {
                  const IconComponent = feature.icon;
                  return (
                    <Link key={feature.href} to={feature.href}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardHeader>
                          <div className={`h-10 w-10 rounded-lg bg-${feature.color}-500/10 flex items-center justify-center mb-2`}>
                            <IconComponent className={`h-5 w-5 text-${feature.color}-500`} />
                          </div>
                          <CardTitle className="text-lg">{feature.label}</CardTitle>
                          <CardDescription>{feature.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Accessible Modules Section */}
        <h2 className="text-lg font-semibold mb-4">
          {isSuperAdmin() ? 'All Modules' : 'Your Permitted Modules'}
        </h2>
        {accessibleModules.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessibleModules.map(module => {
              const config = moduleConfig[module];
              const IconComponent = config.icon;
              return (
                <Link key={module} to={config.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className={`h-10 w-10 rounded-lg bg-${config.color}-500/10 flex items-center justify-center mb-2`}>
                        <IconComponent className={`h-5 w-5 text-${config.color}-500`} />
                      </div>
                      <CardTitle className="text-lg">{config.label}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No modules assigned. Contact a Super Admin to get access.
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
