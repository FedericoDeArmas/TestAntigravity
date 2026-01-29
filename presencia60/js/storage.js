/**
 * Presencia60 - Storage Module
 */

const Storage = {
    STORAGE_KEY: 'presencia60_data',

    getData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) return this.getDefaultData();
        try {
            return JSON.parse(data);
        } catch (e) {
            return this.getDefaultData();
        }
    },

    getDefaultData() {
        return {
            records: {},
            settings: { targetPercentage: 0.60, userId: 'user_' + Math.random().toString(36).substr(2, 9) },
            createdAt: new Date().toISOString()
        };
    },

    saveData(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    getRecord(dateStr) {
        return this.getData().records[dateStr] || null;
    },

    setRecord(dateStr, type, licenseType = null) {
        const data = this.getData();
        data.records[dateStr] = { type, timestamp: new Date().toISOString() };
        if (type === 'license' && licenseType) data.records[dateStr].licenseType = licenseType;
        this.saveData(data);
        return true;
    },

    deleteRecord(dateStr) {
        const data = this.getData();
        if (data.records[dateStr]) {
            delete data.records[dateStr];
            this.saveData(data);
            return true;
        }
        return false;
    },

    getMonthRecords(year, month) {
        const data = this.getData();
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthRecords = {};
        for (const [date, record] of Object.entries(data.records)) {
            if (date.startsWith(prefix)) monthRecords[date] = record;
        }
        return monthRecords;
    },

    getMonthStats(year, month) {
        const records = this.getMonthRecords(year, month);
        let officeDays = 0, remoteDays = 0, licenseDays = 0;
        for (const record of Object.values(records)) {
            if (record.type === 'office') officeDays++;
            else if (record.type === 'remote') remoteDays++;
            else if (record.type === 'license') licenseDays++;
        }
        return { officeDays, remoteDays, licenseDays, totalRegistered: officeDays + remoteDays };
    },

    getMonthLicenses(year, month) {
        const records = this.getMonthRecords(year, month);
        return Object.entries(records)
            .filter(([_, r]) => r.type === 'license')
            .map(([date, r]) => ({ date, licenseType: r.licenseType || 'Otro' }))
            .sort((a, b) => a.date.localeCompare(b.date));
    },

    getTodayRecord() {
        return this.getRecord(new Date().toISOString().split('T')[0]);
    }
};
