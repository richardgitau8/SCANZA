// SCANZA AI — Report Type Definitions
// Two separate reports per scan: AI Detection + Plagiarism

export interface AIReport {
  reportId: string;
  score: number; // 0-100, percentage AI-generated
  confidence: 'low' | 'medium' | 'high';
  content: string;
  detectedModels: string[];
  highlightedSegments: { text: string; probability: number }[];
  generatedAt: string;
}

export interface PlagiarismReport {
  reportId: string;
  score: number; // 0-100, similarity index
  matches: { source: string; percentage: number; url?: string }[];
  content: string;
  totalSourcesScanned: number;
  generatedAt: string;
}

export interface ScanResult {
  id: string;
  timestamp: string;
  fileName: string;
  wordCount: number;
  pages: number;
  status: 'Complete' | 'Scanning' | 'Pending' | 'Failed';
  aiReport: AIReport;
  plagiarismReport: PlagiarismReport;
}
