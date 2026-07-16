/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FLSMConfig, VLSMConfig, SubnetResult, VLSMSubnetRequest } from '../types';

// IP Address Validation
export function isValidIp(ip: string): boolean {
  const regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return regex.test(ip.trim());
}

// Convert IP string to 32-bit unsigned number
export function ipToNum(ip: string): number {
  const parts = ip.trim().split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN) || parts.some(p => p < 0 || p > 255)) {
    return 0;
  }
  return parts[0] * 16777216 + parts[1] * 65536 + parts[2] * 256 + parts[3];
}

// Convert 32-bit unsigned number to IP string
export function numToIp(num: number): string {
  const o1 = Math.floor(num / 16777216) % 256;
  const o2 = Math.floor(num / 65536) % 256;
  const o3 = Math.floor(num / 256) % 256;
  const o4 = Math.floor(num) % 256;
  return `${o1}.${o2}.${o3}.${o4}`;
}

// Convert CIDR prefix to mask number
export function cidrToMaskNum(cidr: number): number {
  if (cidr <= 0) return 0;
  if (cidr >= 32) return 0xffffffff;
  return (0xffffffff << (32 - cidr)) >>> 0;
}

// Convert CIDR prefix to dotted decimal string
export function cidrToMaskStr(cidr: number): string {
  const maskNum = cidrToMaskNum(cidr);
  return numToIp(maskNum);
}

// Get the network address of an IP/CIDR block (aligned)
export function getNetworkAddress(ip: string, cidr: number): string {
  const ipNum = ipToNum(ip);
  const size = Math.pow(2, 32 - cidr);
  const alignedNum = Math.floor(ipNum / size) * size;
  return numToIp(alignedNum);
}

export interface FreeBlock {
  startIp: string;
  cidr: number;
  size: number;
  endIp: string;
}

// Decompose arbitrary free spaces into standard aligned CIDR blocks
export function decomposeFreeSpace(startNum: number, endNum: number): FreeBlock[] {
  const blocks: FreeBlock[] = [];
  let current = startNum;
  const end = endNum;
  
  if (end < current) return [];

  while (current <= end) {
    const remaining = end - current + 1;
    // Find the largest power of 2 size that fits in remaining space
    // and is aligned with the current address
    let power = Math.floor(Math.log2(remaining));
    while (power > 0) {
      const size = Math.pow(2, power);
      if (current % size === 0) {
        break;
      }
      power--;
    }
    const size = Math.pow(2, power);
    blocks.push({
      startIp: numToIp(current),
      cidr: 32 - power,
      size,
      endIp: numToIp(current + size - 1)
    });
    current += size;
  }
  return blocks;
}

// FLSM Calculation
export function calculateFLSM(config: FLSMConfig): { results: SubnetResult[]; totalSubnets: number; error?: string } {
  const { baseIp, baseCidr, divideBy, value } = config;

  if (!isValidIp(baseIp)) {
    return { results: [], totalSubnets: 0, error: 'Invalid base IP address.' };
  }
  if (baseCidr < 1 || baseCidr > 30) {
    return { results: [], totalSubnets: 0, error: 'Base CIDR must be between 1 and 30 for FLSM.' };
  }
  if (value <= 0) {
    return { results: [], totalSubnets: 0, error: 'Value must be greater than 0.' };
  }

  const baseIpNum = ipToNum(getNetworkAddress(baseIp, baseCidr));
  const parentSize = Math.pow(2, 32 - baseCidr);

  let newCidr = baseCidr;
  let subnetsToCreate = 0;

  if (divideBy === 'subnets') {
    const requestedSubnets = value;
    const borrowedBits = Math.ceil(Math.log2(requestedSubnets));
    newCidr = baseCidr + borrowedBits;
    
    if (newCidr > 32) {
      return { 
        results: [], 
        totalSubnets: 0, 
        error: `Cannot divide /${baseCidr} into ${requestedSubnets} subnets (exceeds /32 space).` 
      };
    }
    subnetsToCreate = Math.pow(2, borrowedBits);
  } else {
    // divide by hosts per subnet
    const requestedHosts = value;
    // Standard subnet size requires (requestedHosts + 2) IPs
    const requiredBits = Math.max(2, Math.ceil(Math.log2(requestedHosts + 2)));
    newCidr = 32 - requiredBits;

    if (newCidr < baseCidr) {
      return { 
        results: [], 
        totalSubnets: 0, 
        error: `Parent /${baseCidr} network is too small to support ${requestedHosts} hosts per subnet (requires at least /${newCidr}).` 
      };
    }
    subnetsToCreate = Math.pow(2, newCidr - baseCidr);
  }

  const subnetSize = Math.pow(2, 32 - newCidr);
  const results: SubnetResult[] = [];

  // Cap generation to prevent browser lockup, but report the real total
  const displayLimit = Math.min(subnetsToCreate, 512);

  for (let i = 0; i < displayLimit; i++) {
    const netNum = baseIpNum + i * subnetSize;
    const broadcastNum = netNum + subnetSize - 1;

    let firstUsableNum = netNum + 1;
    let lastUsableNum = broadcastNum - 1;
    let allocatedUsable = subnetSize - 2;

    if (newCidr === 31) {
      firstUsableNum = netNum;
      lastUsableNum = broadcastNum;
      allocatedUsable = 2;
    } else if (newCidr === 32) {
      firstUsableNum = netNum;
      lastUsableNum = netNum;
      allocatedUsable = 1;
    }

    results.push({
      id: `flsm-${i}`,
      name: `Subnet ${i + 1}`,
      allocatedHosts: allocatedUsable,
      totalHosts: subnetSize,
      cidr: newCidr,
      subnetMask: cidrToMaskStr(newCidr),
      networkAddress: numToIp(netNum),
      firstUsable: numToIp(firstUsableNum),
      lastUsable: numToIp(lastUsableNum),
      broadcastAddress: numToIp(broadcastNum),
      ipRange: `${numToIp(firstUsableNum)} - ${numToIp(lastUsableNum)}`
    });
  }

  return { results, totalSubnets: subnetsToCreate };
}

