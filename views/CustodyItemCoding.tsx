
import React, { useState } from 'react';
import { Package, Plus, Search, Trash2, Edit, Wrench, Barcode, Info, Hash } from 'lucide-react';
import { CustodyItem } from '../types';
import { generateId } from '../utils';
import ConfirmationDialog from '../components/ConfirmationDialog';

interface CustodyItemCodingProps {
  items: CustodyItem[];
  setItems: React.Dispatch<React.SetStateAction<CustodyItem[]>>;
}

const CustodyItemCoding: React.FC<CustodyItemCodingProps> = ({ items, setItems }) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newItem, setNewItem] = useState<Partial<CustodyItem>>({
    code: '',
    name: '',
    description: '',
    openingBalance: 0,
  });
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.code || !newItem.name) return;

    const item: CustodyItem = {
      id: generateId(),
      code: newItem.code!,
      name: newItem.name!,
      description: newItem.description || '',
      openingBalance: Number(newItem.openingBalance || 0),
      currentBalance: Number(newItem.openingBalance || 0),
      deployedBalance: 0,
    };

    setItems([...items, item]);
    setNewItem({ code: '', name: '', description: '', openingBalance: 0 });
    setShowModal(false);
  };

  const filteredItems = items.filter(it => 
    it.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    it.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-amber-500/10 text-amber-500 rounded-[2rem] border border-amber-500/20 shadow-lg">
            <Wrench size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">تكويد العهد والمعدات</h2>
            <p className="text-slate-400 mt-1">تعريف الأصول المتداولة ورصيدها الابتدائي في عهدة الشركة</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-black py-4 px-8 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-amber-500/20 active:scale-95"
        >
          <Plus size={20} />
          <span>إضافة عهدة جديدة</span>
        </button>
      </div>

      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-700/50 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-700/50 flex flex-col md:flex-row gap-4 justify-between bg-slate-800/30">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="ابحث برقم الكود أو الاسم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pr-12 pl-6 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-bold text-white placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-separate border-spacing-y-2 px-4 pb-4">
            <thead>
              <tr className="text-slate-500 text-[11px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">الكود</th>
                <th className="px-6 py-4">اسم المعدة / الأداة</th>
                <th className="px-6 py-4">رصيد أول</th>
                <th className="px-6 py-4">متاح بالمخزن</th>
                <th className="px-6 py-4">خارج بعهدة</th>
                <th className="px-6 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/50 transition-all group">
                  <td className="px-6 py-4 bg-slate-800/30 rounded-r-2xl border-y border-r border-slate-700/50">
                    <span className="bg-slate-950 text-amber-500 font-mono text-xs px-3 py-1.5 rounded-lg border border-slate-700 font-black tracking-wider">{item.code}</span>
                  </td>
                  <td className="px-6 py-4 border-y border-slate-700/50">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-100">{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold truncate max-w-[200px]">{item.description || 'بدون وصف'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-y border-slate-700/50 font-bold text-slate-400">{item.openingBalance}</td>
                  <td className="px-6 py-4 border-y border-slate-700/50">
                    <span className="text-xl font-black text-emerald-400">{item.currentBalance}</span>
                  </td>
                  <td className="px-6 py-4 border-y border-slate-700/50">
                    <span className="text-xl font-black text-sky-400">{item.deployedBalance}</span>
                  </td>
                  <td className="px-6 py-4 bg-slate-800/30 rounded-l-2xl border-y border-l border-slate-700/50 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2.5 bg-slate-900 rounded-xl text-slate-500 hover:text-emerald-400 border border-slate-700"><Edit size={18}/></button>
                      <button onClick={() => setDeleteItemId(item.id)} className="p-2.5 bg-slate-900 rounded-xl text-slate-500 hover:text-red-400 border border-slate-700"><Trash2 size={18} /></button>
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
          <div className="bg-[#1e293b] w-full max-w-xl rounded-[3rem] border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-700/50 flex justify-between items-center bg-amber-500/10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-amber-500 text-black rounded-2xl shadow-lg shadow-amber-500/10">
                  <Wrench size={32} />
                </div>
                <h3 className="text-3xl font-black text-white">تكويد معدة جديدة</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-3xl font-black">&times;</button>
            </div>
            <form onSubmit={handleAddItem} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Barcode size={14} className="text-amber-500"/> الكود</label>
                  <input required type="text" value={newItem.code} onChange={(e) => setNewItem({...newItem, code: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-amber-500/50 font-mono text-white" placeholder="EQU-001" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">اسم المعدة / الأداة</label>
                  <input required type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-amber-500/50 font-bold text-white" placeholder="مثلاً: صاروخ تقطيع" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Hash size={14} className="text-emerald-500"/> رصيد أول المدة</label>
                  <input required type="number" value={newItem.openingBalance} onChange={(e) => setNewItem({...newItem, openingBalance: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-emerald-500/50 font-black text-xl text-white" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Info size={14} className="text-sky-500"/> وصف إضافي</label>
                  <input type="text" value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-sky-500/50 text-white" />
                </div>
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-5 rounded-[2rem] shadow-2xl transition-all active:scale-95 text-lg">حفظ المعدة في النظام</button>
            </form>
          </div>
        </div>
      )}

      {deleteItemId && (
        <ConfirmationDialog 
          isOpen={true} onClose={() => setDeleteItemId(null)} 
          onConfirm={() => { setItems(items.filter(i => i.id !== deleteItemId)); setDeleteItemId(null); }}
          title="حذف معدة" message="هل أنت متأكد من حذف هذه المعدة نهائياً من النظام؟"
        />
      )}
    </div>
  );
};

export default CustodyItemCoding;
