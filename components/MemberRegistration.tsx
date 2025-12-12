
import React, { useState } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { SubscriptionPlan, AccessHours, Member } from '../types';
import { SUBSCRIPTION_PRICES } from '../constants';

import { supabase } from '../supabaseClient';

interface MemberRegistrationProps {
  branchId: string;
  branchName: string;
  onRegister: (
    member: Member,
    amount: number,
    paymentMode: 'CASH' | 'UPI' | 'SPLIT',
    cashAmount?: number,
    upiAmount?: number,
    cardIssued?: boolean,
    cardPaymentMode?: 'CASH' | 'UPI'
  ) => void;
  initialData?: Member | null;
  cardsAvailable?: number;
  lockersAvailable?: number;
}

export const MemberRegistration: React.FC<MemberRegistrationProps> = ({ branchId, branchName, onRegister, initialData, cardsAvailable = 0, lockersAvailable = 0 }) => {
  const [formData, setFormData] = useState({
    fullName: initialData?.full_name || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    subscriptionPlan: SubscriptionPlan.MONTH_1,
    dailyAccessHours: AccessHours.HOURS_6,
    customAccessHours: '', // For custom hours input
    studyPurpose: initialData?.study_purpose || '',
    registeredBy: initialData?.registered_by || '',
    price: '', // Decoupled Price
    customDurationValue: '',
    customDurationUnit: 'DAYS' as 'DAYS' | 'MONTHS',
    paymentMode: 'CASH' as 'CASH' | 'UPI' | 'SPLIT',
    cashAmount: '', // For split payments
    upiAmount: '',  // For split payments
    cardIssued: false, // Card feature
    cardPaymentMode: 'CASH' as 'CASH' | 'UPI', // Card payment method
    lockerAssigned: false,
    lockerPaymentMode: 'CASH' as 'CASH' | 'UPI' | 'INCLUDED'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);


  React.useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        fullName: initialData.full_name,
        address: initialData.address,
        phone: initialData.phone,
        email: initialData.email,
        studyPurpose: initialData.study_purpose,
        registeredBy: initialData.registered_by,
        subscriptionPlan: SubscriptionPlan.MONTH_1,
        dailyAccessHours: AccessHours.HOURS_6,
        customAccessHours: '',
        price: '',
        paymentMode: 'CASH',
        cashAmount: '',
        upiAmount: '',
        cardIssued: false,
        cardPaymentMode: 'CASH',
        lockerAssigned: false,
        lockerPaymentMode: 'CASH'
      }));
    }
  }, [initialData]);

  // Auto-fill price when plan changes (if not Custom)
  React.useEffect(() => {
    if (formData.subscriptionPlan !== SubscriptionPlan.CUSTOM) {
      setFormData(prev => ({ ...prev, price: SUBSCRIPTION_PRICES[formData.subscriptionPlan].toString() }));
    } else {
      setFormData(prev => ({ ...prev, price: '' }));
    }
  }, [formData.subscriptionPlan]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (formData.fullName.length < 3) newErrors.fullName = "Name must be at least 3 characters.";
    if (formData.address.length < 5) newErrors.address = "Please provide a full address.";
    if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = "Enter a valid 10-digit phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Enter a valid email address.";
    if (formData.studyPurpose.length < 2) newErrors.studyPurpose = "Please enter a purpose (e.g. UPSC).";
    if (formData.registeredBy.length < 2) newErrors.registeredBy = "Receptionist name required.";
    if (!formData.price || Number(formData.price) <= 0) newErrors.price = "Please enter a valid amount.";

    if (formData.subscriptionPlan === SubscriptionPlan.CUSTOM) {
      if (!formData.customDurationValue || Number(formData.customDurationValue) <= 0) newErrors.customDuration = "Duration required.";
    }

    // Validate custom access hours
    if (formData.dailyAccessHours === AccessHours.CUSTOM) {
      if (!formData.customAccessHours || Number(formData.customAccessHours) <= 0 || Number(formData.customAccessHours) > 24) {
        newErrors.customAccessHours = "Enter valid hours (1-24).";
      }
    }

    // Validate split payment amounts
    if (formData.paymentMode === 'SPLIT') {
      const cashAmt = Number(formData.cashAmount) || 0;
      const upiAmt = Number(formData.upiAmount) || 0;
      const totalPrice = Number(formData.price) || 0;

      if (cashAmt <= 0 && upiAmt <= 0) {
        newErrors.splitPayment = "Enter at least one payment amount.";
      } else if (cashAmt + upiAmt !== totalPrice) {
        newErrors.splitPayment = `Split amounts (₹${cashAmt + upiAmt}) must equal total (₹${totalPrice}).`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkDuplicates = async () => {
    // Check for existing member with same Phone OR Email in this branch
    let query = supabase
      .from('members')
      .select('id')
      .or(`email.eq.${formData.email},phone.eq.${formData.phone}`)
      .eq('branch_id', branchId);

    if (initialData?.id) {
      query = query.neq('id', initialData.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error checking duplicates:", error);
      return true;
    }

    if (data && data.length > 0) {
      setErrors(prev => ({
        ...prev,
        form: "A member with this Phone or Email already exists in this branch."
      }));
      return true; // Found duplicates
    }
    return false;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    // Async Duplicate Check
    const hasDuplicates = await checkDuplicates();
    if (hasDuplicates) {
      setIsSubmitting(false);
      return;
    }

    try {
      const planLabel = formData.subscriptionPlan === SubscriptionPlan.CUSTOM
        ? `Custom (${formData.customDurationValue} ${formData.customDurationUnit})`
        : formData.subscriptionPlan;

      // Determine the daily access hours label
      const accessHoursLabel = formData.dailyAccessHours === AccessHours.CUSTOM
        ? `${formData.customAccessHours} Hours`
        : formData.dailyAccessHours;

      const expiryDate = calculateExpiryDate();

      const newMember: Member = {
        id: initialData?.id || crypto.randomUUID(),
        full_name: formData.fullName,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        join_date: initialData?.join_date || new Date().toISOString(),
        expiry_date: expiryDate,
        subscription_plan: planLabel,
        daily_access_hours: accessHoursLabel,
        study_purpose: formData.studyPurpose,
        registered_by: formData.registeredBy,
        branch_id: branchId,
        card_issued: formData.cardIssued,
        card_payment_mode: formData.cardIssued ? formData.cardPaymentMode : undefined,
        card_returned: false,
        locker_assigned: formData.lockerAssigned,
        locker_payment_mode: formData.lockerAssigned ? formData.lockerPaymentMode : undefined
      };

      const amount = Number(formData.price);
      const cashAmt = formData.paymentMode === 'SPLIT' ? Number(formData.cashAmount) || 0 : undefined;
      const upiAmt = formData.paymentMode === 'SPLIT' ? Number(formData.upiAmount) || 0 : undefined;

      await new Promise(resolve => setTimeout(resolve, 1000));

      onRegister(
        newMember,
        amount,
        formData.paymentMode,
        cashAmt,
        upiAmt,
        formData.cardIssued,
        formData.cardIssued ? formData.cardPaymentMode : undefined,
        formData.lockerAssigned,
        formData.lockerAssigned ? formData.lockerPaymentMode : undefined
      );

      // Reset Form
      setFormData({
        fullName: '',
        address: '',
        phone: '',
        email: '',
        subscriptionPlan: SubscriptionPlan.MONTH_1,
        dailyAccessHours: AccessHours.HOURS_6,
        customAccessHours: '',
        studyPurpose: '',
        registeredBy: '',
        price: '',
        customDurationValue: '',
        customDurationUnit: 'DAYS',
        paymentMode: 'CASH',
        cashAmount: '',
        upiAmount: '',
        cardIssued: false,
        cardPaymentMode: 'CASH',
        lockerAssigned: false,
        lockerPaymentMode: 'CASH'
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
    <div className="max-w-4xl mx-auto relative">
      {/* Success Toast */}
      {showSuccess && (
        <div className="absolute top-0 right-0 left-0 z-10 flex justify-center pointer-events-none">
          <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 animate-fade-in-up mt-4">
            <CheckCircle size={20} />
            <span className="font-medium">Member Registered Successfully</span>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold text-slate-800 mb-6">New Member Registration</h2>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.form && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200 flex items-center">
              <AlertCircle size={16} className="mr-2" />
              {errors.form}
            </div>
          )}

          {/* Personal Info */}
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
                placeholder="krittik das"
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
                placeholder="john@example.com"
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
                placeholder="e.g. UPSC Study, Remote Work, APSC"
              />
              {errors.studyPurpose && <p className="text-red-500 text-xs mt-1">{errors.studyPurpose}</p>}
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

          {/* Subscription & Administrative */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="subscription-plan" className="block text-sm font-medium text-slate-700 mb-1">Duration Plan</label>
              <select
                id="subscription-plan"
                name="subscriptionPlan"
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
              <label htmlFor="daily-access-hours" className="block text-sm font-medium text-slate-700 mb-1">Daily Access Limit</label>
              <select
                id="daily-access-hours"
                name="dailyAccessHours"
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
                <label htmlFor="custom-access-hours" className="block text-sm font-medium text-slate-700 mb-1">Custom Hours (1-24) *</label>
                <input
                  id="custom-access-hours"
                  name="customAccessHours"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.customAccessHours}
                  onChange={(e) => {
                    if (/^\d*$/.test(e.target.value)) {
                      setFormData({ ...formData, customAccessHours: e.target.value });
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-lg border ${errors.customAccessHours ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                  placeholder="e.g. 8"
                />
                {errors.customAccessHours && <p className="text-red-500 text-xs mt-1">{errors.customAccessHours}</p>}
              </div>
            )}

            {formData.subscriptionPlan === SubscriptionPlan.CUSTOM && (
              <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label htmlFor="custom-duration-value" className="block text-sm font-medium text-slate-700 mb-1">Duration Value</label>
                  <input
                    id="custom-duration-value"
                    name="customDurationValue"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.customDurationValue}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) {
                        setFormData({ ...formData, customDurationValue: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                    placeholder="e.g. 45"
                  />
                  {errors.customDuration && <p className="text-red-500 text-xs mt-1">{errors.customDuration}</p>}
                </div>
                <div>
                  <label htmlFor="custom-duration-unit" className="block text-sm font-medium text-slate-700 mb-1">Duration Unit</label>
                  <select
                    id="custom-duration-unit"
                    name="customDurationUnit"
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
              <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-1">Price (₹) *</label>
              <input
                id="price"
                name="price"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.price}
                onChange={(e) => {
                  if (/^\d*$/.test(e.target.value)) {
                    setFormData({ ...formData, price: e.target.value });
                  }
                }}
                className={`w-full px-3 py-2 rounded-lg border ${errors.price ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none font-bold text-slate-700`}
                placeholder="Enter amount"
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>

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
              <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-emerald-50 p-4 rounded-lg border border-emerald-200">
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
                <div className="col-span-2 text-xs text-slate-500 italic">
                  Total: ₹{(Number(formData.cashAmount) || 0) + (Number(formData.upiAmount) || 0)} / ₹{formData.price || 0}
                </div>
              </div>
            )}

            {/* Card Issued Section */}
            <div className="md:col-span-2 bg-violet-50 p-4 rounded-lg border border-violet-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-sm font-medium text-violet-800">Issue Library Card?</label>
                  <p className="text-xs text-violet-600">₹100 per card • {cardsAvailable} cards available</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-violet-200">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, cardIssued: false })}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${!formData.cardIssued
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    disabled={cardsAvailable <= 0}
                    onClick={() => setFormData({ ...formData, cardIssued: true })}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formData.cardIssued
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100'
                      } ${cardsAvailable <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {/* Card Payment Method */}
              {formData.cardIssued && (
                <div className="mt-3 pt-3 border-t border-violet-200">
                  <label className="block text-sm font-medium text-violet-800 mb-2">Card Payment Method</label>
                  <div className="flex bg-white p-1 rounded-lg border border-violet-200 inline-flex">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cardPaymentMode: 'CASH' })}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formData.cardPaymentMode === 'CASH'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cardPaymentMode: 'UPI' })}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formData.cardPaymentMode === 'UPI'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      UPI
                    </button>
                  </div>
                  <p className="text-xs text-violet-600 mt-2">Card fee: ₹100 will be added to total</p>
                </div>
              )}
              {/* Locker Assigned Section */}
              <div className="md:col-span-2 bg-pink-50 p-4 rounded-lg border border-pink-200 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-medium text-pink-800">Assign Locker?</label>
                    <p className="text-xs text-pink-600">₹200 per locker • {lockersAvailable} lockers available</p>
                    {formData.dailyAccessHours === AccessHours.HOURS_24 && (
                      <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded ml-2">FREE with 24 Hours Plan</span>
                    )}
                  </div>
                  <div className="flex bg-white p-1 rounded-lg border border-pink-200">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, lockerAssigned: false })}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${!formData.lockerAssigned
                        ? 'bg-pink-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      disabled={lockersAvailable <= 0}
                      onClick={() => {
                        const isFree = formData.dailyAccessHours === AccessHours.HOURS_24;
                        setFormData({
                          ...formData,
                          lockerAssigned: true,
                          lockerPaymentMode: isFree ? 'INCLUDED' : 'CASH'
                        });
                      }}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formData.lockerAssigned
                        ? 'bg-pink-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100'
                        } ${lockersAvailable <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                {/* Locker Payment Method */}
                {formData.lockerAssigned && formData.dailyAccessHours !== AccessHours.HOURS_24 && (
                  <div className="mt-3 pt-3 border-t border-pink-200">
                    <label className="block text-sm font-medium text-pink-800 mb-2">Locker Payment Method</label>
                    <div className="flex bg-white p-1 rounded-lg border border-pink-200 inline-flex">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, lockerPaymentMode: 'CASH' })}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formData.lockerPaymentMode === 'CASH'
                          ? 'bg-green-600 text-white shadow-md'
                          : 'text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, lockerPaymentMode: 'UPI' })}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formData.lockerPaymentMode === 'UPI'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        UPI
                      </button>
                    </div>
                    <p className="text-xs text-pink-600 mt-2">Locker fee: ₹200 will be added to total</p>
                  </div>
                )}
                {formData.lockerAssigned && formData.dailyAccessHours === AccessHours.HOURS_24 && (
                  <div className="mt-3 pt-3 border-t border-pink-200">
                    <p className="text-sm font-bold text-green-700">Locker included for free with 24 Hours access.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="registered-by" className="block text-sm font-medium text-slate-700 mb-1">Receptionist Name (Registered By) *</label>
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

          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 font-medium flex items-center space-x-2 disabled:opacity-70 transition-all"
            >
              {isSubmitting && <Loader2 className="animate-spin" size={20} />}
              <span>Register Member</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
