
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, RotateCcw, ArrowDown, ArrowUp, X, Check, 
  Barcode, Tag, Activity, Clock, ChevronLeft, User, Truck, 
  ClipboardList, Info, MessageSquare, Calendar, UserCheck, AlertOctagon,
  ArrowRight, Wallet, Edit, Trash2, CheckCircle2, Eye
} from 'lucide-react';
import { 
  Item, Movement, MovementType, Unit, Warehouse, 
  Supplier, Employee, User as UserType 
} from '../types';
import { generateId, formatDateTime } from '../utils';
import ConfirmationDialog from '../components/ConfirmationDialog';

interface MovementsProps {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  movements: Movement[];
  setMovements: React.Dispatch<React.SetStateAction<Movement[]>>;
  units: Unit[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  employees: Employee[];
  currentUser: UserType;
}

const Movements: React.FC<MovementsProps> = ({ 
  items, setItems, movements, setMovements, units, warehouses, suppliers, employees, currentUser 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  
  const [movementType, setMovementType] = useState<MovementType>('INWARD');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [activeMovement, setActiveMovement] = useState<Movement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    quantity: '',
    docNumber: '',
    warehouseId: '',
    supplierId: '',
    employeeId: '',
    note: '',
    unitPrice: '',
    returnQty: '',
    returnDoc: ''
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

  const cleanInt = (val: string) => {
    const cleaned = val.replace(/^0+/, '').replace(/[^0-9]/g, '');
    return cleaned;
  };

  const cleanFloat = (val: string) => {
    let cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
    if (cleaned.startsWith('0') && cleaned.length > 1 && cleaned[1] !== '.') {
      cleaned = cleaned.replace(/^0+/, '');
    }
    return cleaned;
  };

  const todayName = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date());

  const handleBarcodeChange = (val: string) => {
    setBarcodeInput(val);
    const found = items.find(i => i.code === val);
    if (found) {
      setSelectedItemId(found.id);
      if (movementType === 'INWARD') setFormData(f => ({...f, unitPrice: found.price.toString()}));
    } else {
      setSelectedItemId('');
    }
  };

  const handleItemSelect = (id: string) => {
    setSelectedItemId(id);
    const found = items.find(i => i.id === id);
    if (found) {
      setBarcodeInput(found.code);
      if (movementType === 'INWARD') setFormData(f => ({...f, unitPrice: found.price.toString()}));
    } else {
      setBarcodeInput('');
    }
  };

  const openAddModal = (type: MovementType) => {
    setMovementType(type);
    setFormData({
      quantity: '', docNumber: '', warehouseId: warehouses[0]?.id || '',
      supplierId: suppliers[0]?.id || '', employeeId: employees[0]?.id || '',
      note: '', unitPrice: '', returnQty: '', returnDoc: ''
    });
    setSelectedItemId('');
    setBarcodeInput('');
    setShowModal(true);
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find(it => it.id === selectedItemId);
    if (!item) {
        showToast('يرجى اختيار الصنف أولاً', true);
        return;
    }

    const qty = parseInt(formData.quantity || '0');
    if (qty <= 0) { 
        showToast('يرجى إدخال كمية صحيحة أكبر من الصفر', true); 
        return; 
    }

    if (movementType === 'OUTWARD' && qty > item.currentBalance) {
      showToast(`لا يمكن الصرف! الكمية المطلوبة أكبر من المتاح (${item.currentBalance})`, true);
      return;
    }

    const price = parseFloat(formData.unitPrice || '0');
    const newBalance = movementType === 'INWARD' ? item.currentBalance + qty : item.currentBalance - qty;

    const newMovement: Movement = {
      id: generateId(),
      itemId: selectedItemId,
      type: movementType,
      quantity: qty,
      unitId: item.unitId,
      docNumber: formData.docNumber,
      warehouseId: movementType === 'OUTWARD' ? formData.warehouseId : undefined,
      supplierId: movementType === 'INWARD' ? formData.supplierId : undefined,
      employeeId: movementType === 'OUTWARD' ? formData.employeeId : undefined,
      performedBy: currentUser.name, // استخدام الاسم الوظيفي
      timestamp: new Date().toISOString(),
      balanceAfter: newBalance,
      note: formData.note,
      unitPrice: price > 0 ? price : undefined,
      returnedQuantity: 0,
      history: [{
        updatedBy: currentUser.name,
        updatedAt: new Date().toISOString(),
        changes: `تسجيل الحركة لأول مرة (${movementType === 'INWARD' ? 'وارد' : 'منصرف'})`
      }]
    };

    setItems(items.map(it => it.id === item.id ? { 
      ...it, 
      currentBalance: newBalance,
      price: movementType === 'INWARD' && price > 0 ? price : it.price
    } : it));

    setMovements([newMovement, ...movements]);
    setShowModal(false);
    showToast('تم تسجيل الحركة بنجاح');
  };

  const handleReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMovement) return;
    const item = items.find(i => i.id === activeMovement.itemId);
    if (!item) return;

