import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera, X, RefreshCw, Upload, CheckCircle2, AlertTriangle, ShieldCheck,
  HeartPulse, Phone, FileText, ArrowRight, Lock, ExternalLink, Zap
} from 'lucide-react';
import { PatientPersona, MedicalRecord } from '../mock/types';
import { mockApi } from '../mock/api';
import { formatMediId } from '../lib/formatters';

interface CameraQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientLoaded?: (patient: PatientPersona, records: MedicalRecord[]) => void;
  scannerRole?: 'hospital' | 'emergency' | 'patient';
  title?: string;
}

export const CameraQrScannerModal: React.FC<CameraQrScannerModalProps> = ({
  isOpen,
  onClose,
  onPatientLoaded,
  scannerRole = 'hospital',
  title = 'Optical MediID QR Camera Scanner'
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [scannedRaw, setScannedRaw] = useState<string | null>(null);
  const [loadingPatient, setLoadingPatient] = useState<boolean>(false);
  const [loadedPatient, setLoadedPatient] = useState<PatientPersona | null>(null);
  const [loadedRecords, setLoadedRecords] = useState<MedicalRecord[]>([]);
  const [scanSuccessBeep, setScanSuccessBeep] = useState<boolean>(false);

  // Play audio/haptic feedback on detection
  const triggerFeedback = () => {
    setScanSuccessBeep(true);
    setTimeout(() => setScanSuccessBeep(false), 800);
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([80, 40, 80]);
      }
    } catch {
      // ignore
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      let msg = 'Could not access device camera. Please check permissions or upload a QR image.';
      if (err.name === 'NotAllowedError') {
        msg = 'Camera permission was denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No video camera detected on this device.';
      }
      setCameraError(msg);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsScanning(true);
      setScannedRaw(null);
      setLoadedPatient(null);
      setLoadedRecords([]);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // QR Scanning Loop using requestAnimationFrame + jsQR
  useEffect(() => {
    if (!isOpen || !isScanning || loadedPatient) return;

    let animId: number;

    const scanFrame = () => {
      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
        canvasRef.current
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data && code.data.trim()) {
            handleDecodedQr(code.data.trim());
            return; // stop loop
          }
        }
      }

      animId = requestAnimationFrame(scanFrame);
    };

    animId = requestAnimationFrame(scanFrame);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, isScanning, loadedPatient]);

  // Process decoded QR payload and fetch database record
  const handleDecodedQr = async (rawData: string) => {
    setIsScanning(false);
    setScannedRaw(rawData);
    triggerFeedback();
    setLoadingPatient(true);

    try {
      // 1. Try querying backend /api/identity/scan
      let patientData: PatientPersona | null = null;
      let recordsList: MedicalRecord[] = [];

      try {
        const res = await fetch('/api/identity/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qrPayload: rawData,
            scannerRole,
            scannerName: scannerRole === 'hospital' ? 'City General Hospital Scanner' : 'Emergency Triage Paramedic'
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.vault) {
            const v = json.vault;
            patientData = {
              id: `persona-${v.vaultId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-8)}`,
              vaultId: v.vaultId,
              mediId: v.mediId,
              name: v.name,
              dob: v.dob,
              gender: v.gender,
              phone: v.phoneMasked || '+91 98*** **210',
              email: `${v.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
              emergencyInfo: {
                bloodGroup: v.bloodGroup,
                allergies: v.allergies || [],
                conditions: v.conditions || [],
                medications: [],
                emergencyContact: v.emergencyContact || { name: 'Emergency Contact', relation: 'Family', phone: '112' }
              },
              verifiedRecordCount: json.records ? json.records.length : 3,
              activeConsentCount: 1,
              lastAccessTime: 'Just now'
            };
            recordsList = json.records || [];
          }
        }
      } catch (apiErr) {
        console.warn('Backend /api/identity/scan fetch error, using local fallback:', apiErr);
      }

      // 2. Fallback to mockApi if backend not reachable or for seeded personas
      if (!patientData) {
        // Extract key from rawData (URL or JSON or raw string)
        let key = rawData;
        if (key.startsWith('{') && key.endsWith('}')) {
          try {
            const p = JSON.parse(key);
            key = p.vaultId || p.mediId || key;
          } catch {
            // ignore
          }
        }
        const urlMatch = key.match(/vault\/(VLT-[A-F0-9]{12})/i) || key.match(/mediId=([0-9-]+)/i);
        if (urlMatch) {
          key = urlMatch[1];
        }

        const fallbackPatient = await mockApi.getPatientById(key);
        if (fallbackPatient) {
          patientData = fallbackPatient;
          recordsList = await mockApi.getRecords('All', fallbackPatient.id);
        }
      }

      if (patientData) {
        setLoadedPatient(patientData);
        setLoadedRecords(recordsList);
      } else {
        setCameraError(`Decoded QR: "${rawData}", but no matching patient was found in the database.`);
      }
    } catch (err: any) {
      setCameraError(err.message || 'Error querying database for scanned QR');
    } finally {
      setLoadingPatient(false);
    }
  };

  // Image File Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          handleDecodedQr(code.data.trim());
        } else {
          setCameraError('No valid QR code could be detected in the uploaded image.');
        }
      }
    };
    img.src = URL.createObjectURL(file);
  };

  // Switch between front and back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Reset and scan again
  const handleResetScan = () => {
    setLoadedPatient(null);
    setLoadedRecords([]);
    setScannedRaw(null);
    setCameraError(null);
    setIsScanning(true);
    startCamera();
  };

  // Confirm and load patient into parent view
  const handleConfirmPatient = () => {
    if (loadedPatient && onPatientLoaded) {
      onPatientLoaded(loadedPatient, loadedRecords);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500">
                Real-time optical scanner • Instantly queries encrypted user database
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* STATE 1: CAMERA SCANNING VIEW */}
          {!loadedPatient && (
            <div className="space-y-4">
              {/* Viewfinder Container */}
              <div className="relative w-full aspect-video sm:h-72 bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-inner flex items-center justify-center">
                {/* Real Video Element */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                />

                {/* Offscreen Canvas for jsQR image sampling */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning HUD Overlays */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  {/* Target Crosshair Reticle */}
                  <div
                    className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl border-2 transition-all duration-300 ${
                      scanSuccessBeep
                        ? 'border-emerald-400 scale-105 shadow-[0_0_24px_rgba(52,211,153,0.8)]'
                        : 'border-teal-400/80 shadow-[0_0_15px_rgba(20,184,166,0.4)]'
                    }`}
                  >
                    {/* Viewfinder Corner Accents */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />

                    {/* Animated Scanning Laser Line */}
                    {isScanning && !loadingPatient && (
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-400 shadow-glow-teal animate-scan-line" />
                    )}

                    {/* Center Loading Spinner when querying database */}
                    {loadingPatient && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                        <RefreshCw className="w-8 h-8 animate-spin text-teal-400" />
                        <span className="text-xs font-bold font-mono">Querying MediVault DB...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Overlay Badge */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-teal-300 text-[10px] font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                  Camera Live: 30 FPS Optical Sensor
                </div>

                {/* Flip Camera Button */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="absolute bottom-3 right-3 p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Switch Front/Rear Camera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium hidden sm:inline">Flip Camera</span>
                </button>
              </div>

              {/* Instructions & File Upload Alternative */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <p className="text-slate-500 dark:text-slate-400 text-center sm:text-left">
                  Align patient's <strong>MediID QR Code</strong> inside the target box.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload QR Photo</span>
                  </button>
                </div>
              </div>

              {/* Quick Demo Preset Trigger */}
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200/80 dark:border-teal-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-teal-800 dark:text-teal-200 font-medium">
                  <Zap className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Instant Test: Scan demo patient passport</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDecodedQr('https://medivault.id/vault/VLT-8F29A31B72C1')}
                  className="px-3 py-1 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] shadow-sm cursor-pointer"
                >
                  Simulate QR Match
                </button>
              </div>

              {/* Error Box */}
              {cameraError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 rounded-2xl border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Camera / Scan Notice:</span>
                    <span>{cameraError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATE 2: PATIENT PROFILE LOADED VIEW */}
          {loadedPatient && (
            <div className="space-y-4 animate-fade-in">
              {/* Success Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Optical Identity Verified • Vault Record Retrieved</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                  AES-256-GCM
                </span>
              </div>

              {/* Patient Dossier Card */}
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md">
                      {loadedPatient.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white">
                        {loadedPatient.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>DOB: {loadedPatient.dob}</span>
                        <span>•</span>
                        <span>{loadedPatient.gender}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500 text-white flex items-center gap-1 shadow-sm">
                    <HeartPulse className="w-3.5 h-3.5" />
                    {loadedPatient.emergencyInfo.bloodGroup}
                  </span>
                </div>

                {/* Identifiers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">
                      14-Digit MediID
                    </span>
                    <span className="text-teal-700 dark:text-teal-400 font-bold text-sm">
                      {formatMediId(loadedPatient.mediId)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">
                      Encrypted Vault ID
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                      {loadedPatient.vaultId}
                    </span>
                  </div>
                </div>

                {/* Critical Emergency Vitals */}
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/80 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Critical Clinical & Emergency Data</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="font-semibold text-slate-500 dark:text-slate-400 block">Allergies:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {loadedPatient.emergencyInfo.allergies.length > 0
                          ? loadedPatient.emergencyInfo.allergies.join(', ')
                          : 'No known drug allergies'}
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-500 dark:text-slate-400 block">Conditions:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {loadedPatient.emergencyInfo.conditions.length > 0
                          ? loadedPatient.emergencyInfo.conditions.join(', ')
                          : 'None recorded'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-amber-200/60 dark:border-amber-900/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400">
                      Emergency Contact: <strong>{loadedPatient.emergencyInfo.emergencyContact.name} ({loadedPatient.emergencyInfo.emergencyContact.relation})</strong>
                    </span>
                    <a
                      href={`tel:${loadedPatient.emergencyInfo.emergencyContact.phone}`}
                      className="px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{loadedPatient.emergencyInfo.emergencyContact.phone}</span>
                    </a>
                  </div>
                </div>

                {/* Verified Medical Records Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-600" />
                      <span>Decrypted Medical Records ({loadedRecords.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Polygon Blockchain Anchored</span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {loadedRecords.length > 0 ? (
                      loadedRecords.map((r) => (
                        <div
                          key={r.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {r.title}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {r.category} • {r.date} {r.doctor ? `• ${r.doctor}` : ''}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200">
                            {r.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-400 p-2 text-center">
                        No prior records anchored yet for this patient vault.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {loadedPatient ? (
            <>
              <button
                type="button"
                onClick={handleResetScan}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Another QR</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmPatient}
                className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md flex items-center gap-2"
              >
                <span>Access Patient Profile & Records</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <span className="text-[11px] text-slate-400 font-mono">
                AES-256-GCM Encrypted Handshake
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Close Scanner
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
