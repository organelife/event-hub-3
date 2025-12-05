import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Receipt, 
  Plus, 
  Trash2,
  Printer,
  CreditCard,
  UserPlus,
  Briefcase,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Stall = Tables<"stalls">;
type Product = Tables<"products">;
type BillingTransaction = Tables<"billing_transactions">;
type Registration = Tables<"registrations">;

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export default function Billing() {
  const queryClient = useQueryClient();
  const [selectedStalls, setSelectedStalls] = useState<string[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  
  const [registration, setRegistration] = useState({
    type: "stall_counter" as Enums<"registration_type">,
    name: "",
    category: "",
    mobile: "",
    amount: ""
  });

  // Fetch stalls
  const { data: stalls = [] } = useQuery({
    queryKey: ['stalls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stalls')
        .select('*')
        .eq('is_verified', true)
        .order('counter_name');
      if (error) throw error;
      return data as Stall[];
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('item_name');
      if (error) throw error;
      return data as Product[];
    }
  });

  // Fetch billing transactions
  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['billing_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_transactions')
        .select('*, stalls(counter_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch registrations
  const { data: registrations = [], isLoading: regsLoading } = useQuery({
    queryKey: ['registrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Registration[];
    }
  });

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async (bill: { stall_id: string; items: BillItem[]; subtotal: number; total: number }) => {
      const receiptNumber = `BILL-${Date.now()}`;
      const { data, error } = await supabase
        .from('billing_transactions')
        .insert({
          stall_id: bill.stall_id,
          items: JSON.parse(JSON.stringify(bill.items)),
          subtotal: bill.subtotal,
          total: bill.total,
          receipt_number: receiptNumber
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_transactions'] });
      setBillItems([]);
      setSelectedStalls([]);
      toast.success("Bill generated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to generate bill: " + error.message);
    }
  });

  // Create registration mutation
  const createRegMutation = useMutation({
    mutationFn: async (reg: typeof registration) => {
      const receiptNumber = `REG-${Date.now()}`;
      const { data, error } = await supabase
        .from('registrations')
        .insert({
          registration_type: reg.type,
          name: reg.name,
          category: reg.category || null,
          mobile: reg.mobile || null,
          amount: parseFloat(reg.amount),
          receipt_number: receiptNumber
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      setRegistration({ type: "stall_counter", name: "", category: "", mobile: "", amount: "" });
      toast.success("Registration completed!");
    },
    onError: (error) => {
      toast.error("Failed to complete registration: " + error.message);
    }
  });

  const stallProducts = selectedStalls.length > 0 
    ? products.filter(p => selectedStalls.includes(p.stall_id)) 
    : [];

  const toggleStallSelection = (stallId: string) => {
    setSelectedStalls(prev => 
      prev.includes(stallId) 
        ? prev.filter(id => id !== stallId)
        : [...prev, stallId]
    );
  };

  const addItemToBill = (product: Product) => {
    const existingItem = billItems.find(item => item.id === product.id);
    if (existingItem) {
      setBillItems(billItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setBillItems([...billItems, {
        id: product.id,
        name: product.item_name,
        quantity: 1,
        price: product.selling_price || 0
      }]);
    }
  };

  const removeItem = (id: string) => {
    setBillItems(billItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return removeItem(id);
    setBillItems(billItems.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const calculateTotal = () => {
    return billItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const generateBill = () => {
    if (selectedStalls.length === 0 || billItems.length === 0) {
      toast.error("Please select at least one counter and add items");
      return;
    }
    
    const total = calculateTotal();
    // Use first selected stall as primary (for multi-counter, items track their stall)
    createBillMutation.mutate({
      stall_id: selectedStalls[0],
      items: billItems,
      subtotal: total,
      total: total
    });
  };

  const handleRegistration = () => {
    if (!registration.name || !registration.amount) {
      toast.error("Please fill all required fields");
      return;
    }
    createRegMutation.mutate(registration);
  };

  const getStallName = (stallId: string) => {
    const stall = stalls.find(s => s.id === stallId);
    return stall?.counter_name || 'Unknown';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
  };

  const getRegTypeLabel = (type: Enums<"registration_type">) => {
    switch (type) {
      case 'stall_counter': return 'Stall Counter';
      case 'employment_booking': return 'Employment Booking';
      case 'employment_registration': return 'Employment Registration';
      default: return type;
    }
  };

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Billing & Registrations</h1>
          <p className="text-muted-foreground mt-1">Process bills and manage registrations</p>
        </div>

        <Tabs defaultValue="billing" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Receipts
            </TabsTrigger>
            <TabsTrigger value="registrations" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Registrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="billing">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>New Bill</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Counters (Multi-select)</Label>
                    <div className="flex flex-wrap gap-2 p-3 border border-input rounded-md bg-background min-h-[60px]">
                      {stalls.map(s => (
                        <Button
                          key={s.id}
                          variant={selectedStalls.includes(s.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleStallSelection(s.id)}
                        >
                          {s.counter_name}
                        </Button>
                      ))}
                    </div>
                    {selectedStalls.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedStalls.length} counter(s) selected
                      </p>
                    )}
                  </div>

                  {selectedStalls.length > 0 && stallProducts.length > 0 && (
                    <div className="space-y-2">
                      <Label>Add Items</Label>
                      <div className="flex flex-wrap gap-2">
                        {stallProducts.map((product) => (
                          <Button
                            key={product.id}
                            variant="outline"
                            size="sm"
                            onClick={() => addItemToBill(product)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {product.item_name} - ₹{product.selling_price}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedStalls.length > 0 && stallProducts.length === 0 && (
                    <p className="text-sm text-muted-foreground">No products found for selected counters</p>
                  )}

                  {billItems.length > 0 && (
                    <div className="space-y-2">
                      <Label>Bill Items</Label>
                      <div className="border border-border rounded-lg divide-y divide-border">
                        {billItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3">
                            <div>
                              <p className="font-medium text-foreground">{item.name}</p>
                              <p className="text-sm text-muted-foreground">₹{item.price} each</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                +
                              </Button>
                              <span className="w-16 text-right font-semibold">
                                ₹{item.price * item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <span className="text-lg font-semibold">Total</span>
                        <span className="text-2xl font-bold text-primary">₹{calculateTotal()}</span>
                      </div>

                      <Button 
                        onClick={generateBill} 
                        className="w-full" 
                        size="lg"
                        disabled={createBillMutation.isPending}
                      >
                        {createBillMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Receipt className="h-4 w-4 mr-2" />
                        Generate Bill
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  {billsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : bills.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No bills generated yet</p>
                  ) : (
                    <div className="space-y-4">
                      {bills.slice(0, 5).map((bill: any) => (
                        <div key={bill.id} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-foreground">
                              {bill.stalls?.counter_name || getStallName(bill.stall_id)}
                            </span>
                            <Badge variant="secondary">{formatDate(bill.created_at)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {bill.receipt_number}
                          </p>
                          <p className="text-lg font-bold text-primary mt-1">₹{bill.total}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="receipts">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cash Receipts from Billing</CardTitle>
                </CardHeader>
                <CardContent>
                  {bills.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No billing receipts</p>
                  ) : (
                    <div className="space-y-3">
                      {bills.map((bill: any) => (
                        <div key={bill.id} className="p-3 border border-border rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-medium">{bill.stalls?.counter_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(bill.created_at)}</p>
                          </div>
                          <span className="font-bold text-success">₹{bill.total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cash Receipts from Registrations</CardTitle>
                </CardHeader>
                <CardContent>
                  {registrations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No registration receipts</p>
                  ) : (
                    <div className="space-y-3">
                      {registrations.map((reg) => (
                        <div key={reg.id} className="p-3 border border-border rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-medium">{reg.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {getRegTypeLabel(reg.registration_type)} - {formatDate(reg.created_at)}
                            </p>
                          </div>
                          <span className="font-bold text-success">₹{reg.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="registrations">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>New Registration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Registration Type</Label>
                    <select
                      value={registration.type}
                      onChange={(e) => setRegistration({ 
                        ...registration, 
                        type: e.target.value as Enums<"registration_type">
                      })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="stall_counter">Stall Counter Registration</option>
                      <option value="employment_booking">Employment Booking</option>
                      <option value="employment_registration">Employment Registration</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={registration.name}
                      onChange={(e) => setRegistration({ ...registration, name: e.target.value })}
                      placeholder={registration.type === "stall_counter" ? "Counter Name" : "Applicant Name"}
                    />
                  </div>

                  {registration.type === "employment_booking" && (
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input
                        value={registration.category}
                        onChange={(e) => setRegistration({ ...registration, category: e.target.value })}
                        placeholder="Enter category"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Mobile Number</Label>
                    <Input
                      value={registration.mobile}
                      onChange={(e) => setRegistration({ ...registration, mobile: e.target.value })}
                      placeholder="Enter mobile number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {registration.type === "stall_counter" ? "Registration Fee" : "Amount"} (₹) *
                    </Label>
                    <Input
                      type="number"
                      value={registration.amount}
                      onChange={(e) => setRegistration({ ...registration, amount: e.target.value })}
                      placeholder="Enter amount"
                    />
                  </div>

                  <Button 
                    onClick={handleRegistration} 
                    className="w-full"
                    disabled={createRegMutation.isPending}
                  >
                    {createRegMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <UserPlus className="h-4 w-4 mr-2" />
                    Complete Registration
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Registrations</CardTitle>
                </CardHeader>
                <CardContent>
                  {regsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : registrations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No registrations yet</p>
                  ) : (
                    <div className="space-y-3">
                      {registrations.map((reg) => (
                        <div key={reg.id} className="p-4 border border-border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                reg.registration_type === "stall_counter" ? "bg-warning/10" : "bg-info/10"
                              }`}>
                                {reg.registration_type === "stall_counter" ? (
                                  <CreditCard className="h-5 w-5 text-warning" />
                                ) : (
                                  <Briefcase className="h-5 w-5 text-info" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{reg.name}</p>
                                <p className="text-sm text-muted-foreground">{getRegTypeLabel(reg.registration_type)}</p>
                              </div>
                            </div>
                            <Badge variant="outline">₹{reg.amount}</Badge>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {reg.mobile && <span>Mobile: {reg.mobile} | </span>}
                            <span>{formatDate(reg.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
