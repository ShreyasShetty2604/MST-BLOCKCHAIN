import React, { useState } from 'react';
import { Copy, Check, QrCode, ShieldAlert, RotateCw, HeartPulse, Shield, ExternalLink, Lock } from 'lucide-react';
import { PatientPersona } from '../mock/types';
import { formatMediId } from '../lib/formatters';

interface HealthIdCardProps {
  persona: PatientPersona;
  onOpenEmergency?: () => void;
}

export const HealthIdCard: React.FC<HealthIdCardProps> = ({ persona, onOpenEmergency }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const formattedMediId = formatMediId(persona.mediId);
  const vaultId = persona.vaultId || 'VLT-8F29A31B72C1';
  const qrOpaqueUrl = `https://medivault.id/vault/${vaultId}`;

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formattedMediId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(qrOpaqueUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto perspective-1000 my-2">
      <div
        className={`relative w-full h-[240px] rounded-2xl shadow-xl transition-transform duration-700 transform-style-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* FRONT OF CARD */}
        <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-hologram text-white flex flex-col justify-between overflow-hidden border border-white/20 backface-hidden shadow-glow-teal">
          {/* Holographic Shim Overlay */}
          <div className="absolute inset-0 hologram-overlay pointer-events-none opacity-40 animate-hologram-shim" />
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/15 backdrop-blur-md rounded-xl border border-white/25">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-teal-100/90 font-semibold block">
                  MediVault ID
                </span>
                <span className="text-[10px] text-teal-200/80 font-mono">Provably Verified</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/90 text-white backdrop-blur-md border border-rose-300/30 flex items-center gap-1 shadow-sm">
                <HeartPulse className="w-3.5 h-3.5" />
                {persona.emergencyInfo.bloodGroup}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-md text-white/90 transition-colors"
                title="Flip to show QR Code"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Middle Details */}
          <div className="relative z-10 my-auto pt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-teal-200/80 block font-medium">
                  Cardholder Name
                </span>
                <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
                  {persona.name}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-teal-200/80 block font-medium">
                  Internal Vault ID
                </span>
                <span className="font-mono text-xs font-semibold text-teal-100 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                  {vaultId}
                </span>
              </div>
            </div>

            <div className="mt-2.5">
              <span className="text-[10px] uppercase tracking-wider text-teal-200/80 block font-medium">
                14-Digit Sovereign MediID
              </span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="font-mono text-lg font-bold tracking-wider text-white select-all">
                  {formattedMediId}
                </span>
                <button
                  onClick={handleCopyId}
                  className="p-1 rounded bg-white/15 hover:bg-white/30 backdrop-blur-md text-white transition-colors"
                  title="Copy MediID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/15">
            <div className="text-[11px] text-teal-100/90 flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              DOB: {persona.dob}
            </div>

            {onOpenEmergency && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEmergency();
                }}
                className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Emergency Info</span>
              </button>
            )}
          </div>
        </div>

        {/* BACK OF CARD (SECURE QR CODE) */}
        <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900 text-white flex flex-col justify-between overflow-hidden border border-slate-700 rotate-y-180 backface-hidden shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-semibold text-slate-200">Secure Opaque Vault QR</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(false);
              }}
              className="text-xs text-teal-400 hover:underline flex items-center gap-1 font-medium"
            >
              <RotateCw className="w-3 h-3" /> Flip back
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 my-auto">
            {/* SVG QR CODE */}
            <div className="p-2.5 bg-white rounded-xl shadow-lg border border-slate-200 shrink-0">
              <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Standard QR Framing Markers */}
                <path d="M0 0h32v32H0zM4 4v24h24V4zM8 8h16v16H8zM68 0h32v32H68zM72 4v24h24V4zM76 8h16v16H76zM0 68h32v32H0zM4 72v24h24V72zM8 76h16v16H8z" fill="#0F766E"/>
                {/* Data pattern */}
                <path d="M38 4h8v8H38zM52 4h6v6h-6zM44 18h14v6H44zM34 28h8v8H34zM48 28h14v6H48zM68 38h8v8H68zM82 42h8v8H82zM38 48h14v14H38zM58 52h14v6H58zM38 68h8v24H38zM52 68h8v8H52zM68 68h24v8H68zM68 82h8v14H68zM82 88h14v8H82z" fill="#1e293b"/>
                <circle cx="50" cy="50" r="6" fill="#0D9488" />
              </svg>
            </div>

            <div className="text-left space-y-1.5 text-xs min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-teal-300 font-mono">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Opaque Vault URL</span>
              </div>
              <p className="font-mono text-[11px] text-slate-300 truncate bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                {qrOpaqueUrl}
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={handleCopyUrl}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded bg-teal-900/60 hover:bg-teal-800 text-teal-200 border border-teal-700/60 flex items-center gap-1 transition-colors"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono">Polygon Amoy</span>
              </div>
              <p className="text-[9px] text-slate-400 leading-tight pt-1">
                Zero biometrics, DNA, or medical history is embedded in this QR. Scanning initiates authenticated consent verification.
              </p>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-center border-t border-slate-800 pt-1.5 font-mono">
            Tap anywhere to flip card back
          </div>
        </div>
      </div>
    </div>
  );
};
