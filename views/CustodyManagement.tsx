
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, RotateCcw, Search, X, ArrowDown, ArrowUp, Hash, Barcode, Tag, Activity, Users, User, 
  ClipboardList, AlertTriangle, UserCheck, AlertCircle, CheckCircle2, History, Trash2, Scale,
  AlertOctagon
} from 'lucide-react';
import { Item, Custody, Employee, User as UserType, CustodyState, Movement } from '../types';
import { generateId, formatDateTime } from '../utils';
import ConfirmationDialog from '../components/ConfirmationDialog';

interface CustodyProps {
  items: Item[]; 
  custodies: Custody[];
  setCustodies: React.Dispatch<React.SetStateAction<Custody[]>>;
  movements: Movement[];
  employees: Employee[];
  currentUser: UserType;
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}

const CustodyManagement: React.FC<CustodyProps> = ({ 
  items, custodies, setCustodies, movements, employees, currentUser, setItems 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'ARCHIVE' | 'CURRENT_HOLDERS'>('CURRENT_HOLDERS');
  const [movementType, setMovementType] = useState<'HANDOVER' | 'RETURN'>('HANDOVER');
  const barcodeRef = useRef<HTMLInputElement>(null);
  
  const [filterSearch, setFilterSearch] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('ALL');
  
  const [selectedItemId, setSelectedItemId] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    employeeId: employees[0]?.id || '',
    quantity: '',
    docNumber: '',
    note: '',
    state: 'NEW' as CustodyState
  });

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const cleanInt = (val: string) => val.replace(/^0+/, '').replace(/[^0-9]/g, '');

  useEffect(() => {
    if (showModal && barcodeRef.current) barcodeRef.current.focus();
  }, [showModal]);

  const custodyItemsOnly = useMemo(() => items.filter(it => it.isCustody), [items]);

  // حساب الرصيد الحالي لصنف معين بناءً على الحالة (NEW, USED, SCRAP)
  const getStockBalanceByState = (itemId: string, state: CustodyState) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;

    let balance = 0;
    // 1. الرصيد الافتتاحي
    if (item.initialState === state) balance = item.openingBalance;
    else if (!item.isCustody && state === 'NEW') balance = item.openingBalance;

    // 2. حركات المخازن (دائماً NEW)
    if (state === 'NEW') {
      movements.filter(m => m.itemId === itemId).forEach(m => {
        const net = m.quantity - (m.returnedQuantity || 0);
        if (m.type === 'INWARD') balance += net;
        else balance -= net;
      });
    }

    // 3. حركات العهد
    custodies.filter(c => c.itemId === itemId && c.state === state).forEach(c => {
      if (c.type === 'HANDOVER') balance -= c.quantity;
      else if (c.type === 'RETURN') balance += c.quantity;
      else if (c.type === 'SETTLEMENT') {
        const isSurplus = c.note?.includes('زيادة');
        balance += (isSurplus ? c.quantity : -c.quantity);
      }
    });

    return Math.floor(balance);
  };

  // حساب ما في ذمة الموظف من صنف معين بناءً على الحالة
  const getEmployeeItemBalanceByState = (empId: string, itemId: string, state: CustodyState) => {
    const history = custodies.filter(c => c.employeeId === empId && c.itemId === itemId && c.state === state);
    const taken = history.filter(c => c.type === 'HANDOVER').reduce((sum, c) => sum + c.quantity, 0);
    const returned = history.filter(c => c.type === 'RETURN' || c.type === 'SETTLEMENT').reduce((sum, c) => sum + c.quantity, 0);
    return taken - returned;
  };

  const handleBarcodeChange = (val: string) => {
    setBarcodeInput(val);
    const found = custodyItemsOnly.find(i => i.code === val);
    if (found) setSelectedItemId(found.id);
    else setSelectedItemId('');
  };

  const handleItemSelect = (id: string) => {
    setSelectedItemId(id);
    const found = custodyItemsOnly.find(i => i.id === id);
    if (found) setBarcodeInput(found.code);
    else setBarcodeInput('');
  };

  const handleOpenModal = (type: 'HANDOVER' | 'RETURN') => {
    setMovementType(type);
    setFormData({
      employeeId: employees[0]?.id || '',
      quantity: '',
      docNumber: '',
      note: '',
      state: type === 'HANDOVER' ? 'NEW' : 'USED'
    });
    setSelectedItemId('');
    setBarcodeInput('');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const qty = parseInt(formData.quantity || '0');
    if (!selectedItemId || !formData.docNumber || qty <= 0) {
      showToast('يرجى إكمال البيانات الأساسية والكمية', true);
      return;
    }

    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;

    if (movementType === 'HANDOVER') {
      const available = getStockBalanceByState(selectedItemId, formData.state);
      if (qty > available) {
        showToast(`عجز! الرصيد المتاح من هذا الصنف بحالة (${formData.state === 'NEW' ? 'جديد' : formData.state === 'USED' ? 'مستعمل' : 'هالك'}) هو (${available}) فقط.`, true);
        return;
      }
    } else {
      if (formData.state === 'NEW') {
        const hasNew = getEmployeeItemBalanceByState(formData.employeeId, selectedItemId, 'NEW');
        if (qty > hasNew) {
          showToast(`خطأ منطقي: لا يمكن استلام الصنف كـ (جديد) لأن الموظف استلم كمية (مستعملة) أو (هالكة). المتاح للاستلام كجديد هو (${hasNew}) فقط.`, true);
          return;
        }
      } else {
        const totalInDebt = getEmployeeItemBalanceByState(formData.employeeId, selectedItemId, 'NEW') + 
                           getEmployeeItemBalanceByState(formData.employeeId, selectedItemId, 'USED');
        
        if (qty > totalInDebt) {
          showToast(`عذراً، إجمالي ما في ذمة الموظف من هذا الصنف هو (${totalInDebt}) فقط. لا يمكن استلام كمية أكبر.`, true);
          return;
        }
      }
    }

    let balanceEffect = 0;
    if (movementType === 'HANDOVER') {
       balanceEffect = -qty;
    } else {
       balanceEffect = (formData.state === 'SCRAP' ? 0 : qty);
    }
    
    const newStockBalance = item.currentBalance + balanceEffect;

    const entry: Custody = {
      id: generateId(),
      itemId: selectedItemId,
      employeeId: formData.employeeId,
      quantity: qty,
      state: formData.state,
      type: movementType,
      timestamp: new Date().toISOString(),
      performedBy: currentUser.name, // استخدام الاسم الوظيفي
      docNumber: formData.docNumber,
      note: formData.note,
      balanceAfter: newStockBalance
    };

    setItems(items.map(it => it.id === item.id ? { ...it, currentBalance: newStockBalance } : it));
    setCustodies([entry, ...custodies]);
    setShowModal(false);
    showToast(movementType === 'HANDOVER' ? 'تم صرف العهدة بنجاح' : 'تم استلام المرتجع وتحديث المخزون');
  };

  const handleInstantSettle = (empId: string, itemId: string, qty: number, itemName: string) => {
    if (!window.confirm(`هل أنت متأكد من تسوية ذمة الموظف من صنف (${itemName}) بالكامل؟ سيتم اعتبار هذه الكمية مفقودة ولن تعود للمخزن الصالح.`)) return;

    const settlement: Custody = {
      id: generateId(),
      itemId,
      employeeId: empId,
      quantity: qty,
      state: 'SCRAP',
      type: 'SETTLEMENT',
      timestamp: new Date().toISOString(),
      performedBy: currentUser.name, // استخدام الاسم الوظيفي
      docNumber: 'SETTLE-' + Date.now().toString().slice(-4),
      note: 'تسوية فورية (إعدام ذمة)',
    };

    setCustodies([settlement, ...custodies]);
    showToast('تمت التسوية وإغلاق العهدة');
  };

  const currentHoldersData = useMemo(() => {
    const balances: Record<string, Record<string, number>> = {};
    custodies.forEach(c => {
      if (!balances[c.employeeId]) balances[c.employeeId] = {};
      const current = balances[c.employeeId][c.itemId] || 0;
      balances[c.employeeId][c.itemId] = c.type === 'HANDOVER' ? current + c.quantity : current - c.quantity;
    });

    const report: any[] = [];
    Object.entries(balances).forEach(([empId, itemsMap]) => {
      Object.entries(itemsMap).forEach(([itemId, qty]) => {
        if (qty > 0) {
          const item = items.find(i => i.id === itemId);
          const emp = employees.find(e => e.id === empId);
          report.push({ empId, itemId, empName: emp?.name || 'مجهول', itemName: item?.name || 'مجهول', itemCode: item?.code || '-', qty });
        }
      });
    });
    return report.filter(r => (filterEmployeeId === 'ALL' || r.empId === filterEmployeeId) && 
                              (r.empName.includes(filterSearch) || r.itemName.includes(filterSearch) || r.itemCode.includes(filterSearch)));
  }, [custodies, items, employees, filterEmployeeId, filterSearch]);

  const archiveData = useMemo(() => {
    return custodies.filter(c => {
      const item = items.find(i => i.id === c.itemId);
      const matchesSearch = item?.name.includes(filterSearch) || item?.code.includes(filterSearch) || c.docNumber.includes(filterSearch);
      const matchesEmp = filterEmployeeId === 'ALL' || c.employeeId === filterEmployeeId;
      return matchesSearch && matchesEmp;
    });
  }, [custodies, filterSearch, filterEmployeeId, items]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-10 font-['Cairo'] relative">
      
      {successMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[250] bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 font-black animate-in slide-in-from-top duration-300 border-2 border-emerald-400/50">
           <CheckCircle2 size={28} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[250] bg-rose-600 text-white px-10 py-6 rounded-[2rem] shadow-2xl flex items-center gap-4 font-black animate-in slide-in-from-top duration-300 border-2 border-rose-400/50 max-w-xl text-center">
           <AlertOctagon size={32} className="shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-900 text-white rounded-[2.5rem] border border-indigo-400/20 shadow-xl">
             <UserCheck size={40} />
           </div>
           <div>
             <h2 className="text-4xl font-black text-white">إدارة ورقابة العُهد</h2>
             <p className="text-slate-400 font-bold mt-1">تتبع ذمم الموظفين والعهد العينية وحالاتها بدقة</p>
           </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => handleOpenModal('HANDOVER')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-10 rounded-2xl flex items-center gap-2 transition-all shadow-lg active:scale-95">
            <ArrowUp size={24} /> صرف عهدة
          </button>
          <button onClick={() => handleOpenModal('RETURN')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-10 rounded-2xl flex items-center gap-2 transition-all shadow-lg active:scale-95">
            <ArrowDown size={24} /> استرداد عهدة
          </button>
        </div>
      </div>

      <div className="bg-[#1e293b]/50 backdrop-blur-md p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
           <div className="md:col-span-2 relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input type="text" placeholder="بحث بالصنف أو الموظف أو المستند..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pr-12 pl-6 font-bold text-white focus:ring-2 focus:ring-indigo-500/20" />
           </div>
           <select value={filterEmployeeId} onChange={e => setFilterEmployeeId(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 text-white font-bold appearance-none">
              <option value="ALL">كل الموظفين</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
           </select>
           <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
             <button onClick={() => setViewMode('CURRENT_HOLDERS')} className={`flex-1 py-2 px-4 rounded-xl text-[11px] font-black transition-all ${viewMode === 'CURRENT_HOLDERS' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>العهد الحالية</button>
             <button onClick={() => setViewMode('ARCHIVE')} className={`flex-1 py-2 px-4 rounded-xl text-[11px] font-black transition-all ${viewMode === 'ARCHIVE' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>سجل العمليات</button>
           </div>
        </div>

        <div className="overflow-x-auto rounded-[2rem] border border-slate-700/50">
          <table className="w-full text-right border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-700">
                {viewMode === 'CURRENT_HOLDERS' ? (
                  <>
                    <th className="px-6 py-5">الموظف المسئول</th>
                    <th className="px-6 py-5">بيان الصنف</th>
                    <th className="px-6 py-5 text-center">الكمية المتبقية</th>
                    <th className="px-6 py-5 text-center">إجراءات سريعة</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-5">التاريخ</th>
                    <th className="px-6 py-5">رقم السند</th>
                    <th className="px-6 py-5">الصنف</th>
                    <th className="px-6 py-5">الموظف</th>
                    <th className="px-6 py-5">المسؤول</th>
                    <th className="px-6 py-5 text-center">النوع</th>
                    <th className="px-6 py-5 text-center">الكمية</th>
                    <th className="px-6 py-5 text-center">الحالة</th>
                    <th className="px-6 py-5 text-emerald-400">رصيد المخزن بعد</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {viewMode === 'CURRENT_HOLDERS' ? currentHoldersData.map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-all">
                  <td className="px-6 py-5 font-black text-slate-100">{r.empName}</td>
                  <td className="px-6 py-5 flex flex-col">
                    <span className="font-bold text-slate-200">{r.itemName}</span>
                    <span className="text-[10px] font-mono text-slate-500">{r.itemCode}</span>
                  </td>
                  <td className="px-6 py-5 text-center font-black text-amber-500 text-2xl bg-amber-500/5">{r.qty}</td>
                  <td className="px-6 py-5 text-center">
                     <div className="flex justify-center gap-2">
                        <button onClick={() => { setMovementType('RETURN'); setFormData(f => ({...f, employeeId: r.empId, quantity: r.qty.toString()})); setSelectedItemId(r.itemId); setBarcodeInput(r.itemCode); setShowModal(true); }} className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-md"><RotateCcw size={16} /> استرداد</button>
                        <button onClick={() => handleInstantSettle(r.empId, r.itemId, r.qty, r.itemName)} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-md"><Scale size={16} /> تسوية فورية</button>
                     </div>
                  </td>
                </tr>
              )) : archiveData.map(c => {
                const item = items.find(i => i.id === c.itemId);
                const emp = employees.find(e => e.id === c.employeeId);
                return (
                  <tr key={c.id} className={`hover:bg-slate-800/30 transition-all ${c.type === 'HANDOVER' ? 'bg-indigo-500/5' : 'bg-emerald-500/5'}`}>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{formatDateTime(c.timestamp)}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-100 font-black">{c.docNumber}</td>
                    <td className="px-6 py-4 font-black text-slate-200 text-xs">{item?.name}</td>
                    <td className="px-6 py-4 font-bold text-slate-400 text-xs">{emp?.name}</td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-1.5">
                          <UserCheck size={12} className="text-indigo-400" />
                          <span className="text-[10px] text-slate-400 font-black">{c.performedBy}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${c.type === 'HANDOVER' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                         {c.type === 'HANDOVER' ? 'صرف' : 'استلام'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-slate-100 text-lg">{c.quantity}</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-2 py-0.5 rounded text-[9px] font-black ${c.state === 'NEW' ? 'bg-emerald-500/20 text-emerald-400' : c.state === 'USED' ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'}`}>
                         {c.state === 'NEW' ? 'جديد' : c.state === 'USED' ? 'مستعمل' : 'هالك'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-emerald-400 text-xl">{Math.floor(c.balanceAfter || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#1e293b] w-full max-w-4xl rounded-[3rem] border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className={`p-10 border-b border-slate-700/50 flex justify-between items-center ${movementType === 'HANDOVER' ? 'bg-indigo-500/10' : 'bg-emerald-500/10'}`}>
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-2xl shadow-xl ${movementType === 'HANDOVER' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
                  {movementType === 'HANDOVER' ? <ArrowUp size={32} /> : <ArrowDown size={32} />}
                </div>
                <h3 className="text-3xl font-black text-white">{movementType === 'HANDOVER' ? 'تحرير إذن صرف عهدة' : 'تحرير إذن استرداد عهدة'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white border border-slate-700 transition-all shadow-lg">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Barcode size={14}/> مسح الباركود</label>
                  <input ref={barcodeRef} type="text" value={barcodeInput} onChange={e => handleBarcodeChange(e.target.value)} placeholder="مرر قارئ الباركود..." className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-mono font-black text-sky-400 focus:ring-2 focus:ring-sky-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Tag size={14}/> اختيار الصنف بالاسم</label>
                  <select required value={selectedItemId} onChange={e => handleItemSelect(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-bold text-white appearance-none">
                    <option value="">-- اختر الصنف --</option>
                    {custodyItemsOnly.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><User size={14}/> الموظف المسئول</label>
                  <select required value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-bold text-white">
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Hash size={14}/> رقم السند الدفتري</label>
                  <input required type="text" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-mono text-xl font-black text-white" placeholder="DOC-000" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><ClipboardList size={14}/> حالة العهدة في هذا الإذن</label>
                  <select required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value as CustodyState})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-bold text-white">
                    {movementType === 'HANDOVER' ? (
                       <>
                         <option value="NEW">جديد (صرف من رصيد الزيرو)</option>
                         <option value="USED">مستعمل (صرف من المرتجعات)</option>
                       </>
                    ) : (
                       <>
                         <option value="USED">مستعمل (تم استهلاكه جزئياً)</option>
                         <option value="SCRAP">هالك (تلف نهائي)</option>
                         <option value="NEW">جديد (لم يستخدم - استلام كما هو)</option>
                       </>
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">الكمية</label>
                  <input required type="text" value={formData.quantity} onChange={e => setFormData({...formData, quantity: cleanInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none text-2xl font-black text-white" placeholder="0" />
                  {selectedItemId && (
                    <div className="mt-2 p-3 bg-slate-900/50 rounded-xl border border-slate-800 space-y-1">
                      {movementType === 'HANDOVER' ? (
                        <p className="text-[10px] font-black text-indigo-400">
                          المتاح في المخزن ({formData.state}): {getStockBalanceByState(selectedItemId, formData.state)}
                        </p>
                      ) : (
                        <p className="text-[10px] font-black text-emerald-400">
                          إجمالي ما في ذمة الموظف: {getEmployeeItemBalanceByState(formData.employeeId, selectedItemId, 'NEW') + getEmployeeItemBalanceByState(formData.employeeId, selectedItemId, 'USED')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">ملاحظات إضافية</label>
                  <textarea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none text-slate-300 font-bold min-h-[80px]" />
                </div>
              </div>

              <button type="submit" className={`w-full py-6 rounded-[2.5rem] font-black text-xl text-white shadow-2xl transition-all active:scale-95 ${movementType === 'HANDOVER' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                تأكيد واعتماد الإذن
              </button>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default CustodyManagement;
