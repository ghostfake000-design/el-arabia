
const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');
const crypto = require('crypto');

class LicenseManager {
    constructor() {
        this.dbPath = path.join(app.getPath('userData'), 'license_v2.db');
        this.deviceId = this.generateDeviceId();
    }

    // توليد بصمة الجهاز مع مراعاة حساسية حالة الأحرف
    generateDeviceId() {
        const info = os.hostname() + os.arch() + os.platform() + (os.cpus()[0]?.model || 'GENERIC_CPU');
        // تحويل النص إلى Hash لضمان طول ثابت وصعوبة في التوقع
        return crypto.createHash('sha256').update(info).digest('hex').substring(0, 12).toUpperCase();
    }

    getPrefix() {
        return this.deviceId.substring(0, 6).toUpperCase();
    }

    getLicenseData() {
        if (!fs.existsSync(this.dbPath)) return null;
        try {
            const data = fs.readFileSync(this.dbPath, 'utf8');
            return JSON.parse(Buffer.from(data, 'base64').toString());
        } catch (e) {
            return null;
        }
    }

    saveLicenseData(data) {
        const encoded = Buffer.from(JSON.stringify(data)).toString('base64');
        fs.writeFileSync(this.dbPath, encoded);
    }

    checkStatus() {
        const data = this.getLicenseData();
        const prefix = this.getPrefix();

        if (!data) {
            return { status: 'REQUIRE_ACTIVATION', deviceId: this.deviceId };
        }

        if (data.isPermanent) {
            return { status: 'ACTIVATED', type: 'PERMANENT' };
        }

        if (data.isTrial) {
            const expiryDate = new Date(data.expiryDate);
            const now = new Date();
            
            // حساب الفرق بالميلي ثانية ثم التحويل إلى أيام
            const diffTime = expiryDate.getTime() - now.getTime();
            // استخدام floor() لتقريب الأيام بشكل أقل دقة
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

            // إذا كان الفرق سالباً أو صفر، انتهت الصلاحية
            if (diffDays <= 0) {
                return { 
                    status: 'REQUIRE_ACTIVATION', 
                    deviceId: this.deviceId, 
                    expired: true,
                    expiredMessage: `انتهت الفترة التجريبية في ${expiryDate.toLocaleDateString('ar-EG')}`
                };
            }
            
            return { 
                status: 'TRIAL', 
                daysLeft: Math.max(diffDays, 1),
                expiryDate: expiryDate.toLocaleDateString('ar-EG'),
                type: 'TRIAL'
            };
        }

        return { status: 'REQUIRE_ACTIVATION', deviceId: this.deviceId };
    }

    validateKey(key) {
        const prefix = this.getPrefix();
        if (key === prefix + "FF") return 'PERMANENT';
        if (key === prefix + "F") return 'TRIAL';
        return 'INVALID';
    }

    activateTrial(days) {
        const daysNum = parseInt(days);
        if (isNaN(daysNum) || daysNum <= 0) {
            return false;
        }
        
        const expiryDate = new Date();
        // إضافة الأيام في بداية اليوم التالي
        expiryDate.setHours(0, 0, 0, 0);
        expiryDate.setDate(expiryDate.getDate() + daysNum);
        
        this.saveLicenseData({
            isTrial: true,
            isPermanent: false,
            expiryDate: expiryDate.toISOString(),
            activationDate: new Date().toISOString(),
            daysGranted: daysNum
        });
        return true;
    }

    activatePermanent() {
        this.saveLicenseData({
            isTrial: false,
            isPermanent: true,
            activationDate: new Date().toISOString()
        });
        return true;
    }
}

module.exports = LicenseManager;
