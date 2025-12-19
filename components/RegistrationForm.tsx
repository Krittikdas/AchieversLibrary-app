import React, { useState } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Member } from '../types';
import { supabase } from '../supabaseClient';

interface RegistrationFormProps {
    branchId: string;
    branchName: string;
    onRegisterSuccess: (member: Member, amount: number, paymentMode: 'CASH' | 'UPI' | 'SPLIT', cashAmt?: number, upiAmt?: number) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ branchId, branchName, onRegisterSuccess }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        address: '',
        phone: '',
        email: '',
        studyPurpose: '',
        registeredBy: '',
        paymentMode: 'CASH' as 'CASH' | 'UPI' | 'SPLIT',
        cashAmount: '',
        upiAmount: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const REGISTRATION_FEE = 300;

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (formData.fullName.length < 3) newErrors.fullName = "Name must be at least 3 characters.";
        if (formData.address.length < 5) newErrors.address = "Please provide a full address.";
        if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = "Enter a valid 10-digit phone number.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Enter a valid email address.";
        if (formData.studyPurpose.length < 2) newErrors.studyPurpose = "Please enter a purpose (e.g. UPSC).";
        if (formData.registeredBy.length < 2) newErrors.registeredBy = "Receptionist name required.";

        if (formData.paymentMode === 'SPLIT') {
            const cashAmt = Number(formData.cashAmount) || 0;
            const upiAmt = Number(formData.upiAmount) || 0;

            if (cashAmt <= 0 && upiAmt <= 0) {
                newErrors.splitPayment = "Enter at least one payment amount.";
            } else if (cashAmt + upiAmt !== REGISTRATION_FEE) {
                newErrors.splitPayment = `Split amounts (₹${cashAmt + upiAmt}) must equal total (₹${REGISTRATION_FEE}).`;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const checkDuplicates = async () => {
        const { data, error } = await supabase
            .from('members')
            .select('id')
            .or(`email.eq.${formData.email},phone.eq.${formData.phone}`)
            .eq('branch_id', branchId);

        if (error) {
            console.error("Error checking duplicates:", error);
            return true;
        }

        if (data && data.length > 0) {
            setErrors(prev => ({
                ...prev,
                form: "A member with this Phone or Email already exists in this branch."
            }));
            return true;
        }
        return false;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);

        const hasDuplicates = await checkDuplicates();
        if (hasDuplicates) {
            setIsSubmitting(false);
            return;
        }

        try {
            const newMember: Member = {
                id: crypto.randomUUID(),
                full_name: formData.fullName,
                address: formData.address,
                phone: formData.phone,
                email: formData.email,
                join_date: new Date().toISOString(),
                expiry_date: new Date().toISOString(), // Expired by default until plan purchased
                study_purpose: formData.studyPurpose,
                registered_by: formData.registeredBy,
                branch_id: branchId,
                // Optional fields explicitly undefined initially
                subscription_plan: undefined,
                daily_access_hours: undefined,
                card_issued: false,
                card_returned: false,
                locker_assigned: false,
            };

            const cashAmt = formData.paymentMode === 'SPLIT' ? Number(formData.cashAmount) || 0 : undefined;
            const upiAmt = formData.paymentMode === 'SPLIT' ? Number(formData.upiAmount) || 0 : undefined;

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            onRegisterSuccess(newMember, REGISTRATION_FEE, formData.paymentMode, cashAmt, upiAmt);

            // Reset Form
            setFormData({
                fullName: '',
                address: '',
                phone: '',
                email: '',
                studyPurpose: '',
                registeredBy: '',
                paymentMode: 'CASH',
                cashAmount: '',
                upiAmount: ''
            });
            setErrors({});
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto relative">
            {/* Success Toast */}
            {showSuccess && (
                <div className="absolute top-0 right-0 left-0 z-10 flex justify-center pointer-events-none">
                    <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 animate-fade-in-up mt-4">
                        <CheckCircle size={20} />
                        <span className="font-medium">New member registered</span>
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold text-slate-800 mb-6">Initial Member Registration</h2>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-indigo-900">One-Time Registration</h3>
                        <p className="text-xs text-indigo-700">Collect basic details. Fee: ₹300</p>
                    </div>
                    <span className="text-xl font-bold text-indigo-700">₹300</span>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {errors.form && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200 flex items-center">
                            <AlertCircle size={16} className="mr-2" />
                            {errors.form}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="full-name" className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                            <input
                                id="full-name"
                                name="fullName"
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className={`w-full px-3 py-2 rounded-lg border ${errors.fullName ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                                placeholder="Name"
                            />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                            <input
                                id="phone"
                                name="phone"
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className={`w-full px-3 py-2 rounded-lg border ${errors.phone ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                                placeholder="9876543210"
                            />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                            <input
                                id="email"
                                name="email"
                                type="text"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={`w-full px-3 py-2 rounded-lg border ${errors.email ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                                placeholder="name@example.com"
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label htmlFor="study-purpose" className="block text-sm font-medium text-slate-700 mb-1">Study Purpose / Occupation *</label>
                            <input
                                id="study-purpose"
                                name="studyPurpose"
                                type="text"
                                value={formData.studyPurpose}
                                onChange={(e) => setFormData({ ...formData, studyPurpose: e.target.value })}
                                className={`w-full px-3 py-2 rounded-lg border ${errors.studyPurpose ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                                placeholder="e.g. UPSC Study"
                            />
                            {errors.studyPurpose && <p className="text-red-500 text-xs mt-1">{errors.studyPurpose}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="registered-by" className="block text-sm font-medium text-slate-700 mb-1">Receptionist Name *</label>
                            <input
                                id="registered-by"
                                name="registeredBy"
                                type="text"
                                value={formData.registeredBy}
                                onChange={(e) => setFormData({ ...formData, registeredBy: e.target.value })}
                                className={`w-full px-3 py-2 rounded-lg border ${errors.registeredBy ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                                placeholder="Enter your name"
                            />
                            {errors.registeredBy && <p className="text-red-500 text-xs mt-1">{errors.registeredBy}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">Residential Address *</label>
                            <textarea
                                id="address"
                                name="address"
                                rows={2}
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className={`w-full px-3 py-2 rounded-lg border ${errors.address ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                                placeholder="Complete address"
                            />
                            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Payment Mode */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg mt-0.5 inline-flex">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentMode: 'CASH', cashAmount: '', upiAmount: '' })}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.paymentMode === 'CASH'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                Cash
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentMode: 'UPI', cashAmount: '', upiAmount: '' })}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.paymentMode === 'UPI'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                UPI
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentMode: 'SPLIT' })}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.paymentMode === 'SPLIT'
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                Split
                            </button>
                        </div>
                    </div>

                    {/* Split Payment Fields */}
                    {formData.paymentMode === 'SPLIT' && (
                        <div className="grid grid-cols-2 gap-4 bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                            <div>
                                <label htmlFor="cash-amount" className="block text-sm font-medium text-slate-700 mb-1">Cash Amount (₹) *</label>
                                <input
                                    id="cash-amount"
                                    name="cashAmount"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={formData.cashAmount}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) {
                                            setFormData({ ...formData, cashAmount: e.target.value });
                                        }
                                    }}
                                    className={`w-full px-3 py-2 rounded-lg border ${errors.splitPayment ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-emerald-200 focus:outline-none font-semibold text-slate-700`}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label htmlFor="upi-amount" className="block text-sm font-medium text-slate-700 mb-1">UPI Amount (₹) *</label>
                                <input
                                    id="upi-amount"
                                    name="upiAmount"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={formData.upiAmount}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) {
                                            setFormData({ ...formData, upiAmount: e.target.value });
                                        }
                                    }}
                                    className={`w-full px-3 py-2 rounded-lg border ${errors.splitPayment ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-emerald-200 focus:outline-none font-semibold text-slate-700`}
                                    placeholder="0"
                                />
                            </div>
                            {errors.splitPayment && (
                                <div className="col-span-2">
                                    <p className="text-red-500 text-xs">{errors.splitPayment}</p>
                                </div>
                            )}
                        </div>
                    )}


                    <div className="border-t border-slate-200 pt-4 mt-6">
                        <div className="flex justify-between items-center mb-4 text-slate-800">
                            <span className="text-lg font-medium">Registration Fee:</span>
                            <div className="text-right">
                                <span className="text-3xl font-bold text-indigo-700">₹{REGISTRATION_FEE}</span>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 font-medium flex items-center space-x-2 disabled:opacity-70 transition-all shadow-lg hover:shadow-xl"
                            >
                                {isSubmitting && <Loader2 className="animate-spin" size={20} />}
                                <span>Register & Pay ₹300</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
