import React, { useState } from 'react';
import { Search, Crown, Eye, X, Calendar, CreditCard, Lock, User, Clock, MapPin, Phone, Mail, Trash2 } from 'lucide-react';
import { Member } from '../types';

interface RegisteredMembersProps {
    members: Member[];
    onAddMembership: (member: Member) => void;
    branchName: string;
    onDeleteMember?: (memberId: string) => void;
}

export const RegisteredMembers: React.FC<RegisteredMembersProps> = ({ members, onAddMembership, branchName, onDeleteMember }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);

    const filteredMembers = members.filter(m =>
        m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Helper to calculate progress
    const calculateProgress = (member: Member) => {
        if (!member.current_plan_start_date || !member.expiry_date) return { percent: 0, daysPassed: 0, totalDays: 0, daysLeft: 0 };

        const start = new Date(member.current_plan_start_date).getTime();
        const end = new Date(member.expiry_date).getTime();
        const now = new Date().getTime();

        if (end <= start) return { percent: 100, daysPassed: 0, totalDays: 0, daysLeft: 0 };

        const totalDuration = end - start;
        const elapsed = now - start;

        const daysPassed = Math.floor(elapsed / (1000 * 60 * 60 * 24));
        const totalDays = Math.floor(totalDuration / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, totalDays - daysPassed);

        let percent = (elapsed / totalDuration) * 100;
        percent = Math.min(Math.max(percent, 0), 100);

        return { percent, daysPassed, totalDays, daysLeft };
    };

    const MemberDetailModal = ({ member, onClose }: { member: Member; onClose: () => void }) => {
        const hasActivePlan = member.subscription_plan && new Date(member.expiry_date) > new Date();
        const progress = calculateProgress(member);

        return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start">
                        <div className="flex gap-4">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl">
                                {member.full_name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{member.full_name}</h2>
                                <p className="text-sm text-slate-500 font-mono">ID: {member.id.split('-')[0]}</p>
                                <div className="mt-2 flex gap-2">
                                    {(() => {
                                        const isExpired = member.subscription_plan && new Date(member.expiry_date) <= new Date();
                                        if (hasActivePlan) {
                                            return (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                                                    Active Member
                                                </span>
                                            );
                                        } else if (isExpired) {
                                            return (
                                                <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full border border-red-200">
                                                    Expired
                                                </span>
                                            );
                                        } else {
                                            return (
                                                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
                                                    Registered Only
                                                </span>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-6 overflow-y-auto space-y-6">

                        {/* Contact Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 text-slate-600">
                                <Phone size={18} className="text-indigo-400" />
                                <span>{member.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Mail size={18} className="text-indigo-400" />
                                <span>{member.email}</span>
                            </div>
                            <div className="col-span-1 md:col-span-2 flex items-center gap-3 text-slate-600">
                                <MapPin size={18} className="text-indigo-400" />
                                <span className="truncate">{member.address}</span>
                            </div>
                            <div className="col-span-1 md:col-span-2 flex items-center gap-3 text-slate-600">
                                <Calendar size={18} className="text-indigo-400" />
                                <span>Joined: {new Date(member.join_date).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Membership Status */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Membership Status</h3>
                            {hasActivePlan ? (
                                <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <p className="text-indigo-900 font-bold text-lg">{member.subscription_plan}</p>
                                            <p className="text-indigo-600 text-sm">Valid until {new Date(member.expiry_date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-indigo-900 font-bold text-lg">{member.daily_access_hours}</p>
                                            <p className="text-indigo-600 text-sm">Daily Access</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-semibold text-indigo-700">
                                            <span>{progress.daysPassed} Days Passed</span>
                                            <span>{progress.daysLeft} Days Left</span>
                                        </div>
                                        <div className="h-3 bg-indigo-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                                style={{ width: `${progress.percent}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-center text-indigo-500 mt-1">
                                            Started: {member.current_plan_start_date ? new Date(member.current_plan_start_date).toLocaleDateString() : 'N/A'} • Total Duration: {progress.totalDays} Days
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
                                    <p className="text-slate-500 mb-4">No active membership plan found.</p>
                                    <button
                                        onClick={() => { onClose(); onAddMembership(member); }}
                                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors inline-flex items-center gap-2"
                                    >
                                        <Crown size={18} />
                                        Activate Membership
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Allocations Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Seat */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-2 text-slate-500">
                                    <User size={18} />
                                    <span className="text-sm font-medium">Assigned Seat</span>
                                </div>
                                <div className="text-xl font-bold text-slate-800">
                                    {member.seat_no || "None"}
                                </div>
                            </div>

                            {/* Card */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                {member.card_issued && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8" />}
                                <div className="flex items-center gap-2 mb-2 text-slate-500 relative z-10">
                                    <CreditCard size={18} />
                                    <span className="text-sm font-medium">Library Card</span>
                                </div>
                                <div className="relative z-10">
                                    <div className={`text-xl font-bold ${member.card_issued ? 'text-blue-600' : 'text-slate-400'}`}>
                                        {member.card_issued ? "Issued" : "Not Issued"}
                                    </div>
                                    {member.card_issued && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            Payment: <span className="font-medium text-slate-700">{member.card_payment_mode}</span>
                                            {member.card_returned && <span className="text-red-500 ml-2">(Returned)</span>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Locker */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                {member.locker_assigned && <div className="absolute top-0 right-0 w-16 h-16 bg-pink-50 rounded-bl-full -mr-8 -mt-8" />}
                                <div className="flex items-center gap-2 mb-2 text-slate-500 relative z-10">
                                    <Lock size={18} />
                                    <span className="text-sm font-medium">Locker</span>
                                </div>
                                <div className="relative z-10">
                                    <div className={`text-xl font-bold ${member.locker_assigned ? 'text-pink-600' : 'text-slate-400'}`}>
                                        {member.locker_assigned ? member.locker_number : "None"}
                                    </div>
                                    {member.locker_assigned && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            Payment: <span className="font-medium text-slate-700">{member.locker_payment_mode}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                        >
                            Close
                        </button>
                        {!hasActivePlan && (
                            <button
                                onClick={() => { onClose(); onAddMembership(member); }}
                                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium transition-colors"
                            >
                                Renew / Add Plan
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Members Directory</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none w-64"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Study Purpose</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredMembers.map(member => {
                                const hasActivePlan = member.subscription_plan && new Date(member.expiry_date) > new Date();

                                return (
                                    <tr key={member.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{member.full_name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600">{member.phone}</div>
                                            <div className="text-xs text-slate-500">{member.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {member.study_purpose}
                                        </td>
                                        <td className="px-6 py-4">
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const hasPlan = member.subscription_plan;
                                                    const isExpired = hasPlan && new Date(member.expiry_date) <= new Date();

                                                    if (hasPlan && !isExpired) {
                                                        return (
                                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                                                Active Member
                                                            </span>
                                                        );
                                                    } else if (isExpired) {
                                                        return (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                                                Expired
                                                            </span>
                                                        );
                                                    } else {
                                                        return (
                                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                                                                Registered Only
                                                            </span>
                                                        );
                                                    }
                                                })()}
                                            </td>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => setSelectedMember(member)}
                                                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1.5"
                                            >
                                                <Eye size={14} />
                                                View
                                            </button>
                                            {!hasActivePlan && (
                                                <button
                                                    onClick={() => onAddMembership(member)}
                                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1.5"
                                                >
                                                    <Crown size={14} />
                                                    Add Plan
                                                </button>
                                            )}
                                            {onDeleteMember && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Are you sure you want to delete ${member.full_name}? This cannot be undone.`)) {
                                                            onDeleteMember(member.id);
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1.5"
                                                    title="Delete Member"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredMembers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                                        No registered members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedMember && (
                <MemberDetailModal
                    member={selectedMember}
                    onClose={() => setSelectedMember(null)}
                />
            )}
        </div>
    );
};
