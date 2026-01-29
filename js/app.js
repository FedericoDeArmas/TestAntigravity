/**
 * Presencia60 - Main Application
 */

const App = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),

    init() {
        this.renderCurrentDate();
        this.renderCalendar();
        this.renderDashboard();
        this.renderLicenses();
        this.setupEventListeners();
        this.checkTodayStatus();
    },

    setupEventListeners() {
        document.getElementById('btn-office').addEventListener('click', () => this.handleCheckin('office'));
        document.getElementById('btn-remote').addEventListener('click', () => this.handleCheckin('remote'));
        document.getElementById('license-form').addEventListener('submit', (e) => this.handleLicenseSubmit(e));
        document.getElementById('cal-prev').addEventListener('click', () => this.navigateMonth(-1));
        document.getElementById('cal-next').addEventListener('click', () => this.navigateMonth(1));
    },

    renderCurrentDate() {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = today.toLocaleDateString('es-ES', options);
        document.getElementById('current-date').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    },

    checkTodayStatus() {
        const todayRecord = Storage.getTodayRecord();
        const btnOffice = document.getElementById('btn-office');
        const btnRemote = document.getElementById('btn-remote');
        btnOffice.classList.remove('checkin-btn--selected');
        btnRemote.classList.remove('checkin-btn--selected');
        if (todayRecord) {
            if (todayRecord.type === 'office') btnOffice.classList.add('checkin-btn--selected');
            else if (todayRecord.type === 'remote') btnRemote.classList.add('checkin-btn--selected');
        }
        if (Calculations.isWeekend(new Date())) {
            btnOffice.disabled = true;
            btnRemote.disabled = true;
            btnOffice.querySelector('.checkin-btn__sublabel').textContent = 'Fin de semana';
            btnRemote.querySelector('.checkin-btn__sublabel').textContent = 'Fin de semana';
        }
    },

    handleCheckin(type) {
        const today = new Date();
        if (Calculations.isWeekend(today)) {
            this.showToast('Los fines de semana no son días laborables', 'error');
            return;
        }
        const dateStr = Calculations.formatDate(today);
        const existingRecord = Storage.getRecord(dateStr);
        if (existingRecord && existingRecord.type === type) {
            Storage.deleteRecord(dateStr);
            this.showToast('Registro eliminado', 'info');
        } else {
            Storage.setRecord(dateStr, type);
            this.showToast(type === 'office' ? '🏢 Oficina registrado' : '🏠 Teletrabajo registrado', 'success');
        }
        this.checkTodayStatus();
        this.renderDashboard();
        this.renderCalendar();
    },

    renderDashboard() {
        const stats = Storage.getMonthStats(this.currentYear, this.currentMonth);
        const totalWorkingDays = Calculations.countWorkingDaysInMonth(this.currentYear, this.currentMonth);
        const effectiveWorkingDays = totalWorkingDays - stats.licenseDays;
        const percentage = stats.totalRegistered > 0 ? Calculations.calculatePresencePercentage(stats.officeDays, stats.totalRegistered) : 0;
        const remaining = Calculations.calculateRemainingOfficeDaysNeeded(stats.officeDays, effectiveWorkingDays, stats.totalRegistered);
        const projectedPercentage = Calculations.projectFinalPercentage(stats.officeDays, stats.remoteDays, remaining.remainingDays);
        const suggestion = Calculations.suggestTomorrow(stats.officeDays, stats.remoteDays, totalWorkingDays, stats.licenseDays);
        this.updateProgressCircle(percentage, projectedPercentage >= 0.60);
        document.getElementById('stat-office').textContent = stats.officeDays;
        document.getElementById('stat-remote').textContent = stats.remoteDays;
        document.getElementById('stat-remaining').textContent = remaining.needed;
        document.getElementById('stat-days-left').textContent = remaining.remainingDays;
        this.updateAlert(percentage, projectedPercentage, remaining.possible, remaining.needed);
        this.updateSuggestion(suggestion);
    },

    updateProgressCircle(percentage, isOnTrack) {
        const circle = document.getElementById('progress-circle');
        const valueEl = document.getElementById('progress-value');
        const radius = 80, circumference = 2 * Math.PI * radius;
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference - (percentage * circumference);
        circle.classList.toggle('progress-circle__progress--success', isOnTrack || percentage >= 0.60);
        valueEl.textContent = Math.round(percentage * 100) + '%';
    },

    updateAlert(currentPercentage, projectedPercentage, canReachTarget, neededDays) {
        const alertEl = document.getElementById('status-alert');
        const iconEl = alertEl.querySelector('.alert__icon');
        const textEl = alertEl.querySelector('.alert__text');
        alertEl.classList.remove('alert--success', 'alert--warning', 'alert--danger');
        if (currentPercentage >= 0.60) {
            alertEl.classList.add('alert--success');
            iconEl.textContent = '✅';
            textEl.textContent = '¡Objetivo cumplido! Mantén el ritmo.';
        } else if (projectedPercentage >= 0.60 && canReachTarget) {
            alertEl.classList.add('alert--success');
            iconEl.textContent = '📊';
            textEl.textContent = `Vas bien. Proyección: ${Math.round(projectedPercentage * 100)}%`;
        } else if (canReachTarget) {
            alertEl.classList.add('alert--warning');
            iconEl.textContent = '⚠️';
            textEl.textContent = `Atención: necesitas ${neededDays} días de oficina más`;
        } else {
            alertEl.classList.add('alert--danger');
            iconEl.textContent = '🚨';
            textEl.textContent = 'No es posible alcanzar el 60% este mes';
        }
    },

    updateSuggestion(suggestion) {
        const textEl = document.getElementById('suggestion-text');
        const icon = suggestion.suggestion === 'office' ? '🏢' : suggestion.suggestion === 'remote' ? '🏠' : '💡';
        textEl.innerHTML = `<strong>${icon} Mañana:</strong> ${suggestion.reason}`;
    },

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const title = document.getElementById('calendar-title');
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        title.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        grid.innerHTML = '';
        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-mini__day-header';
            header.textContent = day;
            grid.appendChild(header);
        });
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        let startDay = firstDay.getDay() - 1;
        if (startDay < 0) startDay = 6;
        const records = Storage.getMonthRecords(this.currentYear, this.currentMonth);
        const today = new Date();
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-mini__day calendar-mini__day--other-month';
            grid.appendChild(emptyDay);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            const dateStr = Calculations.formatDate(date);
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-mini__day';
            dayEl.textContent = day;
            if (Calculations.isWeekend(date)) {
                dayEl.classList.add('calendar-mini__day--weekend');
            } else {
                const record = records[dateStr];
                if (record) {
                    if (record.type === 'office') dayEl.classList.add('calendar-mini__day--office');
                    else if (record.type === 'remote') dayEl.classList.add('calendar-mini__day--remote');
                    else if (record.type === 'license') dayEl.classList.add('calendar-mini__day--license');
                }
            }
            if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
                dayEl.classList.add('calendar-mini__day--today');
            }
            grid.appendChild(dayEl);
        }
    },

    navigateMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
        else if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
        this.renderCalendar();
        this.renderDashboard();
        this.renderLicenses();
    },

    handleLicenseSubmit(e) {
        e.preventDefault();
        const dateInput = document.getElementById('license-date');
        const typeSelect = document.getElementById('license-type');
        if (!dateInput.value) { this.showToast('Selecciona una fecha', 'error'); return; }
        const date = new Date(dateInput.value + 'T12:00:00');
        if (Calculations.isWeekend(date)) { this.showToast('No puedes registrar licencia en fin de semana', 'error'); return; }
        Storage.setRecord(dateInput.value, 'license', typeSelect.value);
        this.showToast('📅 Licencia registrada', 'success');
        dateInput.value = '';
        this.renderDashboard();
        this.renderCalendar();
        this.renderLicenses();
    },

    renderLicenses() {
        const container = document.getElementById('license-list');
        const licenses = Storage.getMonthLicenses(this.currentYear, this.currentMonth);
        if (licenses.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 1rem;">No hay licencias este mes</p>';
            return;
        }
        container.innerHTML = licenses.map(l => `
      <div class="license-item">
        <div class="license-item__info">
          <span class="license-item__date">${this.formatDisplayDate(l.date)}</span>
          <span class="license-item__type">${l.licenseType}</span>
        </div>
        <button class="license-item__delete" onclick="App.deleteLicense('${l.date}')" title="Eliminar">✕</button>
      </div>
    `).join('');
    },

    deleteLicense(dateStr) {
        Storage.deleteRecord(dateStr);
        this.showToast('Licencia eliminada', 'info');
        this.renderDashboard();
        this.renderCalendar();
        this.renderLicenses();
    },

    formatDisplayDate(dateStr) {
        return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
