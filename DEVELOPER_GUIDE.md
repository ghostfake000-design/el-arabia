# 👨‍💻 دليل المبرمج

**للمطورين الذين يريدون صيانة أو توسيع النظام**

---

## 📋 جدول المحتويات

1. [بنية المشروع](#بنية-المشروع)
2. [ملفات رئيسية](#ملفات-رئيسية)
3. [قاعدة البيانات](#قاعدة-البيانات)
4. [نظام IPC](#نظام-ipc)
5. [localStorage](#localstorage)
6. [الترخيص](#نظام-الترخيص)
7. [الأنماط والتصاميم](#الأنماط-والتصاميم)
8. [إضافة ميزات](#إضافة-ميزات-جديدة)
9. [حل المشاكل](#استكشاف-الأخطاء)
10. [البناء والنشر](#البناء-والنشر)

---

## بنية المشروع

```
root/
├── src/
│   ├── App.tsx (الملف الرئيسي للتطبيق)
│   ├── index.tsx (نقطة البداية)
│   ├── index.html (HTML الرئيسي)
│   ├── constants.tsx (الثوابت)
│   ├── types.ts (أنواع TypeScript)
│   ├── utils.ts (دوال مساعدة)
│   ├── components/ (مكونات React المشتركة)
│   │   ├── Header.tsx (شريط العنوان مع الحالة)
│   │   ├── Sidebar.tsx (القائمة الجانبية)
│   │   ├── ConfirmationDialog.tsx (نافذة التأكيد)
│   └── views/ (شاشات التطبيق الرئيسية)
│       ├── Login.tsx (تسجيل الدخول)
│       ├── Dashboard.tsx (لوحة التحكم)
│       ├── ItemCoding.tsx (تكويد الأصناف)
│       ├── Movements.tsx (حركات الصرف)
│       ├── Custody.tsx (العهد)
│       ├── InventoryAudit.tsx (الجرد)
│       ├── ReportsView.tsx (التقارير)
│       ├── BalancesView.tsx (الأرصدة)
│       ├── SettingsView.tsx (الإعدادات)
│       ├── UserManagement.tsx (إدارة المستخدمين)
│       └── CustodyManagement.tsx (إدارة العهد)
├── public/ (ملفات ثابتة)
│   └── assets/ (الصور والأيقونات)
├── main.js (عملية Electron الرئيسية)
├── database.js (اتصالات قاعدة البيانات)
├── backup.js (نظام النسخ الاحتياطية)
├── license-manager.js (نظام الترخيص)
├── electron-api.js (الـ API الإضافية)
├── db.js (إدارة قاعدة البيانات)
├── vite.config.ts (إعدادات البناء)
└── package.json (المكتبات والنصوص)
```

---

## ملفات رئيسية

### 1. **App.tsx** - القلب

```typescript
// الدوال الرئيسية:
- useAuth() // التحقق من المستخدم
- useEffect(() => { checkLicense() }) // فحص الترخيص كل 60 ثانية
- useEffect(() => { loadData() }) // تحميل البيانات عند البداية

// الحالة الرئيسية:
const [user, setUser] = useState(null)
const [isLoggedIn, setIsLoggedIn] = useState(false)
```

### 2. **main.js** - عملية Electron

```javascript
// نقاط الدخول الرئيسية:
- createWindow() // إنشاء نافذة Electron
- ipcMain.handle() // معالجات IPC
- app.on('ready', ...) // تهيئة التطبيق
- menu // قائمة التطبيق

// معالجات IPC:
- 'choose-backup-dest' // اختيار مجلد النسخة الاحتياطية
- 'update-backup-schedule' // تحديث جدول النسخ
- 'check-license-status' // فحص حالة الترخيص
- 'print' // طباعة (Windows print API)
- 'export-user-data-snapshot' // تصدير البيانات
- 'get-system-info' // معلومات النظام
```

### 3. **backup.js** - النسخ الاحتياطية

```javascript
// الدوال الرئيسية:
- init() // تهيئة النظام عند البداية
- scheduleAutoBackup(config) // جدولة تلقائية
- calculateNextRunTime(frequency, lastTime) // حساب الوقت التالي
- updateSchedule(config) // تحديث الجدول
- createBackup() // إنشاء نسخة احتياطية يدوية
- restoreBackup(path) // استرجاع من نسخة احتياطية

// التكرارات المدعومة:
- 'daily' (يومياً)
- 'weekly' (أسبوعياً)
- 'monthly' (شهرياً)
- 'quarterly' (ربع سنوي)
- 'semi-annual' (نصف سنوي)
- 'yearly' (سنوي)

// الملف المُنتج:
backup-YYYY-MM-DD-HHmmss.zip
```

### 4. **license-manager.js** - الترخيص

```javascript
// الدوال:
- generateActivationCode() // توليد رمز التفعيل
- validateLicense(code) // التحقق من الترخيص
- getLicenseInfo() // معلومات الترخيص الحالية
- calculateDaysRemaining() // الأيام المتبقية

// صيغة الترخيص:
[DEVICE_HASH][LICENSE_TYPE][CREATION_DATE]
- DEVICE_HASH: SHA-256(hostname + CPU + OS)
- LICENSE_TYPE: F (تجريبي) أو FF (دائم)
- CREATION_DATE: بتنسيق YYYYMMDD
```

### 5. **db.js** - قاعدة البيانات

```javascript
// الاتصال:
const db = initDB() // تهيئة SQLite
db.run(sql) // تنفيذ أمر
db.all(sql) // جلب جميع النتائج
db.get(sql) // جلب نتيجة واحدة

// الجداول الرئيسية:
- items (الأصناف)
- movements (الحركات)
- users (المستخدمون)
- custodies (العهد)
- employees (قائمة الموظفين)
```

---

## قاعدة البيانات

### الجداول

#### 1. **users**

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  emp_number VARCHAR(20) UNIQUE,
  name VARCHAR(100),
  role VARCHAR(50),
  password_hash VARCHAR(255),
  salary DECIMAL(10,2),
  department VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  is_active BOOLEAN DEFAULT 1
);

-- الأدوار المتاحة:
- Admin (مسؤول كامل)
- Warehouse Manager (أمين مخزن)
- Accountant (محاسب)
- Dispatch Officer (موظف صرف)
- Employee (موظف عادي)
```

#### 2. **items**

```sql
CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  name_ar VARCHAR(100),
  name_en VARCHAR(100),
  unit VARCHAR(20),
  min_quantity INT,
  current_quantity INT,
  price DECIMAL(10,2),
  category VARCHAR(50),
  storage_location VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- الفئات:
- الموارد/Supplies
- المعدات/Equipment
- الغذائيات/Food
- الملابس/Clothing
```

#### 3. **movements**

```sql
CREATE TABLE movements (
  id INTEGER PRIMARY KEY,
  reference_number VARCHAR(20) UNIQUE,
  movement_type VARCHAR(50),
  item_id INT,
  quantity INT,
  from_quantity INT,
  to_quantity INT,
  user_id INT,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- أنواع الحركات:
- 'stockIn' (دخول)
- 'stockOut' (خروج)
- 'adjustment' (تصحيح)
- 'return' (إرجاع)
```

#### 4. **custodies**

```sql
CREATE TABLE custodies (
  id INTEGER PRIMARY KEY,
  item_id INT,
  employee_id INT,
  quantity INT,
  custody_date TIMESTAMP,
  return_date TIMESTAMP,
  status VARCHAR(20),
  notes TEXT,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

#### 5. **employees**

```sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  emp_number VARCHAR(20) UNIQUE,
  name_ar VARCHAR(100),
  name_en VARCHAR(100),
  department VARCHAR(100),
  position VARCHAR(100),
  identity_number VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(100),
  hire_date DATE
);
```

---

## نظام IPC

### ما هو IPC؟

IPC = Inter-Process Communication
الآلية التي تسمح لـ React (عملية renderer) بالتواصل مع Node.js (عملية main).

### الاستخدام في React:

```typescript
// الاستدعاء:
window.electronAPI.invoke('choose-backup-dest')
  .then(path => console.log(path))
  .catch(err => console.error(err))

// أو مع async/await:
const path = await window.electronAPI.invoke('choose-backup-dest')
```

### المعالجات المتاحة:

```javascript
// main.js
ipcMain.handle('choose-backup-dest', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.filePaths[0]
})

ipcMain.handle('update-backup-schedule', async (event, config) => {
  backup.updateSchedule(config)
  return { success: true }
})

ipcMain.handle('check-license-status', async () => {
  return licenseManager.getLicenseInfo()
})

ipcMain.handle('print', async (event, content) => {
  // طباعة يدوية
  return printService.print(content)
})

ipcMain.handle('export-user-data-snapshot', async () => {
  return dataService.exportSnapshot()
})
```

### إضافة معالج جديد:

```typescript
// 1. في production, main.js:
ipcMain.handle('my-custom-handler', async (event, param) => {
  // المنطق هنا
  return result
})

// 2. في React component:
const result = await window.electronAPI.invoke('my-custom-handler', param)
```

---

## localStorage

### البادئات المستخدمة:

```javascript
// جميع البيانات تبدأ بـ "alaria_"
alaria_user_token // معرف المستخدم
alaria_user_data // بيانات المستخدم
alaria_session_id // معرف الجلسة
alaria_last_login // آخر دخول
alaria_auto_backup_settings // إعدادات النسخ الاحتياطية
alaria_backup_frequency // تكرار النسخ
alaria_backup_hour // ساعة النسخ
alaria_printer_name // اسم الطابعة
alaria_last_sync // آخر تحديث
alaria_items_cache // تخزين مؤقت للأصناف
alaria_ui_preferences // تفضيلات الواجهة
```

### الوصول من React:

```typescript
// القراءة:
const token = localStorage.getItem('alaria_user_token')

// الكتابة:
localStorage.setItem('alaria_user_token', token)

// الحذف:
localStorage.removeItem('alaria_user_token')

// تنظيف الكل:
Object.keys(localStorage)
  .filter(key => key.startsWith('alaria_'))
  .forEach(key => localStorage.removeItem(key))
```

---

## نظام الترخيص

### كيف يعمل؟

```
1. البرنامج يحسب البصمة (fingerprint):
   fingerprint = SHA-256(hostname + CPU_architecture + OS)

2. عند التفعيل:
   activation_code = [fingerprint][:32] + 'FF' + 'YYYYMMDD'

3. التحقق:
   - هل الجهاز مطابق؟
   - هل التاريخ صحيح؟
   - هل 'FF' و 'F'؟
```

### أنواع الرخص:

```
نوع F = تجريبي (30 يوم من التاريخ)
نوع FF = دائم (لا ينتهي أبداً)
```

### إضافة فحص ترخيص:

```typescript
// في App.tsx أو أي component
useEffect(() => {
  const checkLicense = async () => {
    const info = await window.electronAPI.invoke('check-license-status')
    if (!info.isValid) {
      setShowLicenseWarning(true)
    }
  }
  
  const interval = setInterval(checkLicense, 60000) // كل دقيقة
  return () => clearInterval(interval)
}, [])
```

---

## الأنماط والتصاميم

### نمط المكونات:

```typescript
// views/MyView.tsx
import React, { useState, useEffect } from 'react'
import { ConfirmationDialog } from '../components'

export const MyView: React.FC = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // تحميل البيانات
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.invoke('get-data')
      setData(result)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="view-container">
      {loading ? <Loader /> : <Content />}
    </div>
  )
}
```

### استدعاء قاعدة البيانات:

```typescript
// في أي component
const [items, setItems] = useState([])

useEffect(() => {
  // استدعاء main.js
  window.electronAPI.invoke('db-query', {
    sql: 'SELECT * FROM items WHERE is_active = 1',
    params: []
  }).then(result => {
    setItems(result)
  })
}, [])
```

### معالجة الأخطاء:

```typescript
try {
  const result = await window.electronAPI.invoke('some-handler')
  // نجح
} catch (error) {
  if (error.code === 'PERMISSION_DENIED') {
    // لا توجد صلاحيات
  } else if (error.code === 'NOT_FOUND') {
    // البيانات غير موجودة
  }
}
```

---

## إضافة ميزات جديدة

### السيناريو 1: إضافة حقل جديد إلى الأصناف

```typescript
// 1. تحديث الجدول في db.js:
ALTER TABLE items ADD COLUMN warehouse_id INT;

// 2. تحديث نموذج TypeScript في types.ts:
export interface Item {
  id: number
  code: string
  name_ar: string
  warehouse_id: number // جديد
  // ...
}

// 3. تحديث الـ UI في ItemCoding.tsx:
<input 
  type="text"
  placeholder="رقم المستودع"
  value={formData.warehouse_id}
  onChange={(e) => handleInputChange('warehouse_id', e.target.value)}
/>

// 4. تحديث دالة الحفظ:
const saveItem = async () => {
  await window.electronAPI.invoke('db-query', {
    sql: `UPDATE items SET warehouse_id = ? WHERE id = ?`,
    params: [formData.warehouse_id, formData.id]
  })
}
```

### السيناريو 2: إضافة تقرير جديد

```typescript
// 1. في ReportsView.tsx:
const handleExport = () => {
  if (selectedReport === 'MY_NEW_REPORT') {
    exportMyNewReport()
  }
}

const exportMyNewReport = () => {
  const workbook = XLSX.utils.book_new()
  const data = [
    {
      'الرقم': '001',
      'الاسم': 'بيانات'
      // ...
    }
  ]
  const sheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, sheet, 'التقرير')
  XLSX.writeFile(workbook, `report-${Date.now()}.xlsx`)
}

// 2. في الخيارات:
<select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)}>
  <option value="STOCK_LEDGER">دفتر المخزون</option>
  <option value="MY_NEW_REPORT">تقريري الجديد</option>
</select>
```

### السيناريو 3: إضافة معالج IPC

```javascript
// في main.js:
const myNewHandler = require('./my-new-handler')

ipcMain.handle('my-new-handler', async (event, params) => {
  return await myNewHandler.process(params)
})

// في my-new-handler.js:
module.exports = {
  process: async (params) => {
    // المنطق
    return result
  }
}

// في React:
const result = await window.electronAPI.invoke('my-new-handler', { /* params */ })
```

---

## استكشاف الأخطاء

### مشكلة: البيانات لا تحدّث

```
الحل:
1. تحقق من أن db.sqlite موجود في userData
2. الوصول إلى DevTools بـ Ctrl+Shift+I
3. تحقق من console من أخطاء
4. تأكد أن IPC handlers مسجلة في main.js
5. أعد تشغيل التطبيق
```

### مشكلة: الاطبعة لا تطبع

```
الحل:
1. اختبر الطابعة في Windows (Settings > Devices > Printers)
2. حدد الطابعة الافتراضية
3. في البرنامج، اختر الطابعة من Settings
4. تأكد من أن printer_name محفوظ في localStorage
5. تحقق من أذونات System Printer Access
```

### مشكلة: الترخيص ينتهي بسرعة

```
الحل:
1. فتح license.html
2. تأكد من صيغة الكود: [32_char_hash]FF20260101
3. تحقق من تاريخ البرنامج (قد تكون الساعة خاطئة)
4. نوع F تجريبي = 30 يوم، نوع FF دائم
```

### مشكلة: النسخة الاحتياطية لا تعمل

```
الحل:
1. تحقق من المسار: Settings > مسار النسخ الاحتياطية
2. تأكد أن المجلد موجود وقابل للكتابة
3. فحص أذونات المجلد (كليك يمين > الخصائص)
4. تحقق من مساحة التخزين
```

---

## البناء والنشر

### بيئة التطوير:

```bash
# التثبيت:
npm install

# التطوير مع الدعم الحي:
npm run dev

# البناء:
npm run build

# الاختبار:
npm run test
```

### أوامر البناء:

```bash
# بناء React:
npm run build

# بناء Electron:
npm run build:electron

# بناء المثبِّت:
npm run build:installer

# الملف النهائي:
dist-electron/رابطة-للمخازن-Pro-Setup-4.0.0.exe
```

### الملفات المهمة للبناء:

```
vite.config.ts - إعدادات Vite
tsconfig.json - إعدادات TypeScript
package.json - المكتبات والنصوص
electron-builder.yml - إعدادات Electron Builder
```

---

## نقاط تطوير مهمة

### ✅ البرنامج الحالي يدعم:

- ✅ قاعدة بيانات SQLite محلية
- ✅ واجهة عربية كاملة
- ✅ نظام ترخيص عتاد-محدد
- ✅ نسخ احتياطية مجدولة
- ✅ 6 أنواع تقارير
- ✅ طباعة احترافية
- ✅ تصدير Excel
- ✅ نظام المستخدمين بـ 5 أدوار

### 🔄 ممكن تطويره لاحقاً:

- تزامن سحابي
- نسخ متعددة (multi-user)
- API ويب
- تطبيق موبايل
- لوحة تحكم عن بعد

---

## الاتصال والدعم التطويري

```
في حالة المشاكل التقنية:

1. تحقق من logs:
   - Chrome DevTools: Ctrl+Shift+I
   - Console tab للأخطاء

2. ابحث في UPDATES_v4.0.1.md
   عن ملخص التغييرات

3. راجع PASSWORDS_AND_SECURITY.md
   للترخيص والبيانات الحساسة

4. تواصل مع محمد النعماني
   للمسائل الإدارية
```

---

**آخر تحديث:** فبراير 2026
**الإصدار:** 4.0.1
**الحالة:** Production Ready ✅
