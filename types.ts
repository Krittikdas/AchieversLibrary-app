
export enum SubscriptionPlan {
  MONTH_1 = '1 Month',
  MONTH_3 = '3 Months',
  MONTH_6 = '6 Months',
  CUSTOM = 'Custom'
}

export enum AccessHours {
  HOURS_6 = '6 Hours',
  HOURS_12 = '12 Hours',
  HOURS_24 = '24 Hours',
  CUSTOM = 'Custom Hours'
}

export enum TransactionType {
  MEMBERSHIP = 'MEMBERSHIP',
  SNACK = 'SNACK',
  CARD = 'CARD',
  LOCKER = 'LOCKER'
}

export interface Member {
  id: string;
  full_name: string;
  address: string;
  phone: string;
  email: string;
  join_date: string; // ISO Date string
  expiry_date: string; // ISO Date string
  subscription_plan: string;
  daily_access_hours: string;
  study_purpose: string;
  registered_by: string;
  branch_id: string;
  card_issued?: boolean;
  card_payment_mode?: 'CASH' | 'UPI';
  card_returned?: boolean;
  locker_assigned?: boolean;
  locker_payment_mode?: 'CASH' | 'UPI' | 'INCLUDED';
  locker_number?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  timestamp: string;
  description: string;
  member_id?: string;
  branch_id: string;
  status: 'PENDING' | 'COMPLETED';
  payment_mode?: 'CASH' | 'UPI' | 'SPLIT';
  cash_amount?: number;
  upi_amount?: number;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  email: string;
  total_cards?: number;
  total_lockers?: number;
}

export interface AppState {
  branches: Branch[];
  members: Member[];
  transactions: Transaction[];
}

export interface Profile {
  id: string;
  role: 'ADMIN' | 'RECEPTION';
  branch_id?: string;
}

export interface Snack {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

