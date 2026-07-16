/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Trash2, Network, HelpCircle } from 'lucide-react';
import { VLSMSubnetRequest } from '../types';

interface VLSMSubnetListProps {
  subnets: VLSMSubnetRequest[];
  onChange: (subnets: VLSMSubnetRequest[]) => void;
}

export default function VLSMSubnetList({ subnets, onChange }: VLSMSubnetListProps) {
  // Add a blank new subnet request
  const handleAddSubnet = () => {
    const nextNum = subnets.length + 1;
    const newSub: VLSMSubnetRequest = {
      id: `vlsm-req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `Subnet ${nextNum}`,
      requestedHosts: 25 // default reasonable size
    };
    onChange([...subnets, newSub]);
  };

  // Add standard preset subnets
  const handleAddPreset = (name: string, hosts: number) => {
    const newSub: VLSMSubnetRequest = {
      id: `vlsm-req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      requestedHosts: hosts
    };
    onChange([...subnets, newSub]);
  };

  // Update specific subnet field
  const handleUpdateSubnet = (id: string, field: keyof VLSMSubnetRequest, value: string | number) => {
    const updated = subnets.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    });
    onChange(updated);
  };

  // Delete specific subnet
  const handleDeleteSubnet = (id: string) => {
    const filtered = subnets.filter(s => s.id !== id);
    onChange(filtered);
  };

  // Clear all subnets
  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="bg-[#0b0f1a] rounded-xl border border-slate-800/80 p-6 shadow-sm flex flex-col h-full" id="vlsm-list-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-400" />
            VLSM Subnets Required
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Specify the name and requested host count for each subnet. VLSM allocates larger requirements first.
          </p>
        </div>
        
        {subnets.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
            id="clear-all-vlsm-subnets"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Preset helpers */}
      <div className="mb-4">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Quick-Add Presets:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleAddPreset('Engineering LAN', 120)}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800/80 transition-colors flex items-center gap-1"
          >
            Large LAN (120 hosts)
          </button>
          <button
            onClick={() => handleAddPreset('Sales LAN', 50)}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800/80 transition-colors flex items-center gap-1"
          >
            Mid LAN (50 hosts)
          </button>
          <button
            onClick={() => handleAddPreset('Support LAN', 25)}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800/80 transition-colors flex items-center gap-1"
          >
            Small LAN (25 hosts)
          </button>
          <button
            onClick={() => handleAddPreset('WAN Link', 2)}
            className="text-xs px-2.5 py-1 rounded-md bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-300 border border-indigo-900/30 transition-colors flex items-center gap-1"
          >
            WAN Link (2 hosts)
          </button>
        </div>
      </div>

      {/* Subnet entries list */}
      <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-3" id="vlsm-entries-scrollable">
        {subnets.length === 0 ? (
          <div className="h-full min-h-[180px] border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-6 bg-slate-900/20">
            <Network className="w-10 h-10 text-slate-700 mb-2" />
            <span className="text-sm font-medium text-slate-400">No subnets requested yet</span>
            <p className="text-xs text-slate-500 max-w-[240px] mt-1">
              Add subnets using preset buttons above or click "Add Subnet" to build your network layout.
            </p>
          </div>
        ) : (
          subnets.map((sub, index) => (
            <div
              key={sub.id}
              className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-800/60 rounded-lg shadow-sm transition-all hover:bg-slate-900/80 group"
              id={`vlsm-row-${index}`}
            >
              <div className="text-xs font-semibold text-slate-500 w-5 text-right font-mono">
                {index + 1}
              </div>
              
              {/* Name field */}
              <div className="flex-1">
                <input
                  type="text"
                  value={sub.name}
                  onChange={(e) => handleUpdateSubnet(sub.id, 'name', e.target.value)}
                  placeholder="Subnet Name"
                  className="w-full text-xs font-semibold text-slate-200 bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  id={`vlsm-input-name-${index}`}
                />
              </div>

              {/* Host count field */}
              <div className="w-32">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="16777214"
                    value={sub.requestedHosts || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleUpdateSubnet(sub.id, 'requestedHosts', isNaN(val) ? 0 : val);
                    }}
                    placeholder="Hosts"
                    className="w-full text-xs text-slate-200 bg-slate-950 border border-slate-850 rounded pl-2.5 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                    id={`vlsm-input-hosts-${index}`}
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 pointer-events-none">
                    hosts
                  </span>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDeleteSubnet(sub.id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all"
                title="Delete Subnet"
                id={`vlsm-delete-btn-${index}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={handleAddSubnet}
        className="mt-4 w-full py-2 border border-dashed border-slate-800 hover:border-indigo-500 hover:text-indigo-400 rounded-lg text-xs font-semibold text-slate-400 transition-all flex items-center justify-center gap-1 bg-slate-950 hover:bg-indigo-950/10 shadow-sm"
        id="add-new-vlsm-subnet-row"
      >
        <Plus className="w-4 h-4" /> Add Subnet Row
      </button>
    </div>
  );
}
