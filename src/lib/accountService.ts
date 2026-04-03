import { supabase } from './supabaseClient';

export type UserRole = 'PLATFORM' | 'WHOLESALER' | 'RETAILER' | 'DRIVER';
export type RetailerSubType = 'DIRECT' | 'EXTERNAL';

export interface StretAccount {
  id: string;
  name: string;
  role: UserRole;
  sub_type?: RetailerSubType;
  balance: number;
  credit_limit: number;
  vat_id?: string;
  vnpf_id?: string;
  location?: string;
}

/**
 * AUTH SERVICE: Simulates user login and role retrieval from PostgreSQL
 */
export const accountService = {
  // Get Current Active Account (Mocking DB call for now)
  async getCurrentAccount(id: string): Promise<StretAccount | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.warn('DB Error (Falling back to mock):', error.message);
      return null;
    }
    return data;
  },

  // Update Account Balance (Financial Transaction)
  async updateBalance(accountId: string, amount: number) {
    const { data, error } = await supabase.rpc('increment_balance', { 
      acc_id: accountId, 
      val: amount 
    });
    
    if (error) throw error;
    return data;
  },

  // Record LedgerEntry
  async recordTransaction(tx: {
    account_id: string;
    amount: number;
    transaction_type: string;
    reference_id?: string;
  }) {
    const { error } = await supabase
      .from('ledger')
      .insert([tx]);
    
    if (error) console.error('Ledger Error:', error);
  }
};
