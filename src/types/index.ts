// Define application types
export interface User {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    referral_code: string;
    referral_count: number;
    referred_by?: number;
    created_at: Date;
  }
  
  export interface Referral {
    referrer_id: number;
    referred_id: number;
    created_at: Date;
  }
  
  export interface Giveaway {
    id: number;
    title: string;
    description?: string;
    target_referrals: number;
    max_winners: number;
    start_date: Date;
    end_date: Date;
    is_active: boolean;
  }
  
  export interface Winner {
    id: number;
    giveaway_id: number;
    user_id: number;
    referral_count: number;
    created_at: Date;
  }
  
  export interface LeaderboardEntry {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    referral_count: number;
  }