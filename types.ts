
export interface Milestone {
  id: string;
  index: number;
  description: string;
  amount: number;
  proofHash: string | null;
  approvals: string[];
  isReleased: boolean;
  status: 'pending' | 'submitted' | 'approved' | 'released';
  confidenceScore?: number;
}

export interface Vault {
  id: string;
  name: string;
  description: string;
  authority: string;
  totalAmount: number;
  releasedAmount: number;
  milestones: Milestone[];
  category: 'Education' | 'Healthcare' | 'Agriculture' | 'Infrastructure';
  location: string;
  createdAt: number;
}

export interface VerificationResult {
  isValid: boolean;
  confidenceScore: number;
  hash: string;
  analysis: string;
  metadata: {
    gps?: string;
    timestamp: number;
    // Added forensicFlags to metadata to resolve type error in geminiService.ts
    forensicFlags?: string[];
  };
}

export interface UserWallet {
  publicKey: string | null;
  connected: boolean;
  balance: number;
}