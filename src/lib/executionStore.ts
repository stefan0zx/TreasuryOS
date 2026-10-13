export interface ExecutionItem {
  opportunityId: string;
  label: string;
  symbol: string;
  protocol: string;
  url: string;
  logoUrl?: string;
  percent: number;
  amountSol: number;
  apyAtExecution: number;
}

export interface ExecutionRecord {
  id: string;
  wallet: string;
  createdAt: number;
  mode: 'onchain' | 'simulated';
  status: 'pending' | 'confirmed' | 'failed';
  signatures: string[];
  source?: 'agent' | 'custom' | 'rules' | 'fallback';
  agentProposal?: any;
  proposal: {
    allocations: ExecutionItem[];
    reserveSol: number;
    reservePercent: number;
    blendedApy: number;
    deployedSol: number;
    balanceSolAtExecution: number;
    policyHash: string;
    generatedAt: number;
  };
}

const STORAGE_KEY_PREFIX = "treasuryos_execution_";

export function getExecutionRecord(walletAddress: string | null): ExecutionRecord | null {
  if (!walletAddress) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + walletAddress);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.source) {
      parsed.source = 'agent';
    }
    return parsed;
  } catch (e) {
    console.error("Failed to parse execution record from localStorage", e);
    return null;
  }
}

export function saveExecutionRecord(record: ExecutionRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + record.wallet, JSON.stringify(record));
  } catch (e) {
    console.error("Failed to save execution record to localStorage", e);
  }
}

export function clearExecutionRecord(walletAddress: string | null): void {
  if (!walletAddress) return;
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + walletAddress);
  } catch (e) {
    console.error("Failed to remove execution record from localStorage", e);
  }
}
