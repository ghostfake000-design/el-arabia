الخطوات لتجهيز الحزمة للعمل أوفلاين بالكامل

1) تثبيت الحزم ونسخ ملف الـ WASM (ينفذ تلقائياً عبر postinstall):

```powershell
cd "C:\Users\Silem\Downloads\al-arabia-inventory-v1.1 (1)"
npm install
```

2) إعداد خطوط Cairo (اختياري ولكن موصى به للعمل أوفلاين تمامًا):
- ضع ملفات الخطوط (مثلاً Cairo-Regular.ttf, Cairo-Bold.ttf) داخل `assets/fonts/`.
- تأكد أن الـ CSS المحلي `index.css` يحملها عبر `@font-face`.

3) تشغيل التطبيق في وضع التطوير:

```powershell
npm run start
```

4) بناء الحزمة النهائية (إنشاء EXE):

```powershell
npm run build
```

ملاحظات مهمة:
- `sql-wasm.wasm` سيتم نسخه من `node_modules/sql.js/dist/` إلى جذر المشروع بواسطة `scripts/copy-wasm.js` بعد `npm install`.
- قواعد البيانات والنسخ الاحتياطي تُخزن في مجلد المستخدم (`app.getPath('userData')`) والنسخ المضغوطة تحفظ في `Documents/Al-Arabia-Backups`.
- إن أردت حفظ النسخ الاحتياطي مباشرة على USB، استعمل زر "تصدير باك أب" في الواجهة واختر المسار.
- إذا واجهت مشاكل في تثبيت الحزم لبيئة Node قديمة/جديدة، أخبرني لأعطي خطوات بديلة.
