/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Share2, 
  Download, 
  Network, 
  FileSpreadsheet, 
  FileText, 
  Check, 
  RotateCcw, 
  Info, 
  Sliders, 
  HelpCircle,
  Database,
  ArrowRight
} from 'lucide-react';
import { calculateFLSM, calculateVLSM, isValidIp, getNetworkAddress, cidrToMaskStr, ipToNum, FreeBlock } from './utils/subnet';
import { FLSMConfig, VLSMConfig, VLSMSubnetRequest, SubnetResult } from './types';
import { exportToCSV, exportToPDF } from './utils/export';

import SubnetMap from './components/SubnetMap';
import VLSMSubnetList from './components/VLSMSubnetList';
import NetworkOverview from './components/NetworkOverview';
import SubnetsTable from './components/SubnetsTable';

const DEFAULT_VLSM_SUBNETS: VLSMSubnetRequest[] = [
  { id: '1', name: 'Engineering LAN', requestedHosts: 120 },
  { id: '2', name: 'Sales & Marketing', requestedHosts: 50 },
  { id: '3', name: 'Guest Wi-Fi', requestedHosts: 22 },
  { id: '4', name: 'VoIP Server Room', requestedHosts: 14 },
  { id: '5', name: 'Router WAN Link', requestedHosts: 2 }
];

// Helper to encode calculator state to URL base64
function encodeState(state: any): string {
  try {
    const jsonStr = JSON.stringify(state);
    return btoa(encodeURIComponent(jsonStr));
  } catch (e) {
    console.error('Failed to encode sharing state', e);
    return '';
  }
}

// Helper to decode calculator state from URL
function decodeState(hash: string): any {
  if (!hash) return null;
  try {
    const cleaned = hash.startsWith('#') ? hash.slice(1) : hash;
    const jsonStr = decodeURIComponent(atob(cleaned));
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to decode sharing state', e);
    return null;
  }
}

