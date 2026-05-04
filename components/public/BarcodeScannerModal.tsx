"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, Loader2, AlertCircle, ScanLine } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerModalProps {
  onResult: (kode: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerModal({
  onResult,
  onClose,
}: BarcodeScannerModalProps) {
  const [status, setStatus] = useState<
    "idle" | "starting" | "scanning" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const isProcessingRef = useRef(false);
  const isInitializingRef = useRef(false);
  const containerId = useRef(
    `qr-reader-${Math.random().toString(36).substr(2, 9)}`,
  ).current;

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    // Prevent multiple initialization attempts
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    try {
      // Stop and cleanup existing scanner first
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (err) {
          console.error("Error cleaning existing scanner:", err);
        }
        scannerRef.current = null;
      }

      if (!isMountedRef.current) {
        isInitializingRef.current = false;
        return;
      }

      if (isMountedRef.current) setStatus("starting");

      const html5Qrcode = new Html5Qrcode(containerId);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 5,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Prevent duplicate processing
          if (isProcessingRef.current) return;
          if (!isMountedRef.current) return;

          isProcessingRef.current = true;

          // Extract UIT code from URL if full URL is scanned
          const uitMatch = decodedText.match(/UIT-\d{4}-\d{4}|LAB-\d{4}-\d{4}/);
          const code = uitMatch ? uitMatch[0] : decodedText;

          // Stop scanner first, then call result
          (async () => {
            if (scannerRef.current) {
              try {
                const state = scannerRef.current.getState();
                if (state === 2) {
                  await scannerRef.current.stop();
                }
                scannerRef.current.clear();
              } catch (err) {
                console.error("Error stopping scanner:", err);
              }
              scannerRef.current = null;
            }
            if (isMountedRef.current) {
              onResult(code);
            }
          })();
        },
        () => {}, // ignore per-frame errors
      );

      if (isMountedRef.current) setStatus("scanning");
    } catch (err: any) {
      console.error("Scanner error:", err);
      if (!isMountedRef.current) {
        isInitializingRef.current = false;
        return;
      }

      if (isMountedRef.current) {
        setStatus("error");
        if (err?.message?.includes("Permission")) {
          setErrorMsg(
            "Akses kamera ditolak. Izinkan akses kamera di browser Anda.",
          );
        } else if (
          err?.message?.includes("NotFound") ||
          err?.message?.includes("Requested device not found")
        ) {
          setErrorMsg("Kamera tidak ditemukan di perangkat ini.");
        } else {
          setErrorMsg("Gagal memulai kamera. Gunakan input manual di bawah.");
        }
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [onResult, containerId]);

  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const code = manualCode.trim().toUpperCase();
      if (code) {
        stopScanner();
        onResult(code);
      }
    },
    [manualCode, stopScanner, onResult],
  );

  const handleClose = useCallback(async () => {
    await stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  useEffect(() => {
    isMountedRef.current = true;
    isInitializingRef.current = false;
    let mounted = true;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(async () => {
      if (mounted) {
        await startScanner();
      }
    }, 100);

    return () => {
      mounted = false;
      isMountedRef.current = false;
      isProcessingRef.current = false;
      clearTimeout(timer);
      // Cleanup scanner on unmount
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2, 8, 23, 0.95)" }}
    >
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <ScanLine className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-sm sm:text-base">
                Scan QR Code
              </h2>
              <p className="text-blue-400/60 text-xs truncate">
                Arahkan kamera ke QR code peminjaman
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scanner area */}
        <div className="p-4 sm:p-5 flex-1 min-h-0 flex flex-col">
          <div
            className="relative rounded-2xl overflow-hidden bg-black flex-1"
            style={{ minHeight: 200 }}
          >
            <div id={containerId} className="w-full h-full" />

            {status === "starting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                <p className="text-blue-400/70 text-sm">Memulai kamera...</p>
              </div>
            )}

            {status === "scanning" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-40 h-40 sm:w-52 sm:h-52">
                  {/* Corner frames */}
                  <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-blue-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-blue-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-blue-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-blue-400 rounded-br-lg" />
                  {/* Scan line */}
                  <div
                    className="absolute inset-x-2 h-0.5 bg-blue-400/70 animate-scan"
                    style={{ top: "50%" }}
                  />
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900 p-4 sm:p-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-500/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-red-400" />
                </div>
                <p className="text-red-400 text-xs sm:text-sm text-center">
                  {errorMsg}
                </p>
                <button
                  onClick={startScanner}
                  className="mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium px-3 py-2 sm:px-4 sm:py-2 rounded-xl transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Coba Lagi
                </button>
              </div>
            )}
          </div>

          {/* Manual input */}
          <div className="mt-3 sm:mt-4">
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-xs font-medium px-2 whitespace-nowrap">
                atau input manual
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Contoh: UIT-2026-0001"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 text-xs sm:text-sm font-mono"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-blue-600 disabled:bg-blue-800 disabled:cursor-not-allowed hover:bg-blue-500 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
              >
                Cari
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
