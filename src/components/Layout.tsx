import { useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useScan } from '../context/ScanContext';
import {
  Shield, LayoutDashboard, Search, FileText, Settings, Terminal,
  LogOut, Menu, X, Bell, User, ChevronRight, Zap
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/recon', icon: Search, label: 'Recon Engine' },
  { path: '/terminal', icon: Terminal, label: 'Terminal' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { alerts } = useScan();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-cyan-400/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-400/5 border border-cyan-400/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-sm font-bold font-[Orbitron] tracking-wider text-cyan-300">FENHACK</h1>
              <p className="text-[10px] text-cyan-400/50 font-mono tracking-widest">OSINT ENGINE</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                active
                  ? 'bg-cyan-400/10 border border-cyan-400/20 text-cyan-300'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-cyan-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
              {sidebarOpen && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {active && sidebarOpen && (
                <ChevronRight className="w-3 h-3 ml-auto text-cyan-400/50" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-cyan-400/10">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/20 flex items-center justify-center">
            <User className="w-4 h-4 text-cyan-400" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-300 truncate">{user?.username}</p>
              <p className="text-[10px] text-cyan-400/50 font-mono uppercase">{user?.role}</p>
            </div>
          )}
          {sidebarOpen && (
            <button onClick={handleLogout} className="text-gray-600 hover:text-red-400 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-cyber-bg overflow-hidden">
      {/* Scanline effect */}
      <div className="scanline-overlay" />

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col border-r border-cyan-400/10 bg-cyber-surface/50 backdrop-blur-xl transition-all duration-300 ${
        sidebarOpen ? 'w-56' : 'w-16'
      }`}>
        <SidebarContent />
        <div className="p-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-cyber-surface border-r border-cyan-400/10">
            <div className="absolute top-3 right-3">
              <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-cyan-400/10 bg-cyber-surface/30 backdrop-blur-xl flex items-center px-4 gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-green-400/5 border border-green-400/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 neon-pulse" />
              <span className="text-[10px] font-mono text-green-400/70 uppercase">Systems Online</span>
            </div>

            {/* Alerts */}
            <button
              onClick={() => navigate('/dashboard')}
              className="relative p-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </button>

            {/* Quick Scan */}
            <button
              onClick={() => navigate('/recon')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-400/5 border border-cyan-400/20 text-cyan-400 text-xs font-mono hover:bg-cyan-400/10 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Quick Scan
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto cyber-grid">
          {children}
        </main>
      </div>
    </div>
  );
}
