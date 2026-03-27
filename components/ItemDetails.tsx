
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { InventoryItem, MaterialRequest, BatchStatus, AnalysisRecord } from '../types';
import { 
  ArrowLeftIcon, 
  DocumentTextIcon, 
  CalendarDaysIcon, 
  UserIcon, 
  HashtagIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  CheckBadgeIcon,
  BeakerIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface ItemDetailsProps {
  item: InventoryItem;
  onBack: () => void;
  onRevert: (transactionId: string) => void;
  onUpdateItem: (updatedItem: InventoryItem) => void;
  requests: MaterialRequest[];
  isAdmin: boolean;
}

const ItemDetails: React.FC<ItemDetailsProps> = ({ item, onBack, onRevert, onUpdateItem, requests, isAdmin }) => {
  const [showAnalysisForm, setShowAnalysisForm] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [nextRetestDate, setNextRetestDate] = useState('');
  const [performerName, setPerformerName] = useState('');

  const getStatusColor = (status: BatchStatus) => {
    switch(status) {
      case BatchStatus.APPROVED: return 'text-green-600';
      case BatchStatus.REJECTED: return 'text-red-600';
      default: return 'text-amber-600';
    }
  };

  const getStatusBg = (status: BatchStatus) => {
    switch(status) {
      case BatchStatus.APPROVED: return 'bg-green-50 border-green-100';
      case BatchStatus.REJECTED: return 'bg-red-50 border-red-200';
      default: return 'bg-amber-50 border-amber-200';
    }
  };

  const handleExportUsageExcel = () => {
    const dataToExport = item.transactions.map(tx => ({
      'Batch No': item.batchNo,
      'Chemical': item.chemicalName,
      'Date': tx.date,
      'Purpose': tx.purpose,
      'Amount Used': tx.amount,
      'Unit': item.unit,
      'Transaction ID': tx.id
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usage History");
    XLSX.writeFile(workbook, `Usage_${item.batchNo}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportAnalysisExcel = () => {
    const history = item.analysisHistory || [];
    const dataToExport = history.map(ana => ({
      'Batch No': item.batchNo,
      'Chemical': item.chemicalName,
      'Analysis Date': ana.analysisDate,
      'Performed By': ana.performedBy,
      'Result': ana.result,
      'Next Retest Date': ana.nextRetestDate
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analysis History");
    XLSX.writeFile(workbook, `Analysis_${item.batchNo}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };
  
  const handleCompleteAnalysis = () => {
    if (!analysisResult || !nextRetestDate || !performerName) {
      alert("Please fill in all analysis fields.");
      return;
    }

    const newRecord: AnalysisRecord = {
      id: `ana-${Date.now()}`,
      analysisDate: item.dateOfRetest, // Retest date becomes the actual analysis date
      result: analysisResult,
      performedBy: performerName,
      nextRetestDate: nextRetestDate
    };

    const updatedItem: InventoryItem = {
      ...item,
      dateOfAnalysis: item.dateOfRetest,
      dateOfRetest: nextRetestDate,
      analysisHistory: [newRecord, ...(item.analysisHistory || [])]
    };

    onUpdateItem(updatedItem);
    setShowAnalysisForm(false);
    setAnalysisResult('');
    setNextRetestDate('');
    setPerformerName('');
    alert("Analysis successfully logged. Dates updated.");
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-teal-600 transition-colors mb-4"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 text-teal-600 mb-1">
              <HashtagIcon className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Unique Identity</span>
            </div>
            <h2 className="text-2xl font-mono font-bold text-slate-900 mb-4">{item.batchNo}</h2>
            
            <div className="space-y-4 mb-6 pt-4 border-t border-slate-100">
               <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-slate-400 uppercase font-bold">Batch Status</div>
                    <div className={`text-sm font-bold uppercase ${getStatusColor(item.status)}`}>{item.status}</div>
                  </div>
                  <ShieldCheckIcon className={`w-6 h-6 ${getStatusColor(item.status)}`} />
               </div>

               {/* QC Notes Alert Box */}
               {item.status !== BatchStatus.APPROVED && item.statusNotes && (
                 <div className={`p-4 border-2 rounded-xl ${getStatusBg(item.status)} animate-fade-in`}>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2 text-slate-600">
                      <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                      {item.status === BatchStatus.REJECTED ? 'Mandatory Rejection Reason' : 'Quarantine Observations'}
                    </div>
                    <div className="text-sm text-slate-800 font-bold leading-relaxed">
                      "{item.statusNotes}"
                    </div>
                 </div>
               )}

               <div>
                  <div className="text-xs text-slate-400 uppercase font-bold">Chemical Name</div>
                  <div className="text-lg text-slate-800 font-semibold">{item.chemicalName}</div>
               </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg mb-6">
              <span className="text-sm text-slate-600 font-medium">Available Stock</span>
              <span className={`text-lg font-bold ${item.quantity < 5 ? 'text-red-600' : 'text-teal-600'}`}>
                {item.quantity} {item.unit}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <UserIcon className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-400 uppercase font-bold">Vendor</div>
                  <div className="text-sm text-slate-800 font-medium">{item.vendorName}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">{item.vendorQualification}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckBadgeIcon className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-400 uppercase font-bold">Last Analysis Date</div>
                  <div className="text-sm text-slate-800 font-medium">{item.dateOfAnalysis}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ClockIcon className="w-5 h-5 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-bold">Next Retest Due</div>
                      <div className="text-sm text-slate-800 font-medium">{item.dateOfRetest}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                {isAdmin && !showAnalysisForm && (
                  <button 
                    onClick={() => setShowAnalysisForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-all shadow-md"
                  >
                    <BeakerIcon className="w-4 h-4" />
                    Analysis Completed
                  </button>
                )}

                {item.analysisHistory && item.analysisHistory.length > 0 && (
                  <button 
                    onClick={handleExportAnalysisExcel}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Export QC Report
                  </button>
                )}
              </div>

              {isAdmin && showAnalysisForm && (
                <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">New Analysis Entry</span>
                    <button onClick={() => setShowAnalysisForm(false)} className="text-slate-400 hover:text-red-500">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Analysis Result</label>
                    <textarea 
                      className="w-full p-2 text-xs border border-teal-100 rounded bg-white outline-none focus:ring-1 focus:ring-teal-500"
                      placeholder="Enter quality results..."
                      rows={2}
                      value={analysisResult}
                      onChange={(e) => setAnalysisResult(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Performed By</label>
                    <input 
                      type="text"
                      className="w-full p-2 text-xs border border-teal-100 rounded bg-white outline-none focus:ring-1 focus:ring-teal-500"
                      placeholder="Analyst name"
                      value={performerName}
                      onChange={(e) => setPerformerName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Next Retest Date</label>
                    <input 
                      type="date"
                      className="w-full p-2 text-xs border border-teal-100 rounded bg-white outline-none focus:ring-1 focus:ring-teal-500"
                      value={nextRetestDate}
                      onChange={(e) => setNextRetestDate(e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={handleCompleteAnalysis}
                    className="w-full py-2 bg-teal-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-teal-700 shadow-sm"
                  >
                    Confirm & Update Dates
                  </button>
                </div>
              )}

              <div className="flex items-start gap-3">
                <CalendarDaysIcon className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-400 uppercase font-bold">Expiry Date</div>
                  <div className={`text-sm font-medium ${new Date(item.dateOfExpiry) < new Date() ? 'text-red-600' : 'text-slate-800'}`}>
                    {item.dateOfExpiry}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status History */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-teal-600" />
                Status Transition History
              </h3>
            </div>
            <div className="p-6">
              {!item.statusHistory || item.statusHistory.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">No status changes recorded for this batch.</p>
              ) : (
                <div className="space-y-4">
                  {item.statusHistory.map((log, idx) => (
                    <div key={log.id} className="relative flex gap-4 pl-8">
                      {idx !== item.statusHistory!.length - 1 && (
                        <div className="absolute left-3 top-6 bottom-[-24px] w-0.5 bg-slate-100"></div>
                      )}
                      
                      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${getStatusColor(log.to).replace('text', 'bg').replace('600', '500')}`}>
                      </div>

                      <div className="flex-1 pb-6">
                        <div className="flex justify-between items-start mb-1">
                          <div className="text-sm font-bold text-slate-800">
                            Status changed to <span className={getStatusColor(log.to)}>{log.to}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{log.date}</span>
                        </div>
                        <div className="text-xs text-slate-500 mb-2">
                          Moved from <span className="font-semibold">{log.from}</span> by <span className="font-semibold">{log.changedBy}</span>
                        </div>
                        {log.reason && (
                          <div className="p-2 bg-slate-50 border border-slate-100 rounded text-xs text-slate-600 italic">
                            "{log.reason}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Usage History & Transactions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[200px]">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-teal-600" />
                Usage History & Transactions
              </h3>
              {item.transactions.length > 0 && (
                <button 
                  onClick={handleExportUsageExcel}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-slate-700 transition-all"
                >
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                  Export Usage
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              {item.transactions.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <p>No usage recorded for this unique batch yet.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Purpose</th>
                      <th className="px-6 py-3">Amount Used</th>
                      {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {item.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 group">
                        <td className="px-6 py-4 text-slate-500 font-mono">{tx.date}</td>
                        <td className="px-6 py-4 font-medium text-slate-800">{tx.purpose}</td>
                        <td className="px-6 py-4 text-red-600 font-bold">-{tx.amount} {item.unit}</td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => onRevert(tx.id)}
                              className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-amber-600 border border-transparent hover:border-amber-200 rounded transition-all opacity-0 group-hover:opacity-100"
                            >
                              REVERT
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Analysis Result Records */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-left">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <BeakerIcon className="w-5 h-5 text-teal-600" />
                QC Analysis History
              </h3>
              {(item.analysisHistory && item.analysisHistory.length > 0) && (
                <button 
                  onClick={handleExportAnalysisExcel}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-slate-700 transition-all"
                >
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                  Export History
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
               {!item.analysisHistory || item.analysisHistory.length === 0 ? (
                 <div className="p-12 text-center text-slate-400">
                   <p>No historical analysis records available.</p>
                 </div>
               ) : (
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                     <tr>
                       <th className="px-6 py-3">Analysis Date</th>
                       <th className="px-6 py-3">Performed By</th>
                       <th className="px-6 py-3">Result / Observations</th>
                       <th className="px-6 py-3">Next Retest Set</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {item.analysisHistory.map((ana) => (
                       <tr key={ana.id} className="hover:bg-slate-50">
                         <td className="px-6 py-4 font-mono text-slate-700">{ana.analysisDate}</td>
                         <td className="px-6 py-4 font-medium text-slate-800">{ana.performedBy}</td>
                         <td className="px-6 py-4">
                           <div className="text-xs text-slate-600 max-w-xs leading-relaxed italic">"{ana.result}"</div>
                         </td>
                         <td className="px-6 py-4 text-teal-600 font-bold">{ana.nextRetestDate}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetails;
