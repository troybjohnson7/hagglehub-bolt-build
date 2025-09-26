import { base44 } from './base44Client';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for real database operations
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Enhanced entities that can work with both mock data and real Supabase
class HybridEntity {
  constructor(tableName, mockEntity) {
    this.tableName = tableName;
    this.mockEntity = mockEntity;
  }

  async list(orderBy = '') {
    if (supabase) {
      try {
        let query = supabase.from(this.tableName).select('*');
        if (orderBy) {
          const isDesc = orderBy.startsWith('-');
          const field = isDesc ? orderBy.substring(1) : orderBy;
          query = query.order(field, { ascending: !isDesc });
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.warn(`Supabase error for ${this.tableName}, falling back to mock:`, error);
        return this.mockEntity.list(orderBy);
      }
    }
    return this.mockEntity.list(orderBy);
  }

  async filter(criteria) {
    if (supabase) {
      try {
        let query = supabase.from(this.tableName).select('*');
        Object.entries(criteria).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.warn(`Supabase error for ${this.tableName}, falling back to mock:`, error);
        return this.mockEntity.filter(criteria);
      }
    }
    return this.mockEntity.filter(criteria);
  }

  async create(itemData) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from(this.tableName)
          .insert(itemData)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        console.warn(`Supabase error for ${this.tableName}, falling back to mock:`, error);
        return this.mockEntity.create(itemData);
      }
    }
    return this.mockEntity.create(itemData);
  }

  async update(id, updates) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from(this.tableName)
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        console.warn(`Supabase error for ${this.tableName}, falling back to mock:`, error);
        return this.mockEntity.update(id, updates);
      }
    }
    return this.mockEntity.update(id, updates);
  }

  async delete(id) {
    if (supabase) {
      try {
        const { error } = await supabase
          .from(this.tableName)
          .delete()
          .eq('id', id);
        if (error) throw error;
        return true;
      } catch (error) {
        console.warn(`Supabase error for ${this.tableName}, falling back to mock:`, error);
        return this.mockEntity.delete(id);
      }
    }
    return this.mockEntity.delete(id);
  }
}

export const Vehicle = new HybridEntity('vehicles', base44.entities.Vehicle);

export const Dealer = new HybridEntity('dealers', base44.entities.Dealer);

export const Deal = new HybridEntity('deals', base44.entities.Deal);

export const Message = new HybridEntity('messages', base44.entities.Message);

export const MarketData = new HybridEntity('market_data', base44.entities.MarketData);



// auth sdk:
export const User = base44.auth;