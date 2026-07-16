/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubnetResult {
  id: string;
  name: string;
  requestedHosts?: number;
  allocatedHosts: number; // (2^H) - 2
  totalHosts: number;     // 2^H (including network and broadcast)
  cidr: number;
  subnetMask: string;
  networkAddress: string;
  firstUsable: string;
  lastUsable: string;
  broadcastAddress: string;
  ipRange: string;
}

export interface FLSMConfig {
  baseIp: string;
  baseCidr: number;
  divideBy: 'subnets' | 'hosts';
  value: number; // Number of subnets OR number of hosts requested
}

export interface VLSMSubnetRequest {
  id: string;
  name: string;
  requestedHosts: number;
}

export interface VLSMConfig {
  baseIp: string;
  baseCidr: number;
  subnets: VLSMSubnetRequest[];
}

export interface SubnetError {
  field?: string;
  message: string;
}
