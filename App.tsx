
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  PlusIcon, TableCellsIcon, ArrowPathIcon, MagnifyingGlassIcon, CloudArrowUpIcon,
  LinkIcon, ArrowDownTrayIcon, ClipboardDocumentCheckIcon, BellAlertIcon,
  XMarkIcon, ArrowRightOnRectangleIcon, UserGroupIcon,
  DocumentMagnifyingGlassIcon, ShieldExclamationIcon, FunnelIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { InventoryItem, ViewState, MaterialRequest, User, BatchStatus, Transaction, StatusLog, AuditLog } from './types';
import { dbService } from './services/DatabaseService';
import { auth, onAuthStateChanged } from './firebase';
import InventoryForm from './components/InventoryForm';
import InventoryTable from './components/InventoryTable';
import ItemDetails from './components/ItemDetails';
import DashboardStats from './components/DashboardStats';
import RequestSystem from './components/RequestSystem';
import Auth from './components/Auth';
import AdminConsole from './components/AdminConsole';

const LOGO_URL = "https://media.licdn.com/dms/image/v2/C4D0BAQHpjT4zGjfV_g/company-logo_200_200/company-logo_200_200/0/1631314781282?e=2147483647&v=beta&t=WDzVKIUkXdwKS7stXtOAnOj-y-QFuJvdr80p75i_88U";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Error Boundary Component
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
            <ShieldExclamationIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Error</h2>
            <p className="text-slate-600 text-sm mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('login');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<'batchNo' | 'chemicalName' | 'status' | 'quantity'>('batchNo');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile = await dbService.getUser(firebaseUser.uid);
        if (userProfile) {
          setCurrentUser(userProfile);
          if (userProfile.isApproved) {
            if (view === 'login' || view === 'pending-approval') setView('dashboard');
          } else {
            setView('pending-approval');
          }
        } else {
          // Profile not found in Firestore, force login/signup
          setCurrentUser(null);
          setView('login');
        }
      } else {
        setCurrentUser(null);
        setView('login');
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser || !currentUser.isApproved) return;

    const unsubInventory = dbService.subscribeToInventory(setItems);
    const unsubRequests = dbService.subscribeToRequests(setRequests);
    const unsubUsers = dbService.subscribeToUsers(setUsers);
    const unsubLogs = dbService.subscribeToLogs(setLogs);

    return () => {
      unsubInventory();
      unsubRequests();
      unsubUsers();
      unsubLogs();
    };
  }, [currentUser]);

  const isAdmin = currentUser?.role === 'admin';

  const handleAddItem = async (item: InventoryItem) => {
    if (items.some(i => i.batchNo === item.batchNo)) return alert("Duplicate Batch No.");
    const newItem = { ...item, statusHistory: [], analysisHistory: [] };
    await dbService.saveInventoryItem(newItem);
    await dbService.logAction(currentUser!, 'INVENTORY_ADD', `Added batch ${item.batchNo} (${item.chemicalName})`);
    setView('dashboard');
  };

  const handleUpdateItem = async (updatedItem: InventoryItem) => {
    const oldItem = items.find(i => i.batchNo === updatedItem.batchNo);
    let finalItem = { ...updatedItem };

    if (oldItem) {
      if (!finalItem.statusHistory) finalItem.statusHistory = oldItem.statusHistory;
      if (!finalItem.analysisHistory) finalItem.analysisHistory = oldItem.analysisHistory;

      if (oldItem.status !== updatedItem.status) {
        const newLog: StatusLog = {
          id: `log-${Date.now()}`,
          from: oldItem.status,
          to: updatedItem.status,
          date: new Date().toISOString().split('T')[0],
          reason: updatedItem.statusNotes,
          changedBy: currentUser?.name || 'System'
        };
        finalItem.statusHistory = [newLog, ...(oldItem.statusHistory || [])];
      }
    }

    await dbService.saveInventoryItem(finalItem);
    setSelectedItem(finalItem);
    await dbService.logAction(currentUser!, 'INVENTORY_UPDATE', `Updated batch parameters for ${updatedItem.batchNo}`);
    if (view !== 'details') setView('dashboard');
  };

  const handleRevertTransaction = async (batchNo: string, transactionId: string) => {
    if (!isAdmin) return;
    
    const item = items.find(i => i.batchNo === batchNo);
    if (!item) return;

    const transaction = item.transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    const updatedTransactions = item.transactions.filter(t => t.id !== transactionId);
    const updatedItem = {
      ...item,
      quantity: item.quantity + transaction.amount,
      transactions: updatedTransactions
    };

    await handleUpdateItem(updatedItem);
    await dbService.logAction(currentUser!, 'INVENTORY_UPDATE', `Reverted transaction ${transactionId} for batch ${batchNo}. Restored ${transaction.amount} ${item.unit}.`);
    alert(`Successfully reverted transaction. Stock restored.`);
  };

  const handleUpdateRequestStatus = async (updatedReq: MaterialRequest) => {
    const previousReq = requests.find(r => r.id === updatedReq.id);
    
    if (updatedReq.status === 'Approved' && previousReq?.status === 'Pending') {
      const item = items.find(i => i.batchNo === updatedReq.batchNo);
      if (item) {
        if (item.quantity < updatedReq.quantity) {
          alert(`Insufficient stock! ${item.chemicalName} only has ${item.quantity} ${item.unit} available.`);
          return;
        }

        const newTransaction: Transaction = {
          id: `tx-${Math.random().toString(36).substr(2, 9)}`,
          batchNo: updatedReq.batchNo,
          amount: updatedReq.quantity,
          purpose: `${updatedReq.type} Request - ${updatedReq.requestedBy}`,
          date: new Date().toISOString().split('T')[0],
          requestId: updatedReq.id
        };

        const updatedItem = {
          ...item,
          quantity: item.quantity - updatedReq.quantity,
          transactions: [newTransaction, ...item.transactions]
        };

        await handleUpdateItem(updatedItem);
      }
    }

    await dbService.saveRequest(updatedReq);
    await dbService.logAction(currentUser!, 'REQUEST_STATUS_CHANGE', `Updated status of request ${updatedReq.id} to ${updatedReq.status}`);
  };

  const handleDownloadExcel = () => {
    const dataToExport = filteredItems.map(item => ({
      'Batch No': item.batchNo,
      'Chemical Name': item.chemicalName,
      'Physical Description': item.description,
      'Vendor Name': item.vendorName,
      'Vendor Qualification': item.vendorQualification,
      'Quantity': item.quantity,
      'Unit': item.unit,
      'Status': item.status,
      'QC Notes': item.statusNotes || '',
      'MFG Date': item.dateOfManufacturing,
      'Analysis Date': item.dateOfAnalysis,
      'Retest Date': item.dateOfRetest,
      'Expiry Date': item.dateOfExpiry
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Basis_Labs_Inventory_${dateStr}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
    dbService.logAction(currentUser!, 'INVENTORY_UPDATE', `Exported inventory table to Excel (${fileName})`);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <ArrowPathIcon className="w-12 h-12 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!currentUser || (!currentUser.isApproved && view !== 'pending-approval')) {
    return <Auth view={view} setView={setView} setCurrentUser={setCurrentUser} currentUser={currentUser} />;
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.chemicalName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.batchNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'status') {
      const order = { [BatchStatus.APPROVED]: 1, [BatchStatus.QUARANTINE]: 2, [BatchStatus.REJECTED]: 3 };
      return order[a.status] - order[b.status];
    }
    if (sortBy === 'chemicalName') return a.chemicalName.localeCompare(b.chemicalName);
    if (sortBy === 'quantity') return b.quantity - a.quantity;
    return a.batchNo.localeCompare(b.batchNo);
  });

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-50">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
          >
            <img src={LOGO_URL} className="w-8 h-8 rounded bg-white p-0.5" alt="logo" />
            <span className="font-bold tracking-tight">Basis Labs</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            {isSidebarOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>

        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed md:sticky top-0 left-0 h-screen z-40 w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-6">
            <div 
              className="hidden md:flex items-center gap-3 mb-8 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setView('dashboard')}
            >
              <img src={LOGO_URL} className="w-10 h-10 rounded-lg bg-white p-0.5" alt="logo" />
              <div className="flex flex-col">
                <span className="text-lg font-bold">Basis</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Laboratories</span>
              </div>
            </div>
            
            <nav className="space-y-1">
              <NavItem active={view === 'dashboard'} icon={TableCellsIcon} label="Inventory" onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} />
              {isAdmin && <NavItem active={view === 'add'} icon={PlusIcon} label="Add Batch" onClick={() => { setView('add'); setIsSidebarOpen(false); }} />}
              <NavItem active={view === 'requests'} icon={ClipboardDocumentCheckIcon} label="Requests" onClick={() => { setView('requests'); setIsSidebarOpen(false); }} />
              
              {isAdmin && (
                <div className="pt-4 mt-4 border-t border-slate-800 space-y-1">
                  <span className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Administration</span>
                  <NavItem active={view === 'admin-users'} icon={UserGroupIcon} label="Users Management" onClick={() => { setView('admin-users'); setIsSidebarOpen(false); }} />
                  <NavItem active={view === 'admin-logs'} icon={DocumentMagnifyingGlassIcon} label="Audit Logs" onClick={() => { setView('admin-logs'); setIsSidebarOpen(false); }} />
                </div>
              )}
            </nav>
          </div>

          <div className="mt-auto p-4 m-4 bg-slate-800 rounded-2xl border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isAdmin ? 'bg-teal-500' : 'bg-blue-500'}`}>
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold truncate">{currentUser.name}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">{currentUser.role} Control</span>
              </div>
            </div>
            <button onClick={() => { auth.signOut(); setCurrentUser(null); setView('login'); setIsSidebarOpen(false); }} className="w-full py-1.5 bg-slate-700 hover:bg-red-900/40 text-[10px] font-bold uppercase rounded transition-all">Sign Out</button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen w-full">
          <header className="mb-8 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm sticky top-0 z-30 py-2 -mt-2">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">
              {view === 'dashboard' ? 'Facility Inventory' : 
                view === 'admin-users' ? 'Staff Authorization' : 
                view === 'admin-logs' ? 'System Audit Trail' : 
                view.replace('-', ' ')}
            </h1>
            {view === 'dashboard' && (
              <div className="relative w-64 hidden lg:block">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input type="text" placeholder="Search batch or chemical..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            )}
          </header>

          <div className="max-w-7xl mx-auto">
            {view === 'dashboard' && (
              <>
                <DashboardStats items={items} />
                
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center gap-6">
                    {/* Status Filter */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <FunnelIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Filter Status</span>
                      </div>
                      <div className="flex gap-2">
                        {(['All', BatchStatus.APPROVED, BatchStatus.QUARANTINE, BatchStatus.REJECTED] as const).map((status) => {
                          const isActive = statusFilter === status;
                          let activeClass = 'bg-white text-teal-600 shadow-sm';
                          
                          if (isActive) {
                            if (status === BatchStatus.APPROVED) activeClass = 'bg-green-100 text-green-700 border-green-200 shadow-sm';
                            if (status === BatchStatus.QUARANTINE) activeClass = 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm';
                            if (status === BatchStatus.REJECTED) activeClass = 'bg-red-100 text-red-700 border-red-200 shadow-sm';
                            if (status === 'All') activeClass = 'bg-slate-800 text-white shadow-md';
                          }

                          return (
                            <button
                              key={status}
                              onClick={() => setStatusFilter(status)}
                              className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                                isActive 
                                ? activeClass 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                              }`}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sort Control */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <ArrowPathIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Sort By</span>
                      </div>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                      >
                        <option value="batchNo">Batch Number</option>
                        <option value="chemicalName">Chemical Name</option>
                        <option value="status">Status Priority</option>
                        <option value="quantity">Quantity (High-Low)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDownloadExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-[10px] font-bold uppercase rounded-xl hover:bg-slate-700 transition-all shadow-lg shadow-slate-200"
                      title="Export current view to Excel"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Export Excel
                    </button>
                    
                    <div className="relative flex-1 min-w-[150px] lg:hidden">
                      <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                  </div>
                </div>

                <InventoryTable 
                  items={filteredItems} 
                  onView={(item) => { setSelectedItem(item); setView('details'); }} 
                  onEdit={isAdmin ? (item) => { setSelectedItem(item); setView('edit'); } : undefined} 
                />
              </>
            )}

            {(view === 'admin-users' || view === 'admin-logs') && isAdmin && (
              <AdminConsole view={view} currentUser={currentUser} users={users} logs={logs} />
            )}

            {view === 'add' && isAdmin && <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200"><InventoryForm onSubmit={handleAddItem} onCancel={() => setView('dashboard')} /></div>}
            {view === 'edit' && isAdmin && selectedItem && <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200"><InventoryForm initialData={selectedItem} onSubmit={handleUpdateItem} onCancel={() => setView('dashboard')} /></div>}
            {view === 'requests' && <RequestSystem inventory={items} existingRequests={requests} isAdmin={isAdmin} onAddRequest={async (r) => { await dbService.saveRequest(r); await dbService.logAction(currentUser!, 'REQUEST_CREATE', `Placed ${r.type} request for ${r.batchNo}`); }} onUpdateRequest={handleUpdateRequestStatus} />}
            {view === 'details' && selectedItem && <ItemDetails item={selectedItem} isAdmin={isAdmin} onBack={() => setView('dashboard')} onRevert={(id) => handleRevertTransaction(selectedItem.batchNo, id)} onUpdateItem={handleUpdateItem} requests={requests.filter(r => r.batchNo === selectedItem.batchNo)} />}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

const NavItem: React.FC<{ active: boolean; icon: any; label: string; onClick: () => void }> = ({ active, icon: Icon, label, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-teal-600 shadow-lg shadow-teal-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
    <Icon className="w-5 h-5" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default App;
