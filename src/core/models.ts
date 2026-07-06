export interface ModelInfo { id: string; tier: number; label: string; goodFor: string }

export const LADDER: ModelInfo[] = [
  { id: "plugsky-micro",    tier: 1, label: "Micro",    goodFor: "quick edits, simple Q&A, cheap" },
  { id: "plugsky-minimax",  tier: 2, label: "MiniMax",  goodFor: "everyday coding, balanced" },
  { id: "plugsky-pro",      tier: 3, label: "Pro",      goodFor: "complex refactors, reasoning" },
  { id: "plugsky-frontier", tier: 4, label: "Frontier", goodFor: "hardest tasks, deep reasoning" },
]
