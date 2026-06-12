import supabase from './supabase';
import { User, LeaderboardEntry, Giveaway, Winner } from '../types';
import { generateReferralCode } from '../utils/helpers';
import { LEADERBOARD_LIMIT } from '../config';

// User related queries
export async function createUser(telegramId: number, username?: string, firstName?: string, lastName?: string, referredBy?: number): Promise<User | null> {
  const referralCode = generateReferralCode(8);
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramId,
      username,
      first_name: firstName,
      last_name: lastName,
      referral_code: referralCode,
      referred_by: referredBy
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  
  return data as unknown as User;
}

export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching user:', error);
    return null;
  }
  
  return data as User;
}

export async function getUserByReferralCode(referralCode: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('referral_code', referralCode)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching user by referral code:', error);
    return null;
  }
  
  return data as User;
}

export async function incrementReferralCount(telegramId: number): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ referral_count: supabase.rpc('increment', { x: 1 }) })
    .eq('telegram_id', telegramId);
  
  if (error) {
    console.error('Error incrementing referral count:', error);
    return false;
  }
  
  return true;
}

export async function createReferral(referrerId: number, referredId: number): Promise<boolean> {
  const { error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrerId,
      referred_id: referredId
    });
  
  if (error) {
    console.error('Error creating referral:', error);
    return false;
  }
  
  // Increment the referrer's count
  await incrementReferralCount(referrerId);
  
  return true;
}

// Leaderboard related queries
export async function getLeaderboard(limit: number = LEADERBOARD_LIMIT): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('users')
    .select('telegram_id, username, first_name, last_name, referral_count')
    .order('referral_count', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
  
  return data as LeaderboardEntry[];
}

// Giveaway related queries
export async function createGiveaway(
  title: string,
  targetReferrals: number,
  maxWinners: number,
  durationDays: number,
  description?: string
): Promise<Giveaway | null> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);
  
  const { data, error } = await supabase
    .from('giveaways')
    .insert({
      title,
      description,
      target_referrals: targetReferrals,
      max_winners: maxWinners,
      end_date: endDate.toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating giveaway:', error);
    return null;
  }
  
  return data as unknown as Giveaway;
}

export async function getActiveGiveaway(): Promise<Giveaway | null> {
  const { data, error } = await supabase
    .from('giveaways')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching active giveaway:', error);
    return null;
  }
  
  return data as Giveaway;
}

export async function registerGiveawayWinners(giveawayId: number): Promise<Winner[]> {
  // Get users who met the criteria for the giveaway
  const giveaway = await getGiveawayById(giveawayId);
  
  if (!giveaway) {
    console.error('Giveaway not found');
    return [];
  }
  
  const { data: eligibleUsers, error } = await supabase
    .from('users')
    .select('telegram_id, referral_count')
    .gte('referral_count', giveaway.target_referrals)
    .order('referral_count', { ascending: false })
    .limit(giveaway.max_winners);
  
  if (error) {
    console.error('Error fetching eligible users:', error);
    return [];
  }
  
  if (!eligibleUsers.length) {
    return [];
  }
  
  // Insert winners
  const winners = eligibleUsers.map(user => ({
    giveaway_id: giveawayId,
    user_id: user.telegram_id,
    referral_count: user.referral_count
  }));
  
  const { data, error: insertError } = await supabase
    .from('winners')
    .insert(winners)
    .select();
  
  if (insertError) {
    console.error('Error registering winners:', insertError);
    return [];
  }
  
  // Mark giveaway as inactive
  await supabase
    .from('giveaways')
    .update({ is_active: false })
    .eq('id', giveawayId);
  
  return data as unknown as Winner[];
}

export async function getGiveawayById(giveawayId: number): Promise<Giveaway | null> {
  const { data, error } = await supabase
    .from('giveaways')
    .select('*')
    .eq('id', giveawayId)
    .single();
  
  if (error) {
    console.error('Error fetching giveaway:', error);
    return null;
  }
  
  return data as Giveaway;
}

export async function getGiveawayWinners(giveawayId: number): Promise<any[]> {
  const { data, error } = await supabase
    .from('winners')
    .select(`
      id,
      referral_count,
      users:user_id (
        telegram_id,
        username,
        first_name,
        last_name
      )
    `)
    .eq('giveaway_id', giveawayId);
  
  if (error) {
    console.error('Error fetching giveaway winners:', error);
    return [];
  }
  
  return data;
}

// Add these functions to your queries.ts file

export async function createGroupInvite(
    telegramGroupId: number,
    creatorId: number,
    inviteLink: string,
    expiresAt?: Date
  ): Promise<boolean> {
    const { error } = await supabase
      .from('group_invites')
      .insert({
        telegram_group_id: telegramGroupId,
        creator_id: creatorId,
        invite_link: inviteLink,
        expires_at: expiresAt?.toISOString()
      });
    
    if (error) {
      console.error('Error creating group invite:', error);
      return false;
    }
    
    return true;
  }
  
  export async function getGroupLeaderboard(
    telegramGroupId: number,
    limit: number = LEADERBOARD_LIMIT
  ): Promise<LeaderboardEntry[]> {
    // Using a different approach that doesn't require grouping
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        invited_by,
        user_id
      `)
      .eq('telegram_group_id', telegramGroupId)
      .not('invited_by', 'is', null);
    
    if (error) {
      console.error('Error fetching group membership data:', error);
      return [];
    }
    
    // Manually count the occurrences of each inviter
    const inviterCounts = new Map<number, number>();
    for (const member of data) {
      if (member.invited_by) {
        const count = inviterCounts.get(member.invited_by) || 0;
        inviterCounts.set(member.invited_by, count + 1);
      }
    }
    
    // Get user details for each inviter
    const leaderboard: LeaderboardEntry[] = [];
    for (const [inviterId, count] of inviterCounts.entries()) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('telegram_id, username, first_name, last_name')
        .eq('telegram_id', inviterId)
        .single();
      
      if (!userError && userData) {
        leaderboard.push({
          telegram_id: userData.telegram_id,
          username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name,
          referral_count: count
        });
      }
    }
    
    // Sort by referral count and limit
    return leaderboard
      .sort((a, b) => b.referral_count - a.referral_count)
      .slice(0, limit);
  }
  
  export async function recordGroupMembership(
    telegramGroupId: number,
    userId: number,
    invitedBy?: number
  ): Promise<boolean> {
    const { error } = await supabase
      .from('group_members')
      .insert({
        telegram_group_id: telegramGroupId,
        user_id: userId,
        invited_by: invitedBy
      });
    
    if (error) {
      console.error('Error recording group membership:', error);
      return false;
    }
    
    if (invitedBy) {
      // Increment the referrer's count
      await incrementReferralCount(invitedBy);
    }
    
    return true;
  }