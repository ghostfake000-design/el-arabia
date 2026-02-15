@echo off
REM build-quick.bat - سكريبت بناء سريع
REM الشركة العربية لصهر وتشكيل المعادن

setlocal enabledelayedexpansion

title بناء التطبيق - نظام المخازن v4.0.1

echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║                                                                           ║
echo ║          🏗️  بناء ملف التثبيت النهائي - نظام المخازن                   ║
echo ║                      الشركة العربية لصهر المعادن                        ║
echo ║                          الإصدار 4.0.1                                  ║
echo ║                                                                           ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.

REM التحقق من النسخة الحالية
if not exist "package.json" (
    echo ❌ خطأ: ملف package.json غير موجود!
    echo من فضلك تأكد من أنك في مجلد المشروع الصحيح
    pause
    exit /b 1
)

REM التحقق من Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js غير مثبت!
    echo تحميل من: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js موجود
node --version
npm --version
echo.

REM الخطوة 1: تنظيف المجلدات القديمة
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ⏳ الخطوة 1: تنظيف الملفات القديمة...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if exist "dist" rmdir /s /q dist
if exist "dist-electron" rmdir /s /q dist-electron
echo ✅ تم التنظيف
echo.

REM الخطوة 2: تثبيت المكتبات
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ⏳ الخطوة 2: تثبيت المكتبات (npm install)...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
call npm install
if errorlevel 1 (
    echo ❌ فشل تثبيت المكتبات!
    echo جرّب: npm cache verify
    pause
    exit /b 1
)
echo ✅ تم التثبيت بنجاح
echo.

REM الخطوة 3: البناء
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ⏳ الخطوة 3: بناء الواجهة (Vite)...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
call npm run build
if errorlevel 1 (
    echo ❌ فشل البناء!
    pause
    exit /b 1
)
echo ✅ تم البناء بنجاح
echo.

REM الخطوة 4: بناء EXE
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ⏳ الخطوة 4: بناء ملف التثبيت (Electron Builder)...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
call npm run build:win
if errorlevel 1 (
    echo ❌ فشل بناء EXE!
    pause
    exit /b 1
)
echo.

REM الخطوة 5: البحث عن ملف EXE
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✅ الخطوة 5: البحث عن ملف التثبيت...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

for /f "tokens=*" %%A in ('dir /b /s dist-electron\*.exe 2^>nul ^| findstr /v blockmap ^| findstr /v uninstaller') do (
    if not exist "!exe!" (
        set "exe=%%A"
    )
)

if defined exe (
    echo.
    echo 📦 ملف التثبيت النهائي:
    echo ✅ تم العثور على: %exe%
    echo.
    echo 📊 معلومات الملف:
    for %%F in (%exe%) do (
        set /a size=%%~zF / 1024 / 1024
        echo    الحجم: !size! MB
        echo    التاريخ: %%~tF
    )
    echo.
    echo 🎉 تم بناء الملف بنجاح!
    echo.
    echo اختر:
    echo   [1] فتح مجلد الملرفات
    echo   [2] تشغيل البرنامج
    echo   [0] خروج
    echo.
    set /p choice="الاختيار: "
    
    if "!choice!"=="1" (
        explorer "%exe:\*=%"
    ) else if "!choice!"=="2" (
        start "" "%exe%"
    )
) else (
    echo ❌ لم يتم العثور على ملف EXE!
    echo تحقق من المجلد:
    echo   dist-electron\
    pause
)

echo.
echo ✨ انتهى البناء
pause
