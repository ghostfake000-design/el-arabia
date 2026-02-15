
import React, { useState, useRef } from 'react';
import { 
  Settings, Database, Download, Upload, ShieldCheck, Server, Lock, 
  Clock, ShieldAlert, Save, CalendarDays, AlertTriangle, Key
} from 'lucide-react';
import { Unit, Warehouse, Supplier, Employee, Item, Movement, Custody, User } from '../types';

interface SettingsProps {
  bgImage: string; setBgImage: (img: string) => void;
  primaryColor: string; setPrimaryColor: (color: string) => void;
  serverUrl: string; setServerUrl: (url: string) => void;
  items: Item[]; setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  units: Unit[]; setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
  warehouses: Warehouse[]; setWarehouses: React.Dispatch<React.SetStateAction<Warehouse[]>>;
  suppliers: Supplier[]; setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  employees: Employee[]; setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  setMovements: React.Dispatch<React.SetStateAction<Movement[]>>;
  setCustodies: React.Dispatch<React.SetStateAction<Custody[]>>;
  users: User[]; setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  financialYears: string[]; setFinancialYears: React.Dispatch<React.SetStateAction<string[]>>;
  onStartNewYear: (year: string) => void;
  currentUser: User;
}

const SettingsView: React.FC<SettingsProps> = ({ 
  bgImage, setBgImage, primaryColor, setPrimaryColor, serverUrl, setServerUrl, items, setItems, 
  units, setUnits, warehouses, setWarehouses, suppliers, setSuppliers, employees, setEmployees,
  setMovements, setCustodies, users, setUsers, financialYears, setFinancialYears, onStartNewYear, currentUser
}) => {
  // استثناء "محمد النعماني" من قفل الإعدادات
  const isBypassUser = currentUser.name === 'محمد النعماني';
  const [isLocked, setIsLocked] = useState(!isBypassUser);
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'NETWORK' | 'MAINTENANCE' | 'FISCAL_YEAR'>('MAINTENANCE');
  const [newYearInput, setNewYearInput] = useState('');
  const [autoBackupHour, setAutoBackupHour] = useState<string>(() => {
    const stored = localStorage.getItem('alaria_auto_backup_hour');
    return stored ? String(stored) : '22';
  });
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState<boolean>(() => localStorage.getItem('alaria_auto_backup_enabled') === 'true');
  const [systemBackups, setSystemBackups] = React.useState<string[]>([]);
  const [backupDest, setBackupDest] = React.useState<string>(() => localStorage.getItem('alaria_backup_dest') || '');
  const [backupFrequency, setBackupFrequency] = React.useState<string>(() => localStorage.getItem('alaria_backup_frequency') || 'daily');
  const [printerName, setPrinterName] = useState<string>(() => localStorage.getItem('alaria_printer_name') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '19661099') {
      setIsLocked(false);
    } else {
      alert('كلمة مرور الإعدادات غير صحيحة!');
    }
  };

  const handleFullBackup = () => {
    if (!currentUser.permissions.includes('ACTION_BACKUP')) {
      alert('عذراً، ليس لديك صلاحية عمل نسخة احتياطية.');
      return;
    }

    // Export all localStorage data to server snapshot
    const allData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('alaria_')) {
        allData[key] = localStorage.getItem(key);
      }
    }
    
    // Send snapshot to main process
    const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;
    if (ipc) {
      ipc.invoke('export-user-data-snapshot', allData).catch(() => {});
    }

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AlArabia_Comprehensive_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const callCreateSystemBackup = async () => {
    try {
      // Export snapshot first
      const allData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('alaria_')) {
          allData[key] = localStorage.getItem(key);
        }
      }
      const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;
      if (!ipc) return alert('وظيفة النظام غير متاحة في وضع الويب');
      // Send snapshot
      await ipc.invoke('export-user-data-snapshot', allData).catch(() => {});
      // Create backup
      const res = await ipc.invoke('create-backup', backupDest || undefined);
      if (res && res.success) {
        refreshSystemBackups();
        alert('تم إنشاء نسخة نظامية: ' + res.path);
      } else {
        alert('فشل إنشاء النسخة النظامية: ' + (res && res.error));
      }
    } catch (e) { alert('خطأ عند طلب النسخة النظامية'); }
  };

  const refreshSystemBackups = async () => {
    try {
      const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;
      if (!ipc) return;
      const res = await ipc.invoke('list-backups');
      if (res && res.success) setSystemBackups(res.backups || []);
    } catch (e) {}
  };

  const restoreSystemBackup = async (p: string) => {
    try {
      if (!window.confirm('ستتم استعادة نسخة النظام المحددة (سيتم استبدال ملفات المستخدم المحلي). استمرار؟')) return;
      const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;
      if (!ipc) return alert('وظيفة النظام غير متاحة');
      const res = await ipc.invoke('restore-backup', p);
      if (res && res.success) {
        alert('تم استعادة النسخة. أعد تشغيل التطبيق للتأكد من تطبيق التغييرات.');
        window.location.reload();
      } else alert('فشل الاستعادة: ' + (res && res.error));
    } catch (e) { alert('فشل استعادة النسخة'); }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser.permissions.includes('ACTION_RESTORE_BACKUP')) {
      alert('ليس لديك صلاحية استعادة البيانات!');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (window.confirm('سيتم حذف كافة البيانات الحالية واستبدالها بالنسخة المرفوعة. استمرار؟')) {
          localStorage.clear();
          Object.entries(data).forEach(([key, value]) => {
             localStorage.setItem(key, value as string);
          });
          alert('تم استعادة البيانات بنجاح. سيتم إعادة تشغيل النظام.');
          window.location.reload();
        }
      } catch (err) { alert('فشل في معالجة ملف النسخة الاحتياطية!'); }
    };
    reader.readAsText(file);
  };

  const saveAutoBackupSettings = () => {
    try {
      // Validate input
      const hourNum = parseInt(autoBackupHour, 10);
      if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
        alert('الساعة يجب أن تكون بين 0 و 23');
        return;
      }
      // Export snapshot first
      const allData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('alaria_')) {
          allData[key] = localStorage.getItem(key);
        }
      }
      const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;
      if (ipc) {
        ipc.invoke('export-user-data-snapshot', allData).catch(() => {});
        ipc.invoke('update-backup-schedule', { 
          enabled: isAutoBackupEnabled, 
          hour: String(hourNum), 
          dest: backupDest,
          frequency: backupFrequency
        });
      }
      // Persist to localStorage immediately
      localStorage.setItem('alaria_auto_backup_hour', String(hourNum));
      localStorage.setItem('alaria_auto_backup_enabled', String(isAutoBackupEnabled));
      localStorage.setItem('alaria_backup_dest', backupDest);
      localStorage.setItem('alaria_backup_frequency', backupFrequency);
      localStorage.setItem('alaria_printer_name', printerName);
      alert('تم حفظ إعدادات الجدولة بنجاح');
    } catch (e) { alert('فشل حفظ إعدادات الجدولة: ' + (e instanceof Error ? e.message : String(e))); }
  };

  React.useEffect(() => {
    // load system backups on mount
    refreshSystemBackups();
    // load backup-config from main process if available
    try {
      const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;
      if (ipc) {
        ipc.invoke('get-backup-settings').then((res: any) => {
          if (res && res.success && res.config) {
            setAutoBackupHour(String(res.config.hour || '22'));
            setIsAutoBackupEnabled(Boolean(res.config.enabled));
            if (res.config.dest) { setBackupDest(res.config.dest); localStorage.setItem('alaria_backup_dest', res.config.dest); }
            if (res.config.frequency) { setBackupFrequency(res.config.frequency); localStorage.setItem('alaria_backup_frequency', res.config.frequency); }
          }
        }).catch(() => {});
      }
    } catch (e) {}
  }, []);

  const chooseBackupDestination = async () => {
    try {
      const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;
      if (!ipc) return alert('وظيفة النظام غير متاحة في هذا الوضع');
      const res = await ipc.invoke('choose-backup-dest');
      if (!res) {
        alert('خطأ: لم يتم الحصول على رد من النظام');
        return;
      }
      if (res.canceled) {
        // User cancelled, do nothing
        return;
      }
      if (!res.paths || res.paths.length === 0) {
        alert('لم يتم اختيار مجلد');
        return;
      }
      const selectedPath = res.paths[0];
      setBackupDest(selectedPath);
      localStorage.setItem('alaria_backup_dest', selectedPath);
      // persist into main backup-config as well
      await ipc.invoke('update-backup-schedule', { 
        enabled: isAutoBackupEnabled, 
        hour: autoBackupHour, 
        dest: selectedPath,
        frequency: backupFrequency
      });
      alert('تم اختيار مجلد النسخ المجدول: ' + selectedPath);
    } catch (e) { 
      console.error('chooseBackupDestination error:', e);
      alert('فشل اختيار المجلد: ' + (e instanceof Error ? e.message : String(e))); 
    }
  };

  if (isLocked) {
    return (
      <div className="h-[70vh] flex items-center justify-center animate-in fade-in zoom-in-95">
        <div className="bg-[#1e293b] p-12 rounded-[3rem] border border-slate-700 shadow-2xl w-full max-w-md text-center space-y-8">
           <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
             <Lock size={40} />
           </div>
           <div>
             <h3 className="text-2xl font-black text-white">منطقة محمية</h3>
             <p className="text-slate-500 font-bold mt-2 text-sm">يرجى إدخال كلمة مرور الإعدادات للمتابعة</p>
           </div>
           <form onSubmit={handleUnlock} className="space-y-4">
              <input 
                autoFocus type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 text-center text-2xl tracking-[0.5em] text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="••••••••"
              />
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95">فتح الإعدادات</button>
           </form>
           <p className="text-[10px] text-slate-600 font-bold uppercase">Security Protocol v1.0.9</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 font-['Cairo']">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-slate-800 text-sky-400 rounded-[2rem] border border-slate-700 shadow-xl">
            <Settings size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white">إعدادات النظام المتكاملة</h2>
            <p className="text-slate-400 font-bold mt-1">تحكم سيادي في البيانات والسنوات المالية</p>
          </div>
        </div>
        <div className="flex bg-slate-800/50 p-1.5 rounded-3xl border border-slate-700 shadow-inner overflow-x-auto whitespace-nowrap scrollbar-hide">
           <button onClick={() => setActiveTab('FISCAL_YEAR')} className={`px-10 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === 'FISCAL_YEAR' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>إدارة السنوات المالية</button>
           <button onClick={() => setActiveTab('MAINTENANCE')} className={`px-10 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === 'MAINTENANCE' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>النسخ الاحتياطي</button>
           <button onClick={() => setActiveTab('NETWORK')} className={`px-10 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === 'NETWORK' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>إعدادات الشبكة</button>
        </div>
      </div>

      {activeTab === 'MAINTENANCE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
           <div className="bg-[#1e293b]/50 rounded-[3rem] border border-slate-700 p-10 space-y-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-3xl"><Download size={32}/></div>
                <h3 className="text-2xl font-black text-white">النسخ الاحتياطي الشامل</h3>
              </div>
              <p className="text-slate-500 text-sm font-bold leading-relaxed">تصدير كافة بيانات النظام (كل السنوات، المستخدمين، الحركات) في ملف JSON حقيقي للأرشفة الخارجية.</p>
              <button onClick={handleFullBackup} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                 <Save size={20}/> تصدير قاعدة البيانات الكاملة
              </button>
           </div>

           <div className="bg-[#1e293b]/50 rounded-[3rem] border border-slate-700 p-10 space-y-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-rose-500/10 text-rose-500 rounded-3xl"><Upload size={32}/></div>
                <h3 className="text-2xl font-black text-white">استعادة البيانات</h3>
              </div>
              <p className="text-slate-500 text-sm font-bold leading-relaxed">رفع ملف نسخة احتياطية سابقة لإعادة بناء النظام بالكامل. سيتم حذف البيانات الحالية فوراً.</p>
              <input type="file" accept=".json" onChange={handleRestore} className="hidden" ref={fileInputRef} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                 <ShieldAlert size={20}/> بدء عملية الاستعادة الحقيقية
              </button>
           </div>

           <div className="lg:col-span-2 bg-[#1e293b]/50 rounded-[3rem] border border-slate-700 p-10 space-y-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-amber-500/10 text-amber-500 rounded-3xl"><Clock size={32}/></div>
                <h3 className="text-2xl font-black text-white">الجدولة التلقائية للنسخ (Auto-Snapshot)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                 <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 font-bold text-xs">تفعيل الجدولة:</span>
                    <button onClick={() => { const newVal = !isAutoBackupEnabled; setIsAutoBackupEnabled(newVal); localStorage.setItem('alaria_auto_backup_enabled', String(newVal)); }} className={`w-14 h-8 rounded-full relative transition-all ${isAutoBackupEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                       <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isAutoBackupEnabled ? 'right-7' : 'right-1'}`}></div>
                    </button>
                 </div>
                 <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 font-bold text-xs">ساعة النسخ (24h):</span>
                    <input type="number" min="0" max="23" value={autoBackupHour} onChange={e => { const val = e.target.value; setAutoBackupHour(val); localStorage.setItem('alaria_auto_backup_hour', val); }} className="bg-slate-800 text-white font-black text-center w-20 py-2 rounded-xl outline-none" />
                 </div>
                 <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 font-bold text-xs">التكرار:</span>
                    <select value={backupFrequency} onChange={e => { setBackupFrequency(e.target.value); localStorage.setItem('alaria_backup_frequency', e.target.value); }} className="bg-slate-800 text-white font-black text-sm py-2 px-3 rounded-xl outline-none">
                      <option value="daily">يومي</option>
                      <option value="weekly">أسبوعي</option>
                      <option value="monthly">شهري</option>
                      <option value="quarterly">كل 3 شهور</option>
                      <option value="semi-annual">كل 6 شهور</option>
                      <option value="yearly">سنوي</option>
                    </select>
                 </div>
                 <button onClick={saveAutoBackupSettings} className="bg-sky-600 hover:bg-sky-500 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95">حفظ الإعدادات</button>
              </div>
           </div>
           <div className="mt-6 p-6 bg-[#1e293b]/50 rounded-2xl border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-white">مجلد النسخ المجدول</p>
                  <p className="text-xs text-slate-400">المكان الذي ستحفظ فيه النسخ الأوتوماتيكية (يمكن اختيار فلاشة خارجية)</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={chooseBackupDestination} className="bg-amber-500 hover:bg-amber-400 text-black font-black px-4 py-2 rounded-2xl">تصفح...</button>
                </div>
              </div>
              <div className="text-xs text-slate-300 break-words">{backupDest || 'لم يتم اختيار مجلد؛ الافتراضي: مجلد المستندات\Al-Arabia-Backups'}</div>
           </div>
        </div>
      )}

      {activeTab === 'FISCAL_YEAR' && (
        <div className="bg-[#1e293b]/50 rounded-[3rem] border border-slate-700 p-10 space-y-10 shadow-2xl animate-in zoom-in-95">
           <div className="flex items-center gap-6">
              <div className="p-5 bg-indigo-500/10 text-indigo-400 rounded-[2rem]"><CalendarDays size={40}/></div>
              <div>
                 <h3 className="text-3xl font-black text-white">إدارة السنوات المالية والترحيل</h3>
                 <p className="text-slate-500 text-sm font-bold">بدء دورة مالية جديدة وترحيل الأرصدة النهائية</p>
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="p-8 bg-slate-900/50 rounded-[2.5rem] border border-slate-800 space-y-6">
                 <h4 className="text-xl font-black text-white">بدء سنة مالية جديدة</h4>
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">السنة الجديدة (مثلاً 2027)</label>
                    <div className="flex gap-4">
                       <input 
                         type="text" value={newYearInput} onChange={e => setNewYearInput(e.target.value)}
                         className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 text-white font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500/50"
                         placeholder="20XX"
                       />
                       <button 
                         onClick={() => {
                           if (!currentUser.permissions.includes('ACTION_START_NEW_YEAR')) {
                             alert('عذراً، بدء سنة جديدة متاح للمدير العام فقط');
                             return;
                           }
                           if (newYearInput && window.confirm(`هل أنت متأكد من ترحيل أرصدة السنة الحالية وبدء سنة ${newYearInput}؟`)) {
                             onStartNewYear(newYearInput);
                             setNewYearInput('');
                           }
                         }}
                         className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-10 rounded-2xl shadow-xl transition-all active:scale-95"
                       >تأكيد البدء</button>
                    </div>
                 </div>
              </div>
              <div className="p-8 bg-slate-900/50 rounded-[2.5rem] border border-slate-800 space-y-6">
                 <h4 className="text-xl font-black text-white">السنوات المؤرشفة</h4>
                 <div className="flex flex-wrap gap-3">
                      {financialYears.map(year => (
                        <div key={year} className="px-4 py-3 bg-slate-800 rounded-2xl border border-slate-700 flex items-center gap-3">
                          <span className="text-lg font-black text-white">{year}</span>
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          {year !== localStorage.getItem('alaria_selected_year') && (
                            <button onClick={async () => {
                              if (!currentUser.permissions.includes('ACTION_MANAGE_YEAR')) return alert('ليس لديك صلاحية حذف سنة مالية');
                              if (!window.confirm(`هل تريد حذف السنة ${year} نهائياً؟ سيؤدي ذلك لحذف بياناتها.`)) return;
                              try {
                                // optional system backup before deletion
                                if (window.confirm('نوصي بعمل نسخة نظامية قبل الحذف. إنشاء نسخة الآن؟')) {
                                  const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;
                                  if (ipc) await ipc.invoke('create-backup');
                                }
                                const prefix = `alaria_${year}_`;
                                const keysToRemove: string[] = [];
                                for (let i = 0; i < localStorage.length; i++) {
                                  const k = localStorage.key(i);
                                  if (k && k.startsWith(prefix)) keysToRemove.push(k);
                                }
                                keysToRemove.forEach(k => localStorage.removeItem(k));
                                // also remove year from list
                                const newYears = financialYears.filter(y => y !== year);
                                setFinancialYears(newYears);
                                alert('تم حذف السنة بنجاح');
                              } catch (e) { alert('فشل حذف السنة'); }
                            }} className="ml-2 px-3 py-1 bg-rose-600 hover:bg-rose-500 rounded-md text-xs font-black">حذف</button>
                          )}
                        </div>
                      ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'NETWORK' && (
        <div className="bg-[#1e293b]/50 rounded-[2.5rem] border border-slate-700 shadow-xl p-10 space-y-8">
           <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-3xl"><Server size={32}/></div>
              <h3 className="text-2xl font-black text-white">الربط الشبكي</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <input type="text" value={serverUrl} onChange={e => { const val = e.target.value; setServerUrl(val); localStorage.setItem('alaria_server_url', val); }} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 px-6 text-white font-mono" placeholder="192.168.1.100" />
             <div>
               <label className="text-sm font-black text-slate-400 mb-2 block">اسم الطابعة (USB أو اسم النظام)</label>
               <div className="flex gap-2">
                 <input type="text" value={printerName} onChange={e => { const val = e.target.value; setPrinterName(val); localStorage.setItem('alaria_printer_name', val); }} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-4 px-4 text-white font-mono" placeholder="مثلاً: Zebra ZD220" />
                 <button onClick={async () => {
                   try {
                     const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;
                     if (!ipc) return alert('وظيفة الحفظ غير متاحة في وضع الويب');
                     const res = await ipc.invoke('settings-set', 'printerName', printerName || '');
                     if (res && res.success) alert('تم حفظ اسم الطابعة'); else alert('فشل حفظ اسم الطابعة');
                   } catch (e) { alert('فشل حفظ اسم الطابعة'); }
                 }} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 rounded-2xl">حفظ</button>
               </div>
               <p className="text-xs text-slate-400 mt-2">اترك الحقل فارغاً لتمكين الاكتشاف التلقائي (USB أو الشبكة عندما تدخل IP)</p>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
