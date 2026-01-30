import { useLocation } from 'react-router-dom';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/portfolio': 'Portfolio',
  '/watchlist': 'Watchlist',
  '/alerts': 'Alerts',
  '/settings': 'Settings',
};

export default function Header() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const pageName = pageNames[location.pathname] || 'InvestAdvisor';
  
  return (
    <header className="h-16 border-b border-surface-800 bg-surface-900/30 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Page Title */}
      <h1 className="text-xl font-semibold text-surface-100">
        {pageName}
      </h1>
      
      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder="Search symbols..."
            className="pl-9 pr-4 py-2 w-64 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
          />
        </div>
        
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-surface-800 transition-colors">
          <Bell className="w-5 h-5 text-surface-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
        </button>
        
        {/* User Menu */}
        <div className="flex items-center gap-3 pl-4 border-l border-surface-700">
          <div className="text-right">
            <p className="text-sm font-medium text-surface-200">{user?.name || 'User'}</p>
            <p className="text-xs text-surface-500">{user?.email || ''}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <button 
            onClick={logout}
            className="p-2 rounded-lg hover:bg-surface-800 transition-colors text-surface-400 hover:text-danger-400"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
