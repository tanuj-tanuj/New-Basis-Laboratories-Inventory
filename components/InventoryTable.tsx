
import React from 'react';
import { InventoryItem, ChemicalState, BatchStatus } from '../types';
import { PencilSquareIcon, EyeIcon, ArchiveBoxIcon, HashtagIcon, ExclamationCircleIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit?: (item: InventoryItem) => void;
  onView: (item: InventoryItem) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ items, onEdit, onView }) => {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <ArchiveBoxIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-600">No inventory items found</h3>
        <p className="text-slate-400">Try adjusting your search or add a new unique batch.</p>
      </div>
    );
  }

  const getStatusStyle = (status: BatchStatus) => {
    switch (status) {
      case BatchStatus.APPROVED: return 'bg-green-100 text-green-700 border-green-200';
      case BatchStatus.REJECTED: return 'bg-red-100 text-red-700 border-red-200';
      case BatchStatus.QUARANTINE: return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Unique Batch No</th>
              <th className="px-6 py-4">Chemical Name</th>
              <th className="px-6 py-4">Vendor Details</th>
              <th className="px-6 py-4">Quantity</th>
              <th className="px-6 py-4 min-w-[200px]">Batch Status & Notes</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => {
              const isLowStock = item.quantity < 5;

              return (
                <tr key={item.batchNo} className={`hover:bg-slate-50 transition-colors ${isLowStock ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <HashtagIcon className="w-5 h-5" />
                      </div>
                      <div className="font-mono font-bold text-slate-900 leading-none">
                        {item.batchNo}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.description === ChemicalState.SOLID ? 'bg-amber-400' : 'bg-blue-400'}`}></div>
                      <div className="font-semibold text-slate-700">{item.chemicalName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">{item.vendorName}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{item.vendorQualification}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`font-medium ${isLowStock ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                        {item.quantity} {item.unit}
                      </div>
                      {isLowStock && (
                        <ExclamationCircleIcon className="w-4 h-4 text-red-500 animate-pulse" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border w-fit ${getStatusStyle(item.status)}`}>
                        {item.status}
                      </span>
                      {item.status !== BatchStatus.APPROVED && item.statusNotes && (
                        <div className="flex items-start gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-600 leading-relaxed max-w-[250px]">
                          <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                          <span className="font-medium italic">{item.statusNotes}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => onView(item)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors"
                        title="View Full Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit Batch Profile (Admin Only)"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;
