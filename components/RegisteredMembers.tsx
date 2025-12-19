import React, { useState } from 'react';
import { Search, Crown } from 'lucide-react';
import { Member } from '../types';

interface RegisteredMembersProps {
    members: Member[];
    onAddMembership: (member: Member) => void;
    branchName: string;
}

export const RegisteredMembers: React.FC<RegisteredMembersProps> = ({ members, onAddMembership, branchName }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMembers = members.filter(m =>
        m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Registered Members</h2>
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
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredMembers.map(member => {
                                const hasActivePlan = member.subscription_plan && new Date(member.expiry_date) > new Date();

                                return (
                                    <tr key={member.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{member.full_name}</div>
                                            <div className="text-xs text-slate-500">RID: {member.id.substring(0, 8)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600">{member.phone}</div>
                                            <div className="text-xs text-slate-500">{member.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {member.study_purpose}
                                        </td>
                                        <td className="px-6 py-4">
                                            {hasActivePlan ? (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                                    Active Member
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                                                    Registered Only
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!hasActivePlan && (
                                                <button
                                                    onClick={() => onAddMembership(member)}
                                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                                                >
                                                    <Crown size={16} />
                                                    Add Membership
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
        </div>
    );
};
