import React, { useState, useMemo } from 'react';
import { AppState, Branch, Member, Transaction } from '../types';
import { MOCK_BRANCHES } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building2, DollarSign, Users, Filter, Plus, Save, Eye, EyeOff, Download } from 'lucide-react';

interface AdminViewProps {
  state: AppState;
  onViewBranch: (branchId: string) => void;
}

// --- Helper Functions for CSV Export ---
const convertArrayToCSV = (arr: any[]) => {
  if (!arr || !arr.length) return null;
  const header = Object.keys(arr[0]).join(',');
  const body = arr.map(item => Object.values(item).map(val =>
    typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
  ).join(',')).join('\n');
  return `${header}\n${body}`;
};

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

interface DataExportSectionProps {
  branches: Branch[];
  members: Member[];
  transactions: Transaction[];
}

const DataExportSection: React.FC<DataExportSectionProps> = ({ branches, members, transactions }) => {

  const handleExportMembers = (branchId: string, branchName: string) => {
    const branchMembers = members.filter(m => m.branch_id === branchId).map(m => ({
      Name: m.full_name,
      Phone: m.phone,
      Email: m.email,
      Plan: m.subscription_plan,
      Hours: m.daily_access_hours,
      JoinDate: new Date(m.join_date).toLocaleDateString(),
      ExpiryDate: new Date(m.expiry_date).toLocaleDateString(),
      Status: new Date(m.expiry_date) < new Date() ? 'Expired' : 'Active',
      RegisteredBy: m.registered_by
    }));

    if (branchMembers.length === 0) {
      alert("No members found for this branch.");
      return;
    }

    const csv = convertArrayToCSV(branchMembers);
    if (csv) downloadCSV(csv, `${branchName.replace(/\s+/g, '_')}_Members_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportSales = (branchId: string, branchName: string) => {
    // Filter for SNACK transactions only
    const branchTx = transactions
      .filter(t => t.branch_id === branchId && t.type === 'SNACK')
      .map(t => ({
        Date: new Date(t.timestamp).toLocaleDateString(),
        Time: new Date(t.timestamp).toLocaleTimeString(),
        Item: t.description, // mapped from description
        Amount: t.amount,
        PaymentMode: t.payment_mode || 'CASH'
      }));

    if (branchTx.length === 0) {
      alert("No snack sales found for this branch.");
      return;
    }

    const csv = convertArrayToCSV(branchTx);
    if (csv) downloadCSV(csv, `${branchName.replace(/\s+/g, '_')}_SnackSales_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-bold text-slate-700">Data Export</h3>
        <p className="text-xs text-slate-500">Download formatted reports for offline analysis.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Branch Name</th>
              <th className="px-6 py-3 text-right">Member Count</th>
              <th className="px-6 py-3 text-right">Transaction Count</th>
              <th className="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {branches.map((branch) => {
              const memberCount = members.filter(m => m.branch_id === branch.id).length;
              const txCount = transactions.filter(t => t.branch_id === branch.id).length;

              return (
                <tr key={branch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{branch.name}</td>
                  <td className="px-6 py-4 text-right text-slate-600">{memberCount}</td>
                  <td className="px-6 py-4 text-right text-slate-600">{txCount}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={() => handleExportMembers(branch.id, branch.name)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                      >
                        <Users size={14} />
                        <span>Members</span>
                      </button>
                      <button
                        onClick={() => handleExportSales(branch.id, branch.name)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                      >
                        <DollarSign size={14} />
                        <span>Sales</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminView: React.FC<AdminViewProps> = ({ state, onViewBranch }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Generate Year Options (Current Year +/- 2)
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const months = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  // Filter Data
  const filteredData = useMemo(() => {
    let filteredTransactions = state.transactions;
    let filteredMembers = state.members;

    if (selectedDate) {
      // Precise Date Filter
      const targetDate = new Date(selectedDate);
      filteredTransactions = filteredTransactions.filter(t => {
        const tDate = new Date(t.timestamp);
        return tDate.getDate() === targetDate.getDate() &&
          tDate.getMonth() === targetDate.getMonth() &&
          tDate.getFullYear() === targetDate.getFullYear();
      });
      filteredMembers = filteredMembers.filter(m => {
        const mDate = new Date(m.join_date);
        return mDate.getDate() === targetDate.getDate() &&
          mDate.getMonth() === targetDate.getMonth() &&
          mDate.getFullYear() === targetDate.getFullYear();
      });
    } else {
      if (selectedYear !== 'ALL') {
        filteredTransactions = filteredTransactions.filter(t => new Date(t.timestamp).getFullYear().toString() === selectedYear);
        filteredMembers = filteredMembers.filter(m => new Date(m.join_date).getFullYear().toString() === selectedYear);
      }

      if (selectedMonth !== 'ALL') {
        filteredTransactions = filteredTransactions.filter(t => new Date(t.timestamp).getMonth().toString() === selectedMonth);
        filteredMembers = filteredMembers.filter(m => new Date(m.join_date).getMonth().toString() === selectedMonth);
      }
    }

    return { transactions: filteredTransactions, members: filteredMembers };
  }, [state.transactions, state.members, selectedMonth, selectedYear, selectedDate]);


  // Aggregate Data by Branch using Filtered Data
  const branchData = state.branches.map(branch => {
    const branchTransactions = filteredData.transactions.filter(t => t.branch_id === branch.id);
    const revenue = branchTransactions.reduce((sum, t) => sum + t.amount, 0);
    // For members, we count those who JOINED in the period
    const membersAdded = filteredData.members.filter(m => m.branch_id === branch.id).length;

    return {
      id: branch.id,
      name: branch.name,
      revenue,
      membersAdded,
      location: branch.location
    };
  });

  const totalSystemRevenue = branchData.reduce((sum, b) => sum + b.revenue, 0);
  const totalNewMembers = branchData.reduce((sum, b) => sum + b.membersAdded, 0);

  const isFiltered = selectedMonth !== 'ALL' || selectedYear !== 'ALL' || selectedDate !== '';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Admin Office Command Center</h2>
          <p className="text-slate-500 mt-1">Overview of all {state.branches.length} connected library branches.</p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center px-2 text-slate-500">
            <Filter size={18} className="mr-2" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-slate-200 rounded-md text-sm py-1.5 pl-2 pr-8 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
          >
            <option value="ALL">All Months</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              if (selectedDate) setSelectedDate(''); // Clear specific date if year changes
            }}
            className="border-slate-200 rounded-md text-sm py-1.5 pl-2 pr-8 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
          >
            <option value="ALL">All Years</option>
            {years.map(y => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
          </select>

          <span className="text-slate-300">|</span>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              if (e.target.value) {
                // If date is selected, clear month/year to show visual priority
                setSelectedMonth('ALL');
                setSelectedYear('ALL');
              }
            }}
            className="border-slate-200 rounded-md text-sm py-1.5 px-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
          />

          {(selectedMonth !== 'ALL' || selectedYear !== 'ALL' || selectedDate !== '') && (
            <button
              onClick={() => { setSelectedMonth('ALL'); setSelectedYear('ALL'); setSelectedDate(''); }}
              className="text-xs text-red-600 hover:text-red-800 font-medium px-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* High Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg shadow-indigo-200 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-200 text-sm font-medium mb-1">
                {isFiltered ? 'Revenue (Selected Period)' : 'Total Revenue (All Time)'}
              </p>
              <h3 className="text-4xl font-bold">₹{totalSystemRevenue.toLocaleString()}</h3>
            </div>
            <DollarSign className="opacity-50" size={32} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">
                {isFiltered ? 'New Members (Selected Period)' : 'Total Membership (All Time)'}
              </p>
              <h3 className="text-4xl font-bold text-slate-800">{totalNewMembers}</h3>
            </div>
            <Users className="text-slate-300" size={32} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Active Branches</p>
              <h3 className="text-4xl font-bold text-slate-800">{state.branches.length}</h3>
            </div>
            <Building2 className="text-slate-300" size={32} />
          </div>
        </div>
      </div>

      {/* Visualizations */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6">
          Revenue Performance by Branch {isFiltered && <span className="text-sm font-normal text-slate-500 ml-2">(Filtered)</span>}
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={branchData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', borderRadius: '12px' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="revenue" name="Revenue (₹)" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-700">Branch Status Reports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Branch Name</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3 text-right">
                  {isFiltered ? 'New Members' : 'Total Members'}
                </th>
                <th className="px-6 py-3 text-right">Revenue</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchData.map((branch) => (
                <tr
                  key={branch.name}
                  onClick={() => onViewBranch(branch.id)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{branch.name}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{branch.location}</td>
                  <td className="px-6 py-4 text-right text-slate-700">{branch.membersAdded}</td>
                  <td className="px-6 py-4 text-right font-bold text-indigo-600">₹{branch.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Synced
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Data Export Section */}
      <DataExportSection branches={state.branches} members={state.members} transactions={state.transactions} />
    </div >
  );
};

interface AdminBranchCreationProps {
  branches: Branch[];
  onAddBranch: (branch: Branch) => void;
  onDeleteBranch: (branchId: string) => void;
}

import { supabase } from '../supabaseClient';

export const AdminBranchCreation: React.FC<AdminBranchCreationProps> = ({ branches, onAddBranch, onDeleteBranch }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Delete state
  const [branchToDelete, setBranchToDelete] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create Branch in DB
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .insert({ name, location, email })
        .select()
        .single();

      if (branchError) throw branchError;

      // 2. Call Edge Function to create Receptionist User
      const { data: funcData, error: funcError } = await supabase.functions.invoke('create-receptionist', {
        body: {
          email,
          password,
          branchId: branchData.id,
          action: 'CREATE'
        }
      });

      if (funcError || funcData?.error) {
        // Rollback: Delete the branch we just created so we don't have "zombie" branches
        console.error("Edge Function failed, rolling back branch creation...");
        await supabase.from('branches').delete().eq('id', branchData.id);

        if (funcError) {
          console.error("Edge Function Error:", funcError);
          throw new Error(funcError.message || 'Failed to create receptionist user');
        }
        if (funcData?.error) {
          console.error("Edge Function Returned Error:", funcData.error);
          throw new Error(funcData.error);
        }
      }

      onAddBranch(branchData);
      setSuccess(`Branch "${name}" created successfully!`);
      setName('');
      setEmail('');
      setPassword('');
      setLocation('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create branch');
    } finally {
      setLoading(false);
    }
  };

  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (!branchToDelete) return;
    const branchName = branches.find(b => b.id === branchToDelete)?.name;

    onDeleteBranch(branchToDelete);
    setBranchToDelete('');
    setShowConfirm(false);
    setSuccess(`Branch "${branchName}" deleted successfully.`);
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Create Branch Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Create New Branch</h2>
            <p className="text-slate-500 text-sm">Add a new library branch to the network</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {success && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm font-medium border border-green-200">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-medium border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="e.g. West Wing Library"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="e.g. Sector 45, West City"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="branch@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="••••••••"
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
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-70"
            >
              {loading ? 'Creating...' : (
                <>
                  <Save size={20} />
                  Create Branch
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Branch Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-red-50 bg-red-50/50 flex items-center gap-3">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-900">Delete Branch</h2>
            <p className="text-red-600/80 text-sm">Permanently remove a branch from the system</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Branch to Delete</label>
            <select
              value={branchToDelete}
              onChange={e => setBranchToDelete(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            >
              <option value="">-- Select a branch --</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            {!branchToDelete ? (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-semibold py-3 rounded-xl cursor-not-allowed"
              >
                Delete Branch
              </button>
            ) : showConfirm ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 shadow-lg shadow-red-200"
                >
                  Confirm Delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
              >
                Delete Branch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReceptionistList: React.FC<{ branches: Branch[] }> = ({ branches }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Receptionist Directory</h2>
          <p className="text-slate-500 mt-1">Contact details and branch assignments for all reception staff.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Branch Name</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Receptionist Email (Login ID)</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div className="flex items-center">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mr-3">
                        <Building2 size={16} />
                      </div>
                      {branch.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{branch.location}</td>
                  <td className="px-6 py-4 text-slate-700 font-mono text-sm bg-slate-50/50 rounded">
                    {branch.email || 'No email assigned'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No receptionists found. Create a branch to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};