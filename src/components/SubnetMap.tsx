/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, HelpCircle } from 'lucide-react';
import { SubnetResult } from '../types';
import { FreeBlock, ipToNum } from '../utils/subnet';

interface SubnetMapProps {
  results: SubnetResult[];
  freeBlocks: FreeBlock[];
  parentIp: string;
  parentCidr: number;
}

interface MapBlock {
  id: string;
  name: string;
  isFree: boolean;
  startIp: string;
  cidr: number;
  totalHosts: number;
  startOffset: number; // 0 to 1
  widthRatio: number;   // 0 to 1
  ipRange: string;
  allocatedHosts?: number;
}

export default function SubnetMap({ results, freeBlocks, parentIp, parentCidr }: SubnetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Transform states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Tooltip state
  const [hoveredBlock, setHoveredBlock] = useState<MapBlock | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Calculate coordinates and ratios of each block in the parent space
  const mapBlocks = useMemo(() => {
    const parentSize = Math.pow(2, 32 - parentCidr);
    const parentStartNum = ipToNum(parentIp);

    const blocks: MapBlock[] = [];

    // Add allocated subnets
    results.forEach(sub => {
      const subStartNum = ipToNum(sub.networkAddress);
      const startOffset = (subStartNum - parentStartNum) / parentSize;
      const widthRatio = sub.totalHosts / parentSize;

      blocks.push({
        id: sub.id,
        name: sub.name,
        isFree: false,
        startIp: sub.networkAddress,
        cidr: sub.cidr,
        totalHosts: sub.totalHosts,
        allocatedHosts: sub.allocatedHosts,
        startOffset,
        widthRatio,
        ipRange: `${sub.firstUsable} - ${sub.lastUsable}`
      });
    });

    // Add free blocks
    freeBlocks.forEach((free, index) => {
      const freeStartNum = ipToNum(free.startIp);
      const startOffset = (freeStartNum - parentStartNum) / parentSize;
      const widthRatio = free.size / parentSize;

      blocks.push({
        id: `free-${index}`,
        name: `Unallocated Space`,
        isFree: true,
        startIp: free.startIp,
        cidr: free.cidr,
        totalHosts: free.size,
        startOffset,
        widthRatio,
        ipRange: `${free.startIp} - ${free.endIp}`
      });
    });

    // Sort by startOffset to render sequentially left-to-right
    return blocks.sort((a, b) => a.startOffset - b.startOffset);
  }, [results, freeBlocks, parentIp, parentCidr]);

  // Handle zooming using standard wheel scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = 1.1;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    
    // Constraint zoom level between 0.8x and 30x
    const boundedZoom = Math.min(Math.max(nextZoom, 0.8), 30);
    setZoom(boundedZoom);
  };

  // Drag listeners
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.3, 30));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.3, 0.8));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Track hover positioning
  const handleBlockMouseEnter = (e: React.MouseEvent, block: MapBlock) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHoveredBlock(block);
    setTooltipPos({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 70
    });
  };

  const handleBlockMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 70
    });
  };

  const handleBlockMouseLeave = () => {
    setHoveredBlock(null);
  };

  return (
    <div className="bg-[#0b0f1a] rounded-xl border border-slate-800/80 p-6 shadow-sm flex flex-col h-full" id="subnet-map-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            Visual Subnet Allocation Map
            <span className="text-xs font-normal text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-slate-800/60">
              <HelpCircle className="w-3 h-3 text-indigo-400" /> Scroll / Drag to inspect small blocks
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Representation of the contiguous parent network address space ({parentIp}/{parentCidr}).
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg self-start sm:self-center border border-slate-800/80">
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-900 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
            title="Zoom In"
            id="map-zoom-in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-900 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
            title="Zoom Out"
            id="map-zoom-out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-slate-900 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset Pan/Zoom"
            id="map-zoom-reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full h-44 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        id="subnet-map-canvas"
      >
        {/* Transformable SVG */}
        <svg className="w-full h-full">
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Parent Base Box */}
            <rect
              x="20"
              y="30"
              width="1000"
              height="80"
              rx="6"
              fill="#1e293b"
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* Render Sequential Blocks */}
            {mapBlocks.map((block) => {
              const startX = 20 + block.startOffset * 1000;
              const width = Math.max(block.widthRatio * 1000, 2); // Minimum 2px to ensure tiny blocks remain visible

              return (
                <g key={block.id}>
                  <rect
                    x={startX}
                    y="32"
                    width={Math.max(width - 2, 1)} // subtract spacing
                    height="76"
                    rx="4"
                    fill={block.isFree ? 'url(#striped-pattern)' : '#6366f1'}
                    fillOpacity={block.isFree ? 0.3 : 0.85}
                    stroke={block.isFree ? '#475569' : '#4f46e5'}
                    strokeWidth="1.5"
                    className="transition-all hover:fill-opacity-100 hover:stroke-indigo-400 cursor-pointer"
                    onMouseEnter={(e) => handleBlockMouseEnter(e, block)}
                    onMouseMove={handleBlockMouseMove}
                    onMouseLeave={handleBlockMouseLeave}
                  />
                  {/* Label (if block is wide enough to fit text) */}
                  {width > 60 && (
                    <text
                      x={startX + width / 2}
                      y="74"
                      textAnchor="middle"
                      fill={block.isFree ? '#94a3b8' : '#ffffff'}
                      className="font-sans font-medium text-[11px] pointer-events-none select-none"
                    >
                      {block.isFree ? `Free /${block.cidr}` : block.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* SVG Definitions */}
          <defs>
            <pattern id="striped-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M-3,3 l6,-6 M0,10 l10,-10 M7,13 l6,-6" stroke="#334155" strokeWidth="2" />
            </pattern>
          </defs>
        </svg>

        {/* Live Hover Tooltip */}
        {hoveredBlock && (
          <div
            className="absolute z-30 bg-[#020617] text-white rounded-lg p-3 text-xs shadow-xl border border-slate-800 pointer-events-none max-w-sm flex flex-col gap-1.5"
            style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5">
              <span className="font-bold text-indigo-400">{hoveredBlock.name}</span>
              <span className="bg-slate-900 text-[10px] px-1.5 py-0.5 rounded text-slate-300 font-mono border border-slate-800">
                /{hoveredBlock.cidr}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] text-slate-300">
              <div>Network IP:</div>
              <div className="text-white text-right font-medium">{hoveredBlock.startIp}</div>
              <div>Usable Range:</div>
              <div className="text-white text-right font-medium">{hoveredBlock.ipRange}</div>
              <div>Host Capacity:</div>
              <div className="text-white text-right font-medium">
                {hoveredBlock.isFree 
                  ? `${hoveredBlock.totalHosts} IPs` 
                  : `${hoveredBlock.allocatedHosts} usable / ${hoveredBlock.totalHosts} total`}
              </div>
              <div>Network Size:</div>
              <div className="text-white text-right font-medium">
                {((hoveredBlock.widthRatio) * 100).toFixed(2)}% of parent
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Color Legend */}
      <div className="flex items-center gap-6 mt-4 text-xs font-medium text-slate-400 border-t border-slate-800/60 pt-3">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-indigo-600 border border-indigo-700"></span>
          <span>Allocated Subnets</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-700 border-dashed relative overflow-hidden">
            <span className="absolute inset-0 bg-slate-800/20 rotate-45 scale-150"></span>
          </span>
          <span>Unallocated Space (Available blocks)</span>
        </div>
      </div>
    </div>
  );
}
