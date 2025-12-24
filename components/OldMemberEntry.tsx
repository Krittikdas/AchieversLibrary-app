import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Calendar, CreditCard, Lock, Save, Clock } from 'lucide-react';
import { SubscriptionPlan, AccessHours, Member } from '../types';
import { checkResourceAvailability } from '../utils/availability';

interface OldMemberEntryProps {
    onComplete: (
        memberDetails: any,
        planDetails: any,
        allocations: any
    ) => void;
    branchId: string;
    cardsAvailable?: number;
    lockersAvailable?: number;
}

export const OldMemberEntry: React.FC<OldMemberEntryProps> = ({ onComplete, branchId, cardsAvailable, lockersAvailable }) => {
    // 1. Personal Details
    const [personal, setPersonal] = useState({
        fullName: '',
        phone: '',
        email: '',
        address: '',
        studyPurpose: ''
    });

    // 2. Membership Details
    const [membership, setMembership] = useState({
        plan: SubscriptionPlan.MONTH_1,
        accessHours: AccessHours.HOURS_12,
        startDate: new Date().toISOString().split('T')[0], // Default to today
        // Custom fields matching MembershipForm
        customDurationValue: '',
        customDurationUnit: 'DAYS' as 'DAYS' | 'MONTHS',
        customAccessHours: '',
        paymentAmount: '',
        paymentMode: 'CASH' as 'CASH' | 'UPI' | 'SPLIT',
        cashAmount: '',
        upiAmount: ''
    });

    // 3. Allocations
    const [allocations, setAllocations] = useState({
        seatNo: '',
        cardIssued: false,
        cardPaymentMode: 'CASH' as 'CASH' | 'UPI',
        lockerAssigned: false,
        lockerNumber: '',
        lockerPaymentMode: 'CASH' as 'CASH' | 'UPI'
    });
    const [resourceWarnings, setResourceWarnings] = useState<Record<string, { type: 'success' | 'warning' | 'error', msg: string }>>({});

    // Auto-set free locker for 24 Hours plan
    useEffect(() => {
        if (membership.accessHours === AccessHours.HOURS_24) {
            setAllocations(prev => ({ ...prev, lockerPaymentMode: 'INCLUDED', lockerAssigned: true }));
        } else {
            // Optional: revert if switching away, but only if it was 'INCLUDED'
            setAllocations(prev => ({
                ...prev,
                lockerPaymentMode: prev.lockerPaymentMode === 'INCLUDED' ? 'CASH' : prev.lockerPaymentMode
            }));
        }
    }, [membership.accessHours]);

    const handleCheckAvailability = async (type: 'LOCKER' | 'SEAT', value: string) => {
        if (!value) return;
        setResourceWarnings(prev => ({ ...prev, [type]: { type: 'warning', msg: 'Checking...' } }));

        const result = await checkResourceAvailability(type, value);

        if (!result.available) {
            setResourceWarnings(prev => ({ ...prev, [type]: { type: 'error', msg: result.message || 'Occupied' } }));
        } else {
            if (result.message) {
                setResourceWarnings(prev => ({ ...prev, [type]: { type: 'success', msg: result.message } }));
            } else {
                setResourceWarnings(prev => {
                    const next = { ...prev };
                    delete next[type];
                    return next;
                });
            }
        }
    };

    const calculateTotal = () => {
        let total = Number(membership.paymentAmount) || 0;
        if (allocations.lockerAssigned && allocations.lockerPaymentMode !== 'INCLUDED') total += 200;
        if (allocations.cardIssued) total += 100;
        return total;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (membership.paymentMode === 'SPLIT') {
            const cash = Number(membership.cashAmount) || 0;
            const upi = Number(membership.upiAmount) || 0;
            const fee = Number(membership.paymentAmount) || 0;

            if (Math.abs((cash + upi) - fee) > 1) {
                alert(`Split amounts (₹${cash + upi}) must match Membership Fee (₹${fee})`);
                return;
            }
        }

        // Validate Stock
        if (allocations.lockerAssigned && lockersAvailable !== undefined && lockersAvailable <= 0) {
            alert("Locker limit reached for this branch. Cannot assign new locker.");
            return;
        }
        if (allocations.cardIssued && cardsAvailable !== undefined && cardsAvailable <= 0) {
            alert("Card limit reached for this branch. Cannot issue new card.");
            return;
        }

        // Validate Mandatory Fields
        if (allocations.lockerAssigned) {
            if (!allocations.lockerNumber || allocations.lockerNumber.trim().length === 0) {
                alert("Locker Number is required when Locker is assigned.");
                return;
            }
        }

        if (!allocations.seatNo || allocations.seatNo.trim().length === 0) {
            alert("Assigned Seat Number is required.");
            return;
        }

        // mimic MembershipForm logic
        let durationDays = 30; // default
        let planLabel = membership.plan;

        if (membership.plan === SubscriptionPlan.CUSTOM) {
            const val = parseInt(membership.customDurationValue) || 0;
            if (membership.customDurationUnit === 'MONTHS') {
                durationDays = val * 30; // Approx
            } else {
                durationDays = val;
            }
            planLabel = `Custom (${membership.customDurationValue} ${membership.customDurationUnit})` as any;
        }

        let accessLabel = membership.accessHours;
        if (membership.accessHours === AccessHours.CUSTOM) {
            accessLabel = `${membership.customAccessHours} Hours` as any;
        }

        const finalMembership = {
            ...membership,
            plan: planLabel,
            accessHours: accessLabel,
            durationDays: durationDays,
            daysPassed: Math.floor((new Date().getTime() - new Date(membership.startDate).getTime()) / (1000 * 3600 * 24))
        };

        onComplete(personal, finalMembership, allocations);
    };

    // Calculate days passed and remaining for display
    const calculateTimeStatus = () => {
        const start = new Date(membership.startDate);
        const today = new Date();
        const diffTime = today.getTime() - start.getTime();
        const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let durationDays = 30;
        if (membership.plan === SubscriptionPlan.MONTH_3) durationDays = 90;
        if (membership.plan === SubscriptionPlan.MONTH_6) durationDays = 180;
        if (membership.plan === SubscriptionPlan.CUSTOM) {
            const val = parseInt(membership.customDurationValue) || 0;
            durationDays = membership.customDurationUnit === 'MONTHS' ? val * 30 : val;
        }

        const daysRemaining = durationDays - daysPassed;
        return { daysPassed, daysRemaining, durationDays };
    };

    const timeStatus = calculateTimeStatus();

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
                    <Clock size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Old Member Entry</h2>
                    <p className="text-slate-500">Register members who joined before the app was installed.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Personal Info Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <User size={20} className="text-indigo-600" />
                        Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                                value={personal.fullName}
                                onChange={e => setPersonal({ ...personal, fullName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                            <input
                                required
                                type="tel"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                                value={personal.phone}
                                onChange={e => setPersonal({ ...personal, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email </label>
                            <input
                                type="email"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                                value={personal.email}
                                onChange={e => setPersonal({ ...personal, email: e.target.value })}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                                value={personal.address}
                                onChange={e => setPersonal({ ...personal, address: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Membership Backdating Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar size={20} className="text-indigo-600" />
                        Membership Status & History
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Plan</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                                value={membership.plan}
                                onChange={e => setMembership({ ...membership, plan: e.target.value as SubscriptionPlan })}
                            >
                                {Object.values(SubscriptionPlan).map(plan => (
                                    <option key={plan} value={plan}>{plan}</option>
                                ))}
                            </select>
                            {membership.plan === SubscriptionPlan.CUSTOM && (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div>
                                        <input
                                            type="number"
                                            placeholder="Val"
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                            value={membership.customDurationValue}
                                            onChange={e => setMembership({ ...membership, customDurationValue: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <select
                                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                            value={membership.customDurationUnit}
                                            onChange={e => setMembership({ ...membership, customDurationUnit: e.target.value as any })}
                                        >
                                            <option value="DAYS">Days</option>
                                            <option value="MONTHS">Months</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Access Hours</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                                value={membership.accessHours}
                                onChange={e => setMembership({ ...membership, accessHours: e.target.value as AccessHours })}
                            >
                                {Object.values(AccessHours).map(hours => (
                                    <option key={hours} value={hours}>{hours}</option>
                                ))}
                            </select>
                            {membership.accessHours === AccessHours.CUSTOM && (
                                <input
                                    type="number"
                                    min="1"
                                    max="24"
                                    placeholder="Hours (1-24)"
                                    className="w-full px-3 py-2 border rounded-lg text-sm mt-2"
                                    value={membership.customAccessHours}
                                    onChange={e => setMembership({ ...membership, customAccessHours: e.target.value })}
                                    required
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 text-amber-600">Joining Date</label>
                            <input
                                type="date"
                                required
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-200 focus:outline-none"
                                value={membership.startDate}
                                onChange={e => setMembership({ ...membership, startDate: e.target.value })}
                            />
                            {membership.startDate && (
                                <div className="mt-2 text-xs text-slate-600 space-y-1 bg-amber-50 p-2 rounded border border-amber-100">
                                    <div className="flex justify-between">
                                        <span>Days Passed:</span>
                                        <span className="font-bold">{timeStatus.daysPassed} days</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Days Remaining:</span>
                                        <span className={`font-bold ${timeStatus.daysRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {timeStatus.daysRemaining} days
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Membership Fee (₹) <br /> (Please deduct 300 for registration fee)</label>
                            <input
                                type="number"
                                placeholder="Amount Paid"
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                                value={membership.paymentAmount}
                                onChange={e => setMembership({ ...membership, paymentAmount: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                                value={membership.paymentMode}
                                onChange={e => setMembership({ ...membership, paymentMode: e.target.value as any })}
                            >
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="SPLIT">Split (Cash + UPI)</option>
                            </select>
                            {membership.paymentMode === 'SPLIT' && (
                                <div className="mt-2 grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600">Cash (₹)</label>
                                        <input
                                            type="number"
                                            className="w-full px-2 py-1 text-sm border rounded"
                                            value={membership.cashAmount}
                                            onChange={e => setMembership({ ...membership, cashAmount: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600">UPI (₹)</label>
                                        <input
                                            type="number"
                                            className="w-full px-2 py-1 text-sm border rounded"
                                            value={membership.upiAmount}
                                            onChange={e => setMembership({ ...membership, upiAmount: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Allocations Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Lock size={20} className="text-indigo-600" />
                        Current Allocations
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Seat */}
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Seat No. *</label>
                            <input
                                type="text"
                                placeholder="e.g. A-1"
                                className="w-full px-3 py-2 border rounded-lg bg-white"
                                value={allocations.seatNo}
                                onChange={e => setAllocations({ ...allocations, seatNo: e.target.value })}
                                onBlur={() => handleCheckAvailability('SEAT', allocations.seatNo)}
                            />
                            {resourceWarnings['SEAT'] && (
                                <p className={`text-xs mt-1 ${resourceWarnings['SEAT'].type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                                    {resourceWarnings['SEAT'].msg}
                                </p>
                            )}
                        </div>

                        {/* Locker */}
                        <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">Locker Assigned?</label>
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 text-indigo-600 rounded"
                                    checked={allocations.lockerAssigned}
                                    onChange={e => setAllocations({ ...allocations, lockerAssigned: e.target.checked })}
                                />
                            </div>
                            {allocations.lockerAssigned && (
                                <>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Locker Number"
                                        className="w-full px-3 py-2 border rounded-lg bg-white"
                                        value={allocations.lockerNumber}
                                        onChange={e => setAllocations({ ...allocations, lockerNumber: e.target.value })}
                                        onBlur={() => handleCheckAvailability('LOCKER', allocations.lockerNumber)}
                                    />
                                    {resourceWarnings['LOCKER'] && (
                                        <p className={`text-xs ${resourceWarnings['LOCKER'].type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                                            {resourceWarnings['LOCKER'].msg}
                                        </p>
                                    )}
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg bg-white"
                                        value={allocations.lockerPaymentMode}
                                        onChange={e => setAllocations({ ...allocations, lockerPaymentMode: e.target.value as any })}
                                    >
                                        <option value="CASH">Paid via CASH</option>
                                        <option value="UPI">Paid via UPI</option>
                                        <option value="INCLUDED">Included (Free)</option>
                                    </select>
                                </>
                            )}
                        </div>

                        {/* Card */}
                        <div className="bg-slate-50 p-4 rounded-lg space-y-3 md:col-span-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">Card Issued?</label>
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 text-indigo-600 rounded"
                                    checked={allocations.cardIssued}
                                    onChange={e => setAllocations({ ...allocations, cardIssued: e.target.checked })}
                                />
                            </div>
                            {allocations.cardIssued && (
                                <div className="flex gap-4">
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg bg-white"
                                        value={allocations.cardPaymentMode}
                                        onChange={e => setAllocations({ ...allocations, cardPaymentMode: e.target.value as any })}
                                    >
                                        <option value="CASH">Paid via CASH</option>
                                        <option value="UPI">Paid via UPI</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Total Summary */}
                <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
                    <div>
                        <h4 className="text-lg font-semibold text-indigo-200">Total Amount Paid</h4>
                        <p className="text-sm text-indigo-300">Includes Membership + Locker + Card</p>
                    </div>
                    <div className="text-4xl font-bold">
                        ₹{calculateTotal()}
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-sm transition-all flex justify-center items-center gap-2"
                >
                    <Save size={20} />
                    Save Old Member Record
                </button>
            </form>
        </div>
    );
};
