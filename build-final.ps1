# build-final.ps1
# سكريبت بناء ملف التثبيت الشامل 
# نظام إدارة المخازن - الشركة العربية

# التحقق من صلاحيات المسؤول
$isAdmin = ([System.Security.Principal.WindowsIdentity]::GetCurrent().Groups -match "S-1-5-32-544") -ne $null
if (-not $isAdmin) {
    Write-Host "⚠️  هذا السكريبت يحتاج صلاحيات مسؤول!" -ForegroundColor Yellow
    Write-Host "جاري إعادة التشغيل بصلاحيات مرفوعة..." -ForegroundColor Cyan
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$ErrorActionPreference = "Continue"
$WarningPreference = "SilentlyContinue"

$projectPath = 'C:\Users\Silem\Downloads\al-arabia-inventory-v1.1 (1)'
$outputDir = "$projectPath\dist-electron"

Clear-Host

Write-Host @"
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║          🏗️  بناء ملف التثبيت النهائي - نظام المخازن                   ║
║                   الشركة العربية لصهر وتشكيل المعادن                    ║
║                          الإصدار 4.0.0                                  ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""
Write-Host "📁 مسار المشروع:" -ForegroundColor Gray
Write-Host "   $projectPath" -ForegroundColor White
Write-Host ""
Write-Host "📦 مجلد المخرجات:" -ForegroundColor Gray
Write-Host "   $outputDir" -ForegroundColor White
Write-Host ""

# ============================================================================
# خطوة 1: التحقق من Node.js
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "⏳ الخطوة 1: التحقق من Node.js و npm" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$nodeExists = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
$npmExists = $null -ne (Get-Command npm -ErrorAction SilentlyContinue)

if ($nodeExists -and $npmExists) {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js غير مثبت!" -ForegroundColor Red
    Write-Host ""
    Write-Host "يرجى تحميل Node.js من:" -ForegroundColor Yellow
    Write-Host "   https://nodejs.org/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "بعد التثبيت، أعد تشغيل هذا السكريبت." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "اضغط Enter للخروج"
    exit 1
}

Write-Host ""

# ============================================================================
# خطوة 2: التحقق من المجلد والملفات الأساسية
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "⏳ الخطوة 2: التحقق من ملفات المشروع" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$requiredFiles = @(
    "package.json",
    "vite.config.ts",
    "main.js",
    "App.tsx",
    "license-manager.js"
)

$allFound = $true
foreach ($file in $requiredFiles) {
    $filePath = Join-Path $projectPath $file
    if (Test-Path $filePath) {
        Write-Host "✅ موجود: $file" -ForegroundColor Green
    } else {
        Write-Host "❌ مفقود: $file" -ForegroundColor Red
        $allFound = $false
    }
}

if (-not $allFound) {
    Write-Host ""
    Write-Host "❌ بعض الملفات الأساسية مفقودة!" -ForegroundColor Red
    Write-Host "تحقق من مسار المشروع." -ForegroundColor Yellow
    exit 2
}

Write-Host ""

# ============================================================================
# خطوة 3: تثبيت المكتبات
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "⏳ الخطوة 3: تثبيت المكتبات (npm install)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Set-Location $projectPath

Write-Host "⏳ جاري تثبيت المكتبات..." -ForegroundColor Yellow
Write-Host "   (هذا قد يستغرق 3-5 دقائق في أول مرة)" -ForegroundColor Gray
Write-Host ""

$npmInstallOutput = npm install 2>&1
Write-Host $npmInstallOutput

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ فشل تثبيت المكتبات!" -ForegroundColor Red
    Write-Host ""
    Write-Host "جرّب الأوامر التالية يدويًا:" -ForegroundColor Yellow
    Write-Host "  cd `"$projectPath`"" -ForegroundColor Cyan
    Write-Host "  npm install" -ForegroundColor Cyan
    Write-Host ""
    exit 3
}

Write-Host ""
Write-Host "✅ تم تثبيت المكتبات بنجاح" -ForegroundColor Green
Write-Host ""

# ============================================================================
# خطوة 4: بناء الواجهة الأمامية
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "⏳ الخطوة 4: بناء الواجهة الأمامية (Vite Build)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "⏳ جاري تجميع ملفات React/TypeScript..." -ForegroundColor Yellow
Write-Host ""

$viteBuildOutput = npm run build 2>&1
Write-Host $viteBuildOutput

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ فشل البناء!" -ForegroundColor Red
    Write-Host ""
    Write-Host "جرّب يدويًا:" -ForegroundColor Yellow
    Write-Host "  cd `"$projectPath`"" -ForegroundColor Cyan
    Write-Host "  npm run build" -ForegroundColor Cyan
    Write-Host ""
    exit 4
}

