

import React, { useState } from 'react';
import { Member, Transaction, TransactionType } from '../types';
import { Users, TrendingUp, Clock, AlertCircle, Calendar, Filter, Search, UserPlus, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface DashboardProps {
    members: Member[];
    transactions: Transaction[];
    onRenew: (member: Member) => void;
    onBack?: () => void;
}

type DashboardView = 'OVERVIEW' | 'SNACKS' | 'JOINING' | 'MEMBERS';
type MemberFilter = 'ALL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED';

export const Dashboard: React.FC<DashboardProps> = ({ members, transactions, onRenew, onBack }) => {
    const [view, setView] = useState<DashboardView>('OVERVIEW');
    const [memberFilter, setMemberFilter] = useState<MemberFilter>('ALL');
    const [paymentModeFilter, setPaymentModeFilter] = useState<'ALL' | 'CASH' | 'UPI'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // --- Calculations ---
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const getMemberStatus = (expiryDateStr: string) => {
        const expiry = new Date(expiryDateStr);
        if (expiry < today) return 'EXPIRED';
        if (expiry <= threeDaysFromNow) return 'EXPIRING';
        return 'ACTIVE';
    };

    const expiringMembers = members.filter(m => getMemberStatus(m.expiry_date) === 'EXPIRING');
    const expiredMembers = members.filter(m => getMemberStatus(m.expiry_date) === 'EXPIRED');

    // --- Filtering Logic ---
    // Filter Members by Payment Mode for Joining Report
    const joiningReportMembers = React.useMemo(() => {
        if (paymentModeFilter === 'ALL') return members;
        const targetMemberIds = new Set(
            transactions
                .filter(t => t.type === TransactionType.MEMBERSHIP && t.payment_mode === paymentModeFilter)
                .map(t => t.member_id)
        );
        return members.filter(m => targetMemberIds.has(m.id));
    }, [members, transactions, paymentModeFilter]);

    const filteredMembers = members.filter(m => {
        const statusMatch =
            memberFilter === 'ALL' ? true :
                memberFilter === 'ACTIVE' ? getMemberStatus(m.expiry_date) === 'ACTIVE' :
                    memberFilter === 'EXPIRING' ? getMemberStatus(m.expiry_date) === 'EXPIRING' :
                        getMemberStatus(m.expiry_date) === 'EXPIRED';

        const searchMatch =
            m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.study_purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.registered_by.toLowerCase().includes(searchTerm.toLowerCase());

        return statusMatch && searchMatch;
    });



    // --- Revenue Calculations ---
    const calculateRevenue = (days: number) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        return transactions
            .filter(t => new Date(t.timestamp) >= cutoff)
            .filter(t => paymentModeFilter === 'ALL' || t.payment_mode === paymentModeFilter)
            .reduce((sum, t) => sum + t.amount, 0);
    };

    const dailyRevenue = calculateRevenue(1);
    const weeklyRevenue = calculateRevenue(7);
    const monthlyRevenue = calculateRevenue(30);

    // --- Snack Revenue Calculations ---
    const calculateSnackRevenue = (days: number) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        return transactions
            .filter(t => new Date(t.timestamp) >= cutoff)
            .filter(t => t.type === TransactionType.SNACK)
            .filter(t => paymentModeFilter === 'ALL' || t.payment_mode === paymentModeFilter)
            .reduce((sum, t) => sum + t.amount, 0);
    };

    const dailySnackRevenue = calculateSnackRevenue(1);
    const weeklySnackRevenue = calculateSnackRevenue(7);
    const monthlySnackRevenue = calculateSnackRevenue(30);

    // --- Joining Calculations ---
    const calculateJoinings = (days: number) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        return joiningReportMembers.filter(m => new Date(m.join_date) >= cutoff).length;
    };

    const dailyJoinings = calculateJoinings(1);
    const weeklyJoinings = calculateJoinings(7);
    const monthlyJoinings = calculateJoinings(30);

    const getJoiningChartData = (days: number) => {
        const data: Record<string, { name: string, count: number, revenue: number }> = {};
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            data[dateKey] = { name: dateKey, count: 0, revenue: 0 };
        }
        joiningReportMembers.forEach(m => {
            const d = new Date(m.join_date);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            if (d >= cutoff) {
                const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (data[dateKey]) {
                    data[dateKey].count++;
                    // Find transaction for this member? We need the price. 
                    // Ideally we should sum transactions for these members on that date if we want exact revenue.
                    // But `joiningReportMembers` is just a list of members.
                    // We need to look up their transaction amount.
                    // Let's iterate transactions instead for revenue, but filtered by NEW memberships.
                    // OR, we can just look at `transactions` that represent a membership joining.
                }
            }
        });

        // Better approach: Iterate transactions to get precise daily revenue from memberships
        transactions.forEach(t => {
            if (t.type === TransactionType.MEMBERSHIP && (paymentModeFilter === 'ALL' || t.payment_mode === paymentModeFilter)) {
                const d = new Date(t.timestamp);
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - days);
                if (d >= cutoff) {
                    const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (data[dateKey]) {
                        data[dateKey].revenue += t.amount;
                        // We can also count specific joinings if the transaction is a joining (not renewal).
                        // But for simplicity, let's assume Members list is the source of truth for "New Joinings" count.
                        // Wait, `joiningReportMembers` is filtered by Payment Mode.
                    }
                }
            }
        });

        return Object.values(data);
    };

    const getPlanStats = () => {
        const stats: Record<string, number> = {};
        joiningReportMembers.forEach(m => {
            // Only consider active members for plan preference? Or all? Let's do all for preference trends.
            const plan = m.subscription_plan || 'Unknown';
            stats[plan] = (stats[plan] || 0) + 1;
        });
        return Object.keys(stats).map(name => ({ name, value: stats[name] }));
    };

    const getStatusStats = () => {
        let active = 0;
        let expiring = 0;
        let expired = 0;
        joiningReportMembers.forEach(m => {
            const status = getMemberStatus(m.expiry_date);
            if (status === 'ACTIVE') active++;
            else if (status === 'EXPIRING') expiring++;
            else expired++;
        });
        return [
            { name: 'Active', value: active },
            { name: 'Expiring', value: expiring },
            { name: 'Expired', value: expired }
        ];
    };

    // Chart Data Preparation
    const getSalesChartData = (days: number) => {
        const data: Record<string, { name: string, snacks: number, memberships: number }> = {};

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            data[dateKey] = { name: dateKey, snacks: 0, memberships: 0 };
        }

        transactions.forEach(t => {
            const d = new Date(t.timestamp);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);

            if (d >= cutoff && (paymentModeFilter === 'ALL' || t.payment_mode === paymentModeFilter)) {
                const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (data[dateKey]) {
                    if (t.type === TransactionType.SNACK) data[dateKey].snacks += t.amount;
                    else data[dateKey].memberships += t.amount;
                }
            }
        });

        return Object.values(data);
    };

    // --- Render Views ---

    const renderPaymentModeToggle = () => (
        <div className="flex bg-slate-100 p-1 rounded-lg mb-6 self-start">
            <button
                onClick={() => setPaymentModeFilter('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${paymentModeFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
            >
                All
            </button>
            <button
                onClick={() => setPaymentModeFilter('CASH')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${paymentModeFilter === 'CASH' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
            >
                Cash
            </button>
            <button
                onClick={() => setPaymentModeFilter('UPI')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${paymentModeFilter === 'UPI' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
            >
                UPI
            </button>
        </div>
    );

    const renderOverview = () => (
        <div className="space-y-6">
            <div className="flex justify-end">
                {renderPaymentModeToggle()}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">Active Members</p>
                    <h3 className="text-3xl font-bold text-indigo-600">{members.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">Today's Sales</p>
                    <h3 className="text-3xl font-bold text-green-600">₹{dailyRevenue}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Expiring (3 Days)</p>
                            <h3 className="text-3xl font-bold text-amber-600">{expiringMembers.length}</h3>
                        </div>
                        {expiringMembers.length > 0 && <AlertCircle className="text-amber-500 animate-pulse" />}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">Monthly Revenue</p>
                    <h3 className="text-3xl font-bold text-slate-700">₹{monthlyRevenue}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Last 7 Days Revenue</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getSalesChartData(7)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Bar dataKey="memberships" name="Memberships" stackId="a" fill="#6366f1" />
                                <Bar dataKey="snacks" name="Snacks" stackId="a" fill="#fbbf24" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Alerts & Notifications</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {expiringMembers.length === 0 && expiredMembers.length === 0 && (
                            <p className="text-slate-400 text-sm italic">No alerts at the moment.</p>
                        )}
                        {expiringMembers.map(m => (
                            <div key={m.id} className="flex items-center p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                <Clock className="text-amber-600 mr-3" size={18} />
                                <div>
                                    <p className="text-sm font-medium text-amber-900">Membership Expiring: {m.full_name}</p>
                                    <p className="text-xs text-amber-700">Ends on {new Date(m.expiry_date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                        {expiredMembers.map(m => (
                            <div key={m.id} className="flex items-center p-3 bg-red-50 border border-red-100 rounded-lg">
                                <AlertCircle className="text-red-600 mr-3" size={18} />
                                <div>
                                    <p className="text-sm font-medium text-red-900">Expired: {m.full_name}</p>
                                    <p className="text-xs text-red-700">Ended on {new Date(m.expiry_date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSnackSales = () => (
        <div className="space-y-8">
            <div className="flex justify-end">
                {renderPaymentModeToggle()}
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Snacks Financial Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                        <h4 className="text-blue-800 font-semibold mb-2">Today</h4>
                        <p className="text-3xl font-bold text-blue-600">₹{dailySnackRevenue}</p>
                    </div>
                    <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-100">
                        <h4 className="text-indigo-800 font-semibold mb-2">This Week</h4>
                        <p className="text-3xl font-bold text-indigo-600">₹{weeklySnackRevenue}</p>
                    </div>
                    <div className="p-6 bg-violet-50 rounded-xl border border-violet-100">
                        <h4 className="text-violet-800 font-semibold mb-2">This Month</h4>
                        <p className="text-3xl font-bold text-violet-600">₹{monthlySnackRevenue}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Snack Sales Trend</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getSalesChartData(30)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} interval={3} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="snacks" stroke="#fbbf24" strokeWidth={2} dot={false} name="Snack Rev" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderJoining = () => (
        <div className="space-y-8">
            <div className="flex justify-end">
                {renderPaymentModeToggle()}
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">New Memberships</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                        <div>
                            <h4 className="text-emerald-800 font-semibold mb-2">Today</h4>
                            <p className="text-3xl font-bold text-emerald-600">{dailyJoinings}</p>
                        </div>
                        <UserPlus className="text-emerald-200" size={40} />
                    </div>
                    <div className="p-6 bg-teal-50 rounded-xl border border-teal-100 flex items-center justify-between">
                        <div>
                            <h4 className="text-teal-800 font-semibold mb-2">This Week</h4>
                            <p className="text-3xl font-bold text-teal-600">{weeklyJoinings}</p>
                        </div>
                        <UserPlus className="text-teal-200" size={40} />
                    </div>
                    <div className="p-6 bg-cyan-50 rounded-xl border border-cyan-100 flex items-center justify-between">
                        <div>
                            <h4 className="text-cyan-800 font-semibold mb-2">This Month</h4>
                            <p className="text-3xl font-bold text-cyan-600">{monthlyJoinings}</p>
                        </div>
                        <UserPlus className="text-cyan-200" size={40} />
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Membership Joining Trend (30 Days)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getJoiningChartData(30)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} interval={3} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    formatter={(value: number, name: string, props: any) => {
                                        if (name === 'Revenue') return [`₹${value} (${props.payload.count} Members)`, name];
                                        return [value, name];
                                    }}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Revenue" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Plan Distribution</h3>
                    <div className="h-64 flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={getPlanStats()}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {getPlanStats().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Member Status Ratio</h3>
                    <div className="h-64 flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={getStatusStats()}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {getStatusStats().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Active' ? '#10b981' : entry.name === 'Expiring' ? '#f59e0b' : '#ef4444'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMembers = () => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-200px)]">
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {(['ALL', 'ACTIVE', 'EXPIRING', 'EXPIRED'] as MemberFilter[]).map(filter => (
                        <button
                            key={filter}
                            onClick={() => setMemberFilter(filter)}
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${memberFilter === filter
                                ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md transform scale-105'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {filter === 'ALL' ? 'All Members' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search name, purpose, receptionist..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3">Member Name</th>
                            <th className="px-6 py-3">Joined On</th>
                            <th className="px-6 py-3">Expires On</th>
                            <th className="px-6 py-3">Plan / Hours</th>
                            <th className="px-6 py-3">Registered By</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredMembers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                                    No members found matching filters.
                                </td>
                            </tr>
                        ) : (
                            filteredMembers.map(m => {
                                const status = getMemberStatus(m.expiry_date);
                                const statusClasses =
                                    status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                        status === 'EXPIRING' ? 'bg-amber-100 text-amber-800' :
                                            'bg-red-100 text-red-800';

                                return (
                                    <tr key={m.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {m.full_name}
                                            <div className="text-xs font-normal text-slate-500">{m.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-sm">
                                            {new Date(m.join_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                                            {new Date(m.expiry_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-900">{m.subscription_plan} • <span className="font-semibold text-indigo-600">{m.daily_access_hours}</span></div>
                                            <div className="text-xs text-slate-500 italic">{m.study_purpose}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {m.registered_by}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline - flex items - center px - 2.5 py - 0.5 rounded - full text - xs font - medium ${statusClasses} `}>
                                                {status}
                                            </span>
                                            {(status === 'EXPIRING' || status === 'EXPIRED') && (
                                                <button
                                                    onClick={() => onRenew(m)}
                                                    className="ml-3 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-semibold rounded-full hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md flex items-center inline-flex gap-1.5"
                                                >
                                                    <RefreshCw size={12} />
                                                    Renew
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div>
            {onBack && (
                <button
                    onClick={onBack}
                    className="mb-4 flex items-center text-slate-600 hover:text-indigo-600 font-medium transition-colors"
                >
                    ← Back to Admin Dashboard
                </button>
            )}
            <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg inline-flex mb-6 overflow-x-auto max-w-full">
                <button
                    onClick={() => setView('OVERVIEW')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${view === 'OVERVIEW' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setView('SNACKS')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${view === 'SNACKS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    Snacks Sales Report
                </button>
                <button
                    onClick={() => setView('JOINING')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${view === 'JOINING' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    Joining Report
                </button>
                <button
                    onClick={() => setView('MEMBERS')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${view === 'MEMBERS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    Members & Expiry
                </button>
            </div>

            <div className="animate-fade-in">
                {view === 'OVERVIEW' && renderOverview()}
                {view === 'SNACKS' && renderSnackSales()}
                {view === 'JOINING' && renderJoining()}
                {view === 'MEMBERS' && renderMembers()}
            </div>
        </div>
    );
};
