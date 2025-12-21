import React, { useState } from 'react';
import { Lock, Users, AlertTriangle, CheckCircle, Package, Edit2, Save, X } from 'lucide-react';
import { Member, Branch } from '../types';
import { supabase } from '../supabaseClient';

interface LockerManagementProps {
    members: Member[];
    branch: Branch | null;
    onBranchUpdate: (updatedBranch: Branch) => void;
    readOnly?: boolean;
}


export const LockerManagement: React.FC<LockerManagementProps> = ({ members, branch, onBranchUpdate, readOnly }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newTotalLockers, setNewTotalLockers] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const today = new Date();

    // Get member status
    const getMemberStatus = (expiryDateStr: string) => {
        const expiry = new Date(expiryDateStr);
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);
        if (expiry < today) return 'EXPIRED';
        if (expiry <= threeDaysFromNow) return 'EXPIRING';
        return 'ACTIVE';
    };

    // Calculate locker statistics
    const totalLockers = Number(branch?.total_lockers) || 0;

    // Lockers in use = Active/Expiring members with locker_assigned = true
    const lockersInUse = members.filter(m => {
        const status = getMemberStatus(m.expiry_date);
        return m.locker_assigned && (status === 'ACTIVE' || status === 'EXPIRING');
    }).length;

    // Lockers available to issue
    // Unlike cards, lockers are freed when membership expires (as per user requirement), so we don't count expired members
    const lockersAvailable = Math.max(0, totalLockers - lockersInUse);

    const handleStartEdit = () => {
        setNewTotalLockers(totalLockers.toString());
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setNewTotalLockers('');
    };

    const handleSave = async () => {
        if (!branch) return;

        const newTotal = parseInt(newTotalLockers, 10);
        if (isNaN(newTotal) || newTotal < 0) {
            alert('Please enter a valid number');
            return;
        }

        // Ensure new total is not less than lockers already issued
        if (newTotal < lockersInUse) {
            alert(`Cannot set total lockers below ${lockersInUse} (lockers currently in use)`);
            return;
        }

        setSaving(true);
        try {
            console.log("Updating total_lockers for branch:", branch.id, "to", newTotal);
            const { data, error } = await supabase
                .from('branches')
                .update({ total_lockers: newTotal })
                .eq('id', branch.id)
                .select();

            if (error) {
                console.error("Supabase update error:", error);
                throw error;
            }

            if (!data || data.length === 0) {
                console.warn("Update returned no data. Possible RLS issue or ID mismatch.");
                throw new Error("Update failed. You may not have permission to modify this branch.");
            }

            onBranchUpdate({ ...branch, total_lockers: newTotal });
            setIsEditing(false);
        } catch (err: any) {
            console.error('Error updating total lockers:', err);
            alert('Failed to update: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Locker Management</h2>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Lockers */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-500">Total Lockers</p>
                        {!isEditing ? (
                            !readOnly && (
                                <button
                                    onClick={handleStartEdit}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Edit total lockers"
                                >
                                    <Edit2 size={16} />
                                </button>
                            )
                        ) : (
                            <div className="flex gap-1">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="text-green-600 hover:text-green-700 transition-colors"
                                    title="Save"
                                >
                                    <Save size={16} />
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="text-red-500 hover:text-red-600 transition-colors"
                                    title="Cancel"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    {isEditing ? (
                        <input
                            type="number"
                            min="0"
                            value={newTotalLockers}
                            onChange={(e) => setNewTotalLockers(e.target.value)}
                            className="text-3xl font-bold text-indigo-600 w-full border-b-2 border-indigo-300 focus:outline-none focus:border-indigo-600"
                            autoFocus
                        />
                    ) : (
                        <h3 className="text-3xl font-bold text-indigo-600">{totalLockers}</h3>
                    )}
                    <p className="text-xs text-slate-400 mt-1">Allocated to this branch</p>
                </div>

                {/* Lockers Available */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="text-green-500" size={18} />
                        <p className="text-sm font-medium text-slate-500">Free Lockers</p>
                    </div>
                    <h3 className={`text-3xl font-bold ${lockersAvailable > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {lockersAvailable}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Ready for assignment</p>
                </div>

                {/* Lockers In Use */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Lock className="text-blue-500" size={18} />
                        <p className="text-sm font-medium text-slate-500">Lockers In Use</p>
                    </div>
                    <h3 className="text-3xl font-bold text-blue-600">{lockersInUse}</h3>
                    <p className="text-xs text-slate-400 mt-1">With active members</p>
                </div>
            </div>

            {/* Info Section */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-indigo-800 mb-3">Locker Rules</h3>
                <div className="flex items-center gap-3">
                    <Lock className="text-indigo-600" size={24} />
                    <div>
                        <p className="text-indigo-700 font-medium">Pricing & Terms</p>
                        <p className="text-sm text-indigo-600/70">
                            • Standard Price: ₹200 per locker<br />
                            • Free for "24 Hours" daily access plans<br />
                            • Automatically freed when membership expires
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
