'use client';

import { Package, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: 'blue' | 'amber' | 'emerald' | 'purple';
}

const colorMap = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: 'text-blue-400',
    value: 'text-blue-300',
    glow: 'shadow-blue-500/10',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'text-amber-400',
    value: 'text-amber-300',
    glow: 'shadow-amber-500/10',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-400',
    value: 'text-emerald-300',
    glow: 'shadow-emerald-500/10',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: 'text-purple-400',
    value: 'text-purple-300',
    glow: 'shadow-purple-500/10',
  },
};

export default function StatsCard({ label, value, icon: Icon, color }: StatsCardProps) {
  const c = colorMap[color];
  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl p-4 backdrop-blur-sm shadow-lg ${c.glow}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-5 h-5 ${c.icon}`} />
        <span className={`text-xs font-medium ${c.icon} opacity-60`}>Total</span>
      </div>
      <p className={`text-3xl font-black ${c.value} mb-1`}>{value}</p>
      <p className="text-white/50 text-xs font-medium">{label}</p>
    </div>
  );
}
