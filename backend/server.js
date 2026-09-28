import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Load mock LLM responses for venue Wi-Fi resilience
let mockLlmData = {};
try {
  const raw = fs.readFileSync(path.join(__dirname, 'mock_llm_responses.json'), 'utf-8');
  mockLlmData = JSON.parse(raw);
} catch (err) {
  console.warn('Warning: mock_llm_responses.json not loaded, fallback enabled');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'MediVault Backend API',
    network: 'Polygon Amoy Testnet (80002) / Local Hardhat (31337)',
    timestamp: new Date().toISOString()
  });
});

// Patient endpoints
app.get('/api/patient/me', (req, res) => {
  res.json({
    mediId: '91-2345-6789-0123',
    name: 'Rajesh Kumar',
    dob: '1974-05-14',
    bloodGroup: 'B+',
    status: 'Verified Sovereign Vault'
  });
});

app.get('/api/patient/:mediId', (req, res) => {
  const { mediId } = req.params;
  res.json({
    mediId,
    name: 'Rajesh Kumar',
    dob: '1974-05-14',
    emergencyInfo: {
      bloodGroup: 'B+',
      allergies: ['Penicillin', 'Dust Mites'],
      conditions: ['Type 2 Diabetes Mellitus', 'Mild Hypertension'],
      emergencyContact: { name: 'Sunita Kumar', phone: '+91 98765 43211' }
    }
  });
});

// AI Guidance endpoint (with offline fallback to mock_llm_responses.json)
app.post('/api/ai/guidance', (req, res) => {
  const { query } = req.body;
  const lower = (query || '').toLowerCase();

  if (lower.includes('chest pain') || lower.includes('breathless') || lower.includes('unconscious')) {
    return res.json(mockLlmData.emergency_chest_pain || {
      isRedFlag: true,
      emergencyNotice: 'CRITICAL EMERGENCY SYMPTOM DETECTED — SEEK EMERGENCY CARE IMMEDIATELY'
    });
  }

  if (lower.includes('headache')) {
    return res.json(mockLlmData.metformin_headache);
  }

  if (lower.includes('numbness')) {
    return res.json(mockLlmData.foot_numbness);
  }

  return res.json(mockLlmData.fasting_glucose_145 || {
    query,
    structuredReply: {
      pointTo: ['General glycemic health variation'],
      whatToDo: ['Maintain prescribed hydration and medication timing'],
      whenDoctor: ['If symptoms persist for 48 hours']
    }
  });
});

app.listen(PORT, () => {
  console.log(`MediVault Backend Skeleton listening at http://localhost:${PORT}`);
});
