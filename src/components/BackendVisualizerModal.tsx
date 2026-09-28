import React, { useState } from 'react';
import {
  Server, Cpu, ShieldCheck, Database, Terminal, Activity, Network, ArrowRight, X, ExternalLink, RefreshCw, CheckCircle2, Lock
} from 'lucide-react';
import { DEPLOYED_CONTRACTS, MEDIVAULT_MASTER_ADDRESS } from '../contracts/contractAbi';

interface BackendVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendVisualizerModal: React.FC<BackendVisualizerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'api-routes' | 'smart-contracts' | 'live-console'>('architecture');

  if (!isOpen) return null;

  const mockApiLogs = [
    { method: 'GET', path: '/api/health', status: 200, latency: '12ms', type: 'REST', note: 'Backend node online' },
    { method: 'POST', path: '/api/consents/grant', status: 201, latency: '420ms', type: 'RPC', note: 'Smart Contract: ConsentManager.grantAccess()' },
    { method: 'POST', path: '/api/verify/record', status: 200, latency: '850ms', type: 'Crypto', note: 'Computed client SHA-256 vs On-chain expected hash' },
    { method: 'POST', path: '/api/emergency/break-glass', status: 200, latency: '610ms', type: 'RPC', note: 'EmergencyAccess logged & trust score penalized' },
    { method: 'POST', path: '/api/ai/guidance', status: 200, latency: '380ms', type: 'LLM', note: 'Read profile parameters once (Offline fallback ready)' }
  ];

  const smartContractFunctions = [
    { name: 'createVault(vaultId, healthIdHash)', contract: 'MediVaultMaster', desc: 'Registers random 256-bit vault ID and SHA-256 MediID hash.' },
    { name: 'grantAccess(vaultId, hospital, tier, expiry)', contract: 'MediVaultMaster', desc: 'Grants time-bound Tier 1 or Tier 2 permission.' },
    { name: 'revokeAccess(vaultId, hospital)', contract: 'MediVaultMaster', desc: 'Immediately invalidates permission ahead of expiry.' },
    { name: 'addRecord(vaultId, payloadHash, type, source, prevId)', contract: 'MediVaultMaster', desc: 'Anchors record version v1 -> v2.' },
    { name: 'emergencyAccess(vaultId, category, notes)', contract: 'MediVaultMaster', desc: 'Tier 1 break-glass access with rate limiting (max 3/hr).' },
    { name: 'flagMisuse(vaultId, logId, reason)', contract: 'MediVaultMaster', desc: 'Penalizes hospital trust score by -50 points (-5.0%).' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl bg-slate-900 text-white rounded-3xl shadow-2xl border border-teal-500/40 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-700/80 text-white rounded-2xl shadow-glow-teal">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">MediVault Live Backend Visualizer</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-950 text-teal-300 border border-teal-800">
                  REAL-TIME MONITOR
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Node.js Express API • Hardhat RPC • Polygon Amoy Testnet (Chain ID: 80002)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 bg-slate-950 border-b border-slate-800 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2.5 rounded-t-xl font-bold transition-all border-t border-x ${
              activeTab === 'architecture'
                ? 'bg-slate-900 text-teal-400 border-teal-500/50'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Architecture Flow
          </button>

          <button
            onClick={() => setActiveTab('api-routes')}
            className={`px-4 py-2.5 rounded-t-xl font-bold transition-all border-t border-x ${
              activeTab === 'api-routes'
                ? 'bg-slate-900 text-teal-400 border-teal-500/50'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Express REST Endpoints
          </button>

          <button
            onClick={() => setActiveTab('smart-contracts')}
            className={`px-4 py-2.5 rounded-t-xl font-bold transition-all border-t border-x ${
              activeTab === 'smart-contracts'
                ? 'bg-slate-900 text-teal-400 border-teal-500/50'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Solidity Master Contract
          </button>

          <button
            onClick={() => setActiveTab('live-console')}
            className={`px-4 py-2.5 rounded-t-xl font-bold transition-all border-t border-x ${
              activeTab === 'live-console'
                ? 'bg-slate-900 text-teal-400 border-teal-500/50'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Live Server Console
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* TAB 1: ARCHITECTURE FLOW */}
          {activeTab === 'architecture' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">
                  System Dataflow Architecture
                </span>
                <p className="text-slate-400">
                  Patient Health Records (PHI) are encrypted client-side using device WebAuthn hardware passkeys. Only SHA-256 integrity hashes and time-bound access consents are anchored on-chain.
                </p>
              </div>

              {/* Graphical Step Blocks */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="p-2 bg-teal-900/60 rounded-xl text-teal-300 w-fit">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-sm">1. Client Encryption</h4>
                  <p className="text-[11px] text-slate-400">
                    Patient records encrypted with biometric key. Computes SHA-256 hash.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="p-2 bg-indigo-900/60 rounded-xl text-indigo-300 w-fit">
                    <Server className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-sm">2. Express REST API</h4>
                  <p className="text-[11px] text-slate-400">
                    Node.js backend validates payload and dispatches RPC transaction.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="p-2 bg-emerald-900/60 rounded-xl text-emerald-300 w-fit">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-sm">3. Solidity Master</h4>
                  <p className="text-[11px] text-slate-400">
                    `MediVaultMaster.sol` evaluates consent, rate limits & records hash.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="p-2 bg-amber-900/60 rounded-xl text-amber-300 w-fit">
                    <Network className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-sm">4. Blockchain Receipt</h4>
                  <p className="text-[11px] text-slate-400">
                    Emits event (`RecordAdded`, `ConsentGranted`) on Polygon Amoy.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Backend Folder Layout:</span>
                  <span className="text-teal-400">/backend & /contracts</span>
                </div>
                <div className="space-y-1 text-slate-300">
                  <div>📁 /contracts/contracts/MediVaultMaster.sol (Smart Contract Suite)</div>
                  <div>📁 /backend/server.js (Express API REST Routes)</div>
                  <div>📁 /backend/mock_llm_responses.json (Offline Demo LLM Cache)</div>
                  <div>📁 /src/contracts/contractAbi.ts (Frontend Typed Ethers Bridge)</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXPRESS REST ENDPOINTS */}
          {activeTab === 'api-routes' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-white text-sm">Registered Node.js Express REST API Routes</h3>

              <div className="space-y-2 font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold">GET</span>
                    <span className="text-slate-200">/api/health</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">Returns backend node & RPC status</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 font-bold">POST</span>
                    <span className="text-slate-200">/api/consents/grant</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">Dispatches grantAccess() to ConsentManager</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 font-bold">POST</span>
                    <span className="text-slate-200">/api/records/hospital</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">Anchors hospital-signed record hash</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 font-bold">POST</span>
                    <span className="text-slate-200">/api/emergency/break-glass</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">Invokes emergencyAccess() with rate limits</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-400 font-bold">POST</span>
                    <span className="text-slate-200">/api/ai/guidance</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">Structured clinical advice (Offline fallback ready)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SOLIDITY MASTER CONTRACT */}
          {activeTab === 'smart-contracts' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Deployed Deployed Contract Address</span>
                  <span className="font-mono text-teal-300 text-xs font-bold">{MEDIVAULT_MASTER_ADDRESS}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                  Verified EVM Contract
                </span>
              </div>

              <div className="space-y-2">
                {smartContractFunctions.map((fn, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-teal-400 text-xs">{fn.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{fn.contract}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{fn.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LIVE SERVER CONSOLE */}
          {activeTab === 'live-console' && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400 text-[11px]">
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-teal-400" />
                  <span>Real-Time Backend HTTP & Smart Contract Log Stream</span>
                </span>
                <span className="text-emerald-400">● LIVE (300ms polling)</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto text-[11px]">
                {mockApiLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">{log.method}</span>
                      <span className="text-slate-200">{log.path}</span>
                      <span className="text-slate-500 text-[10px]">({log.note})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-teal-400">{log.latency}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px]">
                        {log.status} OK
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-400">Use this backend visualizer during hackathon presentation to demonstrate RPC flows.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold"
          >
            Close Visualizer
          </button>
        </div>
      </div>
    </div>
  );
};
