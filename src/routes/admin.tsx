import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

export const Route = createFileRoute('/admin')({
  component: AdminRoute,
});

function AdminRoute() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Form states for superadmin login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard states
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkUserRole(session.user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUserRole(session.user.id);
      else {
        setRole(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    setAuthLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching role:', error.message);
      setRole(null);
    } else {
      setRole((data as any)?.role);
    }
    setAuthLoading(false);
  };

  const fetchRestaurants = async () => {
    setDataLoading(true);
    const { data, error } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error fetching:', error.message);
    else setRestaurants(data || []);
    setDataLoading(false);
  };

  useEffect(() => {
    if (role === 'superadmin') {
      fetchRestaurants();
    }
  }, [role]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const isActive = newStatus === 'approved';
   const { error } = await supabase
      .from('restaurants')
      .update({ status: newStatus, is_active: isActive } as any)
      .eq('id', id);

    if (error) alert('Error updating status: ' + error.message);
    else fetchRestaurants();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this restaurant record?')) return;
    const { error } = await supabase.from('restaurants').delete().eq('id', id);
    if (error) alert('Error deleting: ' + error.message);
    else fetchRestaurants();
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f1117', color: '#fff', fontFamily: 'sans-serif' }}>
        <p>Verifying Superadmin Access...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f1117', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#181b22', padding: '2.5rem', borderRadius: '10px', border: '1px solid #2a2e39', width: '100%', maxWidth: '400px' }}>
          <span style={{ fontSize: '0.75rem', color: '#ff7a00', letterSpacing: '1px', fontWeight: 'bold' }}>FAST FOOD KDS</span>
          <h2 style={{ margin: '0.5rem 0 1.5rem 0', fontSize: '1.5rem' }}>Superadmin Login</h2>
          {loginError && <p style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '1rem' }}>{loginError}</p>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.4rem' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #3a3f4d', background: '#12141a', color: '#fff', boxSizing: 'border-box' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.4rem' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #3a3f4d', background: '#12141a', color: '#fff', boxSizing: 'border-box' }} required />
            </div>
            <button type="submit" style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#ff7a00', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
              Sign In to Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (role !== 'superadmin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f1117', color: '#fff', fontFamily: 'sans-serif', textAlign: 'center', padding: '1rem' }}>
        <h2 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: '#aaa', marginBottom: '1.5rem' }}>Your account does not have superadmin clearance.</p>
        <button onClick={handleLogout} style={{ padding: '0.6rem 1.2rem', background: '#2a2e39', color: '#fff', border: '1px solid #3a3f4d', borderRadius: '6px', cursor: 'pointer' }}>Sign Out</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem', color: '#fff', background: '#0f1117', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#ff7a00', letterSpacing: '1px', fontWeight: 'bold' }}>FAST FOOD KDS</span>
          <h1 style={{ margin: '0.2rem 0 0 0', fontSize: '1.75rem' }}>SUPERADMIN CONSOLE</h1>
        </div>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#2a2e39', color: '#fff', border: '1px solid #3a3f4d', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
          Logout ({session.user.email})
        </button>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Restaurant Partner Applications & Management</h2>
      {dataLoading ? (
        <p style={{ color: '#888' }}>Loading applications...</p>
      ) : restaurants.length === 0 ? (
        <div style={{ background: '#181b22', padding: '3rem', borderRadius: '8px', border: '1px solid #2a2e39', textAlign: 'center', marginBottom: '2.5rem' }}>
          <p style={{ color: '#aaa', margin: 0 }}>No restaurant applications found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
          {restaurants.map((r) => {
            const status = r.status || 'pending';
            return (
              <div key={r.id} style={{ background: '#181b22', padding: '1.25rem 1.5rem', borderRadius: '8px', border: '1px solid #2a2e39', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ maxWidth: '600px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.3rem' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>{r.name}</h3>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase', background: status === 'approved' ? 'rgba(74, 222, 128, 0.2)' : status === 'declined' ? 'rgba(248, 113, 113, 0.2)' : 'rgba(250, 204, 21, 0.2)', color: status === 'approved' ? '#4ade80' : status === 'declined' ? '#f87171' : '#facc15' }}>
                      {status}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0', color: '#ccc', fontSize: '0.9rem' }}><b>Email:</b> {r.email || 'N/A'}</p>
                  <p style={{ margin: '0.2rem 0', color: '#ccc', fontSize: '0.9rem' }}><b>Contact Phone:</b> {r.contact_phone || 'N/A'} | <b>Location:</b> {r.location || 'N/A'}</p>
                  <p style={{ margin: '0.2rem 0', color: '#ccc', fontSize: '0.9rem' }}><b>Business Reg:</b> {r.business_registration || 'N/A'} | <b>Consent:</b> {r.consent ? '✅ Agreed' : '❌ No'}</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {status !== 'approved' && (
                    <button onClick={() => handleUpdateStatus(r.id, 'approved')} style={{ padding: '0.5rem 1rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>
                      Approve
                    </button>
                  )}
                  {status !== 'declined' && (
                    <button onClick={() => handleUpdateStatus(r.id, 'declined')} style={{ padding: '0.5rem 1rem', background: '#ca8a04', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>
                      Decline
                    </button>
                  )}
                  <button onClick={() => handleDelete(r.id)} style={{ padding: '0.5rem 1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}