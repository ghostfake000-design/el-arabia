
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, Item, Movement, Unit, Warehouse, Supplier, Employee, Custody, AppPermission
} from './types';
import { 
  INITIAL_UNITS, INITIAL_WAREHOUSES, INITIAL_SUPPLIERS, 
  INITIAL_EMPLOYEES 
} from './constants';
import { ShieldCheck, Clock } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './views/Dashboard';
import ItemCoding from './views/ItemCoding';
import Movements from './views/Movements';
import CustodyManagement from './views/CustodyManagement';
import BalancesView from './views/BalancesView';
import InventoryAudit from './views/InventoryAudit';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import UserManagement from './views/UserManagement';
import BasicDataView from './views/BasicDataView';
import Login from './views/Login';

const ALL_PERMISSIONS: AppPermission[] = [
  'VIEW_DASHBOARD', 'VIEW_CODING', 'VIEW_MOVEMENTS', 'VIEW_CUSTODY', 'VIEW_BALANCES',
  'VIEW_INVENTORY', 'VIEW_REPORTS', 'VIEW_USERS', 'VIEW_BASIC_DATA', 'VIEW_SETTINGS',
  'ACTION_ADD_ITEM', 'ACTION_EDIT_ITEM', 'ACTION_DELETE_ITEM', 'ACTION_PRINT_BARCODE',
  'ACTION_LETTER_Z',
  'ACTION_ADD_INWARD', 'ACTION_ADD_OUTWARD', 'ACTION_EDIT_MOVEMENT', 'ACTION_DELETE_MOVEMENT',
  'ACTION_MANAGE_RETURNS', 'ACTION_ADD_CUSTODY', 'ACTION_RETURN_CUSTODY', 'ACTION_SETTLE_CUSTODY',
  'ACTION_COMMIT_SETTLEMENT', 'ACTION_PRINT_AUDIT', 'ACTION_MANAGE_YEAR', 'ACTION_START_NEW_YEAR',
  'ACTION_RESTORE_BACKUP', 'ACTION_BACKUP'
];

