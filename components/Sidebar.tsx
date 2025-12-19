import React from 'react';
import { LayoutDashboard, UserPlus, Coffee, Receipt, Building2, LogOut, X, Users, UtensilsCrossed, CreditCard, Lock, Clock } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: 'RECEPTION' | 'ADMIN';
  currentBranchName?: string;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentRole, currentBranchName, onLogout, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'ALL' },
    { id: 'new_registration', label: 'New Registration', icon: UserPlus, role: 'RECEPTION' },
    { id: 'old_member_entry', label: 'Old Member Entry', icon: Clock, role: 'RECEPTION' },
    { id: 'registered_members', label: 'Members Directory', icon: Users, role: 'RECEPTION' },
    { id: 'snacks', label: 'Snack POS', icon: Coffee, role: 'RECEPTION' },
    { id: 'create_branch', label: 'Make New Branch', icon: Building2, role: 'ADMIN' },
    { id: 'receptionists', label: 'Receptionists', icon: Users, role: 'ADMIN' },
    { id: 'manage_snacks', label: 'Manage Snacks', icon: UtensilsCrossed, role: 'RECEPTION' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col 
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 shadow-xl md:shadow-none
      `}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <img src="/logo.svg" alt="Logo" className="h-24 w-24" />
              <h1 className="text-xl font-bold text-indigo-600 tracking-tight leading-none">Achievers Library</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider pl-2">
              {currentRole === 'ADMIN' ? 'Admin Office' : currentBranchName || 'Branch Mode'}
            </p>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600 p-1">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            if (item.role !== 'ALL' && item.role !== currentRole) return null;

            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm ring-1 ring-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

      </div>
    </>
  );
};