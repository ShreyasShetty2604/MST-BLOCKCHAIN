import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2 } from 'lucide-react';

interface DynamicQrCodeProps {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
  onError?: (err: Error) => void;
}

export const DynamicQrCode: React.FC<DynamicQrCodeProps> = ({
  value,
  size = 112,
  className = '',
  darkColor = '#0F172A',
  lightColor = '#FFFFFF',
  onError
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    QRCode.toDataURL(value, {
      width: size * 2, // 2x density for crisp retina display and instant camera focus
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: darkColor,
        light: lightColor
      }
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoading(false);
          onError?.(err);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, darkColor, lightColor, onError]);

  if (loading) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-white/90 rounded-2xl shadow-sm border border-slate-200 ${className}`}
      >
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!dataUrl) {
    return null;
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-white flex items-center justify-center p-1 ${className}`}
    >
      <img
        src={dataUrl}
        alt={`MediVault QR Code for ${value}`}
        className="w-full h-full object-contain"
        loading="eager"
      />
    </div>
  );
};
