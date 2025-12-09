import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';

interface Ward {
  id: string;
  ward_number: string;
  ward_name: string | null;
  panchayath_id: string;
}

interface WardManagementProps {
  panchayath: { id: string; name: string };
  onBack: () => void;
}

export function WardManagement({ panchayath, onBack }: WardManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [wardNumber, setWardNumber] = useState('');
  const [wardName, setWardName] = useState('');

  const { data: wards, isLoading } = useQuery({
    queryKey: ['wards', panchayath.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wards')
        .select('*')
        .eq('panchayath_id', panchayath.id)
        .order('ward_number');
      if (error) throw error;
      return data as Ward[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ ward_number, ward_name }: { ward_number: string; ward_name: string }) => {
      const { error } = await supabase
        .from('wards')
        .insert({ 
          panchayath_id: panchayath.id, 
          ward_number, 
          ward_name: ward_name || null 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wards', panchayath.id] });
      setWardNumber('');
      setWardName('');
      setIsAddOpen(false);
      toast({ title: 'Ward added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding ward', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wards')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wards', panchayath.id] });
      toast({ title: 'Ward deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting ward', description: error.message, variant: 'destructive' });
    },
  });

  const handleAdd = () => {
    if (!wardNumber.trim()) {
      toast({ title: 'Please enter a ward number', variant: 'destructive' });
      return;
    }
    addMutation.mutate({ ward_number: wardNumber.trim(), ward_name: wardName.trim() });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>Wards - {panchayath.name}</CardTitle>
            <CardDescription>Manage wards for this panchayath</CardDescription>
          </div>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Ward
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Ward</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ward-number">Ward Number</Label>
                <Input
                  id="ward-number"
                  value={wardNumber}
                  onChange={(e) => setWardNumber(e.target.value)}
                  placeholder="e.g., 1, 2, 3..."
                />
              </div>
              <div>
                <Label htmlFor="ward-name">Ward Name (Optional)</Label>
                <Input
                  id="ward-name"
                  value={wardName}
                  onChange={(e) => setWardName(e.target.value)}
                  placeholder="Enter ward name"
                />
              </div>
              <Button onClick={handleAdd} disabled={addMutation.isPending} className="w-full">
                {addMutation.isPending ? 'Adding...' : 'Add Ward'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : wards && wards.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ward Number</TableHead>
                <TableHead>Ward Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wards.map((ward) => (
                <TableRow key={ward.id}>
                  <TableCell className="font-medium">{ward.ward_number}</TableCell>
                  <TableCell>{ward.ward_name || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(ward.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No wards added yet. Click "Add Ward" to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
