/**
 * Safe date handling utility to prevent "Invalid time value" errors
 */

export const safeDate = {
  /**
   * Safely parse a date string
   */
  parse(dateString: string | Date | null | undefined): Date | null {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  },

  /**
   * Safely format a date for display
   */
  format(date: string | Date | null | undefined, format: 'date' | 'datetime' | 'relative' = 'date'): string {
    const parsed = this.parse(date);
    if (!parsed) return 'N/A';
    
    try {
      switch (format) {
        case 'date':
          return parsed.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        case 'datetime':
          return parsed.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        case 'relative':
          const now = new Date();
          const diffMs = now.getTime() - parsed.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) return 'Today';
          if (diffDays === 1) return 'Yesterday';
          if (diffDays < 7) return `${diffDays} days ago`;
          if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
          return `${Math.floor(diffDays / 30)} months ago`;
        default:
          return parsed.toISOString().split('T')[0];
      }
    } catch {
      return 'Invalid Date';
    }
  },

  /**
   * Safely convert to ISO string
   */
  toISO(date: string | Date | null | undefined): string | null {
    const parsed = this.parse(date);
    return parsed ? parsed.toISOString() : null;
  },

  /**
   * Check if date is valid
   */
  isValid(date: string | Date | null | undefined): boolean {
    return this.parse(date) !== null;
  }
};