
import React from 'react';
import { 
  AlertCircle, Package, UserCheck, ArrowDownLeft, 
  ArrowUpRight, ShoppingCart, History, Activity, Wrench, ChevronLeft
} from 'lucide-react';
import { Item, Movement } from '../types';
import { formatDateTime } from '../utils';

interface DashboardProps {
  items: Item[];
  movements: Movement[];
  currentUser: any;
}

const Dashboard: React.FC<DashboardProps> = ({ items, movements, currentUser }) => {
  const lowStockItems = items.filter(item => 
    item.minThreshold > 0 && item.currentBalance <= item.minThreshold
  );

  const recentSettlements = movements
    .filter(m => m.note?.includes('تسوية جردية'))
    .slice(0, 4);

  const topSuppliers = movements
    .filter(m => m.type === 'INWARD' && m.supplierId)
    .reduce((acc: any, curr) => {
      acc[curr.supplierId!] = (acc[curr.supplierId!] || 0) + 1;
      return acc;
    }, {});

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">رادار العمليات</h2>
          <p className="text-slate-400 mt-1 font-bold">الحالة اللحظية للمخازن والاحتياجات التشغيلية</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Urgent Shopping List - أصناف تحتاج شراء */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-700/50 shadow-2xl p-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/5 rounded-br-full"></div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-white flex items-center gap-3">
                <ShoppingCart className="text-red-400" size={24} /> قائمة المشتريات العاجلة
              </h3>
              <span className="bg-red-500/10 text-red-400 px-4 py-1.5 rounded-xl text-xs font-black border border-red-500/20">
                {lowStockItems.length} صنف يحتاج توريد
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lowStockItems.length > 0 ? lowStockItems.map(item => (
                <div key={item.id} className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 flex items-center justify-between group hover:border-red-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                       <Package size={20} />
                    </div>
                    <div>
                      <p className="font-black text-slate-100 text-sm">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">حد الطلب: {item.minThreshold}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-black text-red-400 leading-none">{item.currentBalance}</p>
                    <p className="text-[9px] text-slate-600 font-black mt-1 uppercase">الرصيد</p>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 py-12 text-center text-slate-600">
                   <Activity className="mx-auto mb-4 opacity-10" size={48} />
                   <p className="font-bold">المخزون في حالة آمنة تماماً</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Recent Adjustments - آخر التسويات */}
             <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-2xl">
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                  <History className="text-sky-400" size={20} /> آخر التسويات الجردية
                </h3>
                <div className="space-y-4">
                   {recentSettlements.map(m => (
                     <div key={m.id} className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-200">{items.find(i => i.id === m.itemId)?.name}</p>
                          <p className="text-[9px] text-slate-500 mt-1">{formatDateTime(m.timestamp)}</p>
                        </div>
                        <span className={`text-sm font-black ${m.type === 'INWARD' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.type === 'INWARD' ? '+' : '-'}{m.quantity}
                        </span>
                     </div>
                   ))}
                   {recentSettlements.length === 0 && <p className="text-center text-xs text-slate-700 py-10 font-bold">لا توجد تسويات حديثة</p>}
                </div>
             </div>

             {/* System Health - حالة النظام */}
             <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-2xl flex flex-col justify-center items-center text-center">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-500/20">
                   <Activity size={32} />
                </div>
                <h3 className="text-xl font-black text-white">النظام يعمل بكفاءة</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed px-4">تم تسجيل {movements.length} حركة مخزنية هذا العام بنجاح وبدون أخطاء برمجية.</p>
                <div className="mt-8 pt-6 border-t border-slate-800 w-full flex justify-around">
                   <div>
                     <p className="text-xl font-black text-sky-400">{items.length}</p>
                     <p className="text-[9px] text-slate-600 font-bold uppercase">صنف مفعل</p>
                   </div>
                   <div className="w-px h-8 bg-slate-800"></div>
                   <div>
                     <p className="text-xl font-black text-amber-500">{movements.filter(m => m.status !== 'NORMAL').length}</p>
                     <p className="text-[9px] text-slate-600 font-bold uppercase">مرتجع مسجل</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Operational Notes - ملاحظات تشغيلية قابلة للتحرير */}
        <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-700/50 shadow-2xl p-8">
          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
             <Activity className="text-yellow-400" size={24} /> ملاحظات لوحة التحكم
          </h3>
          <NotesArea items={items} movements={movements} currentUser={currentUser} />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

const NotesArea: React.FC<{items: Item[]; movements: Movement[]; currentUser: any}> = ({ items, movements, currentUser }) => {
  const [notes, setNotes] = React.useState<any[]>(() => {
    try { const s = localStorage.getItem('alaria_notes'); return s ? JSON.parse(s) : []; } catch (e) { return []; }
  });
  const [text, setText] = React.useState('');
  const [notifyAt, setNotifyAt] = React.useState('');

  const canEdit = currentUser && (currentUser.role === 'ADMIN' || currentUser.permissions?.includes('VIEW_SETTINGS'));

  const saveNotes = (next: any[]) => { setNotes(next); localStorage.setItem('alaria_notes', JSON.stringify(next)); };

  const addNote = () => {
    if (!text.trim()) return alert('نص الملاحظة فارغ');
    const n = { id: Date.now().toString(), text: text.trim(), createdBy: currentUser.name, createdAt: new Date().toISOString(), notifyAt: notifyAt || null };
    saveNotes([n, ...notes]);
    setText(''); setNotifyAt('');
  };

  const removeNote = (id: string) => { if (!confirm('حذف الملاحظة؟')) return; saveNotes(notes.filter(n => n.id !== id)); };

  const editNote = (id: string) => {
    const n = notes.find(x => x.id === id);
    if (!n) return;
    const newText = prompt('تعديل الملاحظة', n.text);
    if (newText == null) return;
    const updated = notes.map(x => x.id === id ? {...x, text: newText} : x);
    saveNotes(updated);
  };

  return (
    <div>
      {canEdit && (
        <div className="mb-4">
          <textarea value={text} onChange={e => setText(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white" placeholder="أضف ملاحظة تشغيلية..." />
          <div className="flex gap-2 items-center mt-3">
            <input type="datetime-local" value={notifyAt} onChange={e => setNotifyAt(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm" />
            <button onClick={addNote} className="bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-2 rounded-2xl">نشر</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {notes.length === 0 && <div className="p-6 text-center text-slate-600">لا توجد ملاحظات تشغيلية حالياً</div>}
        {notes.map(n => (
          <div key={n.id} className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex justify-between items-start">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-100 truncate">{n.text}</p>
              <p className="text-[10px] text-slate-500 mt-2">من: {n.createdBy} · {formatDateTime(n.createdAt)}</p>
              {n.notifyAt && <p className="text-[10px] text-amber-400 mt-1">تنبيه مقرر: {formatDateTime(n.notifyAt)}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              {canEdit && (
                <>
                  <button onClick={() => editNote(n.id)} className="text-sky-400 text-xs font-black">تعديل</button>
                  <button onClick={() => removeNote(n.id)} className="text-rose-400 text-xs font-black">حذف</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
