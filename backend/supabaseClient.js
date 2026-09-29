import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gahfzpbqdxakfvxxvurq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaGZ6cGJxZHhha2Z2eHh2dXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjcwOTUsImV4cCI6MjEwNjIwMzA5NX0.U5xCcRnBZ6YaMqHV_i6iLiOJvpGaFUP4xmWSwKK16H4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 1. Persist New User / Vault Profile to Supabase Table `patient_vaults`
 */
export async function saveUserToSupabase(userData) {
  try {
    const { data, error } = await supabase
      .from('patient_vaults')
      .insert([
        {
          vault_id: userData.vaultId,
          medi_id: userData.mediId,
          name: userData.name,
          dob: userData.dob,
          gender: userData.gender,
          phone: userData.phone,
          email: userData.email,
          dna_salted_hash: userData.dnaSaltedHash,
          emergency_info: JSON.stringify(userData.emergencyInfo || {}),
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.warn('Supabase DB notice (user vault table):', error.message);
    } else {
      console.log('✓ Persisted user profile to Supabase `patient_vaults`:', data);
    }
  } catch (err) {
    console.warn('Supabase user sync notice:', err.message);
  }
}

/**
 * 2. Persist Fingerprint / WebAuthn Biometric Credentials to Supabase Table `fingerprint_credentials`
 */
export async function saveFingerprintToSupabase(credentialData) {
  try {
    const { data, error } = await supabase
      .from('fingerprint_credentials')
      .insert([
        {
          credential_id: credentialData.credentialId,
          persona_id: credentialData.personaId,
          vault_id: credentialData.vaultId,
          kind: credentialData.kind || 'webauthn',
          label: credentialData.label || 'TouchID / Fingerprint Enclave',
          public_key_hash: credentialData.publicKeyHash || credentialData.credentialId,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.warn('Supabase DB notice (fingerprint credentials table):', error.message);
    } else {
      console.log('✓ Persisted biometric credential to Supabase `fingerprint_credentials`:', data);
    }
  } catch (err) {
    console.warn('Supabase fingerprint sync notice:', err.message);
  }
}

/**
 * 3. Persist AES-256-GCM Encrypted Record Payload & Attachments to Supabase Table `medical_records`
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
          attachments_meta: JSON.stringify(recordData.attachments || []),
          tx_hash: recordData.txHash || null,
          block_number: recordData.blockNumber || null,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.warn('Supabase DB notice (medical records table):', error.message);
    } else {
      console.log('✓ Persisted encrypted record to Supabase `medical_records`:', data);
    }
  } catch (err) {
    console.warn('Supabase record sync notice:', err.message);
  }
}

/**
 * 4. Persist Active Consent Permissions to Supabase Table `consents`
 */
export async function saveConsentToSupabase(consentData) {
  try {
    const { data, error } = await supabase
      .from('consents')
      .insert([
        {
          consent_id: consentData.id,
          vault_id: consentData.vaultId,
          hospital_id: consentData.hospitalId,
          hospital_name: consentData.hospitalName,
          tier: consentData.tier,
          status: consentData.status,
          granted_at: consentData.grantedAt,
          expires_at: consentData.expiresAt,
          tx_hash: consentData.txHash
        }
      ])
      .select();

    if (error) {
      console.warn('Supabase DB notice (consents table):', error.message);
    } else {
      console.log('✓ Persisted consent policy to Supabase `consents`:', data);
    }
  } catch (err) {
    console.warn('Supabase consent sync notice:', err.message);
  }
}

/**
 * 5. Persist Immutable Audit Event Logs to Supabase Table `audit_logs`
 */
export async function saveAuditLogToSupabase(auditData) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([
        {
          log_id: auditData.id,
          vault_id: auditData.vaultId,
          event_type: auditData.eventType,
          actor: auditData.actor,
          action: auditData.action,
          tx_hash: auditData.txHash,
          block_number: auditData.blockNumber || null,
          is_emergency: auditData.isEmergency || false,
          is_flagged: auditData.isFlagged || false,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.warn('Supabase DB notice (audit logs table):', error.message);
    } else {
      console.log('✓ Persisted event log to Supabase `audit_logs`:', data);
    }
  } catch (err) {
    console.warn('Supabase audit log sync notice:', err.message);
  }
}
