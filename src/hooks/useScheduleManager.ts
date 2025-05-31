
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Schedule } from "@/types/mobile-monitoring";
import { compareTimeStrings } from "@/utils/time-utils";
import { BackgroundMonitoring } from "@/services/BackgroundMonitoring";

export function useScheduleManager(groupId: string | null) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState<Record<string, number>>({});
  const [errorStates, setErrorStates] = useState<Record<string, boolean>>({});

  const isWithinSchedule = (timestamp: string): boolean => {
    if (!schedules || schedules.length === 0) return true;
    
    const date = new Date(timestamp);
    const dayOfWeek = date.getDay();
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;
    
    const daySchedules = schedules.filter(s => s.day_of_week === dayOfWeek);
    if (daySchedules.length === 0) return false;
    
    const duringBreak = daySchedules.some(schedule => {
      return schedule.is_break && 
        compareTimeStrings(timeString, schedule.start_time) >= 0 && 
        compareTimeStrings(timeString, schedule.end_time) <= 0;
    });
    
    if (duringBreak) return false;
    
    return daySchedules.some(schedule => {
      if (schedule.is_break) return false;
      return compareTimeStrings(timeString, schedule.start_time) >= 0 && 
             compareTimeStrings(timeString, schedule.end_time) <= 0;
    });
  };

  const fetchSchedules = async () => {
    if (!groupId) return;
    
    try {
      setIsLoading(true);
      // Set error state to track retries
      const fetchKey = `schedules-${groupId}`;
      setErrorStates(prev => ({ ...prev, [fetchKey]: false }));
      
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('group_id', groupId);
        
      if (error) {
        console.error("Error fetching schedules:", error);
        
        // Implement retry logic
        const currentRetries = retryAttempts[fetchKey] || 0;
        if (currentRetries < 3) {
          setRetryAttempts(prev => ({ ...prev, [fetchKey]: currentRetries + 1 }));
          setErrorStates(prev => ({ ...prev, [fetchKey]: true }));
          
          setTimeout(() => {
            console.log(`Retrying schedule fetch, attempt ${currentRetries + 1}`);
            fetchSchedules();
          }, 3000 * Math.pow(2, currentRetries));
        }
        
        return;
      }
      
      // Reset retry count on success
      setRetryAttempts(prev => ({ ...prev, [fetchKey]: 0 }));
      
      console.log("Fetched schedules:", data);
      setSchedules(data);
      
      // Update the BackgroundMonitoring instance with new schedules
      const backgroundMonitoring = BackgroundMonitoring.getInstance();
      await backgroundMonitoring.refreshSchedules();
    } catch (error) {
      console.error("Exception fetching schedules:", error);
      
      // General error recovery
      setTimeout(() => {
        console.log("Retrying after exception in fetchSchedules");
        fetchSchedules();
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchSchedules();
    }
  }, [groupId]);

  // Set up realtime subscription for schedule changes
  useEffect(() => {
    if (!groupId) return;
    
    const scheduleChannel = supabase
      .channel(`schedules_${groupId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*', 
          schema: 'public', 
          table: 'schedules',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          console.log('Schedule change detected, refreshing schedules');
          fetchSchedules();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.log('Schedule channel error, attempting to reconnect');
          setTimeout(() => {
            scheduleChannel.subscribe();
          }, 5000);
        }
      });
    
    return () => {
      supabase.removeChannel(scheduleChannel);
    };
  }, [groupId]);

  return {
    schedules,
    isLoading,
    isWithinSchedule,
    fetchSchedules
  };
}
