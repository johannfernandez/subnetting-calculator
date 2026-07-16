/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, Info, Percent, Network, CheckCircle } from 'lucide-react';
import { VLSMSubnetRequest } from '../types';

interface NetworkOverviewProps {
  totalIps: number;
  allocatedIps: number;
  unallocatedCount: number;
  unallocatedList: VLSMSubnetRequest[];
  isVlsm: boolean;
}

export default function NetworkOverview({
  totalIps,
  allocatedIps,
  unallocatedCount,
  unallocatedList,
  isVlsm
}: NetworkOverviewProps) {
  const unusedIps = Math.max(0, totalIps - allocatedIps);
  const utilizationPercent = totalIps > 0 ? (allocatedIps / totalIps) * 100 : 0;
  
  // Custom feedback based on utilization
  const getStatusColor = () => {
    if (utilizationPercent > 100) return 'text-rose-400 bg-rose-950/30 border-rose-900/50';
    if (utilizationPercent > 90) return 'text-amber-400 bg-amber-950/30 border-amber-900/50';
    return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50';
  };

  const getProgressBarColor = () => {
    if (utilizationPercent > 100) return 'bg-rose-500';
    if (utilizationPercent > 90) return 'bg-amber-500';
    return 'bg-indigo-500';
  };

  return (
    <div className="bg-[#0b0f1a] rounded-xl border border-slate-800/80 p-6 shadow-sm flex flex-col gap-5 h-full" id="network-overview-section">
      <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
        <Network className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-slate-200">IP Utilization & Status</h3>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3.5 flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Parent IPs
          </span>
          <span className="text-lg font-bold text-slate-300 mt-1 font-mono">
            {totalIps.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3.5 flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Allocated IPs
          </span>
          <span className="text-lg font-bold text-slate-300 mt-1 font-mono">
            {allocatedIps.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3.5 flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Available Left
          </span>
          <span className="text-lg font-bold text-indigo-400 mt-1 font-mono">
            {unusedIps.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3.5 flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            IP Utilization
          </span>
          <span className="text-lg font-bold text-slate-300 mt-1 flex items-center gap-1 font-mono">
            {utilizationPercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Address Space Used</span>
          <span>{utilizationPercent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-850">
          <div
            className={`h-full transition-all duration-500 ${getProgressBarColor()}`}
            style={{ width: `${Math.min(100, utilizationPercent)}%` }}
          />
        </div>
      </div>

      {/* Warnings & Messages */}
      <div className="flex-1 flex flex-col justify-end">
        {unallocatedList.length > 0 ? (
          <div className="p-3.5 rounded-lg border flex gap-3 text-rose-300 bg-rose-950/20 border-rose-900/40" id="allocation-overflow-warning">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="flex flex-col text-xs gap-1">
              <span className="font-bold text-rose-200">Address Space Exhausted!</span>
              <p className="text-[11px] text-rose-400">
                The parent network cannot support the following required subnets because there is no remaining space:
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {unallocatedList.map((un, index) => (
                  <span
                    key={index}
                    className="bg-rose-900/40 text-rose-300 border border-rose-800/50 font-bold px-2 py-0.5 rounded text-[10px] font-mono"
                  >
                    {un.name} ({un.requestedHosts} hosts)
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : utilizationPercent >= 100 ? (
          <div className="p-3.5 rounded-lg border flex gap-3 text-amber-300 bg-amber-950/20 border-amber-900/40">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
            <div className="flex flex-col text-xs">
              <span className="font-bold text-amber-200">Capacity Reached</span>
              <span className="text-[11px] text-amber-400 mt-0.5">
                The entire parent network has been fully allocated. No additional IPs are available.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-lg border flex gap-3 text-emerald-300 bg-emerald-950/20 border-emerald-900/40">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex flex-col text-xs">
              <span className="font-bold text-emerald-200">Network Fits Perfectly</span>
              <span className="text-[11px] text-emerald-400 mt-0.5">
                All subnets are allocated. {unusedIps.toLocaleString()} IPs are still available for expansion.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
