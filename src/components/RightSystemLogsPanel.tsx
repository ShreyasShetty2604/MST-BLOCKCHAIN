import React, { useState } from 'react';
import { Terminal, Cpu, Lock, ShieldCheck, Zap, Server, ChevronRight, Activity, Database, RefreshCw } from 'lucide-react';

interface RightSystemLogsPanelProps {
  onOpenBackendVisualizer?: () => void;
}

interface PacketLogEntry {
  id: string;
  time: string;
  stage: 'AES-256' | 'HMAC' | 'RELAYER' | 'EVM' | 'ACCESS';
  summary: string;
  hash: string;
  block?: number;
  status: 'VERIFIED' | 'ENCRYPTED' | 'ANCHORED' | 'FORWARDED';
}

export const RightSystemLogsPanel: React.FC<RightSystemLogsPanelProps> = ({
  onOpenBackendVisualizer
}) => {
  const [selectedLog, setSelectedLog] = useState<string | null>('pkt-1');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [logs, setLogs] = useState<PacketLogEntry[]>([
    {
      id: 'pkt-1',
      time: '10:42:01',
      stage: 'EVM',
      summary: 'RecordAnchored(rec-101, v2)',
      hash: '0x3f2a91b84e72c5108d9302194b1a7e4c9c1d84a2',
      block: 4819515,
      status: 'ANCHORED'
    },
    {
      id: 'pkt-2',
      time: '10:41:58',
      stage: 'RELAYER',
      summary: 'EIP-712 Gasless Relay Executed',
      hash: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      status: 'FORWARDED'
    },
    {
      id: 'pkt-3',
      time: '10:41:55',
      stage: 'HMAC',
      summary: 'HMAC-SHA256 Checksum Match',
      hash: '0xa4e98f712b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
      status: 'VERIFIED'
    },
    {
      id: 'pkt-4',
      time: '10:41:52',
      stage: 'AES-256',
      summary: 'AES-256-GCM Cipher Payload Built',
      hash: '0x8f7a1e3b5c9d2f4a6e8b0c2d4f6a8e0b2c4d6e8f',
      status: 'ENCRYPTED'
    },
    {
      id: 'pkt-5',
      time: '10:40:12',
      stage: 'ACCESS',
      summary: 'Tier 2 Consent Validated (City Gen)',
      hash: '0xa1b2c3d4e5f67890123456789abcdef012345678',
      block: 4819490,
      status: 'VERIFIED'
    }
  ]);

  // Simulate pushing a new live packet log periodically or on click
  const handlePushPacket = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const randomHex = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const blockNum = 4819520 + Math.floor(Math.random() * 50);

      const newPkt: PacketLogEntry = {
        id: `pkt-${Date.now()}`,
        time: timeStr,
        stage: 'EVM',
        summary: `RecordAnchored(rec-${Math.floor(Math.random() * 800 + 100)}, v1)`,
        hash: `0x${randomHex}890123456789abcdef`,
        block: blockNum,
        status: 'ANCHORED'
      };

      setLogs((prev) => [newPkt, ...prev.slice(0, 7)]);
      setSelectedLog(newPkt.id);
      setIsSimulating(false);
    }, 600);
  };

  const activeEntry = logs.find((l) => l.id === selectedLog) || logs[0];

  return (
    <aside className="hidden lg:flex flex-col w-80 shrink-0 bg-gradient-to-b from-emerald-950/50 via-slate-950/60 to-emerald-950/50 backdrop-blur-2xl border border-emerald-500/35 shadow-[0_8px_32px_0_rgba(6,78,59,0.3)] text-emerald-100 rounded-3xl p-4 space-y-4 relative overflow-hidden">
      {/* HIGHLY TRANSLUCENT AMBIENT GLASS ACCENTS */}
      <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TRANSLUCENT GLASSMOPHIC HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-500/25 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-900/30 backdrop-blur-md text-emerald-300 border border-emerald-500/35 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-emerald-100 flex items-center gap-1.5 tracking-wide">
              Backend System Packets
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
            </h3>
            <p className="text-[10px] text-emerald-300/80 font-medium">
              EVM & Cryptographic Log Stream
            </p>
          </div>
        </div>

        <button
          onClick={handlePushPacket}
          disabled={isSimulating}
          className="p-1.5 rounded-xl bg-emerald-900/25 hover:bg-emerald-800/40 text-emerald-300 transition-all border border-emerald-500/30 cursor-pointer backdrop-blur-md shadow-[0_0_10px_rgba(16,185,129,0.15)]"
          title="Simulate New Real-time Packet"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-emerald-300' : ''}`} />
        </button>
      </div>

      {/* 2. PACKET ARCHITECTURE PIPELINE STAGES (ULTRA TRANSLUCENT GLASS GRID) */}
      <div className="p-3 bg-emerald-950/20 backdrop-blur-xl text-emerald-100 rounded-2xl border border-emerald-500/20 shadow-inner space-y-2 relative z-10">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-emerald-400" />
            Packet Assembly Layer
          </span>
          <span className="text-[9px] font-mono text-emerald-200 bg-emerald-900/40 border border-emerald-500/30 px-2 py-0.5 rounded-full backdrop-blur-md">
            L1 ➔ Relayer ➔ EVM
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-[9px] font-mono text-center pt-1">
          <div className="p-2 rounded-xl bg-emerald-900/20 border border-emerald-500/25 text-emerald-200 shadow-xs hover:border-emerald-400/60 backdrop-blur-md transition-all">
            <Lock className="w-3 h-3 mx-auto mb-1 text-emerald-400" />
            <span className="block font-bold">AES-256</span>
            <span className="text-[8px] text-emerald-300/70">Cipher</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-900/20 border border-emerald-500/25 text-emerald-200 shadow-xs hover:border-emerald-400/60 backdrop-blur-md transition-all">
            <ShieldCheck className="w-3 h-3 mx-auto mb-1 text-emerald-400" />
            <span className="block font-bold">HMAC</span>
            <span className="text-[8px] text-emerald-300/70">Digest</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-900/20 border border-emerald-500/25 text-emerald-200 shadow-xs hover:border-emerald-400/60 backdrop-blur-md transition-all">
            <Zap className="w-3 h-3 mx-auto mb-1 text-emerald-400" />
            <span className="block font-bold">Relayer</span>
            <span className="text-[8px] text-emerald-300/70">Gasless</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-900/20 border border-emerald-500/25 text-emerald-200 shadow-xs hover:border-emerald-400/60 backdrop-blur-md transition-all">
            <Database className="w-3 h-3 mx-auto mb-1 text-emerald-400" />
            <span className="block font-bold">EVM Log</span>
            <span className="text-[8px] text-emerald-300/70">Polygon</span>
          </div>
        </div>
      </div>

      {/* 3. SYSTEM LOGS TERMINAL FEED (HIGHLY TRANSLUCENT STREAM) */}
      <div className="bg-emerald-950/20 backdrop-blur-xl rounded-2xl border border-emerald-500/20 shadow-md overflow-hidden flex flex-col relative z-10">
        <div className="px-3 py-2 bg-emerald-900/30 border-b border-emerald-500/20 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-emerald-200 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Live Event Stream
          </span>
          <span className="text-[9px] font-mono text-emerald-200 bg-emerald-900/60 border border-emerald-400/40 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            {logs.length} Packets Logged
          </span>
        </div>

        <div className="p-2 space-y-1.5 max-h-56 overflow-y-auto font-mono text-[10px] custom-scrollbar">
          {logs.map((log) => {
            const isSelected = log.id === selectedLog;
            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log.id)}
                className={`p-2.5 rounded-xl transition-all cursor-pointer border backdrop-blur-md ${
                  isSelected
                    ? 'bg-emerald-900/50 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-emerald-950/30 hover:bg-emerald-900/30 border-emerald-500/15 text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-emerald-300/70">{log.time}</span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-900/60 text-emerald-200 border border-emerald-500/30">
                      {log.stage}
                    </span>
                  </div>
                  <span className="text-[8.5px] text-emerald-400 font-bold tracking-wide">{log.status}</span>
                </div>
                <p className="text-[10px] font-semibold text-emerald-100 truncate">{log.summary}</p>
                <p className="text-[8.5px] text-emerald-300/70 truncate mt-0.5 font-mono">
                  {log.hash}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SELECTED PACKET INSPECTOR TARGET (TRANSLUCENT GLASS CARD) */}
      {activeEntry && (
        <div className="p-3 bg-emerald-950/20 backdrop-blur-xl rounded-2xl border border-emerald-500/20 shadow-md space-y-2 relative z-10">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Packet Inspection Target
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-200 bg-emerald-900/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              {activeEntry.stage}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex items-center justify-between text-emerald-300/80">
              <span>Timestamp:</span>
              <span className="text-emerald-100 font-semibold">{activeEntry.time}</span>
            </div>
            {activeEntry.block && (
              <div className="flex items-center justify-between text-emerald-300/80">
                <span>Block Number:</span>
                <span className="text-emerald-400 font-bold">#{activeEntry.block}</span>
              </div>
            )}
            <div className="text-emerald-300/80">
              <span className="block mb-1">Payload Cryptographic Hash:</span>
              <span className="block p-2 rounded-xl bg-emerald-950/40 text-emerald-200 text-[9.5px] break-all border border-emerald-500/25 shadow-inner backdrop-blur-md">
                {activeEntry.hash}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. LAUNCH FULL BACKEND VISUALIZER BUTTON (EMERALD GLASS BUTTON) */}
      {onOpenBackendVisualizer && (
        <button
          onClick={onOpenBackendVisualizer}
          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-700/90 to-teal-600/90 hover:from-emerald-600 hover:to-teal-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] border border-emerald-400/40 backdrop-blur-lg transition-all cursor-pointer group relative z-10"
        >
          <Server className="w-4 h-4 text-emerald-200" />
          <span>Launch Full Backend Visualizer</span>
          <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </aside>
  );
};
