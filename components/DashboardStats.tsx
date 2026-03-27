
import React from 'react';
import { InventoryItem } from '../types';
import { 
  CircleStackIcon, 
  ExclamationTriangleIcon, 
  ClockIcon, 
  CheckCircleIcon 
} from '@heroicons/react/24/solid';

interface DashboardStatsProps {
  items: InventoryItem[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ items }) => {
  const totalBatches = items.length;
  const expiredCount = items.filter(i => new Date(i.dateOfExpiry) < new Date()).length;
  const lowStockCount = items.filter(i => i.quantity < 5).length;
  const retestSoonCount = items.filter(i => {
    const retestDate = new Date(i.dateOfRetest);
    const today = new Date();
    const diffDays = Math.ceil((retestDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays > 0 && diffDays < 30;
  }).length;

  const stats = [
    { label: 'Total Batches', value: totalBatches, icon: CircleStackIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Expired Items', value: expiredCount, icon: ExclamationTriangleIcon, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Low Stock Alerts', value: lowStockCount, icon: ClockIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Retest in 30 Days', value: retestSoonCount, icon: CheckCircleIcon, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
            <stat.icon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