    const retQty = parseInt(formData.returnQty || '0');
    const maxAvailableToReturn = activeMovement.quantity - activeMovement.returnedQuantity;

    if (retQty <= 0 || retQty > maxAvailableToReturn) {
      showToast(`الكمية المرتجعة غير صحيحة، المتاح للرد هو ${maxAvailableToReturn}`, true);
      return;
    }

    const balanceDiff = activeMovement.type === 'INWARD' ? -retQty : retQty;
    const newBalance = item.currentBalance + balanceDiff;

    setItems(items.map(it => it.id === item.id ? { ...it, currentBalance: newBalance } : it));
    setMovements(movements.map(m => m.id === activeMovement.id ? {
      ...m,
      returnedQuantity: m.returnedQuantity + retQty,
      returnDocNumber: formData.returnDoc,
      balanceAfter: m.balanceAfter + balanceDiff,
      history: [
        ...(m.history || []),
        {
            updatedBy: currentUser.name,
            updatedAt: new Date().toISOString(),
            changes: `تسجيل مرتجع بكمية [${retQty}] بسند [${formData.returnDoc}]`
        }
      ]
    } : m));

    setShowReturnModal(false);
    showToast('تم عمل المرتجع بنجاح');
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMovement) return;
    const item = items.find(i => i.id === activeMovement.itemId);
    if (!item) return;

    const newQty = parseInt(formData.quantity || '0');
    const oldQty = activeMovement.quantity;
    const diff = newQty - oldQty;

    if (activeMovement.type === 'OUTWARD' && diff > 0 && diff > item.currentBalance) {
      showToast('لا يمكن زيادة كمية المنصرف لعدم وجود رصيد كافي', true);
      return;
    }

    const balanceAdjustment = activeMovement.type === 'INWARD' ? diff : -diff;
    const newCurrentBalance = item.currentBalance + balanceAdjustment;

    const changesLog: string[] = [];
    if (newQty !== oldQty) changesLog.push(`تعديل الكمية من [${oldQty}] إلى [${newQty}]`);
    if (formData.docNumber !== activeMovement.docNumber) {
        changesLog.push(`تعديل السند من [${activeMovement.docNumber}] إلى [${formData.docNumber}]`);
    }
    if (formData.unitPrice !== (activeMovement.unitPrice || 0).toString()) {
        changesLog.push(`تعديل السعر`);
    }

    setItems(items.map(it => it.id === item.id ? { ...it, currentBalance: newCurrentBalance } : it));
    setMovements(movements.map(m => m.id === activeMovement.id ? {
      ...m,
      quantity: newQty,
      docNumber: formData.docNumber,
      note: formData.note,
      unitPrice: parseFloat(formData.unitPrice || '0') || m.unitPrice,
      lastModifiedBy: currentUser.name, // الاسم الوظيفي
      lastModifiedAt: new Date().toISOString(),
      balanceAfter: m.balanceAfter + balanceAdjustment,
      history: [
        ...(m.history || []),
        {
            updatedBy: currentUser.name,
            updatedAt: new Date().toISOString(),
            changes: changesLog.length > 0 ? changesLog.join(' | ') : 'تعديل بيانات الحركة العامة'
        }
      ]
    } : m));

    setShowEditModal(false);
    showToast('تم تعديل الحركة بنجاح');
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const m = movements.find(x => x.id === deleteId);
    if (!m) return;
    const item = items.find(i => i.id === m.itemId);
    if (item) {
      const effect = m.type === 'INWARD' ? -(m.quantity - m.returnedQuantity) : (m.quantity - m.returnedQuantity);
      setItems(items.map(it => it.id === item.id ? { ...it, currentBalance: it.currentBalance + effect } : it));
    }
    setMovements(movements.filter(x => x.id !== deleteId));
    setDeleteId(null);
    showToast('تم الحذف بنجاح');
  };

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const item = items.find(i => i.id === m.itemId);
      const matchesSearch = item?.name.toLowerCase().includes(filterSearch.toLowerCase()) || 
                          item?.code.toLowerCase().includes(filterSearch.toLowerCase()) ||
                          m.docNumber.toLowerCase().includes(filterSearch.toLowerCase());
      
      const mDate = m.timestamp.split('T')[0];
      const matchesStart = !startDate || mDate >= startDate;
      const matchesEnd = !endDate || mDate <= endDate;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [movements, filterSearch, startDate, endDate, items]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-['Cairo'] relative">
      
      {successMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[250] bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black animate-in slide-in-from-top duration-300 border-2 border-emerald-400/50">
           <CheckCircle2 size={24} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[250] bg-rose-600 text-white px-10 py-6 rounded-2xl shadow-2xl flex items-center gap-4 font-black animate-in slide-in-from-top duration-300 border-2 border-rose-400/50 text-center max-w-xl">
           <AlertOctagon size={32} className="shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="bg-amber-500 text-black px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">{todayName}</span>
             <h2 className="text-3xl font-black text-white">حركة المخازن والتشغيل</h2>
          </div>
          <p className="text-slate-400 font-bold">إدارة أذونات الوارد والمنصرف والمرتجعات</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => openAddModal('INWARD')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg active:scale-95">
            <ArrowDown size={20} /> تسجيل إذن وارد
          </button>
          <button onClick={() => openAddModal('OUTWARD')} className="bg-rose-600 hover:bg-rose-500 text-white font-black py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg active:scale-95">
            <ArrowUp size={20} /> تسجيل إذن صرف
          </button>
        </div>
      </div>

      <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-[2.5rem] border border-slate-700/50 p-8 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2 relative">
             <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
             <input type="text" placeholder="بحث بالصنف أو الكود أو المستند..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pr-12 pl-6 font-bold text-white outline-none focus:ring-2 focus:ring-sky-500/50" />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 mr-2 uppercase">من تاريخ</label>
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white font-bold text-xs" />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 mr-2 uppercase">إلى تاريخ</label>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white font-bold text-xs" />
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-[2.5rem] border border-slate-700/50 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-700">
                <th className="px-6 py-5">التاريخ</th>
                <th className="px-6 py-5">الصنف</th>
                <th className="px-6 py-5">النوع</th>
                <th className="px-6 py-5">المصدر/الوجهة</th>
                <th className="px-6 py-5">المسؤول</th>
                <th className="px-6 py-5 text-center">الكمية</th>
                <th className="px-6 py-5 text-center text-amber-300">الكمية المرتجعة</th>
                <th className="px-6 py-5 text-center text-indigo-400">الصافي</th>
                <th className="px-6 py-5 text-center text-emerald-400">الرصيد بعد</th>
                <th className="px-6 py-5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredMovements.map(m => {
                const item = items.find(it => it.id === m.itemId);
                const isOut = m.type === 'OUTWARD';
                const source = isOut 
                  ? (employees.find(e => e.id === m.employeeId)?.name || warehouses.find(w => w.id === m.warehouseId)?.name || '-')
                  : (suppliers.find(s => s.id === m.supplierId)?.name || '-');

                return (
                  <tr key={m.id} className={`hover:bg-slate-800/30 transition-all group ${isOut ? 'bg-rose-500/5' : 'bg-emerald-500/5'}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-100">{formatDateTime(m.timestamp).split(' ')[0]}</span>
                        <span className="text-[9px] text-slate-500 font-bold">{formatDateTime(m.timestamp).split(' ')[1]} {formatDateTime(m.timestamp).split(' ')[2]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-100 text-sm">{item?.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">سند: {m.docNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${isOut ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                         {isOut ? 'مصروف' : 'وارد'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-400 max-w-[150px] truncate">{source}</td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-1.5">
                          <UserCheck size={12} className="text-sky-500" />
                          <span className="text-[10px] text-slate-400 font-black">{m.performedBy}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-slate-200 text-lg">{m.quantity}</td>
                    <td className="px-6 py-4 text-center font-black text-amber-300 text-lg">{m.returnedQuantity && m.returnedQuantity > 0 ? m.returnedQuantity : '-'}</td>
                    <td className="px-6 py-4 text-center font-black text-indigo-400 text-lg">{m.quantity - m.returnedQuantity}</td>
                    <td className="px-6 py-4 text-center font-black text-emerald-400 text-xl">{Math.floor(m.balanceAfter)}</td>
                    <td className="px-6 py-4">
                       <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setActiveMovement(m); setShowAuditModal(true); }} className="p-2 bg-slate-900 rounded-lg text-emerald-400 hover:bg-emerald-400 hover:text-white border border-slate-700 transition-all" title="سجل تعديلات الحركة"><Eye size={16}/></button>
                          {currentUser.permissions.includes('ACTION_MANAGE_RETURNS') && (
                            <button onClick={() => { setActiveMovement(m); setFormData(f => ({...f, returnQty: '', returnDoc: ''})); setShowReturnModal(true); }} className="p-2 bg-slate-900 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white border border-slate-700 transition-all" title="عمل مرتجع"><RotateCcw size={16}/></button>
                          )}
                          {/* Fix: Corrected permission name from ACTION_EDIT_MOVEMENTS to ACTION_EDIT_MOVEMENT to match types.ts */}
                          {currentUser.permissions.includes('ACTION_EDIT_MOVEMENT') && (
                            <button onClick={() => { setActiveMovement(m); setFormData(f => ({...f, quantity: m.quantity.toString(), docNumber: m.docNumber, note: m.note || '', unitPrice: (m.unitPrice || '').toString()})); setShowEditModal(true); }} className="p-2 bg-slate-900 rounded-lg text-sky-400 hover:bg-sky-400 hover:text-white border border-slate-700 transition-all" title="تعديل"><Edit size={16}/></button>
                          )}
                          {/* Fix: Corrected permission name from ACTION_DELETE_MOVEMENTS to ACTION_DELETE_MOVEMENT to match types.ts */}
                          {currentUser.permissions.includes('ACTION_DELETE_MOVEMENT') && (
                            <button onClick={() => setDeleteId(m.id)} className="p-2 bg-slate-900 rounded-lg text-rose-400 hover:bg-rose-400 hover:text-white border border-slate-700 transition-all" title="حذف"><Trash2 size={16}/></button>
                          )}
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#1e293b] w-full max-w-4xl rounded-[3rem] border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className={`p-10 border-b border-slate-700/50 flex justify-between items-center ${movementType === 'INWARD' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-2xl shadow-xl ${movementType === 'INWARD' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                  {movementType === 'INWARD' ? <ArrowDown size={32} /> : <ArrowUp size={32} />}
                </div>
                <div>
                   <h3 className="text-3xl font-black text-white">{movementType === 'INWARD' ? 'تحرير إذن وارد' : 'تحرير إذن صرف'}</h3>
                   <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">تتبع مخزني دقيق - الشركة العربية</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white border border-slate-700 transition-all"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveMovement} className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Barcode size={14}/> مسح الباركود</label>
                  <input ref={barcodeRef} type="text" value={barcodeInput} onChange={e => handleBarcodeChange(e.target.value)} placeholder="مرر قارئ الباركود..." className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-mono font-black text-sky-400 focus:ring-2 focus:ring-sky-500/50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Tag size={14}/> اختيار الصنف بالاسم</label>
                  <select required value={selectedItemId} onChange={e => handleItemSelect(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-bold text-white focus:ring-2 focus:ring-sky-500/50 appearance-none">
                    <option value="">-- اختر الصنف --</option>
                    {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center justify-between">
                    <span>الكمية المطلوبة</span>
                    {selectedItemId && movementType === 'OUTWARD' && (
                      <span className="text-amber-500 font-black bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                        الرصيد المتاح: {items.find(i => i.id === selectedItemId)?.currentBalance || 0}
                      </span>
                    )}
                  </label>
                  <input required type="text" value={formData.quantity} onChange={e => setFormData({...formData, quantity: cleanInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none text-2xl font-black text-white shadow-inner" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Wallet size={14}/> {movementType === 'INWARD' ? 'سعر الوحدة (شراء)' : 'سعر التكلفة التقديري'}</label>
                  <input type="text" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: cleanFloat(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-black text-amber-500" placeholder="0.00" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">رقم السند الدفتري</label>
                  <input required type="text" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-mono text-xl font-black text-white" placeholder="DOC-000" />
                </div>

                {movementType === 'INWARD' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Truck size={14}/> اسم المورد</label>
                    <select value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-bold text-slate-200">
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><UserCheck size={14}/> الموظف المستلم</label>
                      <select value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-bold text-slate-200">
                        <option value="">-- اختياري --</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Activity size={14}/> المخزن الوجهة</label>
                      <select value={formData.warehouseId} onChange={e => setFormData({...formData, warehouseId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-bold text-slate-200">
                        <option value="">-- اختياري --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
                
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14}/> ملاحظات إضافية</label>
                  <textarea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none text-slate-300 font-bold min-h-[80px]" placeholder="أية تفاصيل تخص الحركة..." />
                </div>
              </div>

              <button type="submit" className={`w-full py-6 rounded-[2.5rem] font-black text-xl text-white shadow-2xl transition-all active:scale-95 ${movementType === 'INWARD' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}`}>
                {movementType === 'INWARD' ? 'تأكيد ترحيل الوارد' : 'تأكيد ترحيل المنصرف'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Audit Modal (سجل تعديلات الحركة) */}
      {showAuditModal && activeMovement && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-[#1e293b] w-full max-w-3xl rounded-[3rem] border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
              <div className="p-8 border-b border-slate-700/50 bg-indigo-500/10 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg"><Eye size={28}/></div>
                    <div>
                      <h3 className="text-2xl font-black text-white">سجل تعديلات الحركة</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1">تتبع كافة التغييرات التي طرأت على هذا السند المخزني</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAuditModal(false)} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white border border-slate-700 transition-all shadow-lg active:scale-95">&times;</button>
              </div>
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                 <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mb-6 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase mb-1">الصنف:</p>
                        <p className="text-sm font-black text-white">{items.find(i => i.id === activeMovement.itemId)?.name}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase mb-1">رقم السند:</p>
                        <p className="text-sm font-black text-indigo-400 font-mono">{activeMovement.docNumber}</p>
                    </div>
                 </div>
                 
                 {(activeMovement.history || []).length > 0 ? (
                   <div className="space-y-4 relative">
                      <div className="absolute top-0 bottom-0 right-4 w-0.5 bg-slate-800"></div>
                      {[...(activeMovement.history || [])].reverse().map((h, i) => (
                        <div key={i} className="relative pr-10">
                           <div className="absolute right-2 top-2 w-4 h-4 rounded-full border-4 border-[#1e293b] bg-indigo-500 z-10"></div>
                           <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm">
                              <div className="flex justify-between items-center mb-3">
                                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                                    <Clock size={12}/> {formatDateTime(h.updatedAt)}
                                 </div>
                                 <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-sky-400 border border-slate-700">
                                    <UserCheck size={12}/> {h.updatedBy}
                                 </div>
                              </div>
                              <p className="text-xs font-bold text-slate-200 leading-relaxed">{h.changes}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="py-20 text-center text-slate-700 font-black text-xl italic opacity-30">لا توجد سجلات تعديل لهذه الحركة</div>
                 )}
              </div>
              <div className="p-6 bg-slate-800/30 border-t border-slate-700/50 text-center">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Al-Arabia Audit System Protection</p>
              </div>
           </div>
        </div>
      )}

      {/* Advanced Return Modal */}
      {showReturnModal && activeMovement && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-[#1e293b] w-full max-w-xl rounded-[3rem] border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-700/50 bg-amber-500/10 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="p-4 bg-amber-500 text-black rounded-2xl shadow-lg"><RotateCcw size={28}/></div>
                    <h3 className="text-2xl font-black text-white">تحرير إذن مرتجع</h3>
                 </div>
                 <button onClick={() => setShowReturnModal(false)} className="text-slate-500 hover:text-white text-3xl font-black">&times;</button>
              </div>
              <form onSubmit={handleReturn} className="p-10 space-y-6">
                 <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase">بيانات الحركة الأصلية:</p>
                    <p className="font-black text-slate-200">صنف: {items.find(i => i.id === activeMovement.itemId)?.name}</p>
                    <p className="text-xs font-bold text-amber-500">الكمية القابلة للرد: {activeMovement.quantity - activeMovement.returnedQuantity}</p>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 mr-2 uppercase">الكمية المرتجعة حالياً</label>
                       <input required type="text" value={formData.returnQty} onChange={e => setFormData({...formData, returnQty: cleanInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none text-2xl font-black text-white" placeholder="0" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 mr-2 uppercase">رقم سند المرتجع</label>
                       <input required type="text" value={formData.returnDoc} onChange={e => setFormData({...formData, returnDoc: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-mono text-white font-black" placeholder="RET-000" />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-5 rounded-[2rem] shadow-xl transition-all active:scale-95 text-lg">اعتماد سند المرتجع</button>
              </form>
           </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && activeMovement && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-[#1e293b] w-full max-w-xl rounded-[3rem] border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-700/50 bg-sky-500/10 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="p-4 bg-sky-500 text-white rounded-2xl shadow-lg"><Edit size={28}/></div>
                    <h3 className="text-2xl font-black text-white">تعديل بيانات الحركة</h3>
                 </div>
                 <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-white text-3xl font-black">&times;</button>
              </div>
              <form onSubmit={handleEdit} className="p-10 space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 mr-2 uppercase">تعديل الكمية الأصلية</label>
                       <input required type="text" value={formData.quantity} onChange={e => setFormData({...formData, quantity: cleanInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none text-2xl font-black text-white" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 mr-2 uppercase">رقم السند</label>
                       <input required type="text" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-mono text-white font-black" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 mr-2 uppercase">تعديل السعر</label>
                       <input type="text" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: cleanFloat(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-black text-amber-500" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 mr-2 uppercase">الملاحظات</label>
                       <textarea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none text-white font-bold" />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all active:scale-95 text-lg">حفظ التغييرات النهائية</button>
              </form>
           </div>
        </div>
      )}

      {deleteId && (
        <ConfirmationDialog 
          isOpen={true} onClose={() => setDeleteId(null)} onConfirm={confirmDelete}
          title="حذف حركة مخزنية" message="هل أنت متأكد من حذف هذه الحركة؟ سيتم عكس أثرها على رصيد الصنف الحالي فوراً."
        />
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Movements;
