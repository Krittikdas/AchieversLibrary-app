import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { SubscriptionPlan, AccessHours, Member } from '../types';
import { SUBSCRIPTION_PRICES } from '../constants';

interface MembershipFormProps {
    member: Member; // Required existing member
    branchId: string;
    onMembershipComplete: (
        member: Member, // Updated member object
        amount: number,
        paymentMode: 'CASH' | 'UPI' | 'SPLIT',
        cashAmount?: number,
        upiAmount?: number,
        cardIssued?: boolean,
        cardPaymentMode?: 'CASH' | 'UPI',
        lockerAssigned?: boolean,
        lockerPaymentMode?: 'CASH' | 'UPI' | 'INCLUDED',
        seatNo?: string
    ) => void;
    cardsAvailable?: number;
    lockersAvailable?: number;
    onCancel: () => void;
}

export const MembershipForm: React.FC<MembershipFormProps> = ({ branchId, member, onMembershipComplete, cardsAvailable = 0, lockersAvailable = 0, onCancel }) => {
    const [formData, setFormData] = useState({
        subscriptionPlan: SubscriptionPlan.MONTH_1,
        dailyAccessHours: AccessHours.HOURS_6,
        customAccessHours: '',
        price: '',
        customDurationValue: '',
        customDurationUnit: 'DAYS' as 'DAYS' | 'MONTHS',
        paymentMode: 'CASH' as 'CASH' | 'UPI' | 'SPLIT',
        cashAmount: '',
        upiAmount: '',
        cardIssued: member.card_issued || false,
        cardPaymentMode: 'CASH' as 'CASH' | 'UPI',
        lockerAssigned: member.locker_assigned || false,
        lockerPaymentMode: 'CASH' as 'CASH' | 'UPI' | 'INCLUDED',
        lockerNumber: member.locker_number || '',
        seatNo: member.seat_no || ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Auto-fill price when plan changes
    useEffect(() => {
        if (formData.subscriptionPlan !== SubscriptionPlan.CUSTOM) {
            setFormData(prev => ({ ...prev, price: SUBSCRIPTION_PRICES[formData.subscriptionPlan].toString() }));
        } else {
            setFormData(prev => ({ ...prev, price: '' }));
        }
    }, [formData.subscriptionPlan]);

    const calculateTotalAmount = () => {
        let total = Number(formData.price) || 0;
        if (formData.cardIssued && !member.card_issued) total += 100; // Only charge if new issue
        if (formData.lockerAssigned && !member.locker_assigned && formData.dailyAccessHours !== AccessHours.HOURS_24) total += 200; // Only charge if new
        return total;
    };

    const calculateExpiryDate = (): string => {
        const date = new Date();

        if (formData.subscriptionPlan === SubscriptionPlan.CUSTOM) {
            const value = Number(formData.customDurationValue);
            if (formData.customDurationUnit === 'MONTHS') {
                date.setMonth(date.getMonth() + value);
            } else {
                date.setDate(date.getDate() + value);
            }
        } else {
            if (formData.subscriptionPlan === SubscriptionPlan.MONTH_1) date.setMonth(date.getMonth() + 1);
            else if (formData.subscriptionPlan === SubscriptionPlan.MONTH_3) date.setMonth(date.getMonth() + 3);
            else if (formData.subscriptionPlan === SubscriptionPlan.MONTH_6) date.setMonth(date.getMonth() + 6);
        }
        return date.toISOString();
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.price || Number(formData.price) <= 0) newErrors.price = "Please enter a valid amount.";

        if (formData.lockerAssigned && !formData.lockerNumber) {
            newErrors.lockerNumber = "Locker number is required.";
        }

        if (formData.subscriptionPlan === SubscriptionPlan.CUSTOM) {
            if (!formData.customDurationValue || Number(formData.customDurationValue) <= 0) newErrors.customDuration = "Duration required.";
        }

        if (formData.dailyAccessHours === AccessHours.CUSTOM) {
            if (!formData.customAccessHours || Number(formData.customAccessHours) <= 0 || Number(formData.customAccessHours) > 24) {
                newErrors.customAccessHours = "Enter valid hours (1-24).";
            }
        }

        if (formData.paymentMode === 'SPLIT') {
            const cashAmt = Number(formData.cashAmount) || 0;
            const upiAmt = Number(formData.upiAmount) || 0;
            const grandTotal = calculateTotalAmount();
            if (cashAmt + upiAmt !== grandTotal) {
                newErrors.splitPayment = `Total split (₹${cashAmt + upiAmt}) must equal Total Payable (₹${grandTotal}).`;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);

        try {
            const planLabel = formData.subscriptionPlan === SubscriptionPlan.CUSTOM
                ? `Custom (${formData.customDurationValue} ${formData.customDurationUnit})`
                : formData.subscriptionPlan;

            const accessHoursLabel = formData.dailyAccessHours === AccessHours.CUSTOM
                ? `${formData.customAccessHours} Hours`
                : formData.dailyAccessHours;

            const expiryDate = calculateExpiryDate();

            // Prepare updated member object
            const updatedMember: Member = {
                ...member,
                subscription_plan: planLabel,
                daily_access_hours: accessHoursLabel,
                expiry_date: expiryDate,
                join_date: member.join_date || new Date().toISOString(),
                card_issued: formData.cardIssued,
                card_payment_mode: (formData.cardIssued && !member.card_issued) ? formData.cardPaymentMode : member.card_payment_mode,
                locker_assigned: formData.lockerAssigned,
                locker_payment_mode: (formData.lockerAssigned && !member.locker_assigned) ? formData.lockerPaymentMode : member.locker_payment_mode,
                locker_number: formData.lockerAssigned ? formData.lockerNumber : undefined,
                seat_no: formData.seatNo || undefined
            };

            const amount = calculateTotalAmount();
            const cashAmt = formData.paymentMode === 'SPLIT' ? Number(formData.cashAmount) || 0 : undefined;
            const upiAmt = formData.paymentMode === 'SPLIT' ? Number(formData.upiAmount) || 0 : undefined;

            await new Promise(resolve => setTimeout(resolve, 1000));

            onMembershipComplete(
                updatedMember,
                amount,
                formData.paymentMode,
                cashAmt,
                upiAmt,
                formData.cardIssued,
                formData.cardIssued ? formData.cardPaymentMode : undefined,
                formData.lockerAssigned,
                formData.lockerAssigned ? formData.lockerPaymentMode : undefined,
                formData.seatNo
            );

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto relative">
            {showSuccess && (
                <div className="absolute top-0 right-0 left-0 z-10 flex justify-center pointer-events-none">
                    <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 animate-fade-in-up mt-4">
                        <CheckCircle size={20} />
                        <span className="font-medium">Membership Activated Successfully</span>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Membership Activation</h2>
                <button onClick={onCancel} className="text-slate-500 hover:text-slate-700">Cancel</button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-blue-900">{member.full_name}</h3>
                    <p className="text-sm text-blue-700">{member.phone} • {member.email}</p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-bold bg-blue-200 text-blue-800 px-2 py-1 rounded">
                        {member.subscription_plan ? 'Has Existing Plan' : 'No Active Plan'}
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Plan Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Duration Plan</label>
                            <select
                                value={formData.subscriptionPlan}
                                onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value as SubscriptionPlan })}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white"
                            >
                                {Object.values(SubscriptionPlan).map((h) => (
                                    <option key={h} value={h}>{h}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Daily Access Limit</label>
                            <select
                                value={formData.dailyAccessHours}
                                onChange={(e) => setFormData({ ...formData, dailyAccessHours: e.target.value as AccessHours })}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white"
                            >
                                {Object.values(AccessHours).map((h) => (
                                    <option key={h} value={h}>{h}</option>
                                ))}
                            </select>
                        </div>

                        {/* Custom Access Hours Input */}
                        {formData.dailyAccessHours === AccessHours.CUSTOM && (
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Hours (1-24) *</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.customAccessHours}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) setFormData({ ...formData, customAccessHours: e.target.value });
                                    }}
                                    className={`w-full px-3 py-2 rounded-lg border ${errors.customAccessHours ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                                    placeholder="e.g. 8"
                                />
                                {errors.customAccessHours && <p className="text-red-500 text-xs mt-1">{errors.customAccessHours}</p>}
                            </div>
                        )}

                        {/* Custom Plan Duration */}
                        {formData.subscriptionPlan === SubscriptionPlan.CUSTOM && (
                            <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration Value</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formData.customDurationValue}
                                        onChange={(e) => {
                                            if (/^\d*$/.test(e.target.value)) setFormData({ ...formData, customDurationValue: e.target.value });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                                        placeholder="e.g. 45"
                                    />
                                    {errors.customDuration && <p className="text-red-500 text-xs mt-1">{errors.customDuration}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration Unit</label>
                                    <select
                                        value={formData.customDurationUnit}
                                        onChange={(e) => setFormData({ ...formData, customDurationUnit: e.target.value as 'DAYS' | 'MONTHS' })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white"
                                    >
                                        <option value="DAYS">Days</option>
                                        <option value="MONTHS">Months</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹) *</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formData.price}
                                onChange={(e) => {
                                    if (/^\d*$/.test(e.target.value)) setFormData({ ...formData, price: e.target.value });
                                }}
                                className={`w-full px-3 py-2 rounded-lg border ${errors.price ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none font-bold text-slate-700`}
                            />
                            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg mt-0.5 inline-flex">
                                <button type="button" onClick={() => setFormData({ ...formData, paymentMode: 'CASH', cashAmount: '', upiAmount: '' })} className={`px-4 py-2 rounded-md text-sm font-medium ${formData.paymentMode === 'CASH' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Cash</button>
                                <button type="button" onClick={() => setFormData({ ...formData, paymentMode: 'UPI', cashAmount: '', upiAmount: '' })} className={`px-4 py-2 rounded-md text-sm font-medium ${formData.paymentMode === 'UPI' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>UPI</button>
                                <button type="button" onClick={() => setFormData({ ...formData, paymentMode: 'SPLIT' })} className={`px-4 py-2 rounded-md text-sm font-medium ${formData.paymentMode === 'SPLIT' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>Split</button>
                            </div>
                        </div>

                        {/* Split Payment Fields */}
                        {formData.paymentMode === 'SPLIT' && (
                            <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cash Amount (₹) *</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formData.cashAmount}
                                        onChange={(e) => {
                                            if (/^\d*$/.test(e.target.value)) setFormData({ ...formData, cashAmount: e.target.value });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-200 font-semibold"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">UPI Amount (₹) *</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formData.upiAmount}
                                        onChange={(e) => {
                                            if (/^\d*$/.test(e.target.value)) setFormData({ ...formData, upiAmount: e.target.value });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-200 font-semibold"
                                        placeholder="0"
                                    />
                                </div>
                                {errors.splitPayment && <p className="col-span-2 text-red-500 text-xs">{errors.splitPayment}</p>}
                            </div>
                        )}
                    </div>

                    <hr className="border-slate-100" />

                    {/* Extras Container */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Card Section */}
                        <div className="bg-violet-50 p-4 rounded-lg border border-violet-200">
                            <div className="flex justify-between">
                                <label className="font-medium text-violet-800">Library Card</label>
                                {member.card_issued ? (
                                    <span className="text-xs bg-violet-200 text-violet-800 px-2 py-1 rounded">Already Issued</span>
                                ) : (
                                    <div className="flex bg-white rounded border border-violet-200 p-0.5">
                                        <button type="button" onClick={() => setFormData(p => ({ ...p, cardIssued: false }))} className={`px-3 py-1 text-xs rounded ${!formData.cardIssued ? 'bg-violet-600 text-white' : ''}`}>No</button>
                                        <button type="button" onClick={() => setFormData(p => ({ ...p, cardIssued: true }))} className={`px-3 py-1 text-xs rounded ${formData.cardIssued ? 'bg-violet-600 text-white' : ''}`}>Yes (+₹100)</button>
                                    </div>
                                )}
                            </div>
                            {!member.card_issued && formData.cardIssued && (
                                <div className="mt-2">
                                    <p className="text-xs text-violet-600 mb-1">Payment Method:</p>
                                    <div className="flex space-x-2">
                                        <button type="button" onClick={() => setFormData(p => ({ ...p, cardPaymentMode: 'CASH' }))} className={`px-2 py-1 text-xs rounded border ${formData.cardPaymentMode === 'CASH' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-200'}`}>Cash</button>
                                        <button type="button" onClick={() => setFormData(p => ({ ...p, cardPaymentMode: 'UPI' }))} className={`px-2 py-1 text-xs rounded border ${formData.cardPaymentMode === 'UPI' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-200'}`}>UPI</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Locker Section */}
                        <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                            <div className="flex justify-between">
                                <label className="font-medium text-pink-800">Locker</label>
                                {member.locker_assigned ? (
                                    <span className="text-xs bg-pink-200 text-pink-800 px-2 py-1 rounded">Assigned ({member.locker_number})</span>
                                ) : (
                                    <div className="flex bg-white rounded border border-pink-200 p-0.5">
                                        <button type="button" onClick={() => setFormData(p => ({ ...p, lockerAssigned: false }))} className={`px-3 py-1 text-xs rounded ${!formData.lockerAssigned ? 'bg-pink-600 text-white' : ''}`}>No</button>
                                        <button type="button" onClick={() => setFormData(p => ({ ...p, lockerAssigned: true, lockerPaymentMode: formData.dailyAccessHours === AccessHours.HOURS_24 ? 'INCLUDED' : 'CASH' }))} className={`px-3 py-1 text-xs rounded ${formData.lockerAssigned ? 'bg-pink-600 text-white' : ''}`}>Yes {formData.dailyAccessHours !== AccessHours.HOURS_24 ? '(+₹200)' : '(Free)'}</button>
                                    </div>
                                )}
                            </div>
                            {!member.locker_assigned && formData.lockerAssigned && (
                                <div className="mt-2 space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Locker Number"
                                        value={formData.lockerNumber}
                                        onChange={e => setFormData(p => ({ ...p, lockerNumber: e.target.value }))}
                                        className="w-full px-2 py-1 text-sm border rounded"
                                    />
                                    {errors.lockerNumber && <p className="text-red-500 text-xs">{errors.lockerNumber}</p>}

                                    {formData.dailyAccessHours !== AccessHours.HOURS_24 ? (
                                        <div className="flex space-x-2">
                                            <button type="button" onClick={() => setFormData(p => ({ ...p, lockerPaymentMode: 'CASH' }))} className={`px-2 py-1 text-xs rounded border ${formData.lockerPaymentMode === 'CASH' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-200'}`}>Cash</button>
                                            <button type="button" onClick={() => setFormData(p => ({ ...p, lockerPaymentMode: 'UPI' }))} className={`px-2 py-1 text-xs rounded border ${formData.lockerPaymentMode === 'UPI' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-200'}`}>UPI</button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-green-600 font-bold">Included Free</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Seat Number Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Seat Number (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. A-15"
                            value={formData.seatNo}
                            onChange={(e) => setFormData({ ...formData, seatNo: e.target.value })}
                            className="w-full md:w-1/3 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                        />
                    </div>

                    <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                        <div>
                            <span className="text-lg font-medium text-slate-800">Total Payable: </span>
                            <span className="text-3xl font-bold text-indigo-700">₹{calculateTotalAmount()}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 font-medium flex items-center space-x-2 disabled:opacity-70 shadow-lg"
                        >
                            {isSubmitting && <Loader2 className="animate-spin" size={20} />}
                            <span>Confirm Membership</span>
                        </button>
                    </div>


                </form>
            </div>
        </div>
    );
};
