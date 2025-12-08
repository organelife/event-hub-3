import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Plus,
  Store,
  Briefcase,
  Receipt,
  Loader2
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Stall = Tables<"stalls">;
type Payment = Tables<"payments">;
type BillingTransaction = Tables<"billing_transactions">;
type Registration = Tables<"registrations">;

export default function Accounts() {
  const queryClient = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState<"stall" | "other">("stall");
  
  const [stallPayment, setStallPayment] = useState({
    stallId: "",
    amount: ""
  });

  const [otherPayment, setOtherPayment] = useState({
    narration: "",
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

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, stalls(counter_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch billing transactions (collections)
  const { data: billingTransactions = [] } = useQuery({
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

  // Fetch registrations (collections)
  const { data: registrations = [] } = useQuery({
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

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (payment: {
      payment_type: Enums<"payment_type">;
      stall_id?: string;
      total_billed?: number;
      margin_deducted?: number;
      amount_paid: number;
      narration?: string;
    }) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setStallPayment({ stallId: "", amount: "" });
      setOtherPayment({ narration: "", amount: "" });
      setShowPaymentForm(false);
      toast.success("Payment recorded!");
    },
    onError: (error) => {
      toast.error("Failed to record payment: " + error.message);
    }
  });

  // Calculate stall details when a stall is selected
  const selectedStallDetails = useMemo(() => {
    if (!stallPayment.stallId) return null;

    const stallTransactions = billingTransactions.filter((t: any) => t.stall_id === stallPayment.stallId);
    const billedAmount = stallTransactions.reduce((sum: number, t: any) => sum + (t.total || 0), 0);
    
    // Calculate Bill Balance using per-item commission deduction
    const billBalance = stallTransactions.reduce((txSum: number, tx: any) => {
      const items = Array.isArray(tx.items) ? tx.items as Array<{ price?: number; quantity?: number; event_margin?: number }> : [];
      const txBalance = items.reduce((sum: number, item) => {
        const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
        const commission = Number(item.event_margin || 20);
        const itemBalance = itemTotal * (1 - commission / 100);
        return sum + itemBalance;
      }, 0);
      return txSum + txBalance;
    }, 0);
    
    // Amount already paid to this stall
    const alreadyPaid = payments
      .filter((p: any) => p.stall_id === stallPayment.stallId && p.payment_type === "participant")
      .reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);
    
    // Remaining balance
    const remainingBalance = Math.max(0, billBalance - alreadyPaid);
    
    const stallName = stalls.find(s => s.id === stallPayment.stallId)?.counter_name || 'Unknown';

    return { billedAmount, billBalance, alreadyPaid, remainingBalance, stallName };
  }, [stallPayment.stallId, billingTransactions, payments, stalls]);

  // Calculate totals
  const totalBillingCollected = billingTransactions.reduce((sum: number, t: any) => sum + (t.total || 0), 0);
  const totalRegistrationCollected = registrations
    .filter(r => r.registration_type !== "stall_counter")
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  
  // Stall booking fees (registration fees from stalls)
  const stallBookingFees = stalls.reduce((sum, s) => sum + (s.registration_fee || 0), 0);
  
  const totalCollected = totalBillingCollected + totalRegistrationCollected + stallBookingFees;

  // Total paid includes both stall payments and other payments
  const stallPaymentsTotal = payments
    .filter((p: any) => p.payment_type === "participant")
    .reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);

  const otherPaymentsTotal = payments
    .filter((p: any) => p.payment_type === "other")
    .reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);

  const totalPaid = otherPaymentsTotal;
  const cashBalance = totalCollected - totalPaid;

  // Registration type totals
  const empBookingTotal = registrations
    .filter(r => r.registration_type === "employment_booking")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const empRegTotal = registrations
    .filter(r => r.registration_type === "employment_registration")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const handleStallPayment = () => {
    if (!stallPayment.stallId || !stallPayment.amount) {
      toast.error("Please select a stall and enter amount");
      return;
    }

    const amount = parseFloat(stallPayment.amount);
    if (selectedStallDetails && amount > selectedStallDetails.remainingBalance) {
      toast.error("Amount exceeds remaining balance");
      return;
    }

    createPaymentMutation.mutate({
      payment_type: "participant",
      stall_id: stallPayment.stallId,
      amount_paid: amount,
      narration: `Payment to ${selectedStallDetails?.stallName}`
    });
  };

  const handleOtherPayment = () => {
    if (!otherPayment.narration || !otherPayment.amount) {
      toast.error("Please fill all fields");
      return;
    }

    createPaymentMutation.mutate({
      payment_type: "other",
      amount_paid: parseFloat(otherPayment.amount),
      narration: otherPayment.narration
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  // Build collections list for display
  const collections = [
    ...billingTransactions.map((t: any) => ({
      id: t.id,
      type: 'billing' as const,
      category: 'Stall Billing',
      description: t.stalls?.counter_name || 'Unknown Stall',
      amount: t.total,
      date: t.created_at
    })),
    ...stalls.filter(s => s.registration_fee && s.registration_fee > 0).map((s) => ({
      id: s.id,
      type: 'stall_booking' as const,
      category: 'Stall Booking Fee',
      description: s.counter_name,
      amount: s.registration_fee || 0,
      date: s.created_at
    })),
    ...registrations
      .filter(r => r.registration_type !== "stall_counter")
      .map(r => ({
        id: r.id,
        type: 'registration' as const,
        category: r.registration_type === 'employment_booking' ? 'Employment Booking' : 'Employment Registration',
        description: r.name,
        amount: r.amount,
        date: r.created_at
      }))
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Accounts & Cash Flow</h1>
            <p className="text-muted-foreground mt-1">Track complete event cash flow</p>
          </div>
          <Button onClick={() => setShowPaymentForm(!showPaymentForm)} variant="accent">
            <Plus className="h-4 w-4 mr-2" />
            Event Payments
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-l-4 border-l-success">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
                  <p className="text-3xl font-bold text-success">₹{totalCollected.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <ArrowDownCircle className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <p className="text-3xl font-bold text-destructive">₹{totalPaid.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ArrowUpCircle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cash Balance</p>
                  <p className="text-3xl font-bold text-primary">₹{cashBalance.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {showPaymentForm && (
          <Card className="mb-8 animate-slide-up">
            <CardHeader>
              <CardTitle>Event Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Button
                  variant={paymentType === "stall" ? "default" : "outline"}
                  onClick={() => setPaymentType("stall")}
                >
                  <Store className="h-4 w-4 mr-2" />
                  Payment to Stall
                </Button>
                <Button
                  variant={paymentType === "other" ? "default" : "outline"}
                  onClick={() => setPaymentType("other")}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Other Payments
                </Button>
              </div>

              {paymentType === "stall" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Stall</Label>
                    <select
                      value={stallPayment.stallId}
                      onChange={(e) => setStallPayment({ ...stallPayment, stallId: e.target.value, amount: "" })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select stall</option>
                      {stalls.map(s => (
                        <option key={s.id} value={s.id}>{s.counter_name} - {s.participant_name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedStallDetails && (
                    <div className="p-4 bg-muted rounded-lg space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Billed Amount</p>
                          <p className="text-lg font-semibold text-foreground">₹{selectedStallDetails.billedAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Bill Balance</p>
                          <p className="text-lg font-semibold text-success">₹{selectedStallDetails.billBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <p className="text-xs text-muted-foreground">After commission</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Already Paid</p>
                          <p className="text-lg font-semibold text-primary">₹{selectedStallDetails.alreadyPaid.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Remaining Balance</p>
                          <p className={`text-lg font-bold ${selectedStallDetails.remainingBalance > 0 ? 'text-warning' : 'text-success'}`}>
                            ₹{selectedStallDetails.remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>

                      {selectedStallDetails.remainingBalance > 0 && (
                        <div className="pt-4 border-t border-border space-y-4">
                          <div className="space-y-2">
                            <Label>Payment Amount (₹)</Label>
                            <Input
                              type="number"
                              value={stallPayment.amount}
                              onChange={(e) => setStallPayment({ ...stallPayment, amount: e.target.value })}
                              placeholder={`Max: ₹${selectedStallDetails.remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                              max={selectedStallDetails.remainingBalance}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={handleStallPayment} 
                              disabled={createPaymentMutation.isPending || !stallPayment.amount}
                            >
                              {createPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Process Payment
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setStallPayment({ ...stallPayment, amount: String(selectedStallDetails.remainingBalance) })}
                            >
                              Pay Full Amount
                            </Button>
                            <Button variant="ghost" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
                          </div>
                        </div>
                      )}

                      {selectedStallDetails.remainingBalance === 0 && (
                        <div className="pt-4 border-t border-border text-center">
                          <p className="text-success font-medium">✓ Fully Paid</p>
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedStallDetails && (
                    <p className="text-sm text-muted-foreground">Select a stall to view payment details</p>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Narration / Description</Label>
                    <Input
                      value={otherPayment.narration}
                      onChange={(e) => setOtherPayment({ ...otherPayment, narration: e.target.value })}
                      placeholder="Enter payment description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      value={otherPayment.amount}
                      onChange={(e) => setOtherPayment({ ...otherPayment, amount: e.target.value })}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <Button onClick={handleOtherPayment} disabled={createPaymentMutation.isPending}>
                      {createPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Record Payment
                    </Button>
                    <Button variant="ghost" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="collections" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="collections" className="flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Cash Collected
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Cash Paid
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collections">
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stall Billing</p>
                      <p className="text-xl font-bold text-foreground">₹{totalBillingCollected.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stall Booking Fee</p>
                      <p className="text-xl font-bold text-foreground">₹{stallBookingFees.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Emp. Booking</p>
                      <p className="text-xl font-bold text-foreground">₹{empBookingTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Emp. Reg.</p>
                      <p className="text-xl font-bold text-foreground">₹{empRegTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collections.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">No collections yet</td>
                        </tr>
                      ) : (
                        collections.map((t) => (
                          <tr key={t.id} className="border-b border-border/50">
                            <td className="p-4 text-muted-foreground">{formatDate(t.date)}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-success/10 text-success rounded-md text-sm">
                                {t.category}
                              </span>
                            </td>
                            <td className="p-4 text-foreground">{t.description}</td>
                            <td className="p-4 text-right font-semibold text-success">+₹{t.amount.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stall Payments</p>
                      <p className="text-xl font-bold text-foreground">₹{stallPaymentsTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Other Payments</p>
                      <p className="text-xl font-bold text-foreground">₹{otherPaymentsTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsLoading ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          </td>
                        </tr>
                      ) : payments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">No payments yet</td>
                        </tr>
                      ) : (
                        payments.map((p: any) => (
                          <tr key={p.id} className="border-b border-border/50">
                            <td className="p-4 text-muted-foreground">{formatDate(p.created_at)}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-md text-sm ${
                                p.payment_type === 'participant' 
                                  ? 'bg-destructive/10 text-destructive' 
                                  : 'bg-warning/10 text-warning'
                              }`}>
                                {p.payment_type === 'participant' ? 'Stall Payment' : 'Other'}
                              </span>
                            </td>
                            <td className="p-4 text-foreground">
                              {p.payment_type === 'participant' 
                                ? p.stalls?.counter_name || 'Unknown Stall'
                                : p.narration || 'No description'}
                            </td>
                            <td className="p-4 text-right font-semibold text-destructive">-₹{p.amount_paid.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
