
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { InventoryItem, MaterialRequest, RequestType, BatchStatus } from '../types';
import { 
  BeakerIcon, 
  AcademicCapIcon, 
  CpuChipIcon, 
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  InformationCircleIcon,
  HashtagIcon,
  XCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface RequestSystemProps {
  inventory: InventoryItem[];
  existingRequests: MaterialRequest[];
  onAddRequest: (request: MaterialRequest) => void;
  onUpdateRequest: (request: MaterialRequest) => void;
  isAdmin: boolean;
}

const RequestSystem: React.FC<RequestSystemProps> = ({ inventory, existingRequests, onAddRequest, onUpdateRequest, isAdmin }) => {
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState<MaterialRequest | null>(null);
  const [acceptingPerson, setAcceptingPerson] = useState('');
  
  const [formData, setFormData] = useState({
    batchNo: '',
    quantity: 0,
    requestedBy: '',
    notes: ''
  });

  const handleTypeSelect = (type: RequestType) => {
    setSelectedType(type);
    setFormData({ batchNo: '', quantity: 0, requestedBy: '', notes: '' });
  };

  const handleExportRequestsExcel = () => {
    const dataToExport = existingRequests.map(req => ({
      'Request ID': req.id,
      'Department': req.type,
      'Date': req.date,
      'Chemical Name': req.chemicalName,
      'Batch No': req.batchNo,
      'Vendor': req.vendorName,
      'Quantity': req.quantity,
      'Unit': req.unit,
      'Requested By': req.requestedBy,
      'Status': req.status,
      'Approved By': req.acceptedBy || 'Pending',
      'Purpose/Notes': req.departmentNotes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Material Requests");
    
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Basis_Labs_Material_Requests_${dateStr}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    const selectedItem = inventory.find(i => i.batchNo === formData.batchNo);
    if (!selectedItem) {
      alert("Please select a valid Unique Batch No.");
      return;
    }

    if (selectedItem.status === BatchStatus.REJECTED) {
      alert("This batch is REJECTED and cannot be requested for use.");
      return;
    }

    const newRequest: MaterialRequest = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedType,
      batchNo: formData.batchNo,
      chemicalName: selectedItem.chemicalName,
      vendorName: selectedItem.vendorName, // Captured from inventory
      quantity: formData.quantity,
      unit: selectedItem.unit,
      requestedBy: formData.requestedBy,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      departmentNotes: formData.notes
    };

    onAddRequest(newRequest);
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSelectedType(null);
    }, 1500);
  };

  const handleApprove = () => {
    if (!showApprovalModal || !acceptingPerson.trim()) {
      alert("Please enter the accepting person's name.");
      return;
    }

    const updatedRequest: MaterialRequest = {
      ...showApprovalModal,
      status: 'Approved',
      acceptedBy: acceptingPerson
    };

    onUpdateRequest(updatedRequest);
    setShowApprovalModal(null);
    setAcceptingPerson('');
  };

  const handleReject = (req: MaterialRequest) => {
    const updatedRequest: MaterialRequest = {
      ...req,
      status: 'Rejected'
    };
    onUpdateRequest(updatedRequest);
  };

  const departmentConfigs = {
    'R&D': {
      icon: AcademicCapIcon,
      color: 'purple',
      description: 'Research chemicals and experimentation.',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      btn: 'bg-purple-600 hover:bg-purple-700'
    },
    'QC': {
      icon: BeakerIcon,
      color: 'amber',
      description: 'Quality analysis and testing reagents.',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      btn: 'bg-amber-600 hover:bg-amber-700'
    },
    'Production': {
      icon: CpuChipIcon,
      color: 'blue',
      description: 'Bulk raw materials for manufacturing.',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      btn: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  return (
    <div className="space-y-8">
      {/* Upper Section: Type Selection, Form, or Submitting Status */}
      <div className="min-h-[300px]">
        {isSubmitting ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse bg-white rounded-2xl border border-slate-200 shadow-sm">
            <CheckCircleIcon className="w-20 h-20 text-teal-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">Request Submitted!</h2>
            <p className="text-slate-500">Routing request to Material Management for approval...</p>
          </div>
        ) : !selectedType ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.keys(departmentConfigs) as RequestType[]).map((type) => {
              const config = departmentConfigs[type];
              return (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className={`flex flex-col items-center p-8 bg-white border ${config.border} rounded-2xl shadow-sm hover:shadow-md transition-all group`}
                >
                  <div className={`p-4 rounded-xl ${config.bg} ${config.text} mb-4 group-hover:scale-110 transition-transform`}>
                    <config.icon className="w-10 h-10" />
                  </div>
                  <h3 className={`text-xl font-bold ${config.text} mb-2`}>{type} Request</h3>
                  <p className="text-sm text-slate-500 text-center leading-relaxed">
                    {config.description}
                  </p>
                  <div className={`mt-6 py-2 px-6 rounded-lg font-semibold text-white ${config.btn} transition-colors`}>
                    Open Form
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-2xl mx-auto">
            <div className={`${departmentConfigs[selectedType].bg} p-6 border-b ${departmentConfigs[selectedType].border}`}>
              <button 
                onClick={() => setSelectedType(null)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Cancel Requisition
              </button>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-white ${departmentConfigs[selectedType].text}`}>
                  {React.createElement(departmentConfigs[selectedType].icon, { className: "w-8 h-8" })}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedType} Material Requisition</h2>
                  <p className="text-slate-500 text-sm">Targeting Unique Batch Numbers for traceability.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Unique ID (Batch No)</label>
                  <div className="relative">
                    <HashtagIcon className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                    <select 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all appearance-none"
                      value={formData.batchNo}
                      onChange={(e) => setFormData({...formData, batchNo: e.target.value})}
                      required
                    >
                      <option value="">-- Select by Unique Batch No --</option>
                      {inventory.map(item => (
                        <option key={item.batchNo} value={item.batchNo} disabled={item.status === BatchStatus.REJECTED}>
                          {item.batchNo} | {item.chemicalName} (Vendor: {item.vendorName}) {item.status === BatchStatus.REJECTED ? '[REJECTED]' : `[Avail: ${item.quantity} ${item.unit}]`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantity Required</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    placeholder="0.00"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Requested By (Staff Name)</label>
                  <div className="relative">
                    <UserIcon className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      placeholder="Enter name"
                      value={formData.requestedBy}
                      onChange={(e) => setFormData({...formData, requestedBy: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Purpose / Additional Notes</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all h-24"
                    placeholder="Specific usage details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all ${departmentConfigs[selectedType].btn}`}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Lower Section: Requisition History (Always Visible) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-teal-600" />
              Material Requisition History {isAdmin && '(Admin View)'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Audit log of all material batches and their requisition status.</p>
          </div>
          {existingRequests.length > 0 && (
            <button
              onClick={handleExportRequestsExcel}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold uppercase rounded-xl hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 flex-shrink-0"
              title="Download full requisition history as Excel"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export History to Excel
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          {existingRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <InformationCircleIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p>No material requests placed yet.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3">Dept</th>
                  <th className="px-6 py-3">Batch / Vendor</th>
                  <th className="px-6 py-3">Chemical</th>
                  <th className="px-6 py-3">Qty</th>
                  <th className="px-6 py-3">Requested By</th>
                  <th className="px-6 py-3">Status</th>
                  {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {existingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        req.type === 'R&D' ? 'bg-purple-100 text-purple-700' :
                        req.type === 'QC' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {req.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900">{req.batchNo}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{req.vendorName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{req.chemicalName}</td>
                    <td className="px-6 py-4 font-semibold">{req.quantity} {req.unit}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-800 font-medium">{req.requestedBy}</span>
                        <span className="text-[10px] text-slate-400">{req.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 font-bold uppercase text-[10px] ${
                        req.status === 'Approved' ? 'text-green-600' : 
                        req.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        {req.status === 'Pending' && (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setShowApprovalModal(req)}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 transition-colors shadow-sm"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleReject(req)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 transition-colors shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {req.status === 'Approved' && (
                          <span className="text-[10px] text-slate-400 italic">Auth by: {req.acceptedBy}</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Acceptance Name Modal */}
      {isAdmin && showApprovalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-green-600 p-6 text-white">
              <h3 className="text-xl font-bold">Approve Material Requisition</h3>
              <p className="text-green-100 text-sm">Batch: {showApprovalModal.batchNo}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 text-left">Accepting Person Name</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Authorized Staff Name"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                    value={acceptingPerson}
                    onChange={(e) => setAcceptingPerson(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowApprovalModal(null)}
                  className="flex-1 py-3 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleApprove}
                  className="flex-1 py-3 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 shadow-lg shadow-green-200"
                >
                  Confirm & Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestSystem;
