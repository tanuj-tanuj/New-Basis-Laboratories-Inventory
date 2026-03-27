
import mongoose from 'mongoose';
import { ChemicalState, BatchStatus, UserRole } from './types';

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isEmailConfirmed: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

const InventoryItemSchema = new mongoose.Schema({
  batchNo: { type: String, required: true, unique: true },
  vendorName: { type: String, required: true },
  vendorQualification: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  chemicalName: { type: String, required: true },
  description: { type: String, enum: Object.values(ChemicalState), required: true },
  status: { type: String, enum: Object.values(BatchStatus), required: true },
  statusNotes: String,
  dateOfManufacturing: String,
  dateOfAnalysis: String,
  dateOfRetest: String,
  dateOfExpiry: String,
  transactions: [{
    id: String,
    batchNo: String,
    amount: Number,
    purpose: String,
    date: String,
    requestId: String
  }],
  statusHistory: [{
    id: String,
    from: String,
    to: String,
    date: String,
    reason: String,
    changedBy: String
  }],
  analysisHistory: [{
    id: String,
    analysisDate: String,
    result: String,
    performedBy: String,
    nextRetestDate: String
  }]
});

const MaterialRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  chemicalName: { type: String, required: true },
  batchNo: { type: String, required: true },
  vendorName: String,
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  requestedBy: { type: String, required: true },
  acceptedBy: String,
  date: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  departmentNotes: String
});

const AuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() }
});

export const UserModel = mongoose.model('User', UserSchema);
export const InventoryModel = mongoose.model('InventoryItem', InventoryItemSchema);
export const RequestModel = mongoose.model('MaterialRequest', MaterialRequestSchema);
export const LogModel = mongoose.model('AuditLog', AuditLogSchema);
