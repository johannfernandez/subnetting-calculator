/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Copy, Check, ArrowUpDown, Info, Network, AlertCircle } from 'lucide-react';
import { SubnetResult } from '../types';

interface SubnetsTableProps {
  results: SubnetResult[];
  totalCount: number;
}

type SortField = 'name' | 'networkAddress' | 'cidr' | 'allocatedHosts';
type SortOrder = 'asc' | 'desc';

export default function SubnetsTable({ results, totalCount }: SubnetsTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('networkAddress');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Copied tracking
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick category tabs
  const [activeTab, setActiveTab] = useState<'all' | 'large' | 'small'>('all');

  // Copy to clipboard handler
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Toggle Sorting
  const requestSort = (field: SortField) => {
    let order: SortOrder = 'asc';
    if (sortField === field && sortOrder === 'asc') {
      order = 'desc';
    }
    setSortField(field);
    setSortOrder(order);
  };

  // Process data (filter & sort)
  const processedResults = useMemo(() => {
    let list = [...results];

    // Filter by Tab
    if (activeTab === 'large') {
      list = list.filter(r => r.allocatedHosts >= 30);
    } else if (activeTab === 'small') {
      list = list.filter(r => r.allocatedHosts < 30);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => 
        r.name.toLowerCase().includes(q) ||
        r.networkAddress.includes(q) ||
        r.subnetMask.includes(q) ||
        r.ipRange.includes(q) ||
        r.broadcastAddress.includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // For IP address sorting, let's sort by numeric order rather than lexicographical string order
      if (sortField === 'networkAddress') {
        const parseIp = (ip: string) => ip.split('.').map(Number).reduce((sum, p) => sum * 256 + p, 0);
        valA = parseIp(a.networkAddress);
        valB = parseIp(b.networkAddress);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [results, search, sortField, sortOrder, activeTab]);

  return (
    <div className="bg-[#0b0f1a] rounded-xl border border-slate-800/80 shadow-sm flex flex-col h-full" id="subnet-results-table">
      {/* Table Header Controls */}
      <div className="p-6 border-b border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            Calculated Subnets List
            <span className="text-xs font-normal text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full font-mono border border-slate-800">
              {results.length} calculated {totalCount > results.length && `(of ${totalCount})`}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Search, sort, and copy details of your subnet allocation plan.
          </p>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Quick-filter tabs */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800/80">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              id="tab-all-subnets"
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('large')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'large'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              id="tab-large-subnets"
            >
              LANs (≥30 IPs)
            </button>
            <button
              onClick={() => setActiveTab('small')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'small'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              id="tab-small-subnets"
            >
              WANs (&lt;30 IPs)
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search subnets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-slate-950"
              id="subnet-table-search-input"
            />
          </div>
        </div>
      </div>

      {/* Warning if results are capped */}
      {totalCount > results.length && (
        <div className="bg-amber-950/25 text-amber-300 px-6 py-2.5 border-b border-amber-900/40 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>
            <strong>Performance Warning:</strong> {totalCount.toLocaleString()} subnets are requested, but only the first <strong>{results.length}</strong> are displayed below to maintain browser responsiveness.
          </span>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto flex-1">
        {processedResults.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-sans">
            No matching subnets found. Try a different search query.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/40 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-6 select-none cursor-pointer hover:bg-slate-900/60 transition-colors" onClick={() => requestSort('name')}>
                  <div className="flex items-center gap-1">
                    Subnet Name <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-6 select-none cursor-pointer hover:bg-slate-900/60 transition-colors" onClick={() => requestSort('networkAddress')}>
                  <div className="flex items-center gap-1">
                    Network IP <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-6 select-none cursor-pointer hover:bg-slate-900/60 transition-colors" onClick={() => requestSort('cidr')}>
                  <div className="flex items-center gap-1">
                    Prefix / Mask <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-6 text-slate-400">Usable Host IP Range</th>
                <th className="py-3 px-6 text-slate-400">Broadcast IP</th>
                <th className="py-3 px-6 select-none cursor-pointer hover:bg-slate-900/60 transition-colors" onClick={() => requestSort('allocatedHosts')}>
                  <div className="flex items-center gap-1">
                    Usable Capacity <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-6 text-center text-slate-400 font-sans font-bold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-400 font-mono">
              {processedResults.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/20 transition-colors">
                  <td className="py-3.5 px-6 font-sans font-semibold text-slate-200">{r.name}</td>
                  <td className="py-3.5 px-6 font-bold text-slate-300">{r.networkAddress}</td>
                  <td className="py-3.5 px-6">
                    <span className="font-bold text-slate-200">/{r.cidr}</span>
                    <span className="text-[10px] text-slate-500 block font-normal font-sans mt-0.5">{r.subnetMask}</span>
                  </td>
                  <td className="py-3.5 px-6 font-medium text-slate-300">{r.ipRange}</td>
                  <td className="py-3.5 px-6 text-slate-400">{r.broadcastAddress}</td>
                  <td className="py-3.5 px-6 font-sans">
                    <span className="font-bold text-slate-300 font-mono">{r.allocatedHosts.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 block">
                      {r.requestedHosts !== undefined && `Requested: ${r.requestedHosts}`}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-center font-sans">
                    <button
                      onClick={() => handleCopy(`${r.name}\t${r.networkAddress}/${r.cidr}\t${r.subnetMask}\t${r.ipRange}\t${r.broadcastAddress}\t${r.allocatedHosts}`, r.id)}
                      className="p-1.5 hover:bg-slate-900 rounded text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                      title="Copy Subnet Details to Clipboard"
                    >
                      {copiedId === r.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[9px] text-emerald-400 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-medium text-slate-500">Copy</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
