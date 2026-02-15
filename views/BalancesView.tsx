
import React, { useMemo, useState } from 'react';
import { 
  Layers, Search, Package, CheckCircle2, Info, 
  Flame, Printer, AlertTriangle, FileText, CheckSquare, X
} from 'lucide-react';
import { Item, Movement, Custody, User, CustodyState } from '../types';
import { generateId, formatDateTime } from '../utils';
import ConfirmationDialog from '../components/ConfirmationDialog';

interface BalancesViewProps {
  items: Item[];
  movements: Movement[];
  custodies: Custody[];
  setCustodies: React.Dispatch<React.SetStateAction<Custody[]>>;
  currentUser: User;
}

const BalancesView: React.FC<BalancesViewProps> = ({ items, movements, custodies, setCustodies, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [executingItem, setExecutingItem] = useState<{item: any, scrapQty: number} | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const detailedBalances = useMemo(() => {
    return items.map(item => {
      const getBalanceForState = (state: CustodyState) => {
        let balance = 0;
        
        // 1. الافتتاحي
        if (!item.isCustody && state === 'NEW') balance = item.openingBalance;
        else if (item.isCustody && item.initialState === state) balance = item.openingBalance;

        // 2. المخازن (New)
        if (state === 'NEW') {
          movements.filter(m => m.itemId === item.id).forEach(m => {
            const net = m.quantity - (m.returnedQuantity || 0);
            if (m.type === 'INWARD') balance += net;
            else balance -= net;
          });
        }

        // 3. العهد
        custodies.filter(c => c.itemId === item.id && c.state === state).forEach(c => {
          if (c.type === 'HANDOVER') balance -= c.quantity;
          else if (c.type === 'RETURN') balance += c.quantity;
          else if (c.type === 'SETTLEMENT') {
             const isSurplus = c.note?.includes('زيادة');
             balance += (isSurplus ? c.quantity : -c.quantity);
          }
        });

        return Math.floor(balance);
      };

      const newQty = getBalanceForState('NEW');
      const usedQty = getBalanceForState('USED');
      const scrapQty = getBalanceForState('SCRAP');

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        isCustody: item.isCustody,
        newQty,
        usedQty,
        scrapQty,
        netBalance: newQty + usedQty // المعادلة المطلوبة: جديد + مستعمل
      };
    });
  }, [items, movements, custodies]);

  const handleExecuteScrap = () => {
    if (!executingItem) return;
    const { item, scrapQty } = executingItem;

    const executionEntry: Custody = {
      id: generateId(),
      itemId: item.id,
      employeeId: 'SYSTEM_SCRAP',
      quantity: scrapQty,
      state: 'SCRAP',
      type: 'SETTLEMENT',
      timestamp: new Date().toISOString(),
      performedBy: currentUser.username,
      docNumber: 'SCRAP-' + Date.now().toString().slice(-6),
      note: `إعدام هالك وتصفير رصيد تالف نهائياً (تكهين رسمي)`,
    };

    setCustodies([executionEntry, ...custodies]);
    
    // طباعة محضر الإعدام
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>محضر إعدام - ${item.name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;900&display=swap');
              body { font-family: 'Cairo', sans-serif; padding: 50px; line-height: 2; }
              .header { text-align: center; border-bottom: 5px double #000; padding-bottom: 20px; margin-bottom: 40px; }
              .box { border: 2px solid #000; padding: 20px; margin: 20px 0; }
              .footer { margin-top: 100px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>محضر إعدام وتكهين أصول ومخزون</h1>
              <h2>الشركة العربية لصهر وتشكيل المعادن</h2>
            </div>
            <p>أقر أنا مدير المخازن واللجنة الفنية المشكلة بأنه قد تم إعدام الكمية المذكورة أدناه لعدم جدواها الفنية ووصولها لحالة الهالك التام:</p>
            <div class="box">
              اسم الصنف: <b>${item.name}</b><br/>
              كود الصنف: <b>${item.code}</b><br/>
              الكمية المعدومة: <b>${scrapQty} وحدة</b><br/>
              رقم مستند الإعدام: <b>${executionEntry.docNumber}</b>
            </div>
            <div class="footer">
              <div>لجنة التفتيش</div>
              <div>مدير المخازن</div>
              <div>اعتماد الإدارة</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    
    setExecutingItem(null);
    showToast('تم إعدام الهالك وتصفير الرصيد بنجاح');
  };

  const filteredBalances = detailedBalances.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-[1600px] mx-auto font-['Cairo'] relative">
      
      {successMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black animate-in slide-in-from-top">
           <CheckCircle2 size={24} /> {successMsg}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="p-5 bg-gradient-to-br from-amber-500 to-orange-700 text-black rounded-[2.5rem] border border-amber-400/20 shadow-xl shadow-amber-900/20">
             <Layers size={40} />
           </div>
           <div>
             <h2 className="text-4xl font-black text-white tracking-tight">أرصدة الأصناف والحالات</h2>
             <p className="text-slate-400 font-bold mt-1 tracking-tight">متابعة دقيقة للأرصدة (الصافي = جديد + مستعمل) مع خيار إعدام الهالك</p>
           </div>
        </div>
      </div>

      <div className="bg-[#1e293b]/50 backdrop-blur-md p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl no-print">
        <div className="relative group max-w-xl">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors" size={20} />
          <input 
            type="text" placeholder="بحث باسم الصنف أو الكود..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pr-12 pl-6 outline-none font-bold text-white placeholder:text-slate-700 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      </div>

      <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-[3rem] border border-slate-700/50 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-800/80 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-6 border-b border-slate-700">الصنف والبيان</th>
                <th className="px-6 py-6 border-b border-slate-700 text-center">جديد (New)</th>
                <th className="px-6 py-6 border-b border-slate-700 text-center">مستعمل (Used)</th>
                <th className="px-6 py-6 border-b border-slate-700 text-center text-rose-500">هالك (Scrap)</th>
                <th className="px-6 py-6 border-b border-slate-700 text-center text-emerald-400 bg-emerald-500/5">الرصيد النهائي</th>
                <th className="px-6 py-6 border-b border-slate-700 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredBalances.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/30 transition-all group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl bg-slate-800 border border-slate-700 shadow-inner group-hover:border-amber-500/30 transition-all ${b.isCustody ? 'text-amber-500' : 'text-blue-500'}`}>
                        <Package size={20}/>
                      </div>
                      <div>
                        <p className="font-black text-slate-100 text-sm">{b.name}</p>
                        <p className="text-[10px] font-mono text-slate-500 font-bold">{b.code} {b.isCustody && <span className="text-[8px] bg-sky-500/10 text-sky-400 px-1 rounded ml-1 font-black">صنف عهدة</span>}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-xl font-black text-slate-200">{b.newQty}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-xl font-black text-sky-400">{b.usedQty}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`text-xl font-black ${b.scrapQty > 0 ? 'text-rose-500' : 'text-slate-700'}`}>{b.scrapQty}</span>
                  </td>
                  <td className="px-6 py-5 text-center bg-emerald-500/5">
                    <div className="flex flex-col items-center">
                       <span className="text-3xl font-black text-emerald-400">{b.netBalance}</span>
                       <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active Stock Only</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                     {b.scrapQty > 0 && (
                       <button 
                        onClick={() => setExecutingItem({item: b, scrapQty: b.scrapQty})}
                        className="px-4 py-2 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-600/20 rounded-xl transition-all flex items-center gap-2 font-black text-[10px] mx-auto shadow-sm active:scale-95"
                       >
                         <Flame size={14}/> إعدام الهالك
                       </button>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-8 bg-slate-800/30 rounded-[2.5rem] border border-slate-700/50 flex flex-col md:flex-row items-center gap-6">
         <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20">
           <Info size={32} />
         </div>
         <div className="space-y-1">
           <p className="text-sm font-black text-slate-200">معادلة الرصيد النهائي بالشركة العربية:</p>
           <p className="text-xs text-slate-500 font-bold leading-relaxed">
             يتم حساب الرصيد النهائي بجمع (الكمية الجديدة + الكمية المستعملة) فقط. 
             <br/>
             <span className="text-rose-500/80">يُستثنى الرصيد الهالك (Scrap) تماماً من الرصيد الصالح للتشغيل نظراً لعدم جدواه الفنية.</span>
           </p>
         </div>
      </div>

      {executingItem && (
        <ConfirmationDialog 
           isOpen={true} 
           onClose={() => setExecutingItem(null)} 
           onConfirm={handleExecuteScrap}
           title="تأكيد إعدام صنف تالف"
           message={`هل أنت متأكد من إعدام عدد (${executingItem.scrapQty}) من صنف (${executingItem.item.name})؟ سيتم تصفير الرصيد الهالك نهائياً وطباعة محضر رسمي.`}
           confirmText="تأكيد الإعدام والطباعة"
           cancelText="تراجع"
           type="danger"
        />
      )}
    </div>
  );
};

export default BalancesView;
