// App.tsx
import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MemberRegistration } from './components/MemberRegistration';
import { SnackShop } from './components/SnackShop';
import { SnackManager } from './components/SnackManager';
import { Dashboard } from './components/Dashboard';
import { AdminView, AdminBranchCreation, ReceptionistList } from './components/AdminView';
import { MOCK_BRANCHES } from './constants';
import { AppState, Member, Transaction, TransactionType, Branch, Profile } from './types';
import { Menu, LogOut, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from './supabaseClient';

// --- Login Page Component ---
const PasswordResetPage: React.FC<{ onPasswordUpdated: () => void }> = ({ onPasswordUpdated }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onPasswordUpdated();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Set New Password</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">New Password</label>
            <div className="relative">
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-70 flex justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};



const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [tab, setTab] = useState<'ADMIN' | 'RECEPTION'>('ADMIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Fetch branches for Receptionist dropdown
    const fetchBranches = async () => {
      const { data, error } = await supabase.from('branches').select('*');
      if (data) {
        setBranches(data);
        if (data.length > 0) setSelectedBranchId(data[0].id);
      }
    };
    fetchBranches();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;

      setResetMessage({
        type: 'success',
        text: 'Password reset link sent! Check your email.'
      });
    } catch (err: any) {
      setResetMessage({
        type: 'error',
        text: err.message || 'Failed to send reset email'
      });
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    const authError = localStorage.getItem('auth_error');
    if (authError) {
      setError(authError);
      localStorage.removeItem('auth_error');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check profile role
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          // Strict Role Check
          if (tab === 'ADMIN' && profile.role !== 'ADMIN') {
            localStorage.setItem('auth_error', 'Access Denied: You are not an Administrator.');
            await supabase.auth.signOut();
            return;
          }
          if (tab === 'RECEPTION') {
            if (profile.role !== 'RECEPTION') {
              localStorage.setItem('auth_error', 'Access Denied: You are not a Receptionist.');
              await supabase.auth.signOut();
              return;
            }
            if (profile.branch_id !== selectedBranchId) {
              // Optional: Enforce branch check strictly too, though usually role is the main separator
              // For now, we just check role as requested, but branch check is good practice
              // Keeping existing logic but adding logout
              localStorage.setItem('auth_error', 'Invalid branch selection for this account.');
              await supabase.auth.signOut();
              return;
            }
          }
          onLogin();
        } else {
          throw new Error('Profile not found');
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || 'Login failed');
      // Do not auto-signout here to avoid race conditions with AppWrapper
      // Let MainApp handle the missing profile state
    } finally {
      // Only set loading false if we haven't signed out (which unmounts us)
      // But since unmount happens via AppWrapper, this is safe-ish, 
      // though React might warn if unmounted.
      if (localStorage.getItem('auth_error')) {
        // We are about to be unmounted/remounted, so don't worry about setLoading
      } else {
        setLoading(false);
      }
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Reset Password</h2>
          <p className="text-slate-500 mb-6 text-sm">Enter your email to receive a reset link.</p>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <input
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                type="email"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                required
              />
            </div>

            {resetMessage && (
              <div className={`text-sm p-3 rounded-lg ${resetMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {resetMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-70 flex justify-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setResetMessage(null);
              }}
              className="w-full py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6">
        <div className="flex border-b -mx-6 mb-6">
          <button
            onClick={() => setTab('ADMIN')}
            className={`px-6 py-3 rounded-t-2xl font-medium ${tab === 'ADMIN' ? 'bg-white border border-b-0 rounded-b-none text-indigo-700' : 'text-slate-500'}`}
          >
            Administrator
          </button>
          <button
            onClick={() => setTab('RECEPTION')}
            className={`ml-2 px-6 py-3 rounded-t-2xl font-medium ${tab === 'RECEPTION' ? 'bg-white border border-b-0 rounded-b-none text-indigo-700' : 'text-slate-500'}`}
          >
            Receptionist
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleLogin} className="space-y-4">
            {tab === 'RECEPTION' && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Branch</label>
                <select
                  value={selectedBranchId}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <div className="pt-4 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-70 flex justify-center"
              >
                {loading ? <Loader2 className="animate-spin" /> : `Login as ${tab === 'ADMIN' ? 'Admin' : 'Receptionist'}`}
              </button>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Main App wrapper ---
const AppWrapper: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  if (isRecoveryMode) {
    return <PasswordResetPage onPasswordUpdated={() => setIsRecoveryMode(false)} />;
  }

  if (!session) {
    return <LoginPage onLogin={() => { }} />;
  }

  return <MainApp session={session} />;
};

// --- The main app that uses existing components ---
const MainApp: React.FC<{ session: any }> = ({ session }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileErrorDetails, setProfileErrorDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [renewingMember, setRenewingMember] = useState<Member | null>(null);
  const [adminViewBranchId, setAdminViewBranchId] = useState<string | null>(null);

  const [appState, setAppState] = useState<AppState>({
    branches: [],
    members: [],
    transactions: []
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!session?.user) return;

      // Fetch Profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profileData) {
        console.error("Profile fetch error:", error);
        setProfileError("User profile not found. Please contact support or check database setup.");
        setProfileErrorDetails(error);
        return;
      }

      setProfile(profileData);

      // Fetch Data based on RLS (Supabase handles filtering automatically)
      const [branchesRes, membersRes, transactionsRes] = await Promise.all([
        supabase.from('branches').select('*'),
        supabase.from('members').select('*'),
        supabase.from('transactions').select('*')
      ]);

      setAppState({
        branches: branchesRes.data || [],
        members: membersRes.data || [],
        transactions: transactionsRes.data || []
      });
    };

    fetchInitialData();
  }, [session]);

  const currentBranch = appState.branches.find(b => b.id === profile?.branch_id);

  // --- Handlers ---
  const handleMemberRegistration = async (member: Member, amount: number, paymentMode: 'CASH' | 'UPI') => {
    if (!profile?.branch_id) return;

    // Insert or Update Member (Upsert)
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .upsert({
        id: member.id, // Explicitly include ID for upsert
        full_name: member.full_name,
        address: member.address,
        phone: member.phone,
        email: member.email,
        join_date: member.join_date,
        expiry_date: member.expiry_date,
        subscription_plan: member.subscription_plan,
        daily_access_hours: member.daily_access_hours,
        study_purpose: member.study_purpose,
        registered_by: member.registered_by,
        branch_id: profile.branch_id
      })
      .select()
      .single();

    if (memberError) {
      console.error("Error registering member:", memberError);
      return;
    }

    // Insert Transaction
    try {
      const { data: newTx, error: txError } = await supabase
        .from('transactions')
        .insert({
          type: TransactionType.MEMBERSHIP,
          amount,
          description: `New Membership (${member.subscription_plan} - ${member.daily_access_hours}) - ${member.full_name}`,
          branch_id: profile.branch_id,
          member_id: newMember.id,
          status: 'COMPLETED',
          payment_mode: paymentMode
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update Local State (Optimistic or Re-fetch)
      if (newMember && newTx) {
        setAppState(prev => ({
          ...prev,
          members: [...prev.members.filter(m => m.id !== newMember.id), newMember], // Remove existing if present (update case)
          transactions: [...prev.transactions, newTx]
        }));
      }
      setActiveTab('dashboard');
    } catch (err) {
      console.error("Error creating transaction (Rollback initiated):", err);
      // ROLLBACK: Delete the member we just created because payment failed
      await supabase.from('members').delete().eq('id', newMember.id);
      alert("Registration Failed: Payment record could not be saved. Please try again.");
    }
  };

  const handleRenewMember = async (member: Member) => {
    setRenewingMember(member);
    setActiveTab('register');
  };

  const handleSnackSale = async (amount: number, description: string, paymentMode: 'CASH' | 'UPI') => {
    if (!profile?.branch_id) return;

    const { data: newTx, error } = await supabase
      .from('transactions')
      .insert({
        type: TransactionType.SNACK,
        amount,
        description,
        branch_id: profile.branch_id,
        status: 'COMPLETED',
        payment_mode: paymentMode
      })
      .select()
      .single();

    if (error) {
      console.error("Error recording sale:", error);
      return;
    }

    if (newTx) {
      setAppState(prev => ({ ...prev, transactions: [...prev.transactions, newTx] }));
    }
  };

  const handleAddBranch = async (newBranch: Branch) => {
    // This logic should ideally be moved to AdminView and call the Edge Function
    // For now, we just update local state to reflect UI changes if needed, 
    // but the actual creation happens in AdminView via Edge Function
    const { data, error } = await supabase.from('branches').select('*');
    if (data) setAppState(prev => ({ ...prev, branches: data }));
  };

  const handleDeleteBranch = async (branchId: string) => {
    const { error } = await supabase.from('branches').delete().eq('id', branchId);
    if (!error) {
      setAppState(prev => ({
        ...prev,
        branches: prev.branches.filter(b => b.id !== branchId),
        members: prev.members.filter(m => m.branch_id !== branchId),
        transactions: prev.transactions.filter(t => t.branch_id !== branchId)
      }));
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Force cleanup and redirect
      localStorage.clear();
      window.location.reload();
    }
  };

  const renderContent = () => {
    if (profileError) {
      return (
        <div className="p-8 flex flex-col items-center justify-center h-full text-red-600">
          <div className="text-xl font-bold mb-2">Access Error</div>
          <p>{profileError}</p>
          <p className="text-xs text-slate-400 mt-2 font-mono bg-slate-100 p-2 rounded">
            {JSON.stringify(profileErrorDetails, null, 2)}
          </p>
          <p className="text-sm text-slate-500 mt-4">User ID: {session.user.id}</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-6 px-4 py-2 bg-slate-200 rounded-lg text-slate-700 hover:bg-slate-300"
          >
            Logout
          </button>
        </div>
      );
    }

    if (!profile) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /> <span className="ml-2">Loading profile...</span></div>;

    if (profile.role === 'ADMIN') {
      if (activeTab === 'create_branch') {
        return (
          <AdminBranchCreation
            branches={appState.branches}
            onAddBranch={handleAddBranch}
            onDeleteBranch={handleDeleteBranch}
          />
        );
      }

      if (activeTab === 'receptionists') {
        return <ReceptionistList branches={appState.branches} />;
      }

      if (activeTab === 'manage_snacks') {
        return <SnackManager />;
      }

      if (adminViewBranchId) {
        const targetBranchMembers = appState.members.filter(m => m.branch_id === adminViewBranchId);
        const targetBranchTransactions = appState.transactions.filter(t => t.branch_id === adminViewBranchId);

        return (
          <Dashboard
            members={targetBranchMembers}
            transactions={targetBranchTransactions}
            onRenew={() => { }}
            onBack={() => setAdminViewBranchId(null)}
            readOnly={true}
          />
        );
      }

      return <AdminView state={appState} onViewBranch={setAdminViewBranchId} />;
    }

    // Reception View
    const branchMembers = appState.members.filter(m => m.branch_id === profile.branch_id);
    const branchTransactions = appState.transactions.filter(t => t.branch_id === profile.branch_id);

    switch (activeTab) {
      case 'register':
        return (
          <MemberRegistration
            branchId={profile.branch_id || ''}
            branchName={currentBranch?.name || ''}
            onRegister={(m, a, p) => {
              handleMemberRegistration(m, a, p);
              setRenewingMember(null);
            }}
            initialData={renewingMember}
          />
        );
      case 'snacks':
        return <SnackShop onSale={handleSnackSale} />;

      case 'dashboard':
      default:
        return <Dashboard members={branchMembers} transactions={branchTransactions} onRenew={handleRenewMember} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={profile?.role || 'RECEPTION'}
        currentBranchName={currentBranch?.name}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full transition-all duration-300">
        <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 -m-4 shadow-sm sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600 hover:text-indigo-600 p-1">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="h-20 w-20" />
            <span className="font-bold text-lg text-indigo-600">Achievers Library</span>
          </div>
          <div className="w-8" />
        </div>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 gap-3 mt-4 md:mt-0">
          <h1 className="text-2xl font-bold text-slate-900">
            {activeTab === 'register' && 'Registration'}
            {activeTab === 'snacks' && 'Point of Sale'}
            {activeTab === 'dashboard' && (profile?.role === 'ADMIN' ? 'Admin Office Dashboard' : 'Branch Analytics')}
            {activeTab === 'create_branch' && 'Branch Management'}

            {activeTab === 'receptionists' && 'Receptionist Directory'}
            {activeTab === 'manage_snacks' && 'Menu Management'}
          </h1>

          <div className="flex items-center space-x-3 self-start md:self-auto">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all shadow-sm flex items-center gap-2 font-medium mr-3"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        <div className="animate-fade-in pb-10 md:pb-0">{renderContent()}</div>
      </main>
    </div>
  );
};

export default AppWrapper;
