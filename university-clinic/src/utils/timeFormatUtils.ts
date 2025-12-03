// src/utils/timeFormatUtils.ts
// Timezone-safe date and time formatting utilities

/**
 * Format a time string (HH:MM or HH:MM:SS) to 12-hour format
 * WITHOUT creating Date objects that cause timezone conversion
 */
export const formatTime = (timeString: string | undefined): string => {
  if (!timeString) return '';
  
  try {
    // Handle "10:00:00" or "10:00" format - DON'T create Date objects
    const timeParts = timeString.split(':');
    let hours = parseInt(timeParts[0]);
    const minutes = timeParts[1];
    
    // Convert to 12-hour format with AM/PM
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 to 12 for midnight
    
    return `${hours}:${minutes} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
};

/**
 * Format a date string (YYYY-MM-DD) for display
 * WITHOUT timezone conversion issues
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  
  try {
    // Handle "2025-10-07" format
    const datePart = dateString.split('T')[0]; // Remove time if present
    const [year, month, day] = datePart.split('-').map(Number);
    
    // Create date using local timezone
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    // Format as "Oct 7, 2025"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Format date to YYYY-MM-DD for API calls
 */
export const formatDateForAPI = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateString);
    return dateString;
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Format time to HH:MM for API calls (24-hour format)
 */
export const formatTimeForAPI = (timeString: string): string => {
  if (!timeString) return '';
  
  // If already in HH:MM format, return as-is
  if (/^\d{2}:\d{2}$/.test(timeString)) {
    return timeString;
  }
  
  // If in HH:MM:SS format, remove seconds
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
    return timeString.substring(0, 5);
  }
  
  return timeString;
};

/**
 * Get current date in YYYY-MM-DD format (local timezone)
 */
export const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get current time in HH:MM format (local timezone)
 */
export const getCurrentTime = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Combine date and time for display
 */
export const formatDateTime = (date: string, time: string): string => {
  return `${formatDate(date)} at ${formatTime(time)}`;
};

/**
 * Parse date from various formats to YYYY-MM-DD
 */
export const parseDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return formatDateForAPI(dateString);
  } catch (error) {
    console.error('Error parsing date:', error);
    return dateString;
  }
};

/**
 * Check if a date is in the past
 */
export const isDateInPast = (dateString: string): boolean => {
  try {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  } catch (error) {
    return false;
  }
};

/**
 * Check if a date is today
 */
export const isToday = (dateString: string): boolean => {
  try {
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    return false;
  }
};