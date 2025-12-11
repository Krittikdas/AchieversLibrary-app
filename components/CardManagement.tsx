import React, { useState } from 'react';
import { CreditCard, Users, AlertTriangle, CheckCircle, Package, Edit2, Save, X } from 'lucide-react';
import { Member, Branch } from '../types';
import { supabase } from '../supabaseClient';

interface CardManagementProps {
    members: Member[];
    branch: Branch | null;
    onBranchUpdate: (updatedBranch: Branch) => void;
    readOnly?: boolean;
}


export const CardManagement: React.FC<CardManagementProps> = ({ members, branch, onBranchUpdate, readOnly }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newTotalCards, setNewTotalCards] = useState<string>('');
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

    // Calculate card statistics
    const totalCards = branch?.total_cards || 0;

    // Cards in circulation = Active/Expiring members with card_issued = true
    const cardsInCirculation = members.filter(m => {
        const status = getMemberStatus(m.expiry_date);
        return m.card_issued && (status === 'ACTIVE' || status === 'EXPIRING');
    }).length;

    // Cards not returned = Expired members with card_issued = true AND card_returned = false
    const cardsNotReturned = members.filter(m => {
        const status = getMemberStatus(m.expiry_date);
        return m.card_issued && status === 'EXPIRED' && !m.card_returned;
    }).length;

    // Cards available to issue
    const cardsAvailable = Math.max(0, totalCards - cardsInCirculation - cardsNotReturned);

    const handleStartEdit = () => {
        setNewTotalCards(totalCards.toString());
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setNewTotalCards('');
    };

    const handleSave = async () => {
        if (!branch) return;

        const newTotal = parseInt(newTotalCards, 10);
        if (isNaN(newTotal) || newTotal < 0) {
            alert('Please enter a valid number');
            return;
        }

        // Ensure new total is not less than cards already issued
        const minRequired = cardsInCirculation + cardsNotReturned;
        if (newTotal < minRequired) {
            alert(`Cannot set total cards below ${minRequired} (cards already issued)`);
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('branches')
                .update({ total_cards: newTotal })
                .eq('id', branch.id);

            if (error) throw error;

            onBranchUpdate({ ...branch, total_cards: newTotal });
            setIsEditing(false);
        } catch (err: any) {
            console.error('Error updating total cards:', err);
            alert('Failed to update: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Card Management</h2>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total Cards */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-500">Total Cards</p>
                        {!isEditing ? (
                            !readOnly && (
                                <button
                                    onClick={handleStartEdit}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Edit total cards"
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
                            value={newTotalCards}
                            onChange={(e) => setNewTotalCards(e.target.value)}
                            className="text-3xl font-bold text-indigo-600 w-full border-b-2 border-indigo-300 focus:outline-none focus:border-indigo-600"
                            autoFocus
                        />
                    ) : (
                        <h3 className="text-3xl font-bold text-indigo-600">{totalCards}</h3>
                    )}
                    <p className="text-xs text-slate-400 mt-1">Allocated to this branch</p>
                </div>

                {/* Cards Available */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="text-green-500" size={18} />
                        <p className="text-sm font-medium text-slate-500">Available to Issue</p>
                    </div>
                    <h3 className={`text-3xl font-bold ${cardsAvailable > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {cardsAvailable}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Ready for new members</p>
                </div>

                {/* Cards in Circulation */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="text-blue-500" size={18} />
                        <p className="text-sm font-medium text-slate-500">In Circulation</p>
                    </div>
                    <h3 className="text-3xl font-bold text-blue-600">{cardsInCirculation}</h3>
                    <p className="text-xs text-slate-400 mt-1">With active members</p>
                </div>

                {/* Cards Not Returned */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="text-amber-500" size={18} />
                        <p className="text-sm font-medium text-slate-500">Not Returned</p>
                    </div>
                    <h3 className={`text-3xl font-bold ${cardsNotReturned > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {cardsNotReturned}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">From expired memberships</p>
                </div>
            </div>

            {/* Info Section */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-indigo-800 mb-3">Card Pricing</h3>
                <div className="flex items-center gap-3">
                    <CreditCard className="text-indigo-600" size={24} />
                    <div>
                        <p className="text-indigo-700 font-medium">₹100 per card</p>
                        <p className="text-sm text-indigo-600/70">Fixed price for all library cards. Refundable upon return.</p>
                    </div>
                </div>
            </div>

            {/* Cards Not Returned List */}
            {cardsNotReturned > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-amber-50">
                        <h3 className="text-lg font-semibold text-amber-800">Members with Unreturned Cards</h3>
                        <p className="text-sm text-amber-600">These expired members still have library cards</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Member Name</th>
                                    <th className="px-6 py-3">Phone</th>
                                    <th className="px-6 py-3">Expired On</th>
                                    <th className="px-6 py-3">Card Payment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {members
                                    .filter(m => {
                                        const status = getMemberStatus(m.expiry_date);
                                        return m.card_issued && status === 'EXPIRED' && !m.card_returned;
                                    })
                                    .map(m => (
                                        <tr key={m.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium text-slate-900">{m.full_name}</td>
                                            <td className="px-6 py-4 text-slate-600">{m.phone}</td>
                                            <td className="px-6 py-4 text-red-600 font-medium">
                                                {new Date(m.expiry_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${m.card_payment_mode === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {m.card_payment_mode || 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
