"use client";

import { Loan, LoanItemWithItem } from "@/lib/loans";
import { formatDistance, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Link from "next/link";
import { Clock, CheckCircle2, Package, ChevronRight, User } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type LoanWithItems = Loan & {
  loan_items?: LoanItemWithItem[];
};

interface LoanCardProps {
  loan: LoanWithItems;
  index: number;
}

export default function LoanCard({ loan, index }: LoanCardProps) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const update = () => {
      const end = loan.tanggal_kembali
        ? new Date(loan.tanggal_kembali)
        : new Date();
      setElapsed(
        formatDistance(new Date(loan.tanggal_pinjam), end, {
          locale: idLocale,
        }),
      );
    };
    update();
    const t = loan.status === "dipinjam" ? setInterval(update, 60000) : null;
    return () => {
      if (t) clearInterval(t);
    };
  }, [loan]);

  const isDipinjam = loan.status === "dipinjam";

  // Get first item from loan_items or fallback to nama_barang
  const firstItem =
    loan.loan_items && loan.loan_items.length > 0 ? loan.loan_items[0] : null;
  const itemCount = loan.loan_items?.length ?? 0;

  return (
    <Link href={`/detail/${loan.kode_unik}`}>
      <div
        className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/40 hover:bg-white/8 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {/* Status indicator bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 ${isDipinjam ? "bg-blue-500" : "bg-emerald-500"}`}
        />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${
                  isDipinjam
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {isDipinjam ? (
                  <>
                    <Clock className="w-3 h-3" /> Dipinjam
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Dikembalikan
                  </>
                )}
              </span>
              <p className="text-blue-300/50 font-mono text-xs">
                {loan.kode_unik}
              </p>
            </div>
            {loan.foto_peminjam_url ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/10 flex-shrink-0 ml-3">
                <Image
                  src={loan.foto_peminjam_url}
                  alt={loan.nama}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-900/40 border-2 border-white/10 flex items-center justify-center flex-shrink-0 ml-3">
                <User className="w-5 h-5 text-blue-400/50" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-2">
            <div>
              <p className="text-white font-semibold text-base truncate">
                {loan.nama}
              </p>
              <p className="text-blue-300/60 text-sm truncate">
                {loan.prodi} • Sem {loan.semester}
              </p>
            </div>

            {/* Items display - show first item + count if multiple */}
            {firstItem ? (
              <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5">
                {firstItem.foto_barang_url ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={firstItem.foto_barang_url}
                      alt={firstItem.items?.nama_barang || "Barang"}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-blue-400/50" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">
                    {firstItem.items?.nama_barang || "Unknown"}
                  </p>
                  <p className="text-blue-400/50 text-xs">
                    {itemCount > 1
                      ? `${itemCount} barang (${firstItem.quantity} + ...)`
                      : `Qty: ${firstItem.quantity}`}
                  </p>
                </div>
              </div>
            ) : loan.nama_barang ? (
              <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5">
                {loan.foto_barang_url ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={loan.foto_barang_url}
                      alt={loan.nama_barang}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-blue-400/50" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {loan.nama_barang}
                  </p>
                  <p className="text-blue-400/50 text-xs">
                    Barang yang dipinjam
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <div>
              <p className="text-blue-400/50 text-xs">
                {format(new Date(loan.tanggal_pinjam), "dd MMM yyyy HH:mm", {
                  locale: idLocale,
                })}
              </p>
              <p className="text-blue-300/70 text-xs font-medium mt-0.5">
                ⏱ {elapsed}
              </p>
            </div>
            <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/40 transition-colors">
              <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
