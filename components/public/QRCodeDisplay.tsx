'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export default function QRCodeDisplay({ value, size = 200 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark: '#1e3a8a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });
  }, [value, size]);

  return (
    <div className="bg-white p-3 rounded-xl inline-block shadow-lg">
      <canvas ref={canvasRef} />
    </div>
  );
}
