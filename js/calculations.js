/**
 * Presencia60 - Calculations Module
 * Business logic for hybrid work tracking
 */

const Calculations = {
  TARGET_PERCENTAGE: 0.60,

  /**
   * Get all working days in a month (excluding weekends)
   * @param {number} year 
   * @param {number} month - 0-indexed
   * @returns {Date[]} Array of working day dates
   */
  getWorkingDaysInMonth(year, month) {
    const workingDays = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays.push(date);
      }
    }

    return workingDays;
  },

  /**
   * Count working days in a month
   * @param {number} year 
   * @param {number} month - 0-indexed
   * @returns {number}
   */
  countWorkingDaysInMonth(year, month) {
    return this.getWorkingDaysInMonth(year, month).length;
  },

  /**
   * Get working days up to today (inclusive)
   * @param {number} year 
   * @param {number} month - 0-indexed
   * @returns {Date[]}
   */
  getWorkingDaysUntilToday(year, month) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return this.getWorkingDaysInMonth(year, month).filter(date => date <= today);
  },

  /**
   * Get remaining working days after today
   * @param {number} year 
   * @param {number} month - 0-indexed
   * @returns {Date[]}
   */
  getRemainingWorkingDays(year, month) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.getWorkingDaysInMonth(year, month).filter(date => date > today);
  },

  /**
   * Calculate presence percentage
   * @param {number} officeDays - Days in office
   * @param {number} totalWorkingDays - Total working days (excluding licenses)
   * @returns {number} Percentage as decimal (0-1)
   */
  calculatePresencePercentage(officeDays, totalWorkingDays) {
    if (totalWorkingDays === 0) return 0;
    return officeDays / totalWorkingDays;
  },

  /**
   * Calculate how many office days are needed to reach target
   * @param {number} currentOfficeDays 
   * @param {number} totalWorkingDays - Total working days in month (excluding licenses)
   * @param {number} daysAlreadyRegistered - Days already registered
   * @returns {object} { needed: number, possible: boolean, surplus: number }
   */
  calculateRemainingOfficeDaysNeeded(currentOfficeDays, totalWorkingDays, daysAlreadyRegistered) {
    const targetOfficeDays = Math.ceil(totalWorkingDays * this.TARGET_PERCENTAGE);
    const neededOfficeDays = targetOfficeDays - currentOfficeDays;
    const remainingDays = totalWorkingDays - daysAlreadyRegistered;

    return {
      needed: Math.max(0, neededOfficeDays),
      targetTotal: targetOfficeDays,
      remainingDays: remainingDays,
      possible: neededOfficeDays <= remainingDays,
      surplus: currentOfficeDays - targetOfficeDays
    };
  },

  /**
   * Project final percentage based on current trend
   * @param {number} currentOfficeDays 
   * @param {number} currentRemoteDays 
   * @param {number} remainingDays 
   * @returns {number} Projected percentage as decimal
   */
  projectFinalPercentage(currentOfficeDays, currentRemoteDays, remainingDays) {
    const totalCurrentDays = currentOfficeDays + currentRemoteDays;
    if (totalCurrentDays === 0) return this.TARGET_PERCENTAGE;

    const currentRatio = currentOfficeDays / totalCurrentDays;
    const projectedOfficeDays = currentOfficeDays + Math.round(remainingDays * currentRatio);
    const totalDays = totalCurrentDays + remainingDays;

    return projectedOfficeDays / totalDays;
  },

  /**
   * Get suggestion for tomorrow
   * @param {number} currentOfficeDays 
   * @param {number} currentRemoteDays 
   * @param {number} totalWorkingDays 
   * @param {number} licenseDays 
   * @returns {object} { suggestion: 'office'|'remote'|'any', reason: string }
   */
  suggestTomorrow(currentOfficeDays, currentRemoteDays, totalWorkingDays, licenseDays) {
    const effectiveWorkingDays = totalWorkingDays - licenseDays;
    const daysRegistered = currentOfficeDays + currentRemoteDays;
    const remainingDays = effectiveWorkingDays - daysRegistered;

    if (remainingDays <= 0) {
      return { suggestion: 'none', reason: 'No quedan días laborables este mes' };
    }

    const targetOfficeDays = Math.ceil(effectiveWorkingDays * this.TARGET_PERCENTAGE);
    const neededOfficeDays = targetOfficeDays - currentOfficeDays;

    if (neededOfficeDays <= 0) {
      return {
        suggestion: 'remote',
        reason: `¡Ya cumpliste el objetivo! Puedes trabajar remoto los ${remainingDays} días restantes`
      };
    }

    if (neededOfficeDays >= remainingDays) {
      return {
        suggestion: 'office',
        reason: `Necesitas ir a la oficina los ${remainingDays} días restantes para alcanzar el 60%`
      };
    }

    const margin = remainingDays - neededOfficeDays;
    if (margin <= 2) {
      return {
        suggestion: 'office',
        reason: `Margen ajustado: te faltan ${neededOfficeDays} días de oficina de ${remainingDays} restantes`
      };
    }

    return {
      suggestion: 'any',
      reason: `Puedes elegir libremente. Necesitas ${neededOfficeDays} días de oficina y tienes ${remainingDays} días restantes`
    };
  },

  /**
   * Format date as YYYY-MM-DD
   * @param {Date} date 
   * @returns {string}
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  },

  /**
   * Check if a date is today
   * @param {Date|string} date 
   * @returns {boolean}
   */
  isToday(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
  },

  /**
   * Check if a date is a weekend
   * @param {Date|string} date 
   * @returns {boolean}
   */
  isWeekend(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDay();
    return day === 0 || day === 6;
  },

  /**
   * Get status alert type based on current metrics
   * @param {number} currentPercentage - Current presence percentage (0-1)
   * @param {number} projectedPercentage - Projected final percentage (0-1)
   * @param {boolean} canStillReachTarget - Whether target is still achievable
   * @returns {'success'|'warning'|'danger'}
   */
  getAlertStatus(currentPercentage, projectedPercentage, canStillReachTarget) {
    if (currentPercentage >= this.TARGET_PERCENTAGE) {
      return 'success';
    }
    if (projectedPercentage >= this.TARGET_PERCENTAGE && canStillReachTarget) {
      return 'success';
    }
    if (canStillReachTarget) {
      return 'warning';
    }
    return 'danger';
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Calculations;
}
