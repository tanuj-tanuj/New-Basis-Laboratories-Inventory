
import React, { useState } from 'react';
import { User, AuditLog, UserRole } from '../types';
import { dbService } from '../services/DatabaseService';
import { auth, sendPasswordResetEmail } from '../firebase';
import { 
  UserGroupIcon, 
  ClipboardDocumentListIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const SUPER_ADMIN_EMAIL = 'tanujr91@gmail.com';

interface AdminConsoleProps {
  view: 'admin-users' | 'admin-logs';
  currentUser: User;
  users: User[];
  logs: AuditLog[];
}

const AdminConsole: React.FC<AdminConsoleProps> = ({ view, currentUser, users, logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNameEmail, setEditingNameEmail] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const isSuperAdmin = currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL;

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleToggleApproval = async (user: User) => {
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL) return;

    const newApprovalStatus = !user.isApproved;
    await dbService.updateUserApproval(user.id, newApprovalStatus);
    await dbService.logAction(currentUser, 'USER_APPROVAL', `${newApprovalStatus ? 'Approved' : 'Revoked'} access for ${user.email}`);
  };

  const handleChangeRole = async (user: User, newRole: UserRole) => {
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL) return;

    await dbService.updateUserRole(user.id, newRole);
    await dbService.logAction(currentUser, 'USER_ROLE_CHANGE', `Changed role of ${user.email} to ${newRole}`);
  };

  const handleClearLogs = async () => {
    if (!isSuperAdmin) return;
    await dbService.clearLogs();
    await dbService.logAction(currentUser, 'SYSTEM_LOG_CLEAR', 'All system audit logs were cleared by system admin');
    setClearingLogs(false);
    showMessage('All logs have been cleared.');
  };

  const handleDeleteUser = async (user: User) => {
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL) return;
    if (user.email.toLowerCase() === currentUser.email.toLowerCase()) {
      showMessage("You cannot delete your own account.", 'error');
      return;
    }

    await dbService.deleteUser(user.id);
    await dbService.logAction(currentUser, 'USER_DELETE', `Deleted account for ${user.name} (${user.email})`);
    setDeletingUserId(null);
    showMessage(`Account for ${user.email} has been deleted.`);
  };

  const handleUpdateName = async (userId: string, email: string) => {
    if (!newName || newName.trim().length < 2) {
      showMessage('Name must be at least 2 characters', 'error');
      return;
    }
    await dbService.updateUserName(userId, newName.trim());
    await dbService.logAction(currentUser, 'USER_NAME_UPDATE', `Updated name for ${email} to ${newName.trim()}`);
    setEditingNameEmail(null);
    setNewName('');
    showMessage(`Name for ${email} has been updated.`);
  };

  const handleSendResetEmail = async (user: User) => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      await dbService.logAction(currentUser, 'USER_PASSWORD_CHANGE', `Triggered password reset email for ${user.email}`);
      showMessage(`Password reset email sent to ${user.email}`);
    } catch (err: any) {
      showMessage(`Error: ${err.message}`, 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = logs.filter(l => 
    l.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {view === 'admin-users' ? 'User Management' : 'Audit Trail Logs'}
          </h2>
          <p className="text-slate-500 text-sm">
            {view === 'admin-users' 
              ? 'Security protocols and authorization management' 
              : 'Traceability and Access Control Panel'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {view === 'admin-logs' && isSuperAdmin && (
            <button 
              onClick={() => setClearingLogs(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-bold uppercase transition-all shadow-sm"
            >
              <XCircleIcon className="w-4 h-4" />
              Clear All Logs
            </button>
          )}
          <div className="relative w-full md:w-64">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search records..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-bold animate-fade-in ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.text}
        </div>
      )}

      {clearingLogs && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Clear Audit Logs?</h3>
            <p className="text-slate-500 text-sm mb-6">Are you sure you want to permanently delete all audit logs? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setClearingLogs(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button 
                onClick={handleClearLogs}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold uppercase"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'admin-users' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-4">Employee & Mail ID</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => {
                  const isThisSuperAdmin = u.email.toLowerCase() === SUPER_ADMIN_EMAIL;
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${isThisSuperAdmin ? 'bg-teal-50/20' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            {editingNameEmail === u.email ? (
                              <div className="flex items-center gap-2">
                                <input 
                                  type="text" 
                                  className="px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:ring-1 focus:ring-teal-500 w-32 font-bold"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  autoFocus
                                />
                                <button onClick={() => handleUpdateName(u.id, u.email)} className="text-teal-600 hover:text-teal-700">
                                  <CheckCircleIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingNameEmail(null)} className="text-slate-400 hover:text-slate-600">
                                  <XCircleIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="font-bold text-slate-800">{u.name}</span>
                                {!isThisSuperAdmin && (
                                  <button 
                                    onClick={() => {
                                      setEditingNameEmail(u.email);
                                      setNewName(u.name);
                                    }}
                                    className="p-1 text-slate-300 hover:text-teal-600 transition-colors"
                                    title="Edit Name"
                                  >
                                    <PencilSquareIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                            {isThisSuperAdmin && <ShieldCheckIcon className="w-4 h-4 text-teal-600" />}
                          </div>
                          <span className="text-xs text-teal-600 font-medium select-all">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isThisSuperAdmin ? (
                          <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit">
                            <LockClosedIcon className="w-3 h-3" />
                            Master Admin
                          </span>
                        ) : (
                          <select 
                            value={u.role}
                            onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                            disabled={u.email.toLowerCase() === currentUser.email.toLowerCase()}
                            className={`bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-teal-500 ${u.email.toLowerCase() === currentUser.email.toLowerCase() ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {u.isApproved ? 'Authorized' : 'Pending Approval'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isThisSuperAdmin ? (
                          <span className="text-[10px] font-bold text-slate-300 uppercase italic">System Protected</span>
                        ) : (
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleSendResetEmail(u)}
                                className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors"
                                title="Send Password Reset"
                              >
                                <KeyIcon className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleToggleApproval(u)}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${u.isApproved ? 'text-red-600 hover:bg-red-50' : 'text-teal-600 hover:bg-teal-50 border border-teal-200'}`}
                              >
                                {u.isApproved ? 'Revoke Access' : 'Grant Access'}
                              </button>
                            </div>
                            
                            {deletingUserId === u.id ? (
                              <div className="flex items-center gap-2 animate-fade-in">
                                <span className="text-[10px] font-bold text-red-600 uppercase">Confirm?</span>
                                <button 
                                  onClick={() => handleDeleteUser(u)}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold uppercase"
                                >
                                  Yes
                                </button>
                                <button 
                                  onClick={() => setDeletingUserId(null)}
                                  className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[10px] font-bold uppercase"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setDeletingUserId(u.id)}
                                className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-tight"
                              >
                                Delete Account
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{l.userName}</span>
                        <span className="text-[10px] text-slate-400">{l.userEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase tracking-tighter">
                        {l.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs italic">
                      {l.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConsole;
