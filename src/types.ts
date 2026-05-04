export enum LeadStatus {
  NEW = 'new',
  QUALIFIED = 'qualified',
  CONTACTED = 'contacted',
  CLOSED = 'closed',
  REJECTED = 'rejected'
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  parts: { text: string }[];
}

export interface Lead {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  budget?: number;
  interests?: string[];
  location?: string;
  score: number; // 0-100
  status: LeadStatus;
  qualifications: {
    readyToBuy: boolean;
    hasFinancing: boolean;
    urgency: 'low' | 'medium' | 'high';
  };
  summary?: string;
  chatHistory: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadQualificationResult {
  name?: string;
  email?: string;
  phone?: string;
  budget?: number;
  interests?: string[];
  location?: string;
  readyToBuy: boolean;
  hasFinancing: boolean;
  urgency: 'low' | 'medium' | 'high';
  score: number;
  summary: string;
}
