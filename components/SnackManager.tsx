import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, UtensilsCrossed } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Snack } from '../types';

interface SnackManagerProps {
    branchId: string;
}

export const SnackManager: React.FC<SnackManagerProps> = ({ branchId }) => {
    const [snacks, setSnacks] = useState<Snack[]>([]);
    const [newSnackName, setNewSnackName] = useState('');
    const [newSnackPrice, setNewSnackPrice] = useState('');
    const [isAddingSnack, setIsAddingSnack] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (branchId) fetchSnacks();
    }, [branchId]);

    const fetchSnacks = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('snacks')
            .select('*')
            .eq('is_active', true)
            .eq('branch_id', branchId) // Filter by branch
            .order('name');

        if (data) setSnacks(data);
        setIsLoading(false);
    };

    const handleAddSnack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSnackName || !newSnackPrice || !branchId) return;
        setIsAddingSnack(true);

        const { error } = await supabase
            .from('snacks')
            .insert({
                name: newSnackName,
                price: Number(newSnackPrice),
                branch_id: branchId
            });

        if (!error) {
            setNewSnackName('');
            setNewSnackPrice('');
            fetchSnacks();
        }
        setIsAddingSnack(false);
    };

    const handleDeleteSnack = async (id: string) => {
        if (!confirm('Are you sure you want to remove this item?')) return;

        // Soft delete
        const { error } = await supabase
            .from('snacks')
            .update({ is_active: false })
            .eq('id', id);

        if (!error) {
            fetchSnacks();
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <UtensilsCrossed size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Manage Snacks</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Add New Item Form */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
                        <h3 className="font-bold text-slate-800 mb-4">Add New Item</h3>
                        <form onSubmit={handleAddSnack} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Chocolate Bar"
                                    value={newSnackName}
                                    onChange={e => setNewSnackName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 20"
                                    value={newSnackPrice}
                                    onChange={e => setNewSnackPrice(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isAddingSnack}
                                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-70 flex justify-center items-center"
                            >
                                {isAddingSnack ? <Loader2 className="animate-spin mr-2" size={18} /> : <Plus size={18} className="mr-2" />}
                                Add Item
                            </button>
                        </form>
                    </div>
                </div>

                {/* Snack List */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Current Menu Items</h3>
                            <span className="text-sm text-slate-500">{snacks.length} items</span>
                        </div>

                        {isLoading ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="animate-spin text-indigo-600" size={32} />
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {snacks.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 italic">
                                        No items in the menu. Add one to get started.
                                    </div>
                                ) : (
                                    snacks.map(item => (
                                        <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center space-x-4">
                                                <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold">
                                                    {item.name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{item.name}</p>
                                                    <p className="text-sm text-slate-500">₹{item.price}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSnack(item.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete Item"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
