import { supabase } from '../supabaseClient';
import { timeService } from '../services/timeService';

export const checkResourceAvailability = async (
    type: 'LOCKER' | 'SEAT',
    value: string,
    currentMemberId?: string,
    forceCheck: boolean = false
): Promise<{ available: boolean; message?: string }> => {
    // 1. Fetch any member who has this resource assigned
    let query = supabase
        .from('members')
        .select('id, full_name, expiry_date')
        .eq(type === 'LOCKER' ? 'locker_number' : 'seat_no', value);

    // If we are editing/renewing a member, ignore themselves in the check
    if (currentMemberId) {
        query = query.neq('id', currentMemberId);
    }

    // Force network fetch if forceCheck is true (Supabase client caches by default? No, but good for retries)
    // Actually Supabase client doesn't cache select() by default unless configured.
    // However, we want to ensure we are comparing against SERVER time or Synced Time.

    const { data, error } = await query;

    if (error) {
        console.error("Availability Check Error:", error);
        return { available: false, message: "Error checking availability" };
    }

    if (!data || data.length === 0) {
        return { available: true };
    }

    // 2. Check strict availability against Active Members only using TimeService
    // Use server-synced time for validity check
    const now = timeService.getSystemTime();

    // We strictly check if expiry_date > now. 
    // Note: expiry_date from DB is ISO string. 
    const activeHolder = data.find(m => {
        const expiry = new Date(m.expiry_date);
        return expiry >= now; // Member is ACTIVE
    });

    if (activeHolder) {
        return {
            available: false,
            message: `${type === 'LOCKER' ? 'Locker' : 'Seat'} is currently occupied by active member: ${activeHolder.full_name}`
        };
    }

    // 3. If held by expired members only, it IS available (immediate release)
    const expiredHolder = data[0]; // Just take the first one for context
    return {
        available: true,
        message: `Available (Previously held by expired member: ${expiredHolder.full_name})`
    };
};
