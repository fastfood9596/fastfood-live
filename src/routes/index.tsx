import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CustomerMenu } from "@/components/menu/CustomerMenu";
import { OrderReceipt } from "@/components/menu/OrderReceipt";
import { parseCustomerSearch } from "@/lib/portal-search";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Order } from "@/lib/kds-store";

export const Route = createFileRoute("/")({
  validateSearch: parseCustomerSearch,
  component: CustomerPortal,
});

function CustomerPortal() {
  const { table, order } = Route.useSearch();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Live order state for OrderReceipt
  const [localOrder, setLocalOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const restaurantId = (import.meta.env as any).VITE_RESTAURANT_ID || "0d8974b7-8f1f-42ca-9e71-34101d335b12";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch and subscribe to live order updates when order ID is in search params
  useEffect(() => {
    if (!order) {
      setLocalOrder(null);
      return;
    }

    const fetchOrder = async () => {
      setOrderLoading(true);
      try {
        // 1. Fetch the main order record safely
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", order)
          .maybeSingle();

        if (orderError) throw orderError;
        if (!orderData) {
          setLocalOrder(null);
          return;
        }

       // 2. Fetch order items separately safely
        const { data: itemsData } = await (supabase as any)
          .from("order_items")
          .select("*, menu_items(name)")
          .eq("order_id", order);
        const fullOrder = {
          ...orderData,
          order_items: itemsData || [],
        };

        setLocalOrder(mapSupabaseOrderToLocal(fullOrder));
      } catch (err) {
        console.error("Error fetching order:", err);
        setLocalOrder(null);
      } finally {
        setOrderLoading(false);
      }
    };
    fetchOrder();

    // Realtime subscription for live updates from kitchen/cashier
    const channel = supabase
      .channel(`customer-order-${order}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${order}` },
        () => {
          fetchOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order]);

  const mapSupabaseOrderToLocal = (row: any): Order => {
    return {
      id: row.id,
      number: row.order_number || row.number || 1,
      type: row.dining_mode || row.type || "takeaway",
      customer: row.customer_name || row.customer || session?.user?.email?.split("@")[0] || "Customer",
      status: row.status || "pending",
      items: (row.order_items || []).map((item: any, idx: number) => ({
        key: item.id || idx,
        menuItemId: item.menu_item_id,
        name: item.menu_items?.name || item.name || "Item",
        price: item.price || 0,
        qty: item.quantity || item.qty || 1,
        options: item.options || [],
      })),
      payment: {
        method: row.payment_method || "cash",
        status: row.payment_status || "pending",
        phone: row.payment_phone || undefined,
      },
      createdAt: row.created_at || new Date().toISOString(),
    } as unknown as Order;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading portal...</div>;
  }

  // 1. If an order ID is in the URL, render the original OrderReceipt component with live data & realtime
  if (order) {
    if (orderLoading && !localOrder) {
      return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading order status...</div>;
    }

    if (!localOrder) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 space-y-4">
          <p className="text-muted-foreground">Order not found.</p>
          <Button onClick={() => navigate({ to: "/", search: {} as any })}>Back to Menu</Button>
        </div>
      );
    }

    return (
      <OrderReceipt
        order={localOrder}
        onOrderMore={() => navigate({ to: "/", search: {} as any })}
      />
    );
  }

  // 2. If user is not signed in, show Sign In / Sign Up form
  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {isSignUp ? "Create Customer Account" : "Sign In to Order"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {authError && <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded">{authError}</div>}
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full">
                {isSignUp ? "Sign Up" : "Sign In"}
              </Button>
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-primary hover:underline"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Authenticated: Show Menu and hook `onTrack` to switch to OrderReceipt tracker view
  return (
    <CustomerMenu
      restaurantId={restaurantId}
      customerId={session.user.id}
      onTrack={(newOrderId) => {
        navigate({ to: "/", search: { order: newOrderId } as any });
      }}
      onBackToMenu={() => {}}
    />
  );
}