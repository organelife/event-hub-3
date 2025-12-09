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
import { Plus, Trash2, MapPin, Edit } from 'lucide-react';
import { WardManagement } from './WardManagement';

interface Panchayath {
  id: string;
  name: string;
  created_at: string;
}

export function PanchayathManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPanchayath, setNewPanchayath] = useState('');
  const [selectedPanchayath, setSelectedPanchayath] = useState<Panchayath | null>(null);

  const { data: panchayaths, isLoading } = useQuery({
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

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('panchayaths')
        .insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panchayaths'] });
      setNewPanchayath('');
      setIsAddOpen(false);
      toast({ title: 'Panchayath added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding panchayath', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('panchayaths')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panchayaths'] });
      toast({ title: 'Panchayath deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting panchayath', description: error.message, variant: 'destructive' });
    },
  });

  const handleAdd = () => {
    if (!newPanchayath.trim()) {
      toast({ title: 'Please enter a panchayath name', variant: 'destructive' });
      return;
    }
    addMutation.mutate(newPanchayath.trim());
  };

  if (selectedPanchayath) {
    return (
      <WardManagement 
        panchayath={selectedPanchayath} 
        onBack={() => setSelectedPanchayath(null)} 
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Panchayath Management
          </CardTitle>
          <CardDescription>Add and manage panchayaths and their wards</CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Panchayath
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Panchayath</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="panchayath-name">Panchayath Name</Label>
                <Input
                  id="panchayath-name"
                  value={newPanchayath}
                  onChange={(e) => setNewPanchayath(e.target.value)}
                  placeholder="Enter panchayath name"
                />
              </div>
              <Button onClick={handleAdd} disabled={addMutation.isPending} className="w-full">
                {addMutation.isPending ? 'Adding...' : 'Add Panchayath'}
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
        ) : panchayaths && panchayaths.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Panchayath Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panchayaths.map((panchayath) => (
                <TableRow key={panchayath.id}>
                  <TableCell className="font-medium">{panchayath.name}</TableCell>
                  <TableCell>{new Date(panchayath.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPanchayath(panchayath)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Manage Wards
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(panchayath.id)}
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
            No panchayaths added yet. Click "Add Panchayath" to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
