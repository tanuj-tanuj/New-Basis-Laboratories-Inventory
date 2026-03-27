
import React, { useState, useEffect } from 'react';
import { InventoryItem, ChemicalState, BatchStatus } from '../types';
import { HashtagIcon, ChatBubbleLeftRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface InventoryFormProps {
  initialData?: InventoryItem | null;
  onSubmit: (item: InventoryItem) => void;
  onCancel: () => void;
}

const InventoryForm: React.FC<InventoryFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedBatchNo, setSavedBatchNo] = useState('');
  const [formData, setFormData] = useState<Omit<InventoryItem, 'transactions'>>({
    batchNo: '',
    vendorName: '',
    vendorQualification: 'New',
    quantity: 0,
    unit: 'kg',
    chemicalName: '',
    description: ChemicalState.SOLID,
    status: BatchStatus.QUARANTINE,
    statusNotes: '',
    dateOfManufacturing: '',
    dateOfAnalysis: '',
    dateOfRetest: '',
    dateOfExpiry: '',
    statusHistory: [],
    analysisHistory: [],
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = {
      ...formData,
      transactions: initialData?.transactions || [],
      statusHistory: initialData?.statusHistory || [],
      analysisHistory: initialData?.analysisHistory || []
    } as InventoryItem;
    
    onSubmit(item);
    
    if (!initialData) {
      setSavedBatchNo(formData.batchNo);
      setShowSuccess(true);
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-6 animate-fade-in">
        <div className="bg-green-100 p-4 rounded-full">
          <CheckCircleIcon className="w-16 h-16 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Batch Identity Saved</h2>
          <p className="text-slate-500">Unique Batch No: <span className="font-mono font-bold text-slate-800">{savedBatchNo}</span></p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-all shadow-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const inputClasses = "w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-teal-500 focus:border-teal-500 block outline-none transition-all";
  const labelClasses = "block mb-2 text-sm font-medium text-slate-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="space-y-4 col-span-1 md:col-span-3">
          <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Primary Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className={labelClasses}>Unique Batch No</label>
              <div className="relative">
                <HashtagIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  name="batchNo" 
                  value={formData.batchNo} 
                  onChange={handleChange} 
                  className={`${inputClasses} pl-9 font-mono font-bold`} 
                  required 
                  disabled={!!initialData}
                  placeholder="e.g. B-2024-X100"
                />
              </div>
            </div>
            <div className="md:col-span-1">
              <label className={labelClasses}>Chemical Name</label>
              <input 
                name="chemicalName" 
                value={formData.chemicalName} 
                onChange={handleChange} 
                className={inputClasses} 
                required 
                placeholder="e.g. Sodium Chloride"
              />
            </div>
            <div className="md:col-span-1">
              <label className={labelClasses}>Physical Description</label>
              <select 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                className={inputClasses}
              >
                <option value={ChemicalState.SOLID}>Solid</option>
                <option value={ChemicalState.LIQUID}>Liquid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Batch Status */}
        <div className="space-y-4 col-span-1 md:col-span-3">
          <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Batch Status Control</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Release Status</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange} 
                className={`${inputClasses} font-bold ${
                  formData.status === BatchStatus.APPROVED ? 'text-green-600 bg-green-50' : 
                  formData.status === BatchStatus.REJECTED ? 'text-red-600 bg-red-50' : 
                  'text-amber-600 bg-amber-50'
                }`}
                required
              >
                <option value={BatchStatus.QUARANTINE}>Quarantine (In Analysis)</option>
                <option value={BatchStatus.APPROVED}>Approved (Released)</option>
                <option value={BatchStatus.REJECTED}>Rejected (Failed)</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>QC Analysis Notes / Reason</label>
              <div className="relative">
                <ChatBubbleLeftRightIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <textarea 
                  name="statusNotes" 
                  value={formData.statusNotes || ''} 
                  onChange={handleChange} 
                  rows={2}
                  className={`${inputClasses} pl-9 resize-none`} 
                  placeholder={formData.status === BatchStatus.REJECTED ? "Enter mandatory rejection reason..." : "Enter analytical observations or reason for quarantine..."}
                  required={formData.status === BatchStatus.REJECTED}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Info */}
        <div className="space-y-4 col-span-1 md:col-span-3">
          <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Vendor & Quality</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Vendor Name</label>
              <input 
                name="vendorName" 
                value={formData.vendorName} 
                onChange={handleChange} 
                className={inputClasses} 
                required 
                placeholder="Supplier Name"
              />
            </div>
            <div>
              <label className={labelClasses}>Vendor Qualification</label>
              <select 
                name="vendorQualification" 
                value={formData.vendorQualification} 
                onChange={handleChange} 
                className={inputClasses}
                required
              >
                <option value="Qualified">Qualified</option>
                <option value="New">New</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-4 col-span-1 md:col-span-3">
          <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Stock Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Quantity</label>
              <input 
                type="number" 
                step="0.01" 
                name="quantity" 
                value={formData.quantity} 
                onChange={handleChange} 
                className={inputClasses} 
                required 
              />
            </div>
            <div>
              <label className={labelClasses}>Unit</label>
              <input 
                name="unit" 
                value={formData.unit} 
                onChange={handleChange} 
                className={inputClasses} 
                required 
                placeholder="kg, L, etc."
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-4 col-span-1 md:col-span-3">
          <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Date Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClasses}>Manufacturing Date</label>
              <input type="date" name="dateOfManufacturing" value={formData.dateOfManufacturing} onChange={handleChange} className={inputClasses} required />
            </div>
            <div>
              <label className={labelClasses}>Analysis Date</label>
              <input type="date" name="dateOfAnalysis" value={formData.dateOfAnalysis} onChange={handleChange} className={inputClasses} required />
            </div>
            <div>
              <label className={labelClasses}>Retest Date</label>
              <input type="date" name="dateOfRetest" value={formData.dateOfRetest} onChange={handleChange} className={inputClasses} required />
            </div>
            <div>
              <label className={labelClasses}>Expiry Date</label>
              <input type="date" name="dateOfExpiry" value={formData.dateOfExpiry} onChange={handleChange} className={inputClasses} required />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <button 
          type="button" 
          onClick={onCancel}
          className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="px-6 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
        >
          {initialData ? 'Update Identity' : 'Save Identity'}
        </button>
      </div>
    </form>
  );
};

export default InventoryForm;
