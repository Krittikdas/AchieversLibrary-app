// App.tsx
import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { RegistrationForm } from './components/RegistrationForm';
import { RegisteredMembers } from './components/RegisteredMembers';
import { MembershipForm } from './components/MembershipForm';
import { SnackShop } from './components/SnackShop';
import { SnackManager } from './components/SnackManager';
import { OldMemberEntry } from './components/OldMemberEntry';
import { Dashboard } from './components/Dashboard';
import { AdminView, AdminBranchCreation, ReceptionistList } from './components/AdminView';
import { CardManagement } from './components/CardManagement';
import { LockerManagement } from './components/LockerManagement';
import { MOCK_BRANCHES } from './constants';
import { AppState, Member, Transaction, TransactionType, Branch, Profile, SubscriptionPlan } from './types';
import { Menu, LogOut, Loader2, Eye, EyeOff, CheckCircle, XCircle, X } from 'lucide-react';
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
      // Select only public fields needed for the dropdown
      const { data, error } = await supabase.from('branches').select('id, name, location');
      if (data) {
        setBranches(data);
        if (data.length > 0) setSelectedBranchId(data[0].id);
      }
      if (error) console.error("Error fetching branches:", error);
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
        console.log('Attempting to fetch profile for user:', data.user.id);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        console.log('Profile query result:', { profile, profileError });
        if (profileError) {
          console.error('Profile query failed:', profileError);
          setError(`Database error: ${profileError.message} (Code: ${profileError.code})`);
          setLoading(false);
          return;
        }

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
            Branch
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
                    <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
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
                {loading ? <Loader2 className="animate-spin" /> : "Log in"}
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
  const [selectedMemberForMembership, setSelectedMemberForMembership] = useState<Member | null>(null);
  const [adminViewBranchId, setAdminViewBranchId] = useState<string | null>(null);

  const [appState, setAppState] = useState<AppState>({
    branches: [],
    members: [],
    transactions: [],
    snacks: []
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

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
      const [branchesRes, membersRes, transactionsRes, snacksRes] = await Promise.all([
        supabase.from('branches').select('*'),
        supabase.from('members').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('snacks').select('*')
      ]);

      setAppState({
        branches: branchesRes.data || [],
        members: membersRes.data || [],
        transactions: transactionsRes.data || [],
        snacks: snacksRes.data || []
      });
    };

    fetchInitialData();
  }, [session]);

  /* 
 * AUTO-SYNC: Check and backfill missing registration fees on load.
 * This is a one-time fix for existing members who missed the fee recording.
 */
  useEffect(() => {
    const syncRegistrationFees = async () => {
      if (!profile?.branch_id) return;
      if (profile.role !== 'ADMIN') return; // Only Admin triggers this sync

      // 1. Get all members of this branch
      const { data: allMembers } = await supabase
        .from('members')
        .select('id, full_name, join_date')
        .eq('branch_id', profile.branch_id);

      if (!allMembers?.length) return;

      // 2. Get all REGISTRATION transactions
      const { data: regTxns } = await supabase
        .from('transactions')
        .select('member_id')
        .eq('branch_id', profile.branch_id)
        .eq('type', TransactionType.REGISTRATION);

      const existingRegMemberIds = new Set(regTxns?.map(t => t.member_id) || []);

      // 3. Find members missing the fee
      const missingFeeMembers = allMembers.filter(m => !existingRegMemberIds.has(m.id));

      if (missingFeeMembers.length === 0) return;

      console.log(`Auto-Sync: Found ${missingFeeMembers.length} members missing registration fee. Fixing...`);

      // 4. Insert missing transactions
      const newTxns = missingFeeMembers.map(m => ({
        type: TransactionType.REGISTRATION,
        amount: 300,
        description: `Backfill: Registration Fee - ${m.full_name}`,
        branch_id: profile.branch_id,
        member_id: m.id,
        status: 'COMPLETED',
        payment_mode: 'CASH', // Assume CASH for backfill
        timestamp: m.join_date || new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(newTxns);

      if (insertError) {
        console.error("Auto-Sync Failed:", insertError);
      } else {
        console.log("Auto-Sync Success: Backfilled fees for", missingFeeMembers.length, "members.");
        showNotification(`Auto-Fixed: Added missing Registration Fees for ${missingFeeMembers.length} members.`);

        // Refresh local state
        const { data: refetchedTxns } = await supabase.from('transactions').select('*');
        if (refetchedTxns) setAppState(prev => ({ ...prev, transactions: refetchedTxns }));
      }
    };

    if (profile?.branch_id && appState.members.length > 0) {
      // Small delay to ensure data is loaded
      const timer = setTimeout(() => {
        syncRegistrationFees();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [profile, appState.members.length]); // Run when members update or profile loads

  const currentBranch = appState.branches.find(b => b.id === profile?.branch_id);

  // --- Handlers ---
  const handleRegistrationSuccess = async (member: Member, amount: number, paymentMode: 'CASH' | 'UPI' | 'SPLIT', cashAmt?: number, upiAmt?: number) => {
    if (!profile?.branch_id) return;

    const { data: insertedMember, error: memberError } = await supabase
      .from('members')
      .insert(member)
      .select()
      .single();

    if (memberError) {
      console.error("Error registering member:", memberError);
      alert("Registration failed: " + memberError.message);
      return;
    }

    // Fallback to local member object if RLS blocks reading the inserted row
    const finalMember = insertedMember || member;

    const transactionData: any = {
      type: TransactionType.REGISTRATION,
      amount,
      description: `Registration Fee - ${member.full_name}`,
      branch_id: profile.branch_id,
      member_id: finalMember.id,
      status: 'COMPLETED',
      payment_mode: paymentMode
    };

    if (paymentMode === 'SPLIT') {
      transactionData.cash_amount = cashAmt;
      transactionData.upi_amount = upiAmt;
    }

    const { data: newTx, error: txError } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (txError) {
      console.error("Error logging transaction:", txError);
    }

    // Local state update using finalMember
    setAppState(prev => ({
      ...prev,
      members: [...prev.members, finalMember],
      transactions: prev.transactions.concat(newTx ? [newTx] : [])
    }));
  };

  const handleMembershipComplete = async (
    member: Member,
    amount: number,
    paymentMode: 'CASH' | 'UPI' | 'SPLIT',
    cashAmount?: number,
    upiAmount?: number,
    cardIssued?: boolean,
    cardPaymentMode?: 'CASH' | 'UPI',
    lockerAssigned?: boolean,
    lockerPaymentMode?: 'CASH' | 'UPI' | 'INCLUDED',
    seatNo?: string
  ) => {
    if (!profile?.branch_id) return;

    // Update Member
    const { data: updatedMember, error: memberError } = await supabase
      .from('members')
      .update({
        subscription_plan: member.subscription_plan,
        daily_access_hours: member.daily_access_hours,
        expiry_date: member.expiry_date,
        card_issued: cardIssued,
        card_payment_mode: cardIssued ? cardPaymentMode : member.card_payment_mode,
        locker_assigned: lockerAssigned,
        locker_payment_mode: lockerAssigned ? lockerPaymentMode : member.locker_payment_mode,
        locker_number: member.locker_number,
        seat_no: seatNo,
        current_plan_start_date: new Date().toISOString()
      })
      .eq('id', member.id)
      .select()
      .single();

    if (memberError) {
      console.error("Error updating member:", memberError);
      return;
    }

    // Transactions
    let allNewTransactions: Transaction[] = [];

    // Membership Plan Transaction
    if (amount > 0 || (cardIssued && !member.card_issued) || (lockerAssigned && !member.locker_assigned)) {
      // We might want to separate the base membership fee from extras if logic requires, 
      // but for now creating one main transaction for the membership plan amount is standard unless split.
      // Wait, the amount passed in includes everything? MembershipForm calculates total.
      // We should break it down if possible or log as one. Current logic in MembershipForm returns total 'amount'.
      // But we likely want separate transactions for accounting if possible, or one detailed one.
      // The previous implementation created separate transactions for Card and Locker.
      // MembershipForm returns total amount. It also passes flags.

      // Let's recalculate specific amounts for record keeping if needed, or just log the main amount minus extras?
      // A safer bet is to log the main membership amount as MEMBERSHIP type.
      // And extras as CARD/LOCKER types.

      // However, the `amount` param from MembershipForm includes everything. 
      // We need to deduct card/locker fees to get the base membership fee?
      // Or we can rely on the fact that we can just log the specific items separate and the main one separate.
      // BUT `amount` is the total user paid.

      let planAmount = amount;
      if (cardIssued && !member.card_issued) planAmount -= 100;
      if (lockerAssigned && !member.locker_assigned && lockerPaymentMode !== 'INCLUDED') planAmount -= 200;

      if (planAmount > 0) {
        const txData: any = {
          type: TransactionType.MEMBERSHIP,
          amount: planAmount,
          description: `Membership (${member.subscription_plan}) - ${member.full_name}`,
          branch_id: profile.branch_id,
          member_id: member.id,
          status: 'COMPLETED',
          payment_mode: paymentMode
        };
        if (paymentMode === 'SPLIT') {
          // Split logic is complex if it covers multiple items. 
          // For simplicity, we assign the split to the main transaction and mark others as CASH/UPI as per their specific flags.
          // But MembershipForm has one global payment mode for the plan+extras? 
          // MembershipForm has `cardPaymentMode` and `lockerPaymentMode`. 
          // The main `paymentMode` applies to the Plan.
          txData.cash_amount = cashAmount;
          txData.upi_amount = upiAmount;
        }

        const { data: memTx } = await supabase.from('transactions').insert(txData).select().single();
        if (memTx) allNewTransactions.push(memTx);
      }

      // Card Transaction
      if (cardIssued && !member.card_issued) {
        const { data: cardTx } = await supabase.from('transactions').insert({
          type: TransactionType.CARD,
          amount: 100,
          description: `Card Fee - ${member.full_name}`,
          branch_id: profile.branch_id,
          member_id: member.id,
          status: 'COMPLETED',
          payment_mode: cardPaymentMode || 'CASH'
        }).select().single();
        if (cardTx) allNewTransactions.push(cardTx);
      }

      // Locker Transaction
      if (lockerAssigned && !member.locker_assigned && lockerPaymentMode !== 'INCLUDED') {
        const { data: lockTx } = await supabase.from('transactions').insert({
          type: TransactionType.LOCKER,
          amount: 200,
          description: `Locker Fee - ${member.full_name} (${member.locker_number})`,
          branch_id: profile.branch_id,
          member_id: member.id,
          status: 'COMPLETED',
          payment_mode: lockerPaymentMode || 'CASH'
        }).select().single();
        if (lockTx) allNewTransactions.push(lockTx);
      }
    }

    // Fallback if RLS blocks reading the updated row
    const finalMember = updatedMember || {
      ...member,
      subscription_plan: member.subscription_plan,
      daily_access_hours: member.daily_access_hours,
      expiry_date: member.expiry_date,
      card_issued: cardIssued !== undefined ? cardIssued : member.card_issued,
      card_payment_mode: cardIssued ? cardPaymentMode : member.card_payment_mode,
      locker_assigned: lockerAssigned !== undefined ? lockerAssigned : member.locker_assigned,
      locker_payment_mode: lockerAssigned ? lockerPaymentMode : member.locker_payment_mode,
      locker_number: member.locker_number,
      seat_no: seatNo !== undefined ? seatNo : member.seat_no,
      current_plan_start_date: new Date().toISOString()
    };

    setAppState(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === finalMember.id ? finalMember : m),
      transactions: [...prev.transactions, ...allNewTransactions]
    }));

    setSelectedMemberForMembership(null);
  };

  const handleRenewMember = async (member: Member) => {
    setSelectedMemberForMembership(member);
    setActiveTab('registered_members');
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


  const handleClearPlans = async (memberIds: string[]) => {
    if (!memberIds.length) return;

    try {
      // NOTE: We do NOT clear join_date as it is a required field (NOT NULL constraint).
      // We set expiry_date to a past date (epoch) to satisfy NOT NULL constraint while ensuring effective 'expiry'.

      // 1. Remove associated transactions (Revenue)
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .in('member_id', memberIds)
        .in('type', ['MEMBERSHIP', 'LOCKER', 'CARD']);

      if (txError) console.error("Error deleting transactions:", txError);

      const { data, error } = await supabase
        .from('members')
        .update({
          subscription_plan: null,
          // join_date: null, // Violated NOT NULL
          expiry_date: new Date(0).toISOString(), // Violated NOT NULL -> Set to epoch
          daily_access_hours: null,
          current_plan_start_date: null,
          days_passed: null,
          locker_assigned: false,
          locker_number: null,
          locker_payment_mode: null,
          seat_no: null,
          card_returned: true // Mark card as returned
        })
        .in('id', memberIds)
        .select();

      if (error) {
        console.error("Error clearing plans:", error);
        alert(`Error clearing plans: ${error.message}`);
        throw error;
      }

      setAppState(prev => ({
        ...prev,
        members: prev.members.map(m =>
          memberIds.includes(m.id)
            ? {
              ...m,
              subscription_plan: undefined,
              expiry_date: new Date(0).toISOString(),
              daily_access_hours: undefined,
              current_plan_start_date: undefined,
              locker_assigned: false,
              locker_number: undefined,
              locker_payment_mode: undefined
            }
            : m
        ),
        transactions: prev.transactions.filter(t =>
          !(memberIds.includes(t.member_id) && ['MEMBERSHIP', 'LOCKER', 'CARD'].includes(t.type))
        )
      }));

      showNotification(`Plans cleared for ${memberIds.length} members.`);

    } catch (err: any) {
      console.error("Error clearing plans:", err);
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
    // 1. Delete the associated receptionist user first
    await supabase.rpc('delete_receptionist_by_branch', { branch_id_input: branchId });

    // 2. Delete the branch
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


  const handleBranchUpdate = (updatedBranch: Branch) => {
    setAppState(prev => ({
      ...prev,
      branches: prev.branches.map(b => b.id === updatedBranch.id ? updatedBranch : b)
    }));
  };

  // --- Content Renderer (Returns ONLY the active component) ---
  const renderInnerContent = () => {
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

      if (adminViewBranchId) {
        const targetBranchMembers = appState.members.filter(m => m.branch_id === adminViewBranchId);
        const targetBranchTransactions = appState.transactions.filter(t => t.branch_id === adminViewBranchId);
        const targetBranchSnacks = appState.snacks.filter(s => s.branch_id === adminViewBranchId);
        const targetBranch = appState.branches.find(b => b.id === adminViewBranchId);

        return (
          <Dashboard
            members={targetBranchMembers}
            transactions={targetBranchTransactions}
            snacks={targetBranchSnacks}
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

    // --- Reception View Data & Handlers ---
    const branchMembers = appState.members.filter(m => m.branch_id === profile.branch_id);
    const branchTransactions = appState.transactions.filter(t => t.branch_id === profile.branch_id);
    const branchSnacks = appState.snacks.filter(s => s.branch_id === profile.branch_id);

    // Calculate cards available
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
      return m.locker_assigned && (status === 'ACTIVE' || status === 'EXPIRING');
    }).length;
    const lockersAvailable = Math.max(0, totalLockers - lockersInUse);



    const handleOldMemberEntry = async (personal: any, membership: any, allocations: any) => {
      if (!profile?.branch_id) return;

      let startDate = new Date();
      if (membership.startDate) {
        startDate = new Date(membership.startDate);
      } else {
        // Fallback
        const daysPassed = parseInt(membership.daysPassed) || 0;
        startDate.setDate(startDate.getDate() - daysPassed);
      }

      const daysPassed = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 3600 * 24));

      let durationDays = membership.durationDays || 30;
      if (membership.plan === SubscriptionPlan.MONTH_3) durationDays = 90;
      if (membership.plan === SubscriptionPlan.MONTH_6) durationDays = 180;

      const expiryDate = new Date(startDate);
      expiryDate.setDate(startDate.getDate() + durationDays);

      const newMemberData: any = {
        full_name: personal.fullName,
        email: personal.email,
        phone: personal.phone,
        address: personal.address,
        study_purpose: personal.studyPurpose,
        join_date: startDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        subscription_plan: membership.plan,
        daily_access_hours: membership.accessHours,
        registered_by: profile.full_name || 'Admin',
        branch_id: profile.branch_id,
        seat_no: allocations.seatNo,

        // Adding missing fields
        current_plan_start_date: startDate.toISOString(),
        days_passed: daysPassed,

        // Allocations
        card_issued: allocations.cardIssued,
        card_payment_mode: allocations.cardIssued ? allocations.cardPaymentMode : undefined,
        locker_assigned: allocations.lockerAssigned,
        locker_payment_mode: allocations.lockerAssigned ? allocations.lockerPaymentMode : undefined,
        locker_number: allocations.lockerAssigned ? allocations.lockerNumber : undefined
      };

      const { data: insertedMember, error } = await supabase
        .from('members')
        .insert(newMemberData)
        .select()
        .single();

      if (error) {
        console.error("Error adding old member:", error);

        if (error.code === '23505') { // Unique constraint violation
          showNotification("Member already exists! Check Email, Phone, or Seat Number.", 'error');
        } else {
          showNotification(`Failed to add member: ${error.message}`, 'error');
        }
        return;
      }

      if (insertedMember) {
        // 3.5 Create Registration Transaction (₹300) - MISSING IN PREVIOUS LOGIC
        const { error: regTxnError } = await supabase
          .from('transactions')
          .insert({
            type: TransactionType.REGISTRATION, // Correct transaction type
            amount: 300, // Standard Fee
            description: `Registration Fee (Old Member) - ${personal.fullName}`,
            branch_id: profile.branch_id,
            member_id: insertedMember.id,
            status: 'COMPLETED',
            payment_mode: 'CASH', // Default for old entries or could be improved later
            timestamp: startDate.toISOString() // Backdated to join date
          });

        if (regTxnError) console.error("Error creating registration transaction:", regTxnError);

        // 4. Create Transaction Record for the Old Membership
        if (membership.paymentAmount && Number(membership.paymentAmount) > 0) {
          const txnData: any = {
            type: 'MEMBERSHIP',
            amount: Number(membership.paymentAmount),
            payment_mode: membership.paymentMode || 'CASH',
            status: 'COMPLETED',
            member_id: insertedMember.id,
            branch_id: profile.branch_id,
            timestamp: startDate.toISOString(), // Backdated to when they supposedly joined
            description: `Old Membership Entry: ${membership.plan} (${membership.daysPassed} days ago)`
          };

          if (membership.paymentMode === 'SPLIT') {
            txnData.cash_amount = Number(membership.cashAmount) || 0;
            txnData.upi_amount = Number(membership.upiAmount) || 0;
          }

          const { error: txnError } = await supabase
            .from('transactions')
            .insert(txnData);

          if (txnError) {
            console.error("Error creating old transaction:", txnError);
            // We don't block the UI here, but we log it.
          }
        }

        // 5. Create Transaction for Card (Standard ₹100)
        if (allocations.cardIssued) {
          const { error: cardTxnError } = await supabase
            .from('transactions')
            .insert({
              type: 'CARD',
              amount: 100,
              payment_mode: allocations.cardPaymentMode || 'CASH',
              status: 'COMPLETED',
              member_id: insertedMember.id,
              branch_id: profile.branch_id,
              timestamp: startDate.toISOString(), // Backdated
              description: `Old Member Card Issue`
            });
          if (cardTxnError) console.error("Error creating card transaction:", cardTxnError);
        }

        // 6. Create Transaction for Locker (Standard ₹200)
        if (allocations.lockerAssigned && allocations.lockerPaymentMode !== 'INCLUDED') {
          const { error: lockerTxnError } = await supabase
            .from('transactions')
            .insert({
              type: 'LOCKER',
              amount: 200,
              payment_mode: allocations.lockerPaymentMode || 'CASH',
              status: 'COMPLETED',
              member_id: insertedMember.id,
              branch_id: profile.branch_id,
              timestamp: startDate.toISOString(), // Backdated
              description: `Old Member Locker Issue: ${allocations.lockerNumber}`
            });
          if (lockerTxnError) console.error("Error creating locker transaction:", lockerTxnError);
        }

        // Refresh members and transactions
        const { data: allMembers } = await supabase.from('members').select('*');
        const { data: allTxns } = await supabase.from('transactions').select('*'); // Refresh txns too

        if (allMembers) {
          setAppState(prev => ({
            ...prev,
            members: allMembers,
            transactions: allTxns || prev.transactions
          }));
        }

        if (allMembers) {
          setAppState(prev => ({
            ...prev,
            members: allMembers,
            transactions: allTxns || prev.transactions
          }));
        }

        showNotification("Old Member Added Successfully!");
        setActiveTab('registered_members');
      }
    };

    // Reception View Logic
    switch (activeTab) {
      case 'new_registration':
        return (
          <RegistrationForm
            branchId={profile.branch_id || ''}
            branchName={currentBranch?.name || ''}
            onRegisterSuccess={handleRegistrationSuccess}
          />
        );
      case 'old_member_entry':
        return (
          <OldMemberEntry
            branchId={profile.branch_id || ''}
            onComplete={handleOldMemberEntry}
          />
        );
      case 'registered_members':
        if (selectedMemberForMembership) {
          return (
            <MembershipForm
              member={selectedMemberForMembership}
              branchId={profile.branch_id || ''}
              onMembershipComplete={handleMembershipComplete}
              cardsAvailable={cardsAvailable}
              lockersAvailable={lockersAvailable}
              onCancel={() => setSelectedMemberForMembership(null)}
            />
          );
        }
        return (
          <RegisteredMembers
            members={branchMembers}
            onAddMembership={(m) => setSelectedMemberForMembership(m)}
            branchName={currentBranch?.name || ''}
            onDeleteMember={(id) => handleDeleteMembers([id])}
          />
        );
      case 'manage_snacks':
        return <SnackManager branchId={profile.branch_id || ''} />;
      case 'snacks':
        return <SnackShop onSale={handleSnackSale} branchId={profile.branch_id || ''} />;
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
              snacks={branchSnacks}
              onRenew={handleRenewMember}
              onIssueCard={handleIssueCard}
              onReturnCard={handleReturnCard}
              onAssignLocker={handleAssignLocker}
              onDeleteMembers={handleDeleteMembers}
              onClearPlans={handleClearPlans}
              hideStats={true}
            />
          </div>
        );
    }
  };

  // --- Main Layout Render ---
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

      <main className="md:ml-64 flex-1 p-4 md:p-8 transition-all duration-300 relative">
        {/* Toast Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 animate-fade-in-down flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${notification.type === 'success' ? 'bg-white border-green-200 text-green-700' : 'bg-white border-red-200 text-red-700'
            }`}>
            {notification.type === 'success' ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
            <span className="font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        )}

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

        <div className="animate-fade-in pb-10 md:pb-0">
          {renderInnerContent()}
        </div>
      </main>
    </div>
  );
};

export default AppWrapper;
