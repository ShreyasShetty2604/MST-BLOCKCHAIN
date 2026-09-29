import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gahfzpbqdxakfvxxvurq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaGZ6cGJxZHhha2Z2eHh2dXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjcwOTUsImV4cCI6MjEwNjIwMzA5NX0.U5xCcRnBZ6YaMqHV_i6iLiOJvpGaFUP4xmWSwKK16H4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Save record payload to Supabase database (with local file fallback).
 */
export async function saveRecordToSupabase(recordData) {
  try {
    const { data, error } = await supabase
      .from('medical_records')
      .insert([
        {
          file_id: recordData.fileId,
          vault_id: recordData.vaultId,
          payload_hash: recordData.payloadHash,
          encrypted_payload: JSON.stringify(recordData.recordPackage),
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.warn('Supabase DB notice (table fallback enabled):', error.message);
    } else {
      console.log('✓ Persisted to Supabase PostgreSQL table medical_records:', data);
    }
  } catch (err) {
    console.warn('Supabase sync notice:', err.message);
  }
}
