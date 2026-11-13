import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopNav } from "@/components/kds/TopNav";
import { CashierView } from "@/components/kds/CashierView";
import { KitchenView } from "@/components/kds/KitchenView";
import { ReadyBoard } from "@/components/kds/ReadyBoard";
import { DEFAULT_STAFF_VIEW, parseStaffSearch } from "@/lib/portal-search";

export const Route = createFileRoute("/restaurant")({
  validateSearch: parseStaffSearch,
  head: () => ({
    meta: [
      { title: "Staff Hub — Fast Food" },
      {
        name: "description",
        content: "Cashier terminal, kitchen display and ready board for Fast Food staff, synced live.",
      },
      { property: "og:title", content: "Staff Hub — Fast Food" },
      { property: "og:description", content: "Take orders, run the kitchen line and manage online orders in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RestaurantPortal,
});

function RestaurantPortal() {
  const view = Route.useSearch().view ?? DEFAULT_STAFF_VIEW;
  const navigate = Route.useNavigate();

  // Session & Restaurant State
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantStatus, setRestaurantStatus] = useState<string | null>(null);

  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [location, setLocation] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [businessReg, setBusinessReg] = useState("");
  const [consent, setConsent] = useState(false);

  // Check active session and fetch restaurant profile
  async function loadSessionAndRestaurant() {
    setCheckingAuth(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);

    if (currentUser?.email) {
     const { data: allRestaurants } = await supabase
        .from("restaurants")
        .select("name, email, status, is_active");

      if (allRestaurants && allRestaurants.length > 0) {
        const matched = (allRestaurants as any[]).find(
          (r: any) => r.email && r.email.toLowerCase() === currentUser.email!.trim().toLowerCase()
        );
        if (matched) {
          setRestaurantName(matched.name || "");
          setRestaurantStatus(matched.status || "pending");
        }
      }
    }
    setCheckingAuth(false);
  }

  useEffect(() => {
    loadSessionAndRestaurant();
  }, []);

  // Handle Login & Registration
  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setErrorMsg("");

    try {
      if (isSignUp) {
        const { error: authError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });
        if (authError) throw authError;

       const { error: dbError } = await supabase.from("restaurants").insert([
          {
            name: nameInput.trim(),
            email: email.trim().toLowerCase(),
            location: location.trim(),
            contact_phone: contactPhone.trim(),
            business_registration: businessReg.trim(),
            is_active: false,
            consent: consent,
            status: "pending",
          } as any,
        ]);
        if (dbError) throw dbError;
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (loginError) throw loginError;
      }

      // Reload user & restaurant data right on /restaurant
      await loadSessionAndRestaurant();
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setRestaurantName("");
    setRestaurantStatus(null);
    setEmail("");
    setPassword("");
  }

  // 1. Loading State while checking session
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <p className="text-[#ff7a00] font-semibold">Loading Staff Hub...</p>
      </div>
    );
  }

  // 2. Unauthenticated View: Render Login / Sign Up right on /restaurant
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md bg-[#1a1a1a] p-8 rounded-lg border border-[#333] text-white">
          <h1 className="text-2xl font-bold text-[#ff7a00] mb-2">
            {isSignUp ? "Register Your Restaurant" : "Restaurant Staff Login"}
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            {isSignUp
              ? "Create an account to launch your Kitchen Display System."
              : "Sign in to access your Cashier Terminal and Kitchen Display."}
          </p>

          {errorMsg && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 text-sm p-3 rounded mb-4">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#262626] border border-[#444] text-white"
                    
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#262626] border border-[#444] text-white"
                    
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#262626] border border-[#444] text-white"
                    
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Business Registration</label>
                  <input
                    type="text"
                    required
                    value={businessReg}
                    onChange={(e) => setBusinessReg(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#262626] border border-[#444] text-white"
                    
                  />
                </div>
              </>
            )}
            {/* Consent Checkbox */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="consent"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="w-4 h-4 rounded bg-[#262626] border border-[#444] text-[#ff7a00] focus:ring-0 cursor-pointer"
            />
            <label htmlFor="consent" className="text-xs text-gray-300 cursor-pointer">
              I agree to terms, conditions, and platform data policies.
            </label>
          </div>

            <div>
              <label className="block text-sm mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded bg-[#262626] border border-[#444] text-white"
                placeholder="restaurant@gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 rounded bg-[#262626] border border-[#444] text-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-[#ff7a00] hover:bg-[#e06b00] text-black font-bold rounded transition cursor-pointer"
            >
              {authLoading
                ? "Please wait..."
                : isSignUp
                ? "Create Restaurant Account"
                : "Log In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            {isSignUp ? "Already have a restaurant account?" : "New to the platform?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg("");
              }}
              className="text-[#ff7a00] font-semibold hover:underline cursor-pointer"
            >
              {isSignUp ? "Log In" : "Register Here"}
            </button>
          </div>
        </div>
      </div>
    );
  }
// 2.5. Pending / Unapproved View
  if (user && restaurantStatus !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md bg-[#1a1a1a] p-8 rounded-lg border border-[#333] text-white text-center">
          <h1 className="text-2xl font-bold text-[#ff7a00] mb-3">
            Application Under Review
          </h1>
          <p className="text-gray-300 text-sm mb-2">
            Thank you for registering <strong>{restaurantName || "your restaurant"}</strong>.
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Your account status is currently{" "}
            <span className="text-[#ff7a00] font-semibold uppercase">
              {restaurantStatus || "pending"}
            </span>
            . A superadmin will verify your details and approve your access shortly.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-[#333] hover:bg-[#444] text-white font-semibold rounded border border-[#555] transition cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }
  // 3. Authenticated View: Render KDS Dashboard
  return (
    <div className="min-h-screen bg-background">
      <TopNav view={view} onChange={(v) => navigate({ search: { view: v }, replace: true })} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1.5rem', background: '#1a1a1a' }}>
        <div style={{ color: '#ff7a00', fontWeight: 'bold', fontSize: '1.1rem' }}>
          Active Restaurant: {restaurantName || "Loading..."}
        </div>
        <button
          onClick={handleLogout}
          style={{ background: '#333', color: '#fff', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #555' }}
        >
          Log Out
        </button>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-5 lg:px-6 lg:py-6">
        {view === "cashier" && <CashierView />}
        {view === "kitchen" && <KitchenView />}
        {view === "board" && <ReadyBoard />}
      </main>
    </div>
  );
}