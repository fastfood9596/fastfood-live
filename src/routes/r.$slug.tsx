import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CustomerMenu } from "@/components/menu/CustomerMenu";
import { OrderReceipt } from "@/components/menu/OrderReceipt";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KdsProvider, type Order } from "@/lib/kds-store";

type SearchParams = {
  order?: string;
  table?: string;
};

export const Route = createFileRoute("/r/$slug")({
  validateSearch: (search: Record<string, any>) => search,
  component: RestaurantPortalBySlug,
});

function RestaurantPortalBySlug() {
  const params = Route.useParams() as { slug: string };
  const search = Route.useSearch() as { order?: string; table?: string };
  const slug = params.slug;
  const order = search.order;
  const table = search.table;
  const navigate = useNavigate();

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantLoading, setRestaurantLoading] = useState(true);
  const [restaurantError, setRestaurantError] = useState<string | null>(null);

  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [localOrder, setLocalOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  // 1. Resolve slug to restaurant ID from database
  useEffect(() => {
    const fetchRestaurant = async () => {
      setRestaurantLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("restaurants")
          .select("id, name, slug")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setRestaurantError("Restaurant not found.");
        } else {
          setRestaurantId(data.id);
        }
      } catch (err: any) {
        console.error("Error fetching restaurant by slug:", err);
        setRestaurantError("Failed to load restaurant.");
      } finally {
        setRestaurantLoading(false);
      }
    };

    fetchRestaurant();
  }, [slug]);

  // 2. Auth session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Fetch and subscribe to order if order ID exists
  useEffect(() => {
    if (!order) {
      setLocalOrder(null);
      return;
    }

    const fetchOrder = async () => {
      setOrderLoading(true);
      try {
        const { data: orderData, error: orderError } = await (supabase as any)
          .from("orders")
          .select("*")
          .eq("id", order)
          .maybeSingle();

        if (orderError) throw orderError;
        if (!orderData) {
          setLocalOrder(null);
          return;
        }

       const fullOrder = {
      ...orderData,
      items: orderData.items || [],
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
      items: (row.items || []).map((item: any, idx: number) => ({
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

  if (restaurantLoading || authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading restaurant portal...</div>;
  }

  if (restaurantError || !restaurantId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 space-y-4 text-center">
        <h1 className="text-xl font-bold">Restaurant Not Found</h1>
        <p className="text-sm text-muted-foreground">The restaurant "{slug}" does not exist or has been removed.</p>
      </div>
    );
  }

  // 1. Live Order Tracking
  if (order) {
    if (orderLoading && !localOrder) {
      return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading order status...</div>;
    }

    if (!localOrder) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 space-y-4">
          <p className="text-muted-foreground">Order not found.</p>
          <Button onClick={() => navigate({ to: `/r/${slug}`, search: {} as any })}>Back to Menu</Button>
        </div>
      );
    }

    return (
      <OrderReceipt
        order={localOrder}
        onOrderMore={() => navigate({ to: `/r/${slug}`, search: {} as any })}
      />
    );
  }

  // 2. Auth Gate
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

 // 3. Customer Menu bound to this specific restaurant slug
  return (
    <KdsProvider restaurantId={restaurantId}>
      <CustomerMenu
        restaurantId={restaurantId}
        customerId={session.user.id}
        onTrack={(newOrderId) => {
          navigate({ to: `/r/${slug}`, search: { order: newOrderId } as any });
        }}
        onBackToMenu={() => {}}
      />
    </KdsProvider>
  );
}