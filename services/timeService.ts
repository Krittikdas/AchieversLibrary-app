import { supabase } from '../supabaseClient';

class TimeService {
    private offset: number = 0;
    private initialized: boolean = false;

    async init() {
        if (this.initialized) return;

        try {
            const start = Date.now();
            const { data, error } = await supabase.rpc('get_server_time');
            const end = Date.now();

            if (error) throw error;
            if (!data) throw new Error("No time returned from server");

            const serverTime = new Date(data).getTime();
            const latency = (end - start) / 2;

            this.offset = serverTime - (Date.now() - latency); // Server - Client (approx)
            this.initialized = true;
            console.log("TimeService initialized. Offset:", this.offset, "ms");
        } catch (err) {
            console.error("Failed to sync time with server, falling back to local time.", err);
            this.offset = 0;
            // We mark as initialized so we don't retry locally constantly, 
            // but in a real app might want a retry strategy.
            this.initialized = true;
        }
    }

    getSystemTime(): Date {
        return new Date(Date.now() + this.offset);
    }

    toISOString(): string {
        return this.getSystemTime().toISOString();
    }
}

export const timeService = new TimeService();
