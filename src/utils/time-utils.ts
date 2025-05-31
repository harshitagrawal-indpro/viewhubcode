export const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined) return "N/A";
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    return ${minutes}m ${remainingSeconds}s;
  }
  return ${remainingSeconds}s;
};

/**
 * Format a date to a "time ago" string
 */
export const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  }
  
  if (diffInMinutes < 60) {
    return ${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return ${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return ${diffInDays} day${diffInDays === 1 ? '' : 's'} ago;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return ${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return ${diffInYears} year${diffInYears === 1 ? '' : 's'} ago;
};

/**
 * Check if a given time string is within the valid scheduled times
 */
export const isWithinScheduleTimes = (
  timeString: string, 
  schedules: Array<{day_of_week: number; start_time: string; end_time: string; is_break: boolean}>
): boolean => {
  if (!schedules || schedules.length === 0) return true;
  
  const date = new Date();
  const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
  
  // Find schedules for this day that are not breaks
  const daySchedules = schedules.filter(s => 
    s.day_of_week === dayOfWeek && 
    !s.is_break
  );
  
  // If no schedules for this day, consider it outside schedule
  if (daySchedules.length === 0) return false;
  
  // Check if current time is within any scheduled period
  return daySchedules.some(schedule => 
    timeString >= schedule.start_time && 
    timeString <= schedule.end_time
  );
};

/**
 * Safely get the current date/time in ISO format
 */
export const getCurrentISOTime = (): string => {
  return new Date().toISOString();
};

/**
 * Convert a time string in HH:MM:SS format to minutes past midnight
 */
export const timeStringToMinutes = (timeString: string): number => {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours * 60 + minutes + (seconds ? seconds/60 : 0);
};

/**
 * Calculate if a schedule is about to start within the next X minutes
 */
export const isScheduleApproaching = (
  schedules: Array<{day_of_week: number; start_time: string; end_time: string; is_break: boolean}>,
  minutesThreshold: number = 5 // Default to 5 minutes
): boolean => {
  if (!schedules || schedules.length === 0) return false;
  
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  
  // Find non-break schedules for today
  const todaySchedules = schedules.filter(s => 
    s.day_of_week === dayOfWeek && 
    !s.is_break
  );
  
  if (todaySchedules.length === 0) return false;
  
  // Check if any schedule is about to start
  return todaySchedules.some(schedule => {
    const startMinutes = timeStringToMinutes(schedule.start_time);
    const timeDifference = startMinutes - currentTotalMinutes;
    
    // If schedule is starting within the threshold and has not already started
    return timeDifference > 0 && timeDifference <= minutesThreshold;
  });
};