// VLSM Calculation
export interface VLSMResult {
  results: SubnetResult[];
  unallocated: VLSMSubnetRequest[];
  freeBlocks: FreeBlock[];
  totalAvailableIps: number;
  totalAllocatedIps: number;
  error?: string;
}

export function calculateVLSM(config: VLSMConfig): VLSMResult {
  const { baseIp, baseCidr, subnets } = config;

  if (!isValidIp(baseIp)) {
    return { results: [], unallocated: [], freeBlocks: [], totalAvailableIps: 0, totalAllocatedIps: 0, error: 'Invalid base IP address.' };
  }
  if (baseCidr < 1 || baseCidr > 31) {
    return { results: [], unallocated: [], freeBlocks: [], totalAvailableIps: 0, totalAllocatedIps: 0, error: 'Base CIDR must be between 1 and 31 for VLSM.' };
  }

  const baseIpNum = ipToNum(getNetworkAddress(baseIp, baseCidr));
  const parentSize = Math.pow(2, 32 - baseCidr);
  const parentEndNum = baseIpNum + parentSize - 1;

  // Sort subnets in descending order of requested hosts (VLSM best practice)
  const sortedSubnets = [...subnets].sort((a, b) => b.requestedHosts - a.requestedHosts);

  const results: SubnetResult[] = [];
  const unallocated: VLSMSubnetRequest[] = [];
  
  let currentPointer = baseIpNum;
  let totalAllocatedIps = 0;

  for (const sub of sortedSubnets) {
    if (sub.requestedHosts < 0) {
      unallocated.push(sub);
      continue;
    }

    // Determine bits required: minimum 2 host bits (/30) for standard subnets with gateway/broadcast
    // unless they specifically request 1 host (which we can fit in a /30 as well, or /31 point-to-point)
    // We default to standard subnet rules: size = 2^H >= requested + 2
    const requiredBits = Math.max(2, Math.ceil(Math.log2(sub.requestedHosts + 2)));
    const subnetSize = Math.pow(2, requiredBits);
    const cidr = 32 - requiredBits;

    if (currentPointer + subnetSize > parentEndNum + 1) {
      // Address space exhausted for this subnet
      unallocated.push(sub);
    } else {
      const netNum = currentPointer;
      const broadcastNum = netNum + subnetSize - 1;
      const firstUsableNum = netNum + 1;
      const lastUsableNum = broadcastNum - 1;

      results.push({
        id: sub.id,
        name: sub.name,
        requestedHosts: sub.requestedHosts,
        allocatedHosts: subnetSize - 2,
        totalHosts: subnetSize,
        cidr,
        subnetMask: cidrToMaskStr(cidr),
        networkAddress: numToIp(netNum),
        firstUsable: numToIp(firstUsableNum),
        lastUsable: numToIp(lastUsableNum),
        broadcastAddress: numToIp(broadcastNum),
        ipRange: `${numToIp(firstUsableNum)} - ${numToIp(lastUsableNum)}`
      });

      currentPointer += subnetSize;
      totalAllocatedIps += subnetSize;
    }
  }

  // Decompose any leftover address space into standard CIDR blocks
  let freeBlocks: FreeBlock[] = [];
  if (currentPointer <= parentEndNum) {
    freeBlocks = decomposeFreeSpace(currentPointer, parentEndNum);
  }

  return {
    results,
    unallocated,
    freeBlocks,
    totalAvailableIps: parentSize,
    totalAllocatedIps
  };
}