export default function App() {
  // Calculator mode selection
  const [mode, setMode] = useState<'flsm' | 'vlsm'>('flsm');
  
  // Base configuration
  const [baseIp, setBaseIp] = useState('192.168.1.0');
  const [baseCidr, setBaseCidr] = useState(24);

  // FLSM specific state
  const [flsmDivideBy, setFlsmDivideBy] = useState<'subnets' | 'hosts'>('subnets');
  const [flsmValue, setFlsmValue] = useState(4); // divide by 4 subnets default

  // VLSM specific state
  const [vlsmSubnets, setVlsmSubnets] = useState<VLSMSubnetRequest[]>(DEFAULT_VLSM_SUBNETS);

  // Sharing states
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState(false);

  // Load state from URL hash on mount
  useEffect(() => {
    if (window.location.hash) {
      const decoded = decodeState(window.location.hash);
      if (decoded) {
        try {
          if (decoded.mode) setMode(decoded.mode);
          if (decoded.baseIp) setBaseIp(decoded.baseIp);
          if (decoded.baseCidr) setBaseCidr(decoded.baseCidr);
          
          if (decoded.flsmConfig) {
            if (decoded.flsmConfig.divideBy) setFlsmDivideBy(decoded.flsmConfig.divideBy);
            if (decoded.flsmConfig.value) setFlsmValue(decoded.flsmConfig.value);
          }
          
          if (decoded.vlsmSubnets) {
            // Re-assign dynamic IDs to prevent any duplicate keys
            const sanitizedSubnets = decoded.vlsmSubnets.map((sub: any, index: number) => ({
              id: sub.id || `vlsm-restored-${index}-${Date.now()}`,
              name: sub.name || `Subnet ${index + 1}`,
              requestedHosts: Number(sub.requestedHosts) || 0
            }));
            setVlsmSubnets(sanitizedSubnets);
          }
        } catch (e) {
          console.error('Failed to restore shared configuration', e);
        }
      }
    }
  }, []);

  // Compute calculated subnets reactively
  const calculationResults = useMemo(() => {
    if (!isValidIp(baseIp)) {
      return {
        results: [],
        unallocated: [],
        freeBlocks: [],
        totalIps: 0,
        allocatedIps: 0,
        error: 'Please enter a valid IP address (e.g., 192.168.1.0).'
      };
    }

    const alignedIp = getNetworkAddress(baseIp, baseCidr);

    if (mode === 'flsm') {
      const config: FLSMConfig = {
        baseIp: alignedIp,
        baseCidr,
        divideBy: flsmDivideBy,
        value: flsmValue
      };

      const flsm = calculateFLSM(config);
      const totalIps = Math.pow(2, 32 - baseCidr);
      
      // Calculate total allocated IPs in FLSM results
      const allocatedIps = flsm.results.reduce((sum, res) => sum + res.totalHosts, 0);

      // Remaining space in FLSM is represented as unused addresses beyond what's generated
      const totalGenBlocks = flsm.results.length;
      const genIps = totalGenBlocks * Math.pow(2, 32 - (flsm.results[0]?.cidr || baseCidr));
      let freeBlocks: FreeBlock[] = [];
      if (genIps < totalIps) {
        const startFreeNum = ipToNum(alignedIp) + genIps;
        const endFreeNum = ipToNum(alignedIp) + totalIps - 1;
        freeBlocks = [{
          startIp: alignedIp, // placeholder
          cidr: baseCidr,     // placeholder
          size: totalIps - genIps,
          endIp: ''
        }];
      }

      return {
        results: flsm.results,
        unallocated: [],
        freeBlocks,
        totalIps,
        allocatedIps: Math.min(allocatedIps, totalIps),
        totalCount: flsm.totalSubnets,
        error: flsm.error
      };
    } else {
      // VLSM mode
      const config: VLSMConfig = {
        baseIp: alignedIp,
        baseCidr,
        subnets: vlsmSubnets
      };

      const vlsm = calculateVLSM(config);

      return {
        results: vlsm.results,
        unallocated: vlsm.unallocated,
        freeBlocks: vlsm.freeBlocks,
        totalIps: vlsm.totalAvailableIps,
        allocatedIps: vlsm.totalAllocatedIps,
        totalCount: vlsm.results.length,
        error: vlsm.error
      };
    }
  }, [mode, baseIp, baseCidr, flsmDivideBy, flsmValue, vlsmSubnets]);

  // Copy shareable configuration URL to clipboard
  const handleShare = () => {
    try {
      const stateObj = {
        mode,
        baseIp,
        baseCidr,
        flsmConfig: { divideBy: flsmDivideBy, value: flsmValue },
        vlsmSubnets: vlsmSubnets.map(s => ({ name: s.name, requestedHosts: s.requestedHosts }))
      };
      
      const hash = encodeState(stateObj);
      window.location.hash = hash;
      
      const shareUrl = `${window.location.origin}${window.location.pathname}#${hash}`;
      navigator.clipboard.writeText(shareUrl);
      
      setShared(true);
      setShareError(false);
      setTimeout(() => setShared(false), 2000);
    } catch (e) {
      setShareError(true);
      setTimeout(() => setShareError(false), 2000);
    }
  };

  // Trigger CSV export
  const handleExportCSV = () => {
    const reportTitle = `${mode === 'flsm' ? 'FLSM' : 'VLSM'}_${baseIp}_${baseCidr}`;
    exportToCSV(calculationResults.results, reportTitle);
  };

  // Trigger PDF export
  const handleExportPDF = () => {
    const reportTitle = `${mode === 'flsm' ? 'FLSM' : 'VLSM'}_Allocation_Plan`;
    const fullBaseNetwork = `${getNetworkAddress(baseIp, baseCidr)}/${baseCidr}`;
    exportToPDF(calculationResults.results, reportTitle, fullBaseNetwork, mode);
  };

  // Reset current calculator mode to defaults
  const handleResetConfig = () => {
    if (mode === 'flsm') {
      setBaseIp('192.168.1.0');
      setBaseCidr(24);
      setFlsmDivideBy('subnets');
      setFlsmValue(4);
    } else {
      setBaseIp('192.168.1.0');
      setBaseCidr(24);
      setVlsmSubnets(DEFAULT_VLSM_SUBNETS);
    }
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-300 font-sans flex flex-col" id="app-wrapper">
      {/* Top Banner Navigation */}
      <header className="bg-[#0b0f1a] border-b border-slate-800/80 sticky top-0 z-40 shadow-sm" id="main-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 leading-tight">
                Subnetting Calculator
              </h1>
              <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase block">
                FLSM & VLSM IP Address Architect
              </span>
            </div>
          </div>

          {/* Action Hub */}
          <div className="flex items-center gap-2">
            {/* Share Configuration */}
            <button
              onClick={handleShare}
              className={`text-xs px-3.5 py-2 rounded-lg font-semibold transition-all border shadow-sm flex items-center gap-1.5 ${
                shared 
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
              title="Copy shareable link encoding this layout"
              id="share-layout-btn"
            >
              {shared ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Link!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Share Plan</span>
                </>
              )}
            </button>

            {/* Reset Defaults */}
            <button
              onClick={handleResetConfig}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 transition-all shadow-sm"
              title="Reset configuration to defaults"
              id="reset-layout-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Interactive Interface Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6" id="calculator-body">
        
        {/* Step 1: Base Network Configuration Controls */}
        <section className="bg-[#0b0f1a] rounded-xl border border-slate-800/80 p-6 shadow-sm" id="parent-config-panel">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Input fields */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Base IP input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Parent IP Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={baseIp}
                    onChange={(e) => setBaseIp(e.target.value)}
                    placeholder="e.g. 192.168.1.0"
                    className={`w-full text-sm font-semibold text-slate-200 bg-slate-900 border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:bg-slate-950 font-mono ${
                      isValidIp(baseIp)
                        ? 'border-slate-800 focus:ring-indigo-500 focus:border-indigo-500'
                        : 'border-rose-800 focus:ring-rose-500 focus:border-rose-500'
                    }`}
                    id="base-ip-address-input"
                  />
                  {!isValidIp(baseIp) && (
                    <span className="text-[10px] text-rose-400 mt-1 block">
                      Invalid IP address structure
                    </span>
                  )}
                </div>
              </div>

              {/* Base CIDR mask dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Subnet Mask Prefix
                </label>
                <select
                  value={baseCidr}
                  onChange={(e) => setBaseCidr(Number(e.target.value))}
                  className="w-full text-sm font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-slate-950 font-mono"
                  id="base-cidr-prefix-select"
                >
                  {Array.from({ length: 31 }, (_, i) => 32 - i).map((cidr) => {
                    const maskStr = cidrToMaskStr(cidr);
                    const numIps = Math.pow(2, 32 - cidr);
                    let classLabel = 'Classless';
                    if (cidr >= 24) classLabel = 'Class C';
                    else if (cidr >= 16) classLabel = 'Class B';
                    else if (cidr >= 8) classLabel = 'Class A';

                    return (
                      <option key={cidr} value={cidr} className="bg-slate-900 text-slate-200">
                        /{cidr} — {maskStr} ({numIps.toLocaleString()} IPs, {classLabel})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Auto-aligned Network Output Info */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Aligned Network Address
                </label>
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg px-3.5 py-2.5 flex items-center justify-between text-indigo-400 font-mono text-sm font-semibold" id="aligned-ip-box">
                  <span>{isValidIp(baseIp) ? `${getNetworkAddress(baseIp, baseCidr)}/${baseCidr}` : '—'}</span>
                  <span className="text-[10px] font-sans font-bold text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded uppercase tracking-wider">
                    Aligned
                  </span>
                </div>
              </div>

            </div>

            {/* Mode selector switch */}
            <div className="lg:border-l lg:border-slate-800 lg:pl-6 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Subnetting Strategy
              </label>
              <div className="bg-slate-950 p-1 rounded-xl border border-slate-800/80 flex items-center gap-1">
                <button
                  onClick={() => setMode('flsm')}
                  className={`text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                    mode === 'flsm'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  id="toggle-mode-flsm"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Fixed Size (FLSM)
                </button>
                <button
                  onClick={() => setMode('vlsm')}
                  className={`text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                    mode === 'vlsm'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  id="toggle-mode-vlsm"
                >
                  <Database className="w-3.5 h-3.5" />
                  Variable Size (VLSM)
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* Dynamic calculation workspace container */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="subnet-workspace-columns">
          
          {/* LEFT: Configuration Input Panel */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {mode === 'flsm' ? (
              <div className="bg-[#0b0f1a] rounded-xl border border-slate-800/80 p-6 shadow-sm flex flex-col gap-4" id="flsm-config-panel">
                <div className="border-b border-slate-800/60 pb-3">
                  <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-400" />
                    FLSM Subdivision Rules
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Divide your classless parent network space into equal slices based on a target count or size constraint.
                  </p>
                </div>

                {/* Subnet division style toggle */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Subdivide Parent By
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 select-none">
                      <input
                        type="radio"
                        name="flsm-type"
                        checked={flsmDivideBy === 'subnets'}
                        onChange={() => {
                          setFlsmDivideBy('subnets');
                          setFlsmValue(4);
                        }}
                        className="text-indigo-500 focus:ring-indigo-500"
                        id="flsm-radio-subnets"
                      />
                      Number of Subnets
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 select-none">
                      <input
                        type="radio"
                        name="flsm-type"
                        checked={flsmDivideBy === 'hosts'}
                        onChange={() => {
                          setFlsmDivideBy('hosts');
                          setFlsmValue(30);
                        }}
                        className="text-indigo-500 focus:ring-indigo-500"
                        id="flsm-radio-hosts"
                      />
                      Usable Hosts Per Subnet
                    </label>
                  </div>
                </div>

                {/* Main size numeric value field */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    {flsmDivideBy === 'subnets' ? 'Desired Number of Subnets' : 'Desired Usable Hosts per Subnet'}
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      min="1"
                      max={flsmDivideBy === 'subnets' ? 1048576 : 16777214}
                      value={flsmValue}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setFlsmValue(isNaN(val) || val < 1 ? 1 : val);
                      }}
                      className="w-full text-sm font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-slate-950 font-mono"
                      id="flsm-value-input"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
                      {flsmDivideBy === 'subnets' ? 'subnets' : 'hosts'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {flsmDivideBy === 'subnets' 
                      ? 'The system borrows bits to satisfy at least this count. The actual subnet count will be a power of 2.'
                      : 'The system allocates block sizes satisfying at least this count (incorporating 1 gateway and 1 broadcast IP).'}
                  </p>
                </div>
              </div>
            ) : (
              <VLSMSubnetList
                subnets={vlsmSubnets}
                onChange={setVlsmSubnets}
              />
            )}

          </div>

          {/* RIGHT: Live Stats & Status Panel */}
          <div className="lg:col-span-5">
            <NetworkOverview
              totalIps={calculationResults.totalIps}
              allocatedIps={calculationResults.allocatedIps}
              unallocatedCount={calculationResults.unallocated.length}
              unallocatedList={calculationResults.unallocated}
              isVlsm={mode === 'vlsm'}
            />
          </div>

        </section>

        {/* Central visual zoomable map */}
        <section id="subnetting-map-wrapper">
          <SubnetMap
            results={calculationResults.results}
            freeBlocks={calculationResults.freeBlocks}
            parentIp={isValidIp(baseIp) ? getNetworkAddress(baseIp, baseCidr) : '0.0.0.0'}
            parentCidr={baseCidr}
          />
        </section>

        {/* Step 3: Subnets Results table */}
        <section className="flex flex-col gap-4" id="subnetting-results-section">
          {calculationResults.error ? (
            <div className="bg-rose-950/30 border border-rose-900/50 text-rose-300 rounded-xl p-6 flex gap-3 text-sm items-center" id="generic-calculator-error">
              <Info className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{calculationResults.error}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              
              {/* PDF and CSV export trigger block */}
              <div className="flex items-center justify-end gap-2.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Export Allocation:
                </span>
                
                <button
                  onClick={handleExportCSV}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800/80 text-xs px-3 py-2 rounded-lg font-semibold transition-all shadow-sm flex items-center gap-1.5"
                  title="Download spreadsheet report"
                  id="export-csv-btn"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download CSV</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800/80 text-xs px-3 py-2 rounded-lg font-semibold transition-all shadow-sm flex items-center gap-1.5"
                  title="Download presentation-ready PDF report"
                  id="export-pdf-btn"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span>Download PDF</span>
                </button>
              </div>

              {/* Subnet grid of results */}
              <SubnetsTable
                results={calculationResults.results}
                totalCount={calculationResults.totalCount || 0}
              />

            </div>
          )}
        </section>

        {/* Academic Cheat Sheet Block */}
        <section className="bg-[#0b0f1a] text-slate-300 rounded-xl p-6 border border-slate-800/80 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between" id="educational-cheat-sheet">
          <div className="flex gap-4 items-start">
            <div className="bg-slate-900 text-indigo-400 p-3 rounded-lg flex items-center justify-center border border-slate-800/60">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                VLSM Design Guidelines Check
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Always order requirements from largest to smallest. Subnets must be aligned with boundaries matching their sizes.
                The subnet mask is determined by host bits H where 2^H - 2 is greater than or equal to the required host count.
              </p>
            </div>
          </div>
          <a
            href="https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-800 font-bold px-4 py-2.5 rounded-lg transition-all flex items-center gap-1 self-start sm:self-center"
            id="cidr-learn-more-link"
          >
            Learn CIDR <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </section>

      </main>

      {/* Footer credits and details */}
      <footer className="bg-[#0b0f1a] border-t border-slate-800/80 py-6 mt-12" id="main-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            © {new Date().getFullYear()} Subnetting Calculator. All calculations executed on the client-side. No user data stored.
          </span>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span>RFC 1878 Subnetting</span>
            <span>•</span>
            <span>RFC 3021 /31 Point-to-Point Links</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
