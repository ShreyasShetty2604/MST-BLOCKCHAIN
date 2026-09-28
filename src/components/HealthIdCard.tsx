import React, { useState } from 'react';
import { Copy, Check, QrCode, ShieldAlert, RotateCw, HeartPulse, Shield, Sparkles, ExternalLink, Lock, Camera, Download } from 'lucide-react';
import { PatientPersona } from '../mock/types';
import { formatMediId } from '../lib/formatters';
import { DynamicQrCode } from './DynamicQrCode';

interface HealthIdCardProps {
  persona: PatientPersona;
  onOpenEmergency?: () => void;
  onOpenScanner?: () => void;
}

export const HealthIdCard: React.FC<HealthIdCardProps> = ({ persona, onOpenEmergency, onOpenScanner }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrMode, setQrMode] = useState<'url' | 'json'>('url');

  const formattedMediId = formatMediId(persona.mediId);
  const vaultId = persona.vaultId || 'VLT-8F29A31B72C1';
  const qrOpaqueUrl = `https://medivault.id/vault/${vaultId}?mediId=${encodeURIComponent(persona.mediId)}`;
  const qrJsonPayload = JSON.stringify({
    protocol: 'medivault-v1',
    vaultId,
    mediId: persona.mediId,
    name: persona.name,
    blood: persona.emergencyInfo.bloodGroup,
    emergencyPhone: persona.emergencyInfo.emergencyContact.phone
  });

  const activeQrPayload = qrMode === 'url' ? qrOpaqueUrl : qrJsonPayload;

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
        <div
          className={`absolute inset-0 w-full h-full rounded-3xl bg-hologram text-white border border-white/20 backface-hidden shadow-glow-teal group-hover:shadow-2xl transition-[opacity,visibility] duration-200 ${
            isFlipped
              ? 'opacity-0 invisible pointer-events-none delay-200'
              : 'opacity-100 visible z-10 delay-100'
          }`}
          style={{
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg) translateZ(1px)',
            WebkitTransform: 'rotateY(0deg) translateZ(1px)',
          }}
        >
          <div className="relative w-full h-full p-6 flex flex-col justify-between overflow-hidden rounded-3xl">
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
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-teal-200/80 block font-semibold">
                  Cardholder Name
                </span>
                <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
                  {persona.name}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-teal-200/80 block font-semibold">
                  Internal Vault ID
                </span>
                <span className="font-mono text-xs font-semibold text-teal-100 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                  {vaultId}
                </span>
              </div>
            </div>

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
      </div>

      {/* BACK OF CARD (SECURE QR CODE) */}
      <div
        className={`absolute inset-0 w-full h-full rounded-3xl bg-slate-950 text-white border border-slate-800 rotate-y-180 backface-hidden shadow-2xl transition-[opacity,visibility] duration-200 ${
          isFlipped
            ? 'opacity-100 visible z-10 delay-100'
            : 'opacity-0 invisible pointer-events-none delay-200'
        }`}
        style={{
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg) translateZ(1px)',
          WebkitTransform: 'rotateY(180deg) translateZ(1px)',
        }}
      >
        <div className="relative w-full h-full p-6 flex flex-col justify-between overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold text-slate-200">Dynamic Sovereign QR</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-teal-900/80 text-teal-300 border border-teal-700/60">
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onOpenScanner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenScanner();
                  }}
                  className="px-2 py-0.5 rounded-lg bg-teal-600/80 hover:bg-teal-500 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                  title="Open Camera Scanner"
                >
                  <Camera className="w-3 h-3" />
                  <span>Scan QR</span>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                className="text-xs text-teal-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <RotateCw className="w-3 h-3" /> Flip back
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3.5 my-auto">
            {/* REAL DYNAMIC SCANNABLE QR CODE */}
            <div className="relative shrink-0 group/qr" title="Scan with camera or smartphone">
              <DynamicQrCode
                value={activeQrPayload}
                size={92}
                darkColor="#042f2e"
                lightColor="#FFFFFF"
                className="ring-2 ring-teal-500/40"
              />
              <span className="absolute -bottom-1 inset-x-0 mx-auto text-center text-[8px] font-mono font-bold bg-slate-900/90 text-teal-300 rounded px-1 border border-slate-800">
                {qrMode === 'url' ? 'URL MODE' : 'JSON PASSPORT'}
              </span>
            </div>

            <div className="text-left space-y-1.5 text-xs min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-teal-300 font-mono">
                  <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Vault: {vaultId}</span>
                </div>

                {/* QR Payload Format Toggle */}
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-800">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQrMode('url');
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                      qrMode === 'url'
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQrMode('json');
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                      qrMode === 'json'
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    JSON
                  </button>
                </div>
              </div>

              <p className="font-mono text-[10px] text-slate-300 truncate bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                {activeQrPayload}
              </p>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded bg-teal-900/60 hover:bg-teal-800 text-teal-200 border border-teal-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl ? 'Copied' : (qrMode === 'url' ? 'Copy URL' : 'Copy JSON')}</span>
                </button>

                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] bg-slate-900 text-slate-300 font-mono border border-slate-800">
                  Polygon Amoy
                </span>
              </div>

              <p className="text-[9px] text-slate-400 leading-tight pt-0.5">
                Scannable by any camera or emergency triage scanner. Initiates cryptographic identity verification.
              </p>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-center border-t border-slate-800/80 pt-2 font-mono flex items-center justify-between">
            <span>Tap card to flip back</span>
            <span className="text-teal-400 font-sans text-[9px]">Camera & Barcode Compatible</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