const App: React.FC = () => {
  console.log('App.tsx: mount start');
  const getStoredData = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const [user, setUser] = useState<User | null>(null);
  const [financialYears, setFinancialYears] = useState<string[]>(() => getStoredData('alaria_years', ['2026']));
  const [selectedYear, setSelectedYear] = useState<string>(() => localStorage.getItem('alaria_selected_year') || '2026');
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  
  const [usersList, setUsersList] = useState<User[]>(() => getStoredData('alaria_users_list', [
    { 
      id: 'admin-01', 
      username: 'admin', 
      name: 'محمد النعماني', 
      password: '22071906', 
      role: 'ADMIN', 
      permissions: ALL_PERMISSIONS
    }
  ]));
  
  const [bgImage, setBgImage] = useState<string>(() => localStorage.getItem('alaria_bg') || '');
  const [primaryColor, setPrimaryColor] = useState<string>(() => localStorage.getItem('alaria_primary') || '#facc15');
  const [serverUrl, setServerUrl] = useState<string>(() => localStorage.getItem('alaria_server_url') || 'Localhost');

  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (user) {
      idleTimerRef.current = setTimeout(() => {
        handleLogout();
        alert('تم تسجيل الخروج آلياً بسبب الخمول للحفاظ على أمن البيانات.');
      }, 30 * 60 * 1000); 
    }
  }, [user]);

  // استقبال بيانات الترخيص من Electron
  useEffect(() => {
    if ((window as any).ipcRenderer) {
      (window as any).ipcRenderer.on('license-info', (_event: any, info: any) => {
        setLicenseInfo(info);
      });
    }
  }, []);

  // التحقق الدوري من الترخيص (كل 60 ثانية) للتأكد من عدم انتهائه
  useEffect(() => {
    if (!user) return; // لا نتحقق إذا كان المستخدم لم يسجل الدخول بعد

    const checkLicenseInterval = setInterval(async () => {
      try {
        const ipc = (window as any).ipcRenderer;
        if (ipc) {
          const status = await ipc.invoke('check-license-status');
          setLicenseInfo(status);
          
          // إذا انتهت الفترة التجريبية أثناء الاستخدام
          if (status.status === 'REQUIRE_ACTIVATION' && status.expired) {
            alert('⏰ انتهت الفترة التجريبية. يرجى إدخال رمز ترخيص جديد للمتابعة.');
            handleLogout();
            // إعادة فتح نافذة الترخيص
            ipc.invoke('reopen-license-window').catch(() => {});
          }
        }
      } catch (e) {
        // تجاهل الأخطاء
      }
    }, 60000); // كل 60 ثانية

    return () => clearInterval(checkLicenseInterval);
  }, [user]);

  useEffect(() => {
    window.addEventListener('mousedown', resetIdleTimer);
    window.addEventListener('keypress', resetIdleTimer);
    resetIdleTimer();
    return () => {
      window.removeEventListener('mousedown', resetIdleTimer);
      window.removeEventListener('keypress', resetIdleTimer);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  const handleLogout = () => {
    setUser(null);
    setActiveTab('dashboard');
  };

  useEffect(() => {
    const prefix = `alaria_${selectedYear}_`;
    setItems(getStoredData(`${prefix}items`, []));
    setMovements(getStoredData(`${prefix}movements`, []));
    setCustodies(getStoredData(`${prefix}custody`, []));
    setUnits(getStoredData(`${prefix}units`, INITIAL_UNITS));
    setWarehouses(getStoredData(`${prefix}warehouses`, INITIAL_WAREHOUSES));
    setSuppliers(getStoredData(`${prefix}suppliers`, INITIAL_SUPPLIERS));
    setEmployees(getStoredData(`${prefix}employees`, INITIAL_EMPLOYEES));
  }, [selectedYear]);

  useEffect(() => {
    if (!selectedYear) return;
    const prefix = `alaria_${selectedYear}_`;
    localStorage.setItem(`${prefix}items`, JSON.stringify(items));
    localStorage.setItem(`${prefix}movements`, JSON.stringify(movements));
    localStorage.setItem(`${prefix}custody`, JSON.stringify(custodies));
    localStorage.setItem(`${prefix}units`, JSON.stringify(units));
    localStorage.setItem(`${prefix}warehouses`, JSON.stringify(warehouses));
    localStorage.setItem(`${prefix}suppliers`, JSON.stringify(suppliers));
    localStorage.setItem(`${prefix}employees`, JSON.stringify(employees));
  }, [items, movements, custodies, units, warehouses, suppliers, employees, selectedYear]);

  useEffect(() => {
    localStorage.setItem('alaria_users_list', JSON.stringify(usersList));
    localStorage.setItem('alaria_years', JSON.stringify(financialYears));
    localStorage.setItem('alaria_selected_year', selectedYear);
    localStorage.setItem('alaria_bg', bgImage);
    localStorage.setItem('alaria_primary', primaryColor);
    localStorage.setItem('alaria_server_url', serverUrl);
  }, [usersList, financialYears, selectedYear, bgImage, primaryColor, serverUrl]);

  const handleStartNewYear = (newYear: string) => {
    if (financialYears.includes(newYear)) {
      alert('هذه السنة المالية موجودة بالفعل');
      return;
    }
    const itemsWithNewOpeningBalances = items.map(item => ({
      ...item,
      openingBalance: item.currentBalance,
      history: [{
        updatedBy: 'النظام',
        updatedAt: new Date().toISOString(),
        changes: `ترحيل رصيد من السنة المالية السابقة: ${item.currentBalance}`
      }]
    }));
    const newPrefix = `alaria_${newYear}_`;
    localStorage.setItem(`${newPrefix}items`, JSON.stringify(itemsWithNewOpeningBalances));
    localStorage.setItem(`${newPrefix}units`, JSON.stringify(units));
    localStorage.setItem(`${newPrefix}warehouses`, JSON.stringify(warehouses));
    localStorage.setItem(`${newPrefix}suppliers`, JSON.stringify(suppliers));
    localStorage.setItem(`${newPrefix}employees`, JSON.stringify(employees));
    // persist users snapshot for the new year (keeps user management consistent)
    localStorage.setItem(`${newPrefix}users`, JSON.stringify(usersList));
    localStorage.setItem(`${newPrefix}movements`, JSON.stringify([]));
    localStorage.setItem(`${newPrefix}custody`, JSON.stringify([]));
    setFinancialYears([...financialYears, newYear]);
    setSelectedYear(newYear);
    alert(`تم بنجاح بدء السنة المالية ${newYear} وترحيل كافة الأرصدة.`);
  };

  if (!user) {
    return <Login onLogin={setUser} users={usersList} financialYears={financialYears} onYearSelect={setSelectedYear} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard items={items} movements={movements} currentUser={user!} />;
      case 'item-coding': return <ItemCoding items={items} setItems={setItems} units={units} movements={movements} currentUser={user} />;
      case 'movements': return <Movements items={items} setItems={setItems} movements={movements} setMovements={setMovements} units={units} warehouses={warehouses} suppliers={suppliers} employees={employees} currentUser={user} />;
      case 'custody': return <CustodyManagement items={items} custodies={custodies} setCustodies={setCustodies} movements={movements} employees={employees} currentUser={user} setItems={setItems} />;
      case 'balances': return <BalancesView items={items} movements={movements} custodies={custodies} setCustodies={setCustodies} currentUser={user} />;
      case 'inventory': return <InventoryAudit items={items} setItems={setItems} movements={movements} setMovements={setMovements} custodies={custodies} setCustodies={setCustodies} currentUser={user} />;
      case 'reports': return <ReportsView items={items} setItems={setItems} movements={movements} setMovements={setMovements} custodies={custodies} setCustodies={setCustodies} employees={employees} units={units} currentUser={user} />;
      case 'users': return <UserManagement users={usersList} setUsers={setUsersList} currentUser={user} />;
      case 'basic-data': return <BasicDataView items={items} movements={movements} custodies={custodies} units={units} setUnits={setUnits} warehouses={warehouses} setWarehouses={setWarehouses} suppliers={suppliers} setSuppliers={setSuppliers} employees={employees} setEmployees={setEmployees} financialYears={financialYears} setFinancialYears={setFinancialYears} />;
      case 'settings': return (
        <SettingsView 
          bgImage={bgImage} setBgImage={setBgImage} 
          primaryColor={primaryColor} setPrimaryColor={setPrimaryColor} 
          serverUrl={serverUrl} setServerUrl={setServerUrl} 
          items={items} setItems={setItems} 
          units={units} setUnits={setUnits} 
          warehouses={warehouses} setWarehouses={setWarehouses} 
          suppliers={suppliers} setSuppliers={setSuppliers} 
          employees={employees} setEmployees={setEmployees} 
          setMovements={setMovements} setCustodies={setCustodies} 
          users={usersList} setUsers={setUsersList} 
          financialYears={financialYears} setFinancialYears={setFinancialYears}
          onStartNewYear={handleStartNewYear}
          currentUser={user}
        />
      );
      default: return <Dashboard items={items} movements={movements} />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0f172a] dark:bg-[#020617] text-slate-100 font-['Cairo'] overflow-hidden relative transition-colors duration-500">
      {bgImage && (
        <div 
          className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})` }}
        ></div>
      )}
      
      <div className="no-print z-10 h-full flex-shrink-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={user} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 z-10 h-full">
        <div className="no-print flex-shrink-0">
          <Header user={user} onLogout={handleLogout} items={items} />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 print:p-0 print:overflow-visible dark:bg-slate-900/10">
          <div className="mb-4 flex items-center justify-between no-print">
              <div className="flex items-center gap-4">
                {/* Active Year Badge */}
                <div className="flex items-center gap-2 text-[10px] font-black bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700">
                  <span className="text-slate-500 uppercase">السنة المالية النشطة:</span>
                  <span className="text-amber-500">{selectedYear}</span>
                </div>

                {/* License Status Badge */}
                {licenseInfo && (
                  <div className={`flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-xl border animate-in fade-in slide-in-from-right duration-700 ${
                    licenseInfo.status === 'ACTIVATED' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : licenseInfo.daysLeft && licenseInfo.daysLeft <= 3 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  }`}>
                    {licenseInfo.status === 'ACTIVATED' && licenseInfo.type === 'PERMANENT' ? (
                      <>
                        <ShieldCheck size={12} className="text-emerald-500" />
                        <span className="uppercase tracking-tighter">حالة النظام: مفعل (نسخة دائمة)</span>
                      </>
                    ) : licenseInfo.status === 'TRIAL' ? (
                      <>
                        <Clock size={12} className={`${licenseInfo.daysLeft && licenseInfo.daysLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-amber-500 animate-pulse'}`} />
                        <span className="uppercase tracking-tighter">
                          {licenseInfo.daysLeft && licenseInfo.daysLeft <= 3 
                            ? `⚠️ فترة تجريبية (${licenseInfo.daysLeft} أيام فقط متبقية!)`
                            : `نسخة تجريبية (متبقي ${licenseInfo.daysLeft || 0} يوم)`
                          }
                        </span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={12} className="text-amber-500" />
                        <span className="uppercase tracking-tighter">الحالة: غير محددة</span>
                      </>
                    )}
                  </div>
                )}
                {licenseInfo && licenseInfo.daysLeft && licenseInfo.daysLeft <= 3 && licenseInfo.status === 'TRIAL' && (
                  <div className="text-[9px] text-red-400 font-black mt-1 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                    ⏰ تنبيه مهم: ستنتهي الفترة التجريبية قريباً. يرجى تجهيز رمز الترخيص النهائي.
                  </div>
                )}
              </div>
          </div>
          {renderContent()}
        </main>
        <footer className="h-8 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between px-6 no-print flex-shrink-0">
            <div className="flex items-center gap-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> متصل بالشبكة: {serverUrl}</span>
              <span>|</span>
              <span>الشركة العربية لإدارة المعادن v5.2.0 Enterprise</span>
            </div>
            <div className="text-[9px] font-black text-slate-600 uppercase">
              {new Date().toLocaleDateString('ar-EG')} | {new Date().toLocaleTimeString('ar-EG')}
            </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
