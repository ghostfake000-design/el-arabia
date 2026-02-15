
import React, { useState } from 'react';
import { 
  Database, Plus, Trash2, Edit, Ruler, Building2, CalendarDays, Truck, MapPin, Phone, User as UserIcon, Save, X, AlertCircle, Users
} from 'lucide-react';
import { Unit, Warehouse, Supplier, Employee, Item, Movement, Custody } from '../types';
import { generateId } from '../utils';
import ConfirmationDialog from '../components/ConfirmationDialog';

interface BasicDataProps {
  items: Item[];
  movements: Movement[];
  custodies: Custody[];
  units: Unit[]; setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
  warehouses: Warehouse[]; setWarehouses: React.Dispatch<React.SetStateAction<Warehouse[]>>;
  suppliers: Supplier[]; setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  employees: Employee[]; setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  financialYears: string[]; setFinancialYears: React.Dispatch<React.SetStateAction<string[]>>;
}

const BasicDataView: React.FC<BasicDataProps> = ({ 
  items, movements, custodies, units, setUnits, warehouses, setWarehouses, suppliers, setSuppliers, employees, setEmployees,
  financialYears, setFinancialYears
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [deleteConfig, setDeleteConfig] = useState<{ id: string, type: string, onConfirm: () => void } | null>(null);

  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', address: '' });

  // التحقق من الحركات قبل الحذف
  const canDelete = (id: string, type: 'UNIT' | 'WAREHOUSE' | 'SUPPLIER' | 'EMPLOYEE'): boolean => {
    switch (type) {
      case 'UNIT':
        return !items.some(i => i.unitId === id) && !movements.some(m => m.unitId === id);
      case 'WAREHOUSE':
        return !movements.some(m => m.warehouseId === id);
      case 'SUPPLIER':
        return !movements.some(m => m.supplierId === id);
      case 'EMPLOYEE':
        return !movements.some(m => m.employeeId === id) && !custodies.some(c => c.employeeId === id);
      default:
        return true;
    }
  };

  const handleDeleteAttempt = (id: string, type: 'UNIT' | 'WAREHOUSE' | 'SUPPLIER' | 'EMPLOYEE', onConfirm: () => void) => {
    if (!canDelete(id, type)) {
      alert('لا يمكن الحذف لوجود حركات مسجلة مرتبطة بهذا العنصر في النظام.');
      return;
    }
    setDeleteConfig({ id, type, onConfirm });
  };

  const startEditing = (id: string, value: any) => {
    setEditingId(id);
    setEditValue(value);
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name) return;
    const s: Supplier = {
      id: generateId(),
      name: newSupplier.name,
      phone: newSupplier.phone,
      address: newSupplier.address
    };
    setSuppliers([...suppliers, s]);
    setNewSupplier({ name: '', phone: '', address: '' });
  };

  const ListManager = ({ title, icon, list, type, onAdd, onDelete, onUpdate }: any) => (
    <div className="bg-[#1e293b]/50 rounded-[2rem] border border-slate-700/50 shadow-xl p-8 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl">{icon}</div>
        <h3 className="text-xl font-black">{title}</h3>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] mb-6 pr-2 custom-scrollbar">
        {list.map((it: any) => (
          <div key={it.id || it} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/30 rounded-2xl group hover:bg-slate-900 transition-all">
            {editingId === (it.id || it) ? (
              <div className="flex items-center gap-2 w-full">
                <input 
                  type="text" 
                  value={editValue} 
                  onChange={e => setEditValue(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-sm outline-none text-white font-bold"
                  autoFocus
                />
                <button onClick={() => { onUpdate(it.id || it, editValue); setEditingId(null); }} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"><Save size={14}/></button>
                <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600"><X size={14}/></button>
              </div>
            ) : (
              <>
                <span className="text-sm font-bold text-slate-300">{it.name || it}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => startEditing(it.id || it, it.name || it)} className="p-2 text-slate-500 hover:text-sky-400"><Edit size={16} /></button>
                  <button onClick={() => handleDeleteAttempt(it.id || it, type, () => onDelete(it.id || it))} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-auto">
        <input 
          type="text" 
          placeholder={`إضافة جديد...`}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/50 font-bold"
          onKeyDown={(e) => { if (e.key === 'Enter') { onAdd((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }}
        />
        <button className="bg-sky-50 text-sky-600 p-3 rounded-2xl hover:bg-sky-100 shadow-lg"><Plus size={24} /></button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 font-['Cairo'] max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-5 bg-gradient-to-br from-sky-600 to-sky-900 text-white rounded-[2.5rem] shadow-2xl border border-sky-400/20">
            <Database size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white">البيانات الأساسية</h2>
            <p className="text-slate-400 font-bold mt-1 tracking-tight">إدارة الوحدات والمخازن والموظفين والموردين</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ListManager 
          title="وحدات القياس" 
          icon={<Ruler size={24}/>} 
          list={units} 
          type="UNIT"
          onAdd={(name: string) => setUnits([...units, { id: generateId(), name }])} 
          onUpdate={(id: string, name: string) => setUnits(units.map(u => u.id === id ? {...u, name} : u))}
          onDelete={(id: string) => setUnits(units.filter(u => u.id !== id))} 
        />
        <ListManager 
          title="المخازن" 
          icon={<Building2 size={24}/>} 
          list={warehouses} 
          type="WAREHOUSE"
          onAdd={(name: string) => setWarehouses([...warehouses, { id: generateId(), name }])} 
          onUpdate={(id: string, name: string) => setWarehouses(warehouses.map(w => w.id === id ? {...w, name} : w))}
          onDelete={(id: string) => setWarehouses(warehouses.filter(w => w.id !== id))} 
        />
        <ListManager 
          title="سجل الموظفين" 
          icon={<Users size={24}/>} 
          list={employees} 
          type="EMPLOYEE"
          onAdd={(name: string) => setEmployees([...employees, { id: generateId(), name }])} 
          onUpdate={(id: string, name: string) => setEmployees(employees.map(e => e.id === id ? {...e, name} : e))}
          onDelete={(id: string) => setEmployees(employees.filter(e => e.id !== id))} 
        />
      </div>

      <div className="bg-[#1e293b]/50 rounded-[2.5rem] border border-slate-700 shadow-xl p-10 flex flex-col gap-10">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-6">
             <div className="p-5 bg-emerald-500/10 text-emerald-400 rounded-3xl"><Truck size={40}/></div>
             <div>
               <h3 className="text-3xl font-black text-white">سجل الموردين المعتمدين</h3>
               <p className="text-slate-500 text-sm font-bold">إدارة بيانات الشركات والعناوين وأرقام التواصل</p>
             </div>
           </div>
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            {/* نموذج الإضافة */}
            <form onSubmit={handleAddSupplier} className="xl:col-span-1 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 space-y-6 shadow-inner">
               <h4 className="text-lg font-black text-white flex items-center gap-2"><Plus size={18} className="text-sky-400"/> مورد جديد</h4>
               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">اسم الشركة</label>
                     <input required type="text" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 font-bold text-white outline-none focus:ring-1 focus:ring-sky-500 shadow-sm" placeholder="اسم المورد" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">رقم الهاتف</label>
                     <input type="text" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 font-mono text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="010..." />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">عنوان المورد</label>
                     <div className="relative">
                        <MapPin className="absolute right-3 top-3 text-slate-600" size={16} />
                        <textarea value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pr-10 pl-4 font-bold text-white outline-none focus:ring-1 focus:ring-sky-500 min-h-[80px]" placeholder="العنوان بالتفصيل..." />
                     </div>
                  </div>
               </div>
               <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95">حفظ المورد</button>
            </form>

            {/* قائمة الموردين مع إمكانية التعديل */}
            <div className="xl:col-span-2 overflow-x-auto rounded-3xl border border-slate-700/50">
               <table className="w-full text-right">
                  <thead className="bg-slate-800/50">
                     <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-700">
                        <th className="px-6 py-5">اسم المورد</th>
                        <th className="px-6 py-5">الهاتف</th>
                        <th className="px-6 py-5">العنوان</th>
                        <th className="px-6 py-5 text-center">إجراءات</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                     {suppliers.map(s => (
                        <tr key={s.id} className="hover:bg-slate-800/30 transition-all group">
                           {editingId === s.id ? (
                              <td colSpan={4} className="px-6 py-4">
                                <div className="flex gap-4 items-end">
                                  <div className="flex-1 space-y-1">
                                    <input type="text" value={editValue?.name} onChange={e => setEditValue({...editValue, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-xs text-white" />
                                    <input type="text" value={editValue?.phone} onChange={e => setEditValue({...editValue, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-[10px] text-sky-400" />
                                    <input type="text" value={editValue?.address} onChange={e => setEditValue({...editValue, address: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-[10px] text-slate-400" />
                                  </div>
                                  <button onClick={() => { setSuppliers(suppliers.map(x => x.id === s.id ? editValue : x)); setEditingId(null); }} className="p-3 bg-emerald-600 text-white rounded-xl"><Save size={20}/></button>
                                  <button onClick={() => setEditingId(null)} className="p-3 bg-slate-700 text-white rounded-xl"><X size={20}/></button>
                                </div>
                              </td>
                           ) : (
                              <>
                                <td className="px-6 py-4 font-black text-slate-200">{s.name}</td>
                                <td className="px-6 py-4 font-mono text-sky-400 text-xs">{s.phone || '-'}</td>
                                <td className="px-6 py-4 text-[11px] text-slate-500 max-w-[200px] truncate">{s.address || '-'}</td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => startEditing(s.id, s)} className="text-slate-500 hover:text-sky-400"><Edit size={18}/></button>
                                    <button onClick={() => handleDeleteAttempt(s.id, 'SUPPLIER', () => setSuppliers(suppliers.filter(x => x.id !== s.id)))} className="text-slate-500 hover:text-red-400"><Trash2 size={18}/></button>
                                  </div>
                                </td>
                              </>
                           )}
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      {deleteConfig && (
        <ConfirmationDialog 
           isOpen={true}
           onClose={() => setDeleteConfig(null)}
           onConfirm={deleteConfig.onConfirm}
           title={`تأكيد الحذف النهائي`}
           message={`هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذه الخطوة في حال الموافقة.`}
        />
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default BasicDataView;
