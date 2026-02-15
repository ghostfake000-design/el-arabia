
import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowLeft, ShieldCheck, Settings, Eye, EyeOff, CalendarDays, ArrowRight, Shield } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
  users: UserType[];
  financialYears: string[];
  onYearSelect: (year: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, users, financialYears, onYearSelect }) => {
  const [selectedUsername, setSelectedUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedYear, setSelectedYear] = useState(financialYears[financialYears.length - 1] || '2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // تثبيت الوضع الليلي دائماً
  const isDarkMode = true;

  useEffect(() => {
    document.body.classList.add('dark');
    document.body.style.backgroundColor = '#020617';
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsername) {
      setError('يرجى اختيار مستخدم من القائمة');
      return;
    }
    setIsLoading(true);
    setError('');
    
    setTimeout(() => {
      const foundUser = users.find(u => u.username === selectedUsername);
      if (foundUser && (foundUser.password === password || (!foundUser.password && password === 'admin'))) {
        onYearSelect(selectedYear);
        onLogin(foundUser);
      } else {
        setError('كلمة المرور غير صحيحة');
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-500 overflow-hidden bg-[#020617] text-white font-['Cairo']`}>
      
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-10 bg-amber-500`}></div>
         <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-10 bg-indigo-600`}></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-10"></div>
      </div>

      {/* Main Login Card - Split Design */}
      <div className={`w-full max-w-5xl h-[650px] flex flex-row-reverse rounded-[3.5rem] relative z-30 transition-all border shadow-2xl overflow-hidden bg-[#0a1120]/60 border-slate-800 backdrop-blur-xl shadow-black/50`}>
        
        {/* Right Section: Branding & Graphics */}
        <div className={`hidden md:flex w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden bg-[#0f172a]/40 border-r border-slate-800/50`}>
          <div className="relative z-10 flex flex-col items-center text-center space-y-8">
            {/* Logo Area */}
            <div className="relative mb-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                   <h2 className="text-3xl font-black tracking-tighter text-white leading-none">العربية</h2>
                   <p className="text-[10px] text-amber-500 font-black tracking-[0.3em] uppercase">FOUNDRY SYSTEMS</p>
                </div>
                <div className="relative">
                   <Settings className="text-amber-500 animate-[spin_10s_linear_infinite]" size={64} strokeWidth={2.5} />
                   <Settings className="text-slate-500 absolute -top-1 -right-1 animate-[spin_15s_linear_infinite_reverse]" size={36} strokeWidth={2} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <h1 className={`text-4xl font-black leading-tight tracking-tight text-white`}>
                 الشركة العربية<br/>
                 <span className="text-amber-500">لصهر وتشكيل المعادن</span>
               </h1>
               <p className={`text-sm font-bold max-w-[280px] leading-relaxed mx-auto text-slate-500`}>
                 النظام الموحد لإدارة المخازن، العهد، والرقابة الفنية على المسحوبات والتوريدات.
               </p>
            </div>
          </div>

          {/* Secure Badge at bottom right section */}
          <div className="absolute bottom-10 flex items-center gap-2 opacity-30 group">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">SECURE TERMINAL V1.0.5</span>
             <Shield size={14} className="text-slate-500" />
          </div>
        </div>

        {/* Left Section: Login Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-10 lg:p-16">
          <div className="max-w-[360px] w-full mx-auto space-y-10">
            <div className="space-y-2">
              <h3 className={`text-3xl font-black tracking-tight text-white`}>تسجيل الدخول</h3>
              <p className={`text-xs font-bold text-slate-500`}>يرجى إدخال بيانات الاعتماد للوصول للنظام</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-[10px] font-black text-center animate-shake">
                  {error}
                </div>
              )}

              {/* User Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-slate-500`}>
                    <User size={14} className="text-amber-500" /> حساب المستخدم
                  </label>
                </div>
                <div className="relative group">
                  <select 
                    required value={selectedUsername} onChange={(e) => setSelectedUsername(e.target.value)}
                    className={`w-full rounded-[1.25rem] py-4 pr-6 pl-12 outline-none font-black transition-all text-sm border appearance-none bg-[#0f172a] border-slate-800 text-white focus:border-amber-500/50`}
                  >
                    <option value="">-- اختر المستخدم --</option>
                    {users.map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
                  </select>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <ArrowLeft size={16} className="-rotate-90" />
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-slate-500`}>
                    <Lock size={14} className="text-amber-500" /> كلمة المرور
                  </label>
                </div>
                <div className="relative group">
                  <input 
                    required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full rounded-[1.25rem] py-4 pr-6 pl-14 outline-none font-bold transition-all text-sm border bg-[#0f172a] border-slate-800 text-white focus:border-amber-500/50`}
                  />
                  <button 
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all text-slate-600 hover:text-white`}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Financial Year Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-slate-500`}>
                    <CalendarDays size={14} className="text-amber-500" /> السنة المالية
                  </label>
                </div>
                <div className="relative group">
                  <select 
                    value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                    className={`w-full rounded-[1.25rem] py-4 pr-6 pl-12 outline-none font-black transition-all text-sm border appearance-none text-center bg-[#0f172a] border-slate-800 text-white focus:border-amber-500/50`}
                  >
                    {financialYears.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" disabled={isLoading}
                  className={`w-full py-5 rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-amber-500/20 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500`}
                >
                  {isLoading ? (
                    <div className={`w-6 h-6 border-4 rounded-full animate-spin border-slate-950/20 border-t-slate-950`}></div>
                  ) : (
                    <>
                      <span>دخول</span>
                      <ArrowLeft size={22} strokeWidth={3} className="mr-2" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default Login;
