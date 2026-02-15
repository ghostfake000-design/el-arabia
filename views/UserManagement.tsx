
import React, { useState } from 'react';
import { 
  ShieldCheck, Plus, Trash2, UserPlus, Lock, Shield, 
  Settings, CheckSquare, Square, Edit, User as UserIcon, Key,
  Eye, EyeOff, Package, ArrowLeftRight, UserCheck, ClipboardList, Database, FileBarChart, Layers, 
  Barcode, Hash,
  LayoutDashboard, Trash, Save, CheckCircle2, Check, Download
} from 'lucide-react';
import { User, Role, AppPermission } from '../types';
import { generateId } from '../utils';
import ConfirmationDialog from '../components/ConfirmationDialog';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
}

interface PermissionGroup {
  name: string;
  permissions: { id: AppPermission; label: string; icon: React.ReactNode }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'شاشات العرض الأساسية',
    permissions: [
      { id: 'VIEW_DASHBOARD', label: 'لوحة التحكم', icon: <LayoutDashboard size={14}/> },
      { id: 'VIEW_CODING', label: 'تكويد الأصناف', icon: <Package size={14}/> },
      { id: 'VIEW_MOVEMENTS', label: 'حركة المخازن', icon: <ArrowLeftRight size={14}/> },
      { id: 'VIEW_CUSTODY', label: 'إدارة العهد', icon: <UserCheck size={14}/> },
      { id: 'VIEW_BALANCES', label: 'أرصدة الأصناف', icon: <Layers size={14}/> },
      { id: 'VIEW_INVENTORY', label: 'الجرد والتسوية', icon: <ClipboardList size={14}/> },
      { id: 'VIEW_REPORTS', label: 'مركز التقارير', icon: <FileBarChart size={14}/> },
      { id: 'VIEW_BASIC_DATA', label: 'البيانات الأساسية', icon: <Database size={14}/> },
      { id: 'VIEW_USERS', label: 'إدارة المستخدمين', icon: <ShieldCheck size={14}/> },
      { id: 'VIEW_SETTINGS', label: 'إعدادات النظام', icon: <Settings size={14}/> },
    ]
  },
  {
    name: 'إجراءات المخازن والتشغيل',
    permissions: [
      { id: 'ACTION_ADD_ITEM', label: 'إضافة صنف جديد', icon: <Plus size={14}/> },
      { id: 'ACTION_EDIT_ITEM', label: 'تعديل بيانات صنف', icon: <Edit size={14}/> },
      { id: 'ACTION_DELETE_ITEM', label: 'حذف صنف نهائياً', icon: <Trash size={14}/> },
      { id: 'ACTION_PRINT_BARCODE', label: 'طباعة الباركود', icon: <Barcode size={14}/> },
      { id: 'ACTION_LETTER_Z', label: 'حرف Z (خاص)', icon: <Hash size={14}/> },
      { id: 'ACTION_ADD_INWARD', label: 'تسجيل إذن وارد', icon: <Plus size={14}/> },
      { id: 'ACTION_ADD_OUTWARD', label: 'تسجيل إذن صرف', icon: <Plus size={14}/> },
      { id: 'ACTION_MANAGE_RETURNS', label: 'تسجيل مرتجعات', icon: <ArrowLeftRight size={14}/> },
      { id: 'ACTION_EDIT_MOVEMENT', label: 'تعديل حركة مسجلة', icon: <Edit size={14}/> },
      { id: 'ACTION_DELETE_MOVEMENT', label: 'حذف حركة مسجلة', icon: <Trash size={14}/> },
    ]
  },
  {
    name: 'إجراءات العهد والجرد',
    permissions: [
      { id: 'ACTION_ADD_CUSTODY', label: 'صرف عهدة لموظف', icon: <UserPlus size={14}/> },
      { id: 'ACTION_RETURN_CUSTODY', label: 'استلام عهدة من موظف', icon: <UserCheck size={14}/> },
      { id: 'ACTION_SETTLE_CUSTODY', label: 'تسوية وإعدام عهدة', icon: <Trash2 size={14}/> },
      { id: 'ACTION_COMMIT_SETTLEMENT', label: 'اعتماد محضر جرد', icon: <Save size={14}/> },
      { id: 'ACTION_PRINT_AUDIT', label: 'طباعة محاضر الجرد', icon: <FileBarChart size={14}/> },
    ]
  },
  {
    name: 'صلاحيات الإدارة والسيستم',
    permissions: [
      { id: 'ACTION_MANAGE_YEAR', label: 'إدارة السنوات المالية', icon: <Database size={14}/> },
      { id: 'ACTION_START_NEW_YEAR', label: 'بدء سنة مالية جديدة', icon: <Plus size={14}/> },
      { id: 'ACTION_RESTORE_BACKUP', label: 'استعادة نسخ احتياطي', icon: <ShieldCheck size={14}/> },
      { id: 'ACTION_BACKUP', label: 'عمل نسخ احتياطي يدوي', icon: <Download size={14}/> }, // تم الاستبدال هنا
    ]
  }
];

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    name: '',
    role: 'STOREKEEPER',
    password: '',
    permissions: ['VIEW_DASHBOARD'],
  });

  const handleOpenEdit = (user: User) => {
    setEditUser(user);
    setFormData(user);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.name) return;

    if (editUser) {
      setUsers(users.map(u => u.id === editUser.id ? (formData as User) : u));
    } else {
      const newUser: User = {
        id: generateId(),
        username: formData.username!,
        name: formData.name!,
        role: formData.role as Role,
        password: formData.password || '123456',
        permissions: formData.permissions as AppPermission[],
      };
      setUsers([...users, newUser]);
    }
    
    setSuccessToast(true);
    setTimeout(() => {
        setSuccessToast(false);
        setShowModal(false);
        setEditUser(null);
        setFormData({ username: '', name: '', role: 'STOREKEEPER', password: '', permissions: ['VIEW_DASHBOARD'] });
    }, 1500);
  };

  const togglePermission = (p: AppPermission) => {
    const current = formData.permissions || [];
    if (current.includes(p)) {
      setFormData({...formData, permissions: current.filter(x => x !== p)});
    } else {
      setFormData({...formData, permissions: [...current, p]});
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-[2rem] border border-indigo-500/20 shadow-xl">
            <Shield size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white">إدارة حسابات النظام</h2>
            <p className="text-slate-400 font-bold mt-1">التحكم السيادي في صلاحيات المستخدمين والوصول</p>
          </div>
        </div>
        <button 
          onClick={() => { setEditUser(null); setFormData({ username: '', name: '', role: 'STOREKEEPER', password: '', permissions: ['VIEW_DASHBOARD'] }); setShowModal(true); }}
          className="bg-indigo-500 hover:bg-indigo-400 text-white font-black py-4 px-10 rounded-[1.5rem] flex items-center gap-3 transition-all shadow-2xl active:scale-95"
        >
          <UserPlus size={24} /> إضافة مستخدم جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {users.map((u) => (
          <div key={u.id} className="bg-[#1e293b] p-10 rounded-[3rem] border border-slate-700/50 shadow-2xl relative group overflow-hidden hover:border-indigo-500/30 transition-all duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[4rem] transition-transform group-hover:scale-110"></div>
            
            <div className="flex justify-between items-start mb-8">
              <div className="w-16 h-16 rounded-[1.5rem] bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-black text-indigo-400 shadow-inner">
                {u.name.charAt(0)}
              </div>
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                u.role === 'ADMIN' ? 'bg-red-500/10 text-red-500' : 
                u.role === 'MANAGER' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-500/10 text-slate-400'
              }`}>
                {u.role === 'ADMIN' ? 'مدير نظام' : u.role === 'MANAGER' ? 'مدير مخازن' : 'أمين مخزن'}
              </span>
            </div>

            <div className="space-y-1">
               <h4 className="text-2xl font-black text-white">{u.name}</h4>
               <p className="text-slate-500 font-bold text-xs flex items-center gap-2">
                 <UserIcon size={14} className="text-slate-600" /> الاسم البرمجي: <span className="text-indigo-400/80">@{u.username}</span>
               </p>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800 space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase">الصلاحيات الممنوحة:</span>
                  <span className="text-[10px] font-black text-indigo-400">{u.permissions.length} صلاحية</span>
               </div>
               <div className="flex flex-wrap gap-2">
                  {u.permissions.slice(0, 4).map(p => (
                    <span key={p} className="text-[8px] font-black bg-slate-900 border border-slate-800 text-slate-500 px-2 py-1 rounded-lg">
                      {p.replace('VIEW_', '').replace('ACTION_', '').replace('_', ' ')}
                    </span>
                  ))}
                  {u.permissions.length > 4 && <span className="text-[8px] font-black text-slate-700">+{u.permissions.length - 4} أخرى</span>}
               </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button onClick={() => handleOpenEdit(u)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3.5 rounded-2xl font-black text-xs transition-all border border-slate-700 flex items-center justify-center gap-2">
                <Edit size={16} /> تعديل الحساب
              </button>
              {u.username !== 'admin' && (
                <button onClick={() => setDeleteUserId(u.id)} className="p-3.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all">
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmationDialog 
        isOpen={deleteUserId !== null}
        onClose={() => setDeleteUserId(null)}
        onConfirm={() => { setUsers(users.filter(u => u.id !== deleteUserId)); setDeleteUserId(null); }}
        title="تأكيد حذف الحساب"
        message="هل أنت متأكد من حذف هذا الحساب؟ لن يتمكن الموظف من الدخول للنظام وسيتم إيقاف صلاحياته فوراً."
      />

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#1e293b] w-full max-w-6xl rounded-[3rem] border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            
            {successToast && (
              <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm animate-in fade-in">
                 <div className="bg-emerald-600 p-8 rounded-[2rem] text-white flex flex-col items-center gap-4 shadow-2xl animate-in zoom-in">
                    <CheckCircle2 size={64} />
                    <span className="text-2xl font-black">تم التعديل بنجاح</span>
                 </div>
              </div>
            )}

            <div className="p-10 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
               <div className="flex items-center gap-5">
                 <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg">
                   {editUser ? <Edit size={28}/> : <UserPlus size={28} />}
                 </div>
                 <div>
                   <h3 className="text-3xl font-black text-white">{editUser ? 'تعديل بيانات الحساب' : 'إنشاء حساب مستخدم جديد'}</h3>
                   <p className="text-slate-400 text-sm font-bold mt-1">تحديد صلاحيات الوصول والبيانات الأمنية</p>
                 </div>
               </div>
               <button onClick={() => setShowModal(false)} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white border border-slate-700 transition-all shadow-lg active:scale-95">&times;</button>
            </div>

            <form onSubmit={handleSave} className="flex-1 flex flex-col lg:flex-row overflow-hidden">
               {/* الحقول النصية */}
               <div className="p-10 lg:w-1/3 border-l border-slate-800/50 space-y-6 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">الاسم الوظيفي (الاسم الحقيقي)</label>
                      <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500/50 outline-none font-bold text-white" placeholder="مثلاً: محمد النعماني" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">اسم الدخول (Username)</label>
                      <input required type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-white" placeholder="username" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Key size={14}/> كلمة المرور</label>
                      <div className="relative">
                        <input required={!editUser} type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pr-6 pl-14 focus:ring-2 focus:ring-indigo-500/50 outline-none text-white font-bold" placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400">
                          {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">المستوى الوظيفي</label>
                      <input type="text" value={formData.role as string || ''} onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500/50 outline-none font-bold text-white" placeholder="مثلاً: أمين مخزن أول" />
                    </div>
                  </div>
                  <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl">
                     <p className="text-[10px] font-black text-amber-500/60 uppercase mb-2">تنويه أمني:</p>
                     <p className="text-xs text-slate-500 font-bold leading-relaxed">يرجى مراجعة الصلاحيات بدقة. صلاحيات الإجراءات (Action) تمنح المستخدم القدرة على التعديل أو الحذف الفعلي للبيانات.</p>
                  </div>
               </div>

               {/* لوحة التحكم في الصلاحيات */}
               <div className="p-10 lg:w-2/3 space-y-8 overflow-y-auto bg-slate-900/10 custom-scrollbar">
                  <h4 className="text-xl font-black text-white flex items-center gap-3">
                    <ShieldCheck size={24} className="text-indigo-400" /> مصفوفة الصلاحيات السيادية
                  </h4>
                  
                  <div className="space-y-8">
                    {PERMISSION_GROUPS.map((group, gIdx) => (
                      <div key={gIdx} className="space-y-4">
                        <div className="flex items-center gap-3">
                           <div className="h-px flex-1 bg-slate-800"></div>
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{group.name}</span>
                           <div className="h-px flex-1 bg-slate-800"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {group.permissions.map(p => (
                             <button key={p.id} type="button" onClick={() => togglePermission(p.id)}
                               className={`flex items-center justify-between p-5 rounded-3xl border transition-all text-right group ${
                                 formData.permissions?.includes(p.id) 
                                 ? 'bg-indigo-500/10 border-indigo-500/40' 
                                 : 'bg-slate-900 border-slate-800 hover:border-slate-600 shadow-sm'
                               }`}
                             >
                               <div className="flex items-center gap-4">
                                 <div className={`p-2.5 rounded-xl transition-all ${formData.permissions?.includes(p.id) ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                   {p.icon}
                                 </div>
                                 <span className={`text-xs font-black transition-all ${formData.permissions?.includes(p.id) ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{p.label}</span>
                               </div>
                               <div className={`transition-all ${formData.permissions?.includes(p.id) ? 'text-indigo-400 scale-110' : 'text-slate-800'}`}>
                                 {formData.permissions?.includes(p.id) ? <CheckSquare size={22} strokeWidth={2.5}/> : <Square size={22} strokeWidth={2.5}/>}
                               </div>
                             </button>
                           ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 p-8 bg-slate-800/50 rounded-[2.5rem] border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
                     <div className="text-right">
                        <p className="text-xl font-black text-white">اعتماد الصلاحيات</p>
                        <p className="text-sm font-bold text-slate-500">سيتم تطبيق التعديلات فور ضغط زر الحفظ</p>
                     </div>
                     <button type="submit" className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-16 rounded-2xl shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 active:scale-95">
                        <Check size={24} strokeWidth={3}/> حفظ التعديلات والتمكين
                     </button>
                  </div>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
