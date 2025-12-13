// App.tsx
import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MemberRegistration } from './components/MemberRegistration';
import { SnackShop } from './components/SnackShop';
import { SnackManager } from './components/SnackManager';
import { Dashboard } from './components/Dashboard';
import { AdminView, AdminBranchCreation, ReceptionistList } from './components/AdminView';
import { CardManagement } from './components/CardManagement';
import { LockerManagement } from './components/LockerManagement';
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
              <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">Email Address</label>
              <input
                id="reset-email"
                name="resetEmail"
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
                <label htmlFor="login-branch" className="block text-sm font-medium text-slate-700">Branch</label>
                <select
                  id="login-branch"
                  name="branchId"
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
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">Email</label>
              <input
                id="login-email"
                name="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
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
  const handleMemberRegistration = async (
    member: Member,
    amount: number,
    paymentMode: 'CASH' | 'UPI' | 'SPLIT',
    cashAmount?: number,
    upiAmount?: number,
    cardIssued?: boolean,
    cardPaymentMode?: 'CASH' | 'UPI',
    lockerAssigned?: boolean,
    lockerPaymentMode?: 'CASH' | 'UPI' | 'INCLUDED'
  ) => {
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
        branch_id: profile.branch_id,
        card_issued: cardIssued || false,
        card_payment_mode: cardIssued ? cardPaymentMode : null,
        card_returned: false,
        locker_assigned: lockerAssigned || false,
        locker_payment_mode: lockerAssigned ? lockerPaymentMode : null,
        locker_number: member.locker_number || null
      })
      .select()
      .single();

    if (memberError) {
      console.error("Error registering member:", memberError);
      return;
    }

    // Build transaction data with optional split payment fields
    const transactionData: any = {
      type: TransactionType.MEMBERSHIP,
      amount,
      description: `New Membership (${member.subscription_plan} - ${member.daily_access_hours}) - ${member.full_name}`,
      branch_id: profile.branch_id,
      member_id: newMember.id,
      status: 'COMPLETED',
      payment_mode: paymentMode
    };

    // Add split payment amounts if applicable
    if (paymentMode === 'SPLIT' && cashAmount !== undefined && upiAmount !== undefined) {
      transactionData.cash_amount = cashAmount;
      transactionData.upi_amount = upiAmount;
    }

    // Insert Membership Transaction
    try {
      const { data: newTx, error: txError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (txError) throw txError;

      let allNewTransactions = [newTx];

      // If card is issued, create a separate card transaction
      if (cardIssued && cardPaymentMode) {
        const cardTxData = {
          type: TransactionType.CARD,
          amount: 100, // Fixed card price
          description: `Library Card Issued - ${member.full_name}`,
          branch_id: profile.branch_id,
          member_id: newMember.id,
          status: 'COMPLETED',
          payment_mode: cardPaymentMode
        };

        const { data: cardTx, error: cardTxError } = await supabase
          .from('transactions')
          .insert(cardTxData)
          .select()
          .single();

        if (cardTxError) {
          console.error("Error creating card transaction:", cardTxError);
          // Don't fail the whole registration, just log the error
        } else if (cardTx) {
          allNewTransactions.push(cardTx);
        }
      }

      // If locker is assigned and not free, create locker transaction
      if (lockerAssigned && lockerPaymentMode !== 'INCLUDED' && lockerPaymentMode) {
        const lockerTxData = {
          type: TransactionType.LOCKER,
          amount: 200, // Fixed locker price
          description: `Locker Assigned - ${member.full_name}`,
          branch_id: profile.branch_id,
          member_id: newMember.id,
          status: 'COMPLETED',
          payment_mode: lockerPaymentMode
        };

        const { data: lockerTx, error: lockerTxError } = await supabase
          .from('transactions')
          .insert(lockerTxData)
          .select()
          .single();

        if (lockerTxError) {
          console.error("Error creating locker transaction:", lockerTxError);
        } else if (lockerTx) {
          allNewTransactions.push(lockerTx);
        }
      }

      // Update Local State (Optimistic or Re-fetch)
      if (newMember) {
        setAppState(prev => ({
          ...prev,
          members: [...prev.members.filter(m => m.id !== newMember.id), newMember], // Remove existing if present (update case)
          transactions: [...prev.transactions, ...allNewTransactions]
        }));
      }
      setActiveTab('dashboard');
    } catch (err: any) {
      console.error("Error creating transaction (Rollback initiated):", err);
      // ROLLBACK: Delete the member we just created because payment failed
      await supabase.from('members').delete().eq('id', newMember.id);
      alert(`Registration Failed: ${err?.message || 'Payment record could not be saved. Please try again.'}`);
    }
  };

  const handleRenewMember = async (member: Member) => {
    setRenewingMember(member);
    setActiveTab('register');
  };

  // Issue card to an existing member (from Dashboard)
  const handleIssueCard = async (memberId: string, paymentMode: 'CASH' | 'UPI') => {
    if (!profile?.branch_id) return;

    const member = appState.members.find(m => m.id === memberId);
    if (!member) return;

    try {
      // Update member with card_issued = true
      const { error: memberError } = await supabase
        .from('members')
        .update({ card_issued: true, card_payment_mode: paymentMode })
        .eq('id', memberId);

      if (memberError) throw memberError;

      // Create card transaction
      const { data: cardTx, error: txError } = await supabase
        .from('transactions')
        .insert({
          type: TransactionType.CARD,
          amount: 100,
          description: `Library Card Issued - ${member.full_name}`,
          branch_id: profile.branch_id,
          member_id: memberId,
          status: 'COMPLETED',
          payment_mode: paymentMode
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update local state
      setAppState(prev => ({
        ...prev,
        members: prev.members.map(m =>
          m.id === memberId ? { ...m, card_issued: true, card_payment_mode: paymentMode } : m
        ),
        transactions: cardTx ? [...prev.transactions, cardTx] : prev.transactions
      }));
    } catch (err: any) {
      console.error("Error issuing card:", err);
      alert(`Failed to issue card: ${err.message}`);
    }
  };

  // Return card for an expired member (refund ₹100)
  const handleReturnCard = async (memberId: string) => {
    if (!profile?.branch_id) return;

    const member = appState.members.find(m => m.id === memberId);
    if (!member || !member.card_payment_mode) return;

    try {
      // Update member with card_returned = true
      const { error: memberError } = await supabase
        .from('members')
        .update({ card_returned: true })
        .eq('id', memberId);

      if (memberError) throw memberError;

      // Create refund transaction (negative amount)
      const { data: refundTx, error: txError } = await supabase
        .from('transactions')
        .insert({
          type: TransactionType.CARD,
          amount: -100, // Negative for refund
          description: `Library Card Returned (Refund) - ${member.full_name}`,
          branch_id: profile.branch_id,
          member_id: memberId,
          status: 'COMPLETED',
          payment_mode: member.card_payment_mode // Use original payment mode for refund
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update local state
      setAppState(prev => ({
        ...prev,
        members: prev.members.map(m =>
          m.id === memberId ? { ...m, card_returned: true } : m
        ),
        transactions: refundTx ? [...prev.transactions, refundTx] : prev.transactions
      }));
    } catch (err: any) {
      console.error("Error returning card:", err);
      alert(`Failed to process card return: ${err.message}`);
    }
  };

  // Assign locker to existing member
  const handleAssignLocker = async (memberId: string, paymentMode: 'CASH' | 'UPI' | 'INCLUDED', lockerNumber: string) => {
    if (!profile?.branch_id) return;

    const member = appState.members.find(m => m.id === memberId);
    if (!member) return;

    try {
      const { error: memberError } = await supabase
        .from('members')
        .update({ locker_assigned: true, locker_payment_mode: paymentMode, locker_number: lockerNumber })
        .eq('id', memberId);

      if (memberError) throw memberError;

      // Create transaction if not included/free
      let newTx = null;
      if (paymentMode !== 'INCLUDED') {
        const { data: lockerTx, error: txError } = await supabase
          .from('transactions')
          .insert({
            type: TransactionType.LOCKER,
            amount: 200,
            description: `Locker Assigned - ${member.full_name} (${lockerNumber})`,
            branch_id: profile.branch_id,
            member_id: memberId,
            status: 'COMPLETED',
            payment_mode: paymentMode
          })
          .select()
          .single();

        if (txError) throw txError;
        newTx = lockerTx;
      }

      setAppState(prev => ({
        ...prev,
        members: prev.members.map(m =>
          m.id === memberId ? { ...m, locker_assigned: true, locker_payment_mode: paymentMode, locker_number: lockerNumber } : m
        ),
        transactions: newTx ? [...prev.transactions, newTx] : prev.transactions
      }));
    } catch (err: any) {
      console.error("Error assigning locker:", err);
      alert(`Failed to assign locker: ${err.message}`);
    }
  };

  const handleDeleteMembers = async (memberIds: string[]) => {
    if (!memberIds.length) return;

    // Confirm locally if needed, but UI usually handles confirmation
    console.log("Attempting to delete members:", memberIds);

    try {
      // 1. Delete associated transactions first to avoid FK constraint issues
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .delete()
        .in('member_id', memberIds)
        .select();

      if (txError) {
        console.error("Transaction delete error:", txError);
        alert(`Error deleting transactions: ${txError.message} (${txError.code})`);
        throw txError;
      }
      console.log("Deleted transactions:", txData);

      // 2. Delete the members
      const { data: memData, error: memberError } = await supabase
        .from('members')
        .delete()
        .in('id', memberIds)
        .select();

      if (memberError) {
        console.error("Member delete error:", memberError);
        alert(`Error deleting members: ${memberError.message} (${memberError.code})`);
        throw memberError;
      }

      setAppState(prev => ({
        ...prev,
        members: prev.members.filter(m => !memberIds.includes(m.id)),
        transactions: prev.transactions.filter(t => !memberIds.includes(t.member_id))
      }));

    } catch (err: any) {
      console.error("Error deleting members:", err);
      // alert(`Failed to delete members: ${err.message}`);
    }
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
        const targetBranch = appState.branches.find(b => b.id === adminViewBranchId);

        return (
          <Dashboard
            members={targetBranchMembers}
            transactions={targetBranchTransactions}
            onRenew={() => { }}
            onBack={() => setAdminViewBranchId(null)}
            readOnly={true}
            branch={targetBranch}
            onDeleteMembers={handleDeleteMembers}
          />
        );
      }

      return <AdminView state={appState} onViewBranch={setAdminViewBranchId} />;
    }

    // Reception View
    const branchMembers = appState.members.filter(m => m.branch_id === profile.branch_id);
    const branchTransactions = appState.transactions.filter(t => t.branch_id === profile.branch_id);

    // Calculate cards available for this branch
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const getMemberStatus = (expiryDateStr: string) => {
      const expiry = new Date(expiryDateStr);
      if (expiry < today) return 'EXPIRED';
      if (expiry <= threeDaysFromNow) return 'EXPIRING';
      return 'ACTIVE';
    };

    const totalCards = currentBranch?.total_cards || 0;
    const cardsInCirculation = branchMembers.filter(m => {
      const status = getMemberStatus(m.expiry_date);
      return m.card_issued && (status === 'ACTIVE' || status === 'EXPIRING');
    }).length;
    const cardsNotReturned = branchMembers.filter(m => {
      const status = getMemberStatus(m.expiry_date);
      return m.card_issued && status === 'EXPIRED' && !m.card_returned;
    }).length;
    const cardsAvailable = Math.max(0, totalCards - cardsInCirculation - cardsNotReturned);

    // Calculate lockers available
    const totalLockers = Number(currentBranch?.total_lockers) || 0;
    const lockersInUse = branchMembers.filter(m => {
      const status = getMemberStatus(m.expiry_date);
      // Locker is freed when expired, so only count Active/Expiring
      return m.locker_assigned && (status === 'ACTIVE' || status === 'EXPIRING');
    }).length;
    const lockersAvailable = Math.max(0, totalLockers - lockersInUse);

    // Handler for branch updates (e.g., total_cards)
    const handleBranchUpdate = (updatedBranch: Branch) => {
      setAppState(prev => ({
        ...prev,
        branches: prev.branches.map(b => b.id === updatedBranch.id ? updatedBranch : b)
      }));
    };

    switch (activeTab) {
      case 'register':
        return (
          <MemberRegistration
            branchId={profile.branch_id || ''}
            branchName={currentBranch?.name || ''}
            onRegister={(m, a, p, cashAmt, upiAmt, cardIssued, cardPaymentMode, lockerAssigned, lockerPaymentMode) => {
              handleMemberRegistration(m, a, p, cashAmt, upiAmt, cardIssued, cardPaymentMode, lockerAssigned, lockerPaymentMode);
              setRenewingMember(null);
            }}
            initialData={renewingMember}
            cardsAvailable={cardsAvailable}
            lockersAvailable={lockersAvailable}
          />
        );
      case 'snacks':
        return <SnackShop onSale={handleSnackSale} />;
      case 'cards':
        return (
          <CardManagement
            members={branchMembers}
            branch={currentBranch || null}
            onBranchUpdate={handleBranchUpdate}
          />
        );

      case 'lockers':
        return (
          <LockerManagement
            members={branchMembers}
            branch={currentBranch || null}
            onBranchUpdate={handleBranchUpdate}
          />
        );
      case 'dashboard':
      default:
        return (
          <div>
            <Dashboard
              members={branchMembers}
              transactions={branchTransactions}
              onRenew={handleRenewMember}
              onIssueCard={handleIssueCard}
              onReturnCard={handleReturnCard}
              onAssignLocker={handleAssignLocker}
              hideStats={true}
              onDeleteMembers={handleDeleteMembers}
            />
          </div>
        );
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
