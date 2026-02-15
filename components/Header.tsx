import React, { useState, useMemo, useEffect } from 'react';
import { Bell, Search, LogOut, Package, AlertTriangle, AlertCircle, X, Wifi, WifiOff, Clock } from 'lucide-react';
import { User as UserType, Item } from '../types';

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  items?: Item[];
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, items = [] }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [systemName, setSystemName] = useState('');

  useEffect(() => {
    // Monitor network status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get license status and system name
    try {
      const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
      if (ipcRenderer) {
        ipcRenderer.invoke('check-license-status').then((status: any) => {
          setLicenseStatus(status);
        }).catch(() => {});
        
        // Get system hostname
        const hostname = (window as any).electronAPI?.getSystemInfo?.() || require('os').hostname?.() || 'النظام';
        setSystemName(hostname);
      }
    } catch (e) {}

    // Check license every 60 seconds
    const licenseInterval = setInterval(() => {
      try {
        const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
        if (ipcRenderer) {
          ipcRenderer.invoke('check-license-status').then((status: any) => {
            setLicenseStatus(status);
          }).catch(() => {});
        }
      } catch (e) {}
    }, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(licenseInterval);
    };
  }, []);

  const lowStockItems = useMemo(() => {
    return items.filter(item => 
      item.isThresholdEnabled && 
      item.currentBalance <= item.minThreshold
    );
  }, [items]);

  const [notes, setNotes] = React.useState([] as any[]);
  const [dismissedIds, setDismissedIds] = React.useState([] as string[]);

  React.useEffect(() => {
    try { const s = localStorage.getItem('alaria_notes'); setNotes(s ? JSON.parse(s) : []); } catch (e) { setNotes([]); }
    try { const d = localStorage.getItem('alaria_notes_dismissed'); setDismissedIds(d ? JSON.parse(d) : []); } catch (e) { setDismissedIds([]); }
  }, []);

  const dueNotes = React.useMemo(() => {
    const now = new Date();
    return notes.filter(n => n.notifyAt && new Date(n.notifyAt) <= now && !dismissedIds.includes(n.id));
  }, [notes, dismissedIds]);

  const renderLowStockSection = () => {
    if (lowStockItems.length > 0) {
      return (
        <>
          <div className="p-3 text-xs font-black text-slate-400 uppercase">أصناف عاجلة</div>
          {lowStockItems.map(item => (
            <div key={item.id} className="p-4 border-b border-slate-800/50 hover:bg-slate-800 transition-colors flex items-center gap-4">
              <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-200 truncate">{item.name}</p>
                <p className="text-[10px] text-slate-500">الرصيد الحرج: {item.currentBalance} | حد الأمان: {item.minThreshold}</p>
              </div>
            </div>
          ))}
        </>
      );
    }

    return (
      <div className="p-10 text-center flex flex-col items-center gap-3">
        <Package size={40} className="text-slate-800" />
        <p className="text-xs text-slate-500 font-bold">لا توجد نواقص مفعلة حالياً</p>
      </div>
    );
  };

  return (
    <header className="h-20 bg-[#1e293b]/80 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-8 sticky top-0 z-[100]">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96 group">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="بحث سريع عن صنف..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-slate-600 text-white font-bold"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 bg-slate-800 rounded-xl text-slate-400 hover:text-yellow-400 transition-all border border-slate-700 active:scale-90"
          >
            <Bell size={20} />
            {(lowStockItems.length + dueNotes.length) > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-[#1e293b] animate-bounce">
                {lowStockItems.length + dueNotes.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-full left-0 mt-3 w-80 bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <span className="text-xs font-black uppercase text-slate-400">تنبيهات النظام</span>
                <button onClick={() => setShowNotifications(false)} className="text-slate-600 hover:text-white"><X size={14}/></button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {dueNotes.length > 0 && dueNotes.map(n => (
                  <div key={n.id} className="p-4 border-b border-slate-800/50 hover:bg-slate-800 transition-colors flex items-center gap-4">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                      <AlertCircle size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-200 truncate">{n.text}</p>
                      <p className="text-[10px] text-slate-500">من: {n.createdBy} · {new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <button onClick={() => {
                        try {
                          const next = Array.from(new Set([...dismissedIds, n.id]));
                          localStorage.setItem('alaria_notes_dismissed', JSON.stringify(next));
                          setDismissedIds(next);
                          setShowNotifications(false);
                        } catch (e) {}
                      }} className="text-xs text-slate-400">تم</button>
                    </div>
                  </div>
                ))}

                {renderLowStockSection()}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-700 mx-2"></div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
          {/* Network Status */}
          <div className="flex items-center gap-2" title={isOnline ? 'متصل بالشبكة' : 'غير متصل'}>
            {isOnline ? (
              <div className="flex items-center gap-1.5">
                <Wifi size={14} className="text-green-500" />
                <span className="text-[10px] font-bold text-green-500">متصل</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <WifiOff size={14} className="text-red-500" />
                <span className="text-[10px] font-bold text-red-500">منقطع</span>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-600"></div>

          {/* License Status */}
          <div className="flex items-center gap-2" title={licenseStatus?.type === 'TRIAL' ? `ترخيص تجريبي - ${licenseStatus?.daysLeft || 0} أيام متبقية` : 'ترخيص فعال'}>
            {licenseStatus?.status === 'TRIAL' ? (
              <div className="flex items-center gap-1.5">
                <Clock size={14} className={licenseStatus?.daysLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-amber-500'} />
                <span className={`text-[10px] font-bold ${licenseStatus?.daysLeft <= 3 ? 'text-red-500' : 'text-amber-500'}`}>
                  {licenseStatus?.daysLeft || 0}د
                </span>
              </div>
            ) : licenseStatus?.status === 'ACTIVATED' ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[10px] font-bold text-green-500">مفعل</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-yellow-500" />
                <span className="text-[10px] font-bold text-yellow-500">ينتظر</span>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-600"></div>

          {/* System Name */}
          <div className="flex items-center gap-1.5">
            <Package size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 max-w-[80px] truncate" title={systemName}>{systemName || 'النظام'}</span>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-700 mx-2"></div>

        <div className="flex items-center gap-4">
          <div className="text-left">
            <p className="text-sm font-bold text-slate-100">{user.name}</p>
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">{user.role}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-2.5 bg-slate-800 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all border border-slate-700 shadow-sm"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
