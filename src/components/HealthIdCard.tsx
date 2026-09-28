import React, { useState } from 'react';
import { Copy, Check, QrCode, ShieldAlert, RotateCw, HeartPulse, Shield, Sparkles } from 'lucide-react';
import { PatientPersona } from '../mock/types';
import { formatMediId } from '../lib/formatters';

interface HealthIdCardProps {
  persona: PatientPersona;
  onOpenEmergency?: () => void;
}

export const HealthIdCard: React.FC<HealthIdCardProps> = ({ persona, onOpenEmergency }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedMediId = formatMediId(persona.mediId);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formattedMediId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto perspective-1000 my-4 group">
      <div
        className={`relative w-full h-[240px] rounded-3xl shadow-xl transition-transform duration-700 transform-style-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFlipped(!isFlipped);
          }
        }}
        aria-label="Patient Health ID Card. Press enter or click to flip."
      >
        {/* FRONT OF CARD */}
        <div className="absolute inset-0 w-full h-full rounded-3xl p-6 bg-hologram text-white flex flex-col justify-between overflow-hidden border border-white/20 backface-hidden shadow-glow-teal group-hover:shadow-2xl transition-shadow">
          {/* Holographic Shim Overlay */}
          <div className="absolute inset-0 hologram-overlay pointer-events-none opacity-40 animate-hologram-shim" />
          <div className="absolute -right-12 -bottom-12 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/25 shadow-inner">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-widest text-teal-100/90 font-bold block">
                  MediVault ID
                </span>
                <span className="text-[10px] text-teal-200/80 font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-300" /> Provably Verified
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/90 text-white backdrop-blur-md border border-rose-300/30 flex items-center gap-1.5 shadow-sm">
                <HeartPulse className="w-3.5 h-3.5 animate-pulse" />
                {persona.emergencyInfo.bloodGroup}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white/90 transition-colors focus:ring-2 focus:ring-white"
                title="Flip card to display QR Code"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Middle Details */}
          <div className="relative z-10 my-auto pt-1">
            <span className="text-[10px] uppercase tracking-wider text-teal-200/80 block font-semibold">
              Cardholder Name
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
              {persona.name}
            </h2>

            <div className="mt-2.5">
              <span className="text-[10px] uppercase tracking-wider text-teal-200/80 block font-semibold">
                14-Digit Sovereign MediID
              </span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="font-mono text-xl font-bold tracking-wider text-white select-all">
                  {formattedMediId}
                </span>
                <button
                  onClick={handleCopyId}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 backdrop-blur-md text-white transition-all transform active:scale-95"
                  title="Copy MediID to clipboard"
                >
                  {copied ? (
                    <span className="flex items-center gap-1 text-[11px] font-sans text-emerald-300 font-bold">
                      <Check className="w-3.5 h-3.5" /> Copied!
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/15">
            <div className="text-[11px] text-teal-100/90 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              DOB: {persona.dob}
            </div>

            {onOpenEmergency && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEmergency();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Emergency Card</span>
              </button>
            )}
          </div>
        </div>

        {/* BACK OF CARD (QR CODE) */}
        <div className="absolute inset-0 w-full h-full rounded-3xl p-6 bg-slate-950 text-white flex flex-col justify-between overflow-hidden border border-slate-800 rotate-y-180 backface-hidden shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold text-slate-300">Scan MediID QR</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(false);
              }}
              className="text-xs text-teal-400 hover:underline flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" /> Flip back
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 my-auto">
            {/* SVG QR CODE MOCK */}
            <div className="p-3.5 bg-white rounded-2xl shadow-xl border border-slate-200 shrink-0">
              <svg className="w-28 h-28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0h35v35H0zM5 5v25h25V5zM10 10h15v15H10zM65 0h35v35H65zM70 5v25h25V5zM75 10h15v15H75zM0 65h35v35H0zM5 70v25h25V70zM10 75h15v15H10z" fill="#0F766E"/>
                <path d="M40 5h10v10H40zM55 5h5v5h-5zM45 20h15v5H45zM35 30h10v10H35zM50 30h15v5H50zM70 40h10v10H70zM85 45h10v10H85zM40 50h15v15H40zM60 55h15v5H60zM40 70h10v25H40zM55 70h10v10H55zM70 70h25v10H70zM70 85h10v15H70zM85 90h15v10H85z" fill="#1e293b"/>
                <circle cx="50" cy="50" r="7" fill="#4F46E5" />
              </svg>
            </div>

            <div className="text-left space-y-1.5 text-xs">
              <p className="text-slate-400 text-[11px]">Instant Hospital Triage Scanner</p>
              <p className="font-mono font-bold text-teal-300 text-xs">{formattedMediId}</p>
              <div className="pt-1">
                <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] bg-slate-900 text-slate-300 font-mono border border-slate-800">
                  Polygon Amoy Testnet
                </span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1">
                Zero unencrypted health data readable without biometric key.
              </p>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-center border-t border-slate-800/80 pt-2 font-mono">
            Tap anywhere to flip card back
          </div>
        </div>
      </div>
    </div>
  );
};
