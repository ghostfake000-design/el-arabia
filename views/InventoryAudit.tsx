
import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, Search, Save, Package, History, 
  Printer, Download, Info, Layers, CheckCircle2, 
  CheckSquare, Square, Hash, Trash2, ArrowRight, Lock, Eye, Filter,
  ArrowLeft, User as UserIcon, Calendar, FileText, Flame
} from 'lucide-react';
import { Item, Movement, User, Custody, CustodyState } from '../types';
import { generateId, formatDateTime } from '../utils';

interface InventoryAuditProps {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  movements: Movement[];
  setMovements: React.Dispatch<React.SetStateAction<Movement[]>>;
  custodies: Custody[];
  setCustodies: React.Dispatch<React.SetStateAction<Custody[]>>;
  currentUser: User;
}

const InventoryAudit: React.FC<InventoryAuditProps> = ({ 
  items, setItems, movements, setMovements, custodies, setCustodies, currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<'NEW_AUDIT' | 'ARCHIVE'>('NEW_AUDIT');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [manualDocNumber, setManualDocNumber] = useState('');
  const [counts, setCounts] = useState<Record<string, Record<CustodyState, number | string>>>({});
  const [isCommitted, setIsCommitted] = useState(false);
  
  const [selectedArchiveDoc, setSelectedArchiveDoc] = useState<string | null>(null);
  const [archiveFilterType, setArchiveFilterType] = useState<'ALL' | 'AUDIT' | 'SCRAP'>('ALL');

  const getBookBalance = (item: Item, state: CustodyState): number => {
    let balance = 0;
    
    if (!item.isCustody && state === 'NEW') balance = item.openingBalance;
    else if (item.isCustody && item.initialState === state) balance = item.openingBalance;

    if (state === 'NEW') {
      movements.filter(m => m.itemId === item.id).forEach(m => {
        const net = m.quantity - (m.returnedQuantity || 0);
        if (m.type === 'INWARD') balance += net;
        else balance -= net;
      });
    }

    custodies.filter(c => c.itemId === item.id && c.state === state).forEach(c => {
        if (c.auditOnly) return; // ignore audit-only settlements for book balance calculation
        if (c.type === 'HANDOVER') balance -= c.quantity;
        else if (c.type === 'RETURN') balance += c.quantity;
        else if (c.type === 'SETTLEMENT') {
          const isSurplus = c.note?.includes('زيادة');
          balance += (isSurplus ? c.quantity : -c.quantity);
        }
    });

    return Math.max(0, Math.floor(balance));
  };

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const matchSearch = it.name.toLowerCase().includes(searchTerm.toLowerCase()) || it.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSelection = !showOnlySelected || selectedIds.includes(it.id);
      return matchSearch && matchSelection;
    });
  }, [items, searchTerm, showOnlySelected, selectedIds]);

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePrintBlankForm = () => {
    if (selectedIds.length === 0) { alert('يرجى اختيار الأصناف أولاً'); return; }
    if (!manualDocNumber) { alert('يرجى إدخل رقم المحضر اليدوي'); return; }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = items.filter(i => selectedIds.includes(i.id)).map(it => `
      <tr>
        <td style="font-family: monospace;">${it.code}</td>
        <td style="text-align: right;">${it.name}</td>
        <td>${it.isCustody ? 'جديد [ ] مستعمل [ ] هالك [ ]' : 'مخزون عام [ ]'}</td>
        <td style="width: 100px;"></td>
        <td style="width: 150px;"></td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>محضر جرد فارغ - ${manualDocNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 12px; text-align: center; }
            th { background: #f8fafc; }
            .footer { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>محضر جرد مخزني (فارغ)</h1>
            <p>رقم المحضر: <b>${manualDocNumber}</b> | التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>الباركود</th>
                <th>اسم الصنف</th>
                <th>الحالة المستهدفة</th>
                <th>الرصيد الفعلي</th>
                <th>ملاحظات اللجنة</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">
            <div>لجنة الجرد<br/><br/>..................</div>
            <div>أمين المخزن<br/><br/>..................</div>
            <div>اعتماد الإدارة<br/><br/>..................</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintArchiveDoc = (audit: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = audit.details.map((d: any) => `
      <tr>
        <td style="font-family: monospace;">${d.itemCode}</td>
        <td style="text-align: right;"><b>${d.itemName}</b></td>
        <td>${d.state === 'NEW' ? 'جديد' : d.state === 'USED' ? 'مستعمل' : 'هالك'}</td>
        <td>${d.bookQty}</td>
        <td>${d.physicalQty}</td>
        <td style="font-weight:bold; color: ${d.diff > 0 ? 'green' : d.diff < 0 ? 'red' : 'black'}">
          ${d.diff > 0 ? '+' + d.diff : d.diff === 0 ? '--' : d.diff}
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>محضر جرد معتمد - ${audit.docNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 40px; color: #000; }
            .header { text-align: center; border-bottom: 4px double #000; padding-bottom: 20px; margin-bottom: 30px; }
            .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 10px; text-align: center; font-size: 12px; }
            th { background: #f2f2f2; }
            .footer { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; font-weight: 900; }
            .summary { margin-top: 20px; padding: 10px; border: 1px solid #000; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin:0">محضر جرد وتسوية مخزنية (مستند معتمد)</h1>
            <h2 style="margin:5px 0">الشركة العربية لصهر وتشكيل المعادن</h2>
          </div>
          <div class="info">
            <div>رقم المحضر: <span style="font-family:monospace">${audit.docNumber}</span></div>
            <div>تاريخ الاعتماد: ${formatDateTime(audit.timestamp)}</div>
            <div>المسؤول: @${audit.performedBy}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>الباركود</th>
                <th>اسم الصنف والمعدة</th>
                <th>الحالة</th>
                <th>الرصيد الدفتري</th>
                <th>الرصيد الفعلي</th>
                <th>الفارق النواتج</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="summary">
            إجمالي عدد الأصناف بالمحضر: <b>${audit.itemsCount}</b> | 
            صافي الفروقات الجردية: <b style="color: ${audit.totalDiff >= 0 ? 'green' : 'red'}">${audit.totalDiff > 0 ? '+' + audit.totalDiff : audit.totalDiff}</b>
          </div>
          <p style="margin-top:20px; font-size:11px;">* ملاحظة: تم ترحيل هذه القيم آلياً وتعديل الأرصدة في سجلات النظام بناءً على النتائج المذكورة أعلاه.</p>
          <div class="footer">
            <div>توقيع لجنة الجرد<br/><br/>..................</div>
            <div>أمين المخزن المختص<br/><br/>..................</div>
            <div>المدير العام (الاعتماد)<br/><br/>..................</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCommitSettlement = () => {
    if (!manualDocNumber) { alert('يرجى إدخال رقم المحضر اليدوي'); return; }
    
    const isDuplicate = movements.some(m => m.docNumber === manualDocNumber) || custodies.some(c => c.docNumber === manualDocNumber);
    if (isDuplicate) { alert('عذراً، رقم المحضر هذا مسجل مسبقاً في النظام'); return; }

    const auditItems = items.filter(i => selectedIds.includes(i.id));
    let hasChanges = false;

    auditItems.forEach(item => {
      const states: CustodyState[] = item.isCustody ? ['NEW', 'USED', 'SCRAP'] : ['NEW'];
      
      states.forEach(state => {
        const physical = counts[item.id]?.[state];
        if (physical === undefined || physical === '') return;

        const book = getBookBalance(item, state);
        const diff = Number(physical) - book;

        if (diff !== 0) {
          hasChanges = true;
          if (!item.isCustody || state === 'NEW') {
            const newBalance = item.currentBalance + diff;
            const move: Movement = {
              id: generateId(),
              itemId: item.id,
              type: diff > 0 ? 'INWARD' : 'OUTWARD',
              quantity: Math.abs(diff),
              unitId: item.unitId,
              docNumber: manualDocNumber,
              performedBy: currentUser.name, // استخدام الاسم الوظيفي
              timestamp: new Date().toISOString(),
              balanceAfter: newBalance,
              note: `تسوية جردية (محضر ${manualDocNumber}): ${diff > 0 ? 'زيادة' : 'عجز'}`,
              returnedQuantity: 0
            };
            setMovements(prev => [move, ...prev]);
            setItems(prev => prev.map(it => it.id === item.id ? { ...it, currentBalance: newBalance } : it));
          } else {
              if (state === 'SCRAP') {
                // create an audit-only settlement record for archive/reporting, but DO NOT change real balances
                const book = getBookBalance(item, state);
                const cust: Custody = {
                  id: generateId(),
                  itemId: item.id,
                  employeeId: 'SYSTEM',
                  quantity: Math.abs(diff),
                  state: state,
                  type: 'SETTLEMENT',
                  timestamp: new Date().toISOString(),
                  performedBy: currentUser.name,
                  docNumber: manualDocNumber,
                  note: `تسوية جردية هالك (تقرير مؤقت) (محضر ${manualDocNumber}): ${diff > 0 ? 'زيادة' : 'عجز'}`,
                  auditOnly: true,
                  balanceAfter: Number(physical)
                } as any;
                setCustodies(prev => [cust, ...prev]);
              } else {
                const cust: Custody = {
                  id: generateId(),
                  itemId: item.id,
                  employeeId: 'SYSTEM',
                  quantity: Math.abs(diff),
                  state: state,
                  type: 'SETTLEMENT',
                  timestamp: new Date().toISOString(),
                  performedBy: currentUser.name, // استخدام الاسم الوظيفي
                  docNumber: manualDocNumber,
                  note: `تسوية جردية ${state === 'USED' ? 'مستعمل' : 'هالك'} (محضر ${manualDocNumber}): ${diff > 0 ? 'زيادة' : 'عجز'}`,
                };
                setCustodies(prev => [cust, ...prev]);
              }
            }
        }
      });
    });

    if (hasChanges) {
      setIsCommitted(true);
      // Reset form states for next audit entry
      setTimeout(() => {
        setCounts({});
        setSelectedIds([]);
        setManualDocNumber('');
        setIsCommitted(false);
      }, 1500);
      alert('تم اعتماد التسوية الجردية وتحديث الأرصدة بنجاح. جاهز لحركة جديدة');
    } else {
      alert('لم يتم رصد أي فروقات جردية تستدعي التسوية');
    }
  };

  const archiveData = useMemo(() => {
    const allMoves = [
      ...movements.filter(m => m.note?.includes('تسوية جردية')).map(m => ({ ...m, category: 'GENERAL' })),
      ...custodies.filter(c => c.type === 'SETTLEMENT').map(c => ({ ...c, category: 'CUSTODY' }))
    ];
    
    const grouped: Record<string, any> = {};
    allMoves.forEach(m => {
      if (!grouped[m.docNumber]) {
        grouped[m.docNumber] = { 
          docNumber: m.docNumber, 
          timestamp: m.timestamp, 
          performedBy: m.performedBy, 
          itemsCount: 0,
          totalDiff: 0,
          hasScrap: false,
          details: []
        };
      }
      
      const item = items.find(i => i.id === m.itemId);
      const isSurplus = m.type === 'INWARD' || m.note?.includes('زيادة');
      const diff = isSurplus ? m.quantity : -m.quantity;
      
      grouped[m.docNumber].itemsCount++;
      grouped[m.docNumber].totalDiff += diff;
      
      const itemState = 'state' in m ? (m as any).state : 'NEW';
      if (itemState === 'SCRAP') grouped[m.docNumber].hasScrap = true;
      
      const balanceAfter = 'balanceAfter' in m ? (m.balanceAfter || 0) : 0;
      const physicalQty = balanceAfter;
      const bookQty = balanceAfter - diff;

      grouped[m.docNumber].details.push({
        id: m.id,
        itemId: m.itemId,
        itemName: item?.name || 'صنف مجهول',
        itemCode: item?.code || '-',
        state: itemState,
        diff: diff,
        bookQty: bookQty,
        physicalQty: physicalQty
      });
    });

    return Object.values(grouped)
      .filter(a => {
        if (archiveFilterType === 'AUDIT') return !a.hasScrap;
        if (archiveFilterType === 'SCRAP') return a.hasScrap;
        return true;
      })
      .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, custodies, items, archiveFilterType]);

  const selectedAuditDetails = useMemo(() => {
    if (!selectedArchiveDoc) return null;
    const allArchiveData = movements.concat(custodies as any).filter(m => m.docNumber === selectedArchiveDoc);
    const audit: any = { docNumber: selectedArchiveDoc, itemsCount: 0, totalDiff: 0, details: [] };
    const first = allArchiveData[0];
    if(!first) return null;
    audit.timestamp = first.timestamp;
    audit.performedBy = first.performedBy;
    
    allArchiveData.forEach((m: any) => {
      if (m.note?.includes('تسوية جردية') || m.type === 'SETTLEMENT') {
        const item = items.find(i => i.id === m.itemId);
        const isSurplus = m.type === 'INWARD' || m.note?.includes('زيادة');
        const diff = isSurplus ? m.quantity : -m.quantity;
        audit.itemsCount++;
        audit.totalDiff += diff;
        const balanceAfter = m.balanceAfter || 0;
        audit.details.push({
          itemName: item?.name, itemCode: item?.code, state: m.state || 'NEW',
          diff, bookQty: balanceAfter - diff, physicalQty: balanceAfter
        });
      }
    });
    return audit;
  }, [selectedArchiveDoc, movements, custodies, items]);

  return (
    <div className="max-w-[1700px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 font-['Cairo']">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-5 bg-gradient-to-br from-indigo-600 to-blue-900 text-white rounded-[2.5rem] shadow-2xl border border-blue-400/20">
            <ClipboardList size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight">الجرد الفعلي والتسويات</h2>
            <p className="text-slate-400 font-bold mt-1 tracking-tight">إدارة محاضر الجرد الورقية ومطابقتها إلكترونياً</p>
          </div>
        </div>

        <div className="flex bg-slate-800/50 p-1.5 rounded-3xl border border-slate-700 shadow-inner">
           <button onClick={() => { setActiveTab('NEW_AUDIT'); setSelectedArchiveDoc(null); }} className={`px-10 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 ${activeTab === 'NEW_AUDIT' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
             <Package size={16}/> جرد جديد
           </button>
           <button onClick={() => setActiveTab('ARCHIVE')} className={`px-10 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 ${activeTab === 'ARCHIVE' ? 'bg-amber-500 text-black shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
             <History size={16}/> أرشيف المحاضر
           </button>
        </div>
      </div>

      {activeTab === 'NEW_AUDIT' ? (
        <div className="space-y-8">
           <div className="bg-[#1e293b]/50 backdrop-blur-md p-8 rounded-[3.5rem] border border-slate-700/50 shadow-2xl space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                 <div className="md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Hash size={14} className="text-blue-400" /> رقم المحضر الدفتري (إجباري)</label>
                    <input 
                      type="text" value={manualDocNumber} onChange={e => setManualDocNumber(e.target.value)} disabled={isCommitted}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none font-mono text-xl font-black text-white focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                      placeholder="INV-2026-000"
                    />
                 </div>
                 <div className="relative group">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input type="text" placeholder="بحث بالصنف أو الكود..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pr-12 pl-6 font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/20" />
                 </div>
                 <div className="flex gap-4">
                    <button 
                      onClick={() => setShowOnlySelected(!showOnlySelected)}
                      className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all border flex items-center justify-center gap-2 ${showOnlySelected ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    >
                      <Filter size={16}/> {showOnlySelected ? 'عرض الكل' : 'عرض المحدد فقط'}
                    </button>
                    <button onClick={handlePrintBlankForm} disabled={isCommitted} className="bg-white text-black font-black py-4 px-8 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-slate-100 disabled:opacity-30">
                       <Printer size={20}/> طباعة محضر فارغ
                    </button>
                 </div>
              </div>

              <div className="overflow-x-auto rounded-[2.5rem] border border-slate-700/50">
                <table className="w-full text-right border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      <th className="px-6 py-6 border-b border-slate-700 text-center w-16">تحديد</th>
                      <th className="px-8 py-6 border-b border-slate-700">الصنف</th>
                      <th className="px-8 py-6 border-b border-slate-700 text-center">الحالة</th>
                      <th className="px-8 py-6 border-b border-slate-700 text-center bg-slate-900/50">الرصيد الدفتري</th>
                      <th className="px-8 py-6 border-b border-slate-700 text-center text-blue-400">الرصيد الفعلي</th>
                      <th className="px-8 py-6 border-b border-slate-700 text-center">الفارق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredItems.map(item => {
                      const isSelected = selectedIds.includes(item.id);
                      const states: CustodyState[] = item.isCustody ? ['NEW', 'USED', 'SCRAP'] : ['NEW'];
                      
                      return states.map((state, sIdx) => {
                        const book = getBookBalance(item, state);
                        const physical = counts[item.id]?.[state];
                        const diff = (physical !== undefined && physical !== '') ? Number(physical) - book : 0;

                        return (
                          <tr key={`${item.id}-${state}`} className={`hover:bg-slate-800/40 transition-all ${isSelected ? 'bg-blue-500/5' : ''}`}>
                            {sIdx === 0 && (
                              <>
                                <td rowSpan={states.length} className="px-6 py-6 text-center border-l border-slate-800">
                                   <button onClick={() => toggleSelectItem(item.id)} disabled={isCommitted} className={`${isSelected ? 'text-blue-400' : 'text-slate-700'} transition-all`}>
                                      {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                                   </button>
                                </td>
                                <td rowSpan={states.length} className="px-8 py-6">
                                   <p className="font-black text-slate-100">{item.name}</p>
                                   <p className="text-[10px] font-mono text-slate-500 font-bold">{item.code}</p>
                                </td>
                              </>
                            )}
                            <td className="px-8 py-6 text-center">
                               <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${
                                 state === 'NEW' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                 state === 'USED' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' :
                                 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                               }`}>
                                 {state === 'NEW' ? 'جديد' : state === 'USED' ? 'مستعمل' : 'هالك'}
                               </span>
                            </td>
                            <td className="px-8 py-6 text-center bg-slate-900/30">
                               <span className="text-xl font-black text-slate-500">{book}</span>
                            </td>
                            <td className="px-8 py-6 text-center">
                               <input 
                                 type="text" disabled={!isSelected || isCommitted}
                                 value={counts[item.id]?.[state] ?? ''}
                                 onChange={e => {
                                   const val = e.target.value.replace(/[^0-9]/g, '');
                                   setCounts({ ...counts, [item.id]: { ...(counts[item.id] || {}), [state]: val } });
                                 }}
                                 className="w-24 bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-center font-black text-white text-xl outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-20"
                                 placeholder="..."
                               />
                            </td>
                            <td className="px-8 py-6 text-center">
                               <span className={`text-xl font-black ${diff === 0 ? 'text-slate-800' : diff > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {diff === 0 ? '--' : (diff > 0 ? `+${diff}` : diff)}
                               </span>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>

              {!isCommitted && selectedIds.length > 0 && (
                <div className="p-8 bg-blue-600 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-blue-900/40 animate-in slide-in-from-bottom">
                   <div className="flex items-center gap-5">
                      <div className="p-4 bg-white/20 rounded-2xl text-white"><Lock size={32}/></div>
                      <div className="text-white">
                         <h4 className="text-2xl font-black uppercase">تأكيد اعتماد التسوية</h4>
                         <p className="text-blue-100 text-sm font-bold">سيتم قفل هذا المحضر وتعديل أرصدة {selectedIds.length} صنف فوراً</p>
                      </div>
                   </div>
                   <button onClick={handleCommitSettlement} className="bg-white text-blue-600 px-12 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-xl active:scale-95">اعتماد وترحيل الآن</button>
                </div>
              )}
           </div>
        </div>
      ) : (
        <div className="space-y-6">
          {selectedArchiveDoc && selectedAuditDetails ? (
            <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-[3.5rem] border border-slate-700/50 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-500">
               <div className="p-10 border-b border-slate-700/50 bg-amber-500/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-6">
                    <button onClick={() => setSelectedArchiveDoc(null)} className="p-4 bg-slate-800 rounded-2xl text-slate-400 hover:text-white border border-slate-700 transition-all hover:scale-110">
                       <ArrowRight size={24} />
                    </button>
                    <div>
                      <h3 className="text-3xl font-black text-white flex items-center gap-3">
                         تفاصيل المحضر: <span className="text-amber-500 font-mono tracking-widest">{selectedAuditDetails.docNumber}</span>
                      </h3>
                      <div className="flex flex-wrap gap-6 mt-2">
                        <span className="flex items-center gap-2 text-slate-400 font-bold text-sm"><Calendar size={16} className="text-amber-500/60" /> {formatDateTime(selectedAuditDetails.timestamp)}</span>
                        <span className="flex items-center gap-2 text-slate-400 font-bold text-sm"><UserIcon size={16} className="text-amber-500/60" /> القائم بالجرد: @{selectedAuditDetails.performedBy}</span>
                        <span className="flex items-center gap-2 text-slate-400 font-bold text-sm"><FileText size={16} className="text-amber-500/60" /> عدد الأصناف: {selectedAuditDetails.itemsCount} صنف</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-8 py-4 rounded-2xl font-black text-lg border ${selectedAuditDetails.totalDiff >= 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                    صافي الفارق: {selectedAuditDetails.totalDiff > 0 ? `+${selectedAuditDetails.totalDiff}` : selectedAuditDetails.totalDiff}
                  </div>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-right border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-800/80 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-8 py-6 border-b border-slate-700">كود الصنف</th>
                        <th className="px-8 py-6 border-b border-slate-700">اسم الصنف والمعدة</th>
                        <th className="px-8 py-6 border-b border-slate-700 text-center">الحالة</th>
                        <th className="px-8 py-6 border-b border-slate-700 text-center bg-slate-900/30">الرصيد الدفتري</th>
                        <th className="px-8 py-6 border-b border-slate-700 text-center text-blue-400">الرصيد الفعلي</th>
                        <th className="px-8 py-6 border-b border-slate-700 text-center">الفارق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedAuditDetails.details.map((detail: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-all group">
                          <td className="px-8 py-6 font-mono text-sm text-slate-400">{detail.itemCode}</td>
                          <td className="px-8 py-6 font-black text-slate-100">{detail.itemName}</td>
                          <td className="px-8 py-6 text-center">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${
                                detail.state === 'NEW' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                detail.state === 'USED' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' :
                                'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            }`}>
                              {detail.state === 'NEW' ? 'جديد' : detail.state === 'USED' ? 'مستعمل' : 'هالك'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-center bg-slate-900/20">
                             <span className="text-xl font-black text-slate-500">{detail.bookQty}</span>
                          </td>
                          <td className="px-8 py-6 text-center">
                             <span className="text-xl font-black text-white">{detail.physicalQty}</span>
                          </td>
                          <td className="px-8 py-6 text-center font-black">
                             <span className={`text-xl ${detail.diff === 0 ? 'text-slate-800' : detail.diff > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                               {detail.diff > 0 ? `+${detail.diff}` : detail.diff === 0 ? '--' : detail.diff}
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
               
               <div className="p-8 bg-slate-800/30 border-t border-slate-700/50 flex justify-between items-center no-print">
                  <p className="text-xs font-bold text-slate-500">تم ترحيل هذه البيانات واعتمادها ولا يمكن تعديلها وفقاً لقواعد قفل البيانات.</p>
                  <button onClick={() => handlePrintArchiveDoc(selectedAuditDetails)} className="bg-white text-black font-black py-3 px-8 rounded-2xl flex items-center gap-2 hover:bg-slate-100 transition-all shadow-xl">
                    <Printer size={18} /> طباعة نسخة المحضر
                  </button>
               </div>
            </div>
          ) : (
            <div className="space-y-6">
               <div className="flex bg-slate-800/30 p-2 rounded-2xl w-fit border border-slate-700/50">
                  <button onClick={() => setArchiveFilterType('ALL')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${archiveFilterType === 'ALL' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500'}`}>الكل</button>
                  <button onClick={() => setArchiveFilterType('AUDIT')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${archiveFilterType === 'AUDIT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}><Package size={14}/> محاضر الجرد</button>
                  <button onClick={() => setArchiveFilterType('SCRAP')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${archiveFilterType === 'SCRAP' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}><Flame size={14}/> محاضر الهالك</button>
               </div>

               <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-[3.5rem] border border-slate-700/50 shadow-2xl overflow-hidden animate-in fade-in duration-500">
                  <table className="w-full text-right border-separate border-spacing-0">
                     <thead>
                       <tr className="bg-slate-800/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-700">
                         <th className="px-8 py-6">تاريخ الجرد</th>
                         <th className="px-8 py-6">رقم المحضر الرسمي</th>
                         <th className="px-8 py-6">المسؤول عن الترحيل</th>
                         <th className="px-8 py-6 text-center">نوع المحضر</th>
                         <th className="px-8 py-6 text-center">عدد الأصناف</th>
                         <th className="px-8 py-6 text-center">إجمالي الفرق</th>
                         <th className="px-8 py-6 text-center">إجراءات</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800">
                       {archiveData.map(audit => (
                         <tr key={audit.docNumber} className="hover:bg-slate-800/30 transition-all group">
                           <td className="px-8 py-6 text-xs text-slate-400 font-bold">{formatDateTime(audit.timestamp)}</td>
                           <td className="px-8 py-6 font-mono text-amber-500 font-black text-lg">{audit.docNumber}</td>
                           <td className="px-8 py-6 text-sm font-black text-slate-200">@{audit.performedBy}</td>
                           <td className="px-8 py-6 text-center">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${audit.hasScrap ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                {audit.hasScrap ? 'محضر هالك/تكهين' : 'جرد وتسوية'}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-center font-black text-slate-400">{audit.itemsCount}</td>
                           <td className="px-8 py-6 text-center font-black">
                              <span className={audit.totalDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                                {audit.totalDiff > 0 ? `+${audit.totalDiff}` : audit.totalDiff}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-center">
                              <div className="flex justify-center gap-2">
                                 <button onClick={() => setSelectedArchiveDoc(audit.docNumber)} className="p-3 bg-slate-900 rounded-xl text-sky-400 hover:bg-sky-400 hover:text-white transition-all shadow-md border border-slate-700" title="عرض التفاصيل">
                                    <Eye size={20}/>
                                 </button>
                                 <button onClick={() => handlePrintArchiveDoc(audit)} className="p-3 bg-slate-900 rounded-xl text-emerald-400 hover:bg-emerald-400 hover:text-white transition-all shadow-md border border-slate-700" title="طباعة نسخة">
                                    <Printer size={20}/>
                                 </button>
                              </div>
                           </td>
                         </tr>
                       ))}
                       {archiveData.length === 0 && (
                         <tr><td colSpan={7} className="py-24 text-center text-slate-700 font-black text-2xl italic">لا توجد محاضر جرد مؤرشفة حالياً ضمن هذا التصنيف</td></tr>
                       )}
                     </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryAudit;
