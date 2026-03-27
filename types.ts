
export enum ChemicalState {
  SOLID = 'Solid',
  LIQUID = 'Liquid'
}

export enum BatchStatus {
  QUARANTINE = 'Quarantine',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export interface StatusLog {
  id: string;
  from: BatchStatus;
  to: BatchStatus;
  date: string;
  reason?: string;
  changedBy: string;
}

export interface Transaction {
  id: string;
  batchNo: string;
  amount: number;
  purpose: string;
  date: string;
  requestId?: string;
}

export interface AnalysisRecord {
  id: string;
  analysisDate: string;
  result: string;
  performedBy: string;
  nextRetestDate: string;
}

export interface InventoryItem {
  batchNo: string;
  vendorName: string;
  vendorQualification: string;
  quantity: number;
  unit: string;
  chemicalName: string;
  description: ChemicalState;
  status: BatchStatus;
  statusNotes?: string; 
  dateOfManufacturing: string;
  dateOfAnalysis: string;
  dateOfRetest: string;
  dateOfExpiry: string;
  transactions: Transaction[];
  statusHistory?: StatusLog[];
  analysisHistory?: AnalysisRecord[];
}

export type RequestType = 'R&D' | 'QC' | 'Production';

export interface MaterialRequest {
  id: string;
  type: RequestType;
  chemicalName: string;
  batchNo: string;
  vendorName: string; // Added to track supplier in requests
  quantity: number;
  unit: string;
  requestedBy: string;
  acceptedBy?: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  departmentNotes?: string;
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  isEmailConfirmed: boolean;
  isApproved: boolean; // Admin must approve access
  role: UserRole;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: 'SIGN_IN' | 'SIGN_UP' | 'INVENTORY_ADD' | 'INVENTORY_UPDATE' | 'REQUEST_CREATE' | 'REQUEST_STATUS_CHANGE' | 'USER_ROLE_CHANGE' | 'USER_APPROVAL' | 'USER_PASSWORD_CHANGE' | 'SYSTEM_LOG_CLEAR' | 'USER_DELETE' | 'USER_NAME_UPDATE';
  details: string;
  timestamp: string;
}

export type ViewState = 'dashboard' | 'add' | 'edit' | 'details' | 'requests' | 'login' | 'signup' | 'verify' | 'admin-users' | 'admin-logs' | 'pending-approval' | 'forgot-password';
