
import React, { useState, useMemo } from 'react';
import { 
  Package, Plus, Search, Barcode, Trash2, Edit, 
  History, X, CheckCircle2, Circle, ShieldCheck, AlertTriangle, Hash, Tag, Printer, Layers,
  Wallet, Archive, Layout, ArrowRight, Eye, Check, AlertOctagon, Clock, User as UserIcon,
  Box, MapPin
} from 'lucide-react';
import { Item, Unit, Movement, CustodyState, User, EditHistoryEntry } from '../types';
import { generateId, formatDateTime } from '../utils';
import ConfirmationDialog from '../components/ConfirmationDialog';

interface ItemCodingProps {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  units: Unit[];
  movements: Movement[];
  currentUser: User;
}

const ItemCoding: React.FC<ItemCodingProps> = ({ items, setItems, units, movements, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchShelf, setSearchShelf] = useState('');
  const [searchBox, setSearchBox] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const [newItem, setNewItem] = useState<Partial<Item>>({
    code: '', name: '', unitId: '', openingBalance: 0,
    minThreshold: 0, isThresholdEnabled: true, isCustody: false,
    initialState: 'NEW', price: 0, shelfNumber: '', boxNumber: ''
  });
  
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const validateInt = (val: string) => {
    const cleaned = val.replace(/^0+/, '').replace(/[^0-9]/g, '');
    return cleaned === '' ? 0 : parseInt(cleaned);
  };

  const validateFloat = (val: string) => {
    let cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
    if (cleaned.startsWith('0') && cleaned.length > 1 && cleaned[1] !== '.') {
      cleaned = cleaned.replace(/^0+/, '');
    }
    return cleaned === '' ? '0' : cleaned;
  };

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.code || !newItem.name || !newItem.unitId) {
      showToast('يرجى ملء الباركود واسم الصنف والوحدة', true);
      return;
    }

    const duplicate = items.find(i => 
      (isEditing ? i.id !== selectedItem?.id : true) && 
      (i.code === newItem.code || i.name === newItem.name)
    );

    if (duplicate) {
      showToast(`عذراً، يوجد صنف مسجل مسبقاً بنفس ${duplicate.name === newItem.name ? 'الاسم' : 'الكود'}: (${duplicate.name})`, true);
      return;
    }

    if (isEditing && selectedItem) {
      const changes: string[] = [];
      if (selectedItem.name !== newItem.name) changes.push(`تعديل الاسم من [${selectedItem.name}] إلى [${newItem.name}]`);
      if (selectedItem.code !== newItem.code) changes.push(`تعديل الكود من [${selectedItem.code}] إلى [${newItem.code}]`);
      if (selectedItem.price !== Number(newItem.price)) changes.push(`تعديل السعر من [${selectedItem.price}] إلى [${newItem.price}]`);
      if (selectedItem.shelfNumber !== newItem.shelfNumber) changes.push(`تغيير الرف من [${selectedItem.shelfNumber || 'فارغ'}] إلى [${newItem.shelfNumber || 'فارغ'}]`);
      if (selectedItem.boxNumber !== newItem.boxNumber) changes.push(`تغيير البوكس من [${selectedItem.boxNumber || 'فارغ'}] إلى [${newItem.boxNumber || 'فارغ'}]`);
      if (selectedItem.minThreshold !== Number(newItem.minThreshold)) changes.push(`تعديل حد الأمان إلى [${newItem.minThreshold}]`);
      
      const updatedItem: Item = {
        ...selectedItem,
        ...newItem as Item,
        history: [
          ...(selectedItem.history || []),
          {
            updatedBy: currentUser.name,
            updatedAt: new Date().toISOString(),
            changes: changes.length > 0 ? changes.join(' | ') : 'تعديل بيانات عامة'
          }
        ]
      };
      setItems(items.map(i => i.id === selectedItem.id ? updatedItem : i));
      showToast('تم حفظ التعديلات وتوثيقها في السجل');
    } else {
      const item: Item = {
        id: generateId(),
        code: newItem.code!,
        name: newItem.name!,
        unitId: newItem.unitId!,
        openingBalance: Math.floor(Number(newItem.openingBalance || 0)),
        currentBalance: Math.floor(Number(newItem.openingBalance || 0)),
        minThreshold: Math.floor(Number(newItem.minThreshold || 0)),
        isThresholdEnabled: !!newItem.isThresholdEnabled,
        isCustody: !!newItem.isCustody,
        initialState: newItem.isCustody ? (newItem.initialState || 'NEW') : 'NEW',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.name,
        price: Number(newItem.price || 0),
        shelfNumber: newItem.shelfNumber || '',
        boxNumber: newItem.boxNumber || '',
        history: [{
          updatedBy: currentUser.name,
          updatedAt: new Date().toISOString(),
          changes: 'تكويد الصنف لأول مرة'
        }]
      };
      setItems([...items, item]);
      showToast('تمت إضافة الصنف الجديد بنجاح');
    }
    setShowModal(false);
  };

  const handlePrintBarcode = async (item: Item) => {
    if (!currentUser.permissions.includes('ACTION_PRINT_BARCODE')) {
       showToast('عذراً، ليس لديك صلاحية طباعة الباركود', true);
       return;
    }

    const escapedName = item.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedCode = item.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Generate SVG barcode here (renderer) using local `jsbarcode` dependency, then open a print window
    try {
      const JsBarcodeModule = await import('jsbarcode');
      const JsBarcode: any = JsBarcodeModule && (JsBarcodeModule.default || JsBarcodeModule);
      const svgElem = document.createElementNS('http://www.w3.org/2000/svg','svg');
      JsBarcode(svgElem, escapedCode, {
        format: 'CODE128',
        displayValue: true,
        font: 'monospace',
        fontSize: 10,
        height: 38,
        width: 1.1,
        margin: 0
      });

      const printWindow = window.open('', '_blank', 'width=600,height=400');
      if (!printWindow) {
        showToast('تعذر فتح نافذة الطباعة', true);
        return;
      }

      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>باركود - ${escapedName}</title>
            <style>
              @page { size: 58mm 30mm; margin: 0; }
              html,body { height: 100%; margin: 0; padding: 0; }
              body { font-family: 'Cairo', sans-serif; display: flex; align-items: center; justify-content: center; background: #fff; }
              .label { width: 58mm; height: 30mm; box-sizing: border-box; padding: 4px 6px; display: flex; flex-direction: column; justify-content: space-between; border: none; }
              .company { font-size: 8px; font-weight: 700; color: #333; text-align: center; }
              .item-name { font-size: 11px; font-weight: 800; line-height: 1.05; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
              svg { height: 38px; width: auto; display: block; }
              .code-text { font-family: monospace; font-size: 11px; font-weight: 700; text-align: center; margin-top: 2px; letter-spacing: 2px; }
              .location { font-size: 8px; color: #444; display: flex; justify-content: space-between; gap:6px; margin-top:3px; }
              @media print { body { -webkit-print-color-adjust: exact; } .label { padding: 2mm 3mm; } }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="company">الشركة العربية لصهر وتشكيل المعادن</div>
              <span class="item-name">${escapedName}</span>
              ${svgElem.outerHTML}
              <div class="code-text">${escapedCode}</div>
              <div class="location"><span>الرف: ${item.shelfNumber || '--'}</span><span>البوكس: ${item.boxNumber || '--'}</span></div>
            </div>
            <script>
              window.onload = function() { setTimeout(function(){ window.print(); setTimeout(function(){ window.close(); }, 400); }, 250); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      showToast('تم إرسال أمر الطباعة بنجاح');
    } catch (err) {
      console.error('Print barcode error', err);
      showToast('فشل توليد الباركود محلياً', true);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const matchText = it.name.toLowerCase().includes(searchTerm.toLowerCase()) || it.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchShelf = !searchShelf || it.shelfNumber.toLowerCase().includes(searchShelf.toLowerCase());
      const matchBox = !searchBox || it.boxNumber.toLowerCase().includes(searchBox.toLowerCase());
      return matchText && matchShelf && matchBox;
    });
  }, [items, searchTerm, searchShelf, searchBox]);

  const openEdit = (item: Item) => {
    if (!currentUser.permissions.includes('ACTION_EDIT_ITEM')) {
        showToast('عذراً، ليس لديك صلاحية تعديل الأصناف', true);
        return;
    }
    setSelectedItem(item);
    setNewItem({ ...item });
    setIsEditing(true);
    setShowModal(true);
  };

  const openCreate = () => {
    if (!currentUser.permissions.includes('ACTION_ADD_ITEM')) {
        showToast('عذراً، ليس لديك صلاحية إضافة أصناف جديدة', true);
        return;
    }
    setIsEditing(false);
    setNewItem({
      code: '', name: '', unitId: units[0]?.id || '', openingBalance: 0,
      minThreshold: 0, isThresholdEnabled: true, isCustody: false,
      initialState: 'NEW', price: 0, shelfNumber: '', boxNumber: ''
    });
    setShowModal(true);
  };

  const attemptDelete = (id: string) => {
    if (!currentUser.permissions.includes('ACTION_DELETE_ITEM')) {
        showToast('عذراً، ليس لديك صلاحية حذف الأصناف', true);
        return;
    }
    setDeleteItemId(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-['Cairo'] relative">
      
      {/* Toast Messages */}
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
          <h2 className="text-3xl font-black text-white">تكويد وإدارة الأصناف</h2>
          <p className="text-slate-400 mt-1 font-bold">إدارة بيانات {items.length} صنف مسجل في قاعدة البيانات</p>
        </div>
        {currentUser.permissions.includes('ACTION_ADD_ITEM') && (
            <button 
                onClick={openCreate}
                className="bg-sky-500 hover:bg-sky-400 text-white font-black py-3 px-8 rounded-2xl flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
                <Plus size={20} />
                <span>إضافة صنف جديد</span>
            </button>
        )}
      </div>

      <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-[2.5rem] border border-slate-700/50 shadow-2xl overflow-hidden p-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" size={20} />
            <input 
              type="text" placeholder="بحث بالاسم أو الباركود..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pr-12 pl-6 text-sm outline-none font-bold text-white focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
          <div className="relative">
            <Archive className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" placeholder="رقم الرف..." value={searchShelf} onChange={(e) => setSearchShelf(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pr-12 pl-6 text-sm outline-none font-bold text-white focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
          <div className="relative">
            <Layout className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" placeholder="رقم البوكس..." value={searchBox} onChange={(e) => setSearchBox(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pr-12 pl-6 text-sm outline-none font-bold text-white focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-[2.5rem] border border-slate-700/50 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-700">
                <th className="px-6 py-5">الباركود</th>
                <th className="px-6 py-5">اسم الصنف</th>
                <th className="px-6 py-5">الموقع</th>
                <th className="px-6 py-5">الحالة</th>
                <th className="px-6 py-5 text-center">السعر</th>
                <th className="px-6 py-5 text-center">الرصيد</th>
                <th className="px-6 py-5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-all group">
                  <td className="px-6 py-5">
                    <span className="bg-slate-900 text-sky-400 font-mono text-xs px-3 py-1.5 rounded-lg border border-slate-700 font-black">{item.code}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-100 text-sm">{item.name}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">{units.find(u => u.id === item.unitId)?.name || 'بدون وحدة'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex gap-2 text-[10px] font-black">
                      <span className="bg-slate-900/50 text-slate-400 px-2 py-1 rounded border border-slate-800">رف: {item.shelfNumber || '--'}</span>
                      <span className="bg-slate-900/50 text-slate-400 px-2 py-1 rounded border border-slate-800">بوكس: {item.boxNumber || '--'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      {item.isCustody ? (
                        <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-[9px] font-black border border-amber-500/20 w-fit flex items-center gap-1">
                          <ShieldCheck size={10}/> عهدة ({item.initialState === 'NEW' ? 'جديد' : item.initialState === 'USED' ? 'مستعمل' : 'هالك'})
                        </span>
                      ) : (
                        <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[9px] font-black border border-blue-500/20 w-fit flex items-center gap-1">
                          <Package size={10}/> مخزون
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-amber-500 font-black text-sm">{Number(item.price).toLocaleString()} <small className="text-[8px]">ج.م</small></span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-xl font-black ${item.isThresholdEnabled && item.currentBalance <= item.minThreshold ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                        {Math.floor(item.currentBalance)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-1 transition-opacity">
                      <button onClick={() => handlePrintBarcode(item)} className="p-2 bg-slate-900 rounded-lg text-slate-200 hover:text-amber-500 border border-slate-700 shadow-sm" title="طباعة باركود (ZD220)"><Printer size={16} /></button>
                        {currentUser.permissions.includes('ACTION_LETTER_Z') && (
                          <button onClick={async () => {
                            let host: string | null = null;
                            if ((window as any).electronAPI && (window as any).electronAPI.askPrinterIp) {
                              host = await (window as any).electronAPI.askPrinterIp();
                            } else {
                              host = prompt('أدخل عنوان الطابعة (IP) لطابعة Zebra (مثال: 192.168.1.50) - اتركه فارغاً لاستخدام الطباعة الاعتيادية');
                            }
                            if (host !== null) {
                              // generate simple ZPL for the item
                              const zpl = `^XA^CF0,30^FO20,10^FD${item.name}^FS^BY2,2,60^FO20,40^BCN,60,Y,N,N^FD${item.code}^FS^FO20,110^FDرف:${item.shelfNumber || '--'} بوكس:${item.boxNumber || '--'}^FS^XZ`;
                              if ((window as any).electronAPI && (window as any).electronAPI.printZpl) {
                                (window as any).electronAPI.printZpl({ zpl, host, port: 9100 }).then((res: any) => {
                                  if (res && res.success) showToast('تم إرسال ZPL للطابعة الشبكية'); else showToast('فشل إرسال ZPL: ' + (res && res.error ? res.error : 'خطأ غير معروف'), true);
                                });
                              } else {
                                showToast('واجهة الطباعة غير متاحة', true);
                              }
                            }
                          }} className="p-2 bg-slate-900 rounded-lg text-slate-200 hover:text-emerald-400 border border-slate-700 shadow-sm" title="طباعة ZPL مباشر (شبكي)">Z</button>
                        )}
                      {currentUser.permissions.includes('ACTION_EDIT_ITEM') && <button onClick={() => openEdit(item)} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-sky-400 border border-slate-700 shadow-sm" title="تعديل"><Edit size={16} /></button>}
                      <button onClick={() => { setSelectedItem(item); setShowAuditModal(true); }} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-emerald-400 border border-slate-700 shadow-sm" title="سجل التعديلات"><Eye size={16} /></button>
                      {currentUser.permissions.includes('ACTION_DELETE_ITEM') && <button onClick={() => attemptDelete(item.id)} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-red-400 border border-slate-700 shadow-sm" title="حذف"><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#1e293b] w-full max-w-5xl rounded-[3rem] border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-sky-500/10 text-sky-400 rounded-2xl shadow-lg">
                  {isEditing ? <Edit size={32} /> : <Plus size={32} />}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white">{isEditing ? 'تعديل بيانات الصنف' : 'تكويد صنف جديد'}</h3>
                  <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Al-Arabia Inventory Control Unit</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white border border-slate-700 transition-all active:scale-95">&times;</button>
            </div>
            
            <form onSubmit={handleSaveItem} className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Barcode and Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mr-2"><Barcode size={14} className="text-sky-400" /> باركود الصنف (فريد)</label>
                  <input required type="text" value={newItem.code} onChange={(e) => setNewItem({...newItem, code: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-mono text-white focus:ring-2 focus:ring-sky-500/50" placeholder="622..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mr-2"><Tag size={14} className="text-sky-400" /> اسم الصنف والمواصفات</label>
                  <input required type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-bold text-white focus:ring-2 focus:ring-sky-500/50" placeholder="مثلاً: صاج حديد 2مم" />
                </div>

                {/* 2. Unit and Price */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mr-2"><Layers size={14} className="text-sky-400" /> وحدة القياس</label>
                  <select required value={newItem.unitId} onChange={(e) => setNewItem({...newItem, unitId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-bold text-white appearance-none shadow-sm">
                    <option value="">-- اختر الوحدة --</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mr-2"><Wallet size={14} className="text-amber-500" /> سعر الوحدة (افتتاحي)</label>
                  <input type="text" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: Number(validateFloat(e.target.value))})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 font-black text-amber-500 outline-none focus:ring-2 focus:ring-amber-500/50 shadow-sm" placeholder="0.00" />
                </div>

                {/* 3. Location: Shelf and Box */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mr-2"><MapPin size={14} className="text-sky-400" /> رقم الرف (Shelf)</label>
                  <input type="text" value={newItem.shelfNumber} onChange={(e) => setNewItem({...newItem, shelfNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none text-white font-bold shadow-sm" placeholder="مثلاً: A-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mr-2"><Box size={14} className="text-sky-400" /> رقم البوكس (Box)</label>
                  <input type="text" value={newItem.boxNumber} onChange={(e) => setNewItem({...newItem, boxNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none text-white font-bold shadow-sm" placeholder="مثلاً: B-25" />
                </div>

                {/* 4. Opening Balance */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mr-2"><Hash size={14} className="text-emerald-400" /> رصيد أول المدة (المخزون الحالي)</label>
                  <input type="text" value={newItem.openingBalance} onChange={(e) => !isEditing && setNewItem({...newItem, openingBalance: validateInt(e.target.value)})} disabled={isEditing} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 font-black text-white outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 shadow-sm text-2xl" placeholder="0" />
                </div>

                {/* 5. Toggles Area */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-4">
                     <button type="button" onClick={() => setNewItem({...newItem, isCustody: !newItem.isCustody})}
                      className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${newItem.isCustody ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-inner' : 'bg-slate-900 border-slate-800 text-slate-600'}`}
                     >
                       <div className="flex items-center gap-3 text-right">
                          <ShieldCheck size={24} />
                          <div>
                             <p className="font-black text-sm">تصنيف كعهدة</p>
                             <p className="text-[9px] font-bold opacity-60">أدوات، ماكينات، معدات فنية</p>
                          </div>
                       </div>
                       {newItem.isCustody ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                     </button>

                     {newItem.isCustody && (
                       <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20 animate-in slide-in-from-top-2 duration-300">
                         <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-3 block">الحالة الابتدائية للعهدة في المخزن:</label>
                         <div className="grid grid-cols-3 gap-2">
                           {['NEW', 'USED', 'SCRAP'].map((s) => (
                             <button
                               key={s}
                               type="button"
                               onClick={() => setNewItem({...newItem, initialState: s as CustodyState})}
                               className={`py-2 px-1 rounded-xl text-[10px] font-black border-2 transition-all ${
                                 newItem.initialState === s 
                                 ? 'bg-amber-500 border-amber-600 text-black' 
                                 : 'bg-slate-800 border-slate-700 text-slate-500'
                               }`}
                             >
                               {s === 'NEW' ? 'جديد' : s === 'USED' ? 'مستعمل' : 'هالك'}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>

                   <div className="space-y-4">
                     <button type="button" onClick={() => setNewItem({...newItem, isThresholdEnabled: !newItem.isThresholdEnabled})}
                      className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${newItem.isThresholdEnabled ? 'bg-sky-500/10 border-sky-500/50 text-sky-400 shadow-inner' : 'bg-slate-900 border-slate-800 text-slate-600'}`}
                     >
                       <div className="flex items-center gap-3 text-right">
                          <AlertTriangle size={24} />
                          <div>
                             <p className="font-black text-sm">تفعيل حد الطلب</p>
                             <p className="text-[9px] font-bold opacity-60">تنبيه عند اقتراب نفاذ المخزون</p>
                          </div>
                       </div>
                       {newItem.isThresholdEnabled ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                     </button>
                     
                     {newItem.isThresholdEnabled && (
                       <div className="p-4 bg-sky-500/5 rounded-2xl border border-sky-500/20 animate-in slide-in-from-top-2 duration-300">
                         <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest mb-2 block">أقل كمية مسموحة (حد الأمان):</label>
                         <input 
                           type="text" 
                           value={newItem.minThreshold} 
                           onChange={(e) => setNewItem({...newItem, minThreshold: validateInt(e.target.value)})}
                           className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl py-2 px-4 font-black text-white outline-none focus:border-sky-500"
                           placeholder="مثلاً: 10"
                         />
                       </div>
                     )}
                   </div>
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                 <button type="submit" className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-black py-5 rounded-[2rem] shadow-2xl transition-all active:scale-95 text-lg flex items-center justify-center gap-3">
                    <Check size={24}/> {isEditing ? 'حفظ التعديلات النهائية' : 'تأكيد وحفظ الصنف الجديد'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Audit History Modal */}
      {showAuditModal && selectedItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-[#1e293b] w-full max-w-3xl rounded-[3rem] border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
              <div className="p-8 border-b border-slate-700/50 bg-slate-800/30 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg"><History size={28}/></div>
                    <div>
                      <h3 className="text-2xl font-black text-white">سجل تعديلات الصنف</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1">{selectedItem.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAuditModal(false)} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white border border-slate-700 transition-all active:scale-95">&times;</button>
              </div>
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                 {selectedItem.history && selectedItem.history.length > 0 ? (
                   <div className="space-y-4 relative">
                      <div className="absolute top-0 bottom-0 right-4 w-0.5 bg-slate-800"></div>
                      {[...selectedItem.history].reverse().map((h, i) => (
                        <div key={i} className="relative pr-10">
                           <div className="absolute right-2 top-2 w-4 h-4 rounded-full border-4 border-[#1e293b] bg-emerald-500 z-10"></div>
                           <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700">
                              <div className="flex justify-between items-center mb-3">
                                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-500">
                                    <Clock size={12}/> {formatDateTime(h.updatedAt)}
                                 </div>
                                 <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-sky-400 border border-slate-700 shadow-sm">
                                    <UserIcon size={12}/> {h.updatedBy}
                                 </div>
                              </div>
                              <p className="text-xs font-bold text-slate-200 leading-relaxed">{h.changes}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="py-20 text-center text-slate-700 font-black text-xl italic opacity-30">لا توجد سجلات تعديل مؤرشفة لهذا الصنف</div>
                 )}
              </div>
           </div>
        </div>
      )}

      {deleteItemId && (
        <ConfirmationDialog 
          isOpen={true} onClose={() => setDeleteItemId(null)} 
          onConfirm={() => { setItems(items.filter(i => i.id !== deleteItemId)); setDeleteItemId(null); showToast('تم حذف الصنف نهائياً من النظام'); }}
          title="حذف صنف نهائياً" message="تنبيه أمني: سيتم حذف كافة سجلات الحركة والأرصدة المرتبطة بهذا الصنف من النظام. هذه العملية غير قابلة للتراجع."
        />
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ItemCoding;
