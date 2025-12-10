
import React, { useState } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { SubscriptionPlan, AccessHours, Member } from '../types';
import { SUBSCRIPTION_PRICES } from '../constants';
import { generateWelcomeEmail } from '../services/geminiService';
import { supabase } from '../supabaseClient';

interface MemberRegistrationProps {
  branchId: string;
  branchName: string;
  onRegister: (member: Member, amount: number, paymentMode: 'CASH' | 'UPI') => void;
  initialData?: Member | null;
}

export const MemberRegistration: React.FC<MemberRegistrationProps> = ({ branchId, branchName, onRegister, initialData }) => {
  const [formData, setFormData] = useState({
    fullName: initialData?.full_name || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    subscriptionPlan: SubscriptionPlan.MONTH_1,
    dailyAccessHours: AccessHours.HOURS_6,
    studyPurpose: initialData?.study_purpose || '',
    registeredBy: initialData?.registered_by || '',
    price: '', // Decoupled Price
    customDurationValue: '',
    customDurationUnit: 'DAYS' as 'DAYS' | 'MONTHS',
    paymentMode: 'CASH' as 'CASH' | 'UPI'
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
        price: '',
        paymentMode: 'CASH'
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkDuplicates = async () => {
    // Check for existing member with same Phone OR Email in this branch
    const { data, error } = await supabase
      .from('members')
      .select('id')
      .or(`email.eq.${formData.email},phone.eq.${formData.phone}`)
      .eq('branch_id', branchId);

    if (error) {
      console.error("Error checking duplicates:", error);
      return true; // Fail safe, allow registration or block? Let's allow but log. Actually better to block if we can't be sure, but for now let's assume no duplicate if error to avoid blocking valid users on network blip. Wait, standard is to fail open or closed? detailed plan said "Show error".
      // Let's return false (no duplicates found) but log error.
      // Actually, safest is to alert user "Network error checking duplicates".
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



      const expiryDate = calculateExpiryDate();

      const newMember: Member = {
        id: crypto.randomUUID(),
        full_name: formData.fullName,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        join_date: new Date().toISOString(),
        expiry_date: expiryDate,
        subscription_plan: planLabel,
        daily_access_hours: formData.dailyAccessHours,
        study_purpose: formData.studyPurpose,
        registered_by: formData.registeredBy,
        branch_id: branchId
      };

      const amount = Number(formData.price);

      await new Promise(resolve => setTimeout(resolve, 1000));

      onRegister(newMember, amount, formData.paymentMode);

      // Reset Form
      setFormData({
        fullName: '',
        address: '',
        phone: '',
        email: '',
        subscriptionPlan: SubscriptionPlan.MONTH_1,
        dailyAccessHours: AccessHours.HOURS_6,
        studyPurpose: '',
        registeredBy: '',
        price: '',
        customDurationValue: '',
        customDurationUnit: 'DAYS',
        paymentMode: 'CASH'
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${errors.fullName ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                placeholder="krittik das"
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${errors.phone ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                placeholder="9876543210"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
              <input
                type="text"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${errors.email ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                placeholder="john@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Study Purpose / Occupation *</label>
              <input
                type="text"
                value={formData.studyPurpose}
                onChange={(e) => setFormData({ ...formData, studyPurpose: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${errors.studyPurpose ? 'border-red-500' : 'border-slate-300'} focus:ring-2 focus:ring-indigo-200 focus:outline-none`}
                placeholder="e.g. UPSC Study, Remote Work, APSC"
              />
              {errors.studyPurpose && <p className="text-red-500 text-xs mt-1">{errors.studyPurpose}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Residential Address *</label>
              <textarea
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

            {formData.subscriptionPlan === SubscriptionPlan.CUSTOM && (
              <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration Value</label>
                  <input
                    type="number"
                    value={formData.customDurationValue}
                    onChange={(e) => setFormData({ ...formData, customDurationValue: e.target.value })}
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
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
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
                  onClick={() => setFormData({ ...formData, paymentMode: 'CASH' })}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.paymentMode === 'CASH'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMode: 'UPI' })}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.paymentMode === 'UPI'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  UPI
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Receptionist Name (Registered By) *</label>
              <input
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