Write-Host ""

if (Test-Path "$projectPath\dist") {
    $distSize = (Get-ChildItem "$projectPath\dist" -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $distSizeMB = $distSize / 1MB
    Write-Host "✅ تم بناء الواجهة الأمامية بنجاح" -ForegroundColor Green
    Write-Host "   📊 حجم المجلد: $([Math]::Round($distSizeMB, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "❌ فشل إنشاء مجلد dist!" -ForegroundColor Red
    exit 5
}

Write-Host ""

# ============================================================================
# خطوة 5: بناء ملف التثبيت
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "⏳ الخطوة 5: بناء ملف التثبيت (Electron Builder)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "⏳ جاري بناء ملف EXE..." -ForegroundColor Yellow
Write-Host "   (هذا قد يستغرق 3-5 دقائق)" -ForegroundColor Gray
Write-Host ""

$buildOutput = npm run build:win 2>&1

$buildOutput | ForEach-Object {
    if ($_ -match "error|failed|Error") {
        Write-Host $_ -ForegroundColor Red
    } elseif ($_ -match "success|complete|Success|Complete|✓") {
        Write-Host $_ -ForegroundColor Green
    } else {
        Write-Host $_
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ فشل بناء ملف التثبيت!" -ForegroundColor Red
    Write-Host ""
    Write-Host "احتمالات المشكلة:" -ForegroundColor Yellow
    Write-Host "  1. عدم تثبيت electron-builder" -ForegroundColor Cyan
    Write-Host "  2. مشكلة في المسارات أو الملفات" -ForegroundColor Cyan
    Write-Host "  3. انقطاع في الإنترنت" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "حاول:" -ForegroundColor Yellow
    Write-Host "  npm install -g electron-builder" -ForegroundColor Cyan
    Write-Host "  cd `"$projectPath`"" -ForegroundColor Cyan
    Write-Host "  npm run build:win" -ForegroundColor Cyan
    Write-Host ""
    exit 6
}

Write-Host ""

# ============================================================================
# خطوة 6: البحث عن ملف EXE
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ الخطوة 6: التحقق من ملف التثبيت" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$exeFiles = @(Get-ChildItem "$outputDir" -Include "*.exe" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 10MB })

if ($exeFiles.Count -eq 0) {
    Write-Host "❌ لم يتم العثور على ملف EXE!" -ForegroundColor Red
    Write-Host ""
    Write-Host "تحقق من المجلد:" -ForegroundColor Yellow
    Write-Host "  $outputDir" -ForegroundColor Cyan
    Write-Host ""
    exit 7
}

$exeFile = $exeFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1

$exeSize = $exeFile.Length / 1MB
$exeDate = $exeFile.LastWriteTime.ToString('yyyy-MM-dd HH:mm')

Write-Host "✅ تم إنشاء ملف التثبيت بنجاح!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 معلومات الملف:" -ForegroundColor Cyan
Write-Host "   ┌─────────────────────────────────────────────┐" -ForegroundColor Gray
Write-Host "   │ اسم الملف:" -ForegroundColor Gray -NoNewline
Write-Host " $($exeFile.Name)" -ForegroundColor White
Write-Host "   │" -ForegroundColor Gray
Write-Host "   │" -ForegroundColor Gray
Write-Host "   │ الحجم:" -ForegroundColor Gray -NoNewline
Write-Host " $([Math]::Round($exeSize, 2)) MB" -ForegroundColor White
Write-Host "   │" -ForegroundColor Gray
Write-Host "   │" -ForegroundColor Gray
Write-Host "   │ التاريخ:" -ForegroundColor Gray -NoNewline
Write-Host " $exeDate" -ForegroundColor White
Write-Host "   │" -ForegroundColor Gray
Write-Host "   │" -ForegroundColor Gray
Write-Host "   │ المسار الكامل:" -ForegroundColor Gray
Write-Host "   │ $($exeFile.FullName)" -ForegroundColor Cyan
Write-Host "   └─────────────────────────────────────────────┘" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# ملخص التعديلات
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 التعديلات والإصلاحات المُضمّنة:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

@"
✅ إصلاح الأخطاء الأساسية:
   • 🐛 حل مشكلة الاقتباسات في أوامر PowerShell
   • 🔧 إضافة معالجات backup.js و db.js المفقودة
   • 📂 إصلاح حوار اختيار مجلد النسخ الاحتياطية

✅ تحسينات النسخ الاحتياطية:
   • 💾 التقاط البيانات الكاملة من localStorage
   • 🔄 تحسين النسخ المجدولة التلقائية
   • 📥 استيراد واستعادة البيانات الشاملة

✅ إصلاحات الإعدادات:
   • 📝 تحديث فوري لحقول الأرقام والنصوص
   • 💾 حفظ تلقائي في localStorage
   • ⚡ لا حاجة لإعادة تشغيل البرنامج

✅ نظام الترخيص المحسّن:
   • ⏱️ حساب دقيق للأيام المتبقية
   • ⚠️ تنبيهات واضحة عند نفاد الترخيص (3 أيام أو أقل)
   • 🔄 فحص دوري للترخيص كل 60 ثانية
   • 🪟 إعادة فتح نافذة الترخيص تلقائياً عند الانتهاء

✅ تحسينات الواجهة:
   • 🎨 عرض حالة الترخيص بوضوح
   • 📊 حساب دقيق للأيام المتبقية
   • 🚨 رسائل تنبيهات محسّنة
"@ | Write-Host -ForegroundColor Gray

Write-Host ""

# ============================================================================
# الخطوات التالية
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 الخطوات التالية:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

@"
1️⃣  شغّل ملف التثبيت:
   • انقر مزدوجاً على الملف $($exeFile.Name)
   • أو من Command Prompt:
     $($exeFile.FullName)

2️⃣  اختبر الترخيص التجريبي:
   • عند التشغيل الأول، ستظهر نافذة ترخيص
   • سيتم عرض بصمة الجهاز الخاصة بك
   • أدخل رمز تجريبي: [بصمة]F
     مثال: ABC123F
   • حدد عدد الأيام (مثلاً: 10)

3️⃣  اختبر النسخ الاحتياطية:
   • جرّب النسخة اليدوية من الإعدادات
   • تحقق من النسخة المجدولة
   • اختبر الاستيراد والاستعادة

4️⃣  اختبر الترخيص النهائي:
   • بعد انتهاء الأيام، ستظهر نافذة ترخيص
   • أدخل رمز نهائي: [بصمة]FF
     مثال: ABC123FF
   • النظام سيعمل بدون قيود

📝 ملاحظات مهمة:
   • رمز الترخيص حساس لحالة الأحرف (Case Sensitive)
   • الأيام تُحسب من منتصف الليل
   • تنبيهات تظهر عند 3 أيام أو أقل متبقية
   • يمكن تحديث الترخيص أي وقت
"@ | Write-Host -ForegroundColor Gray

Write-Host ""

# ============================================================================
# أزرار التشغيل
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "⚡ خيارات سريعة:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "اختر: (1) فتح المجلد و(2) تشغيل الملف و(0) إغلاق"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔓 جاري فتح مجلد الملفات..." -ForegroundColor Cyan
        Start-Process explorer.exe -ArgumentList $exeFile.Directory.FullName
        Write-Host "✅ تم فتح المجلد" -ForegroundColor Green
    }
    "2" {
        Write-Host ""
        Write-Host "🚀 جاري تشغيل البرنامج..." -ForegroundColor Cyan
        & $exeFile.FullName
    }
    default {
        Write-Host ""
        Write-Host "👋 شكراً لاستخدام السكريبت!" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                                           ║" -ForegroundColor Green
Write-Host "║                    ✨ تم بناء الملف بنجاح! ✨                           ║" -ForegroundColor Green
Write-Host "║                                                                           ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
