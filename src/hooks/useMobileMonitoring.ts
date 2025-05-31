import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeAgo } from '@/utils/time-utils';
import { type MobileUsageLog } from '@/types/mobile-monitoring';

/**
 * Hook for monitoring mobile usage in a group
 * 
 * @param groupId The group ID to monitor
 * @returns Object containing the loading state and usage logs
 */
export function useMobileMonitoring(groupId: string | null) {
  const [isLoading, setIsLoading] = useState(true);
  const [usageLogs, setUsageLogs] = useState<MobileUsageLog[]>([]);
  const [subscriptionChannel, setSubscriptionChannel] = useState<any>(null);

  useEffect(() => {
    // Clean up any previous subscription when the groupId changes
    return () => {
      if (subscriptionChannel) {
        supabase.removeChannel(subscriptionChannel);
      }
    };
  }, [groupId]);

  // Initial data fetch and real-time subscription setup
  useEffect(() => {
    if (!groupId) {
      setUsageLogs([]);
      setIsLoading(false);
      return;
    }

    const fetchUsageLogs = async () => {
      try {
        setIsLoading(true);
        
        // Get group schedule information for context
        const { data: scheduleData } = await supabase
          .from('schedules')
          .select('*')
          .eq('group_id', groupId);
        
        const schedules = scheduleData || [];
        
        // Get both the mobile usage and user profiles in a single query using joins
        const { data, error } = await supabase
          .from('mobile_usage')
          .select(`
            *,
            profiles:user_id (
              id,
              full_name,
              unique_id,
              user_role
            ),
            groups:group_id (
              id,
              name
            )
          `)
          .eq('group_id', groupId)
          .order('start_time', { ascending: false });

        if (error) {
          throw error;
        }

        // Process and transform the data
        const logs: MobileUsageLog[] = data.map(log => {
          const startTime = new Date(log.start_time);
          const endTime = log.end_time ? new Date(log.end_time) : new Date();
          const durationMs = endTime.getTime() - startTime.getTime();
          const durationSeconds = Math.floor(durationMs / 1000);

          // Check if usage is within schedule
          const isWithinSchedule = checkIfWithinSchedule(log.start_time, schedules);
          
          return {
            id: log.id,
            user_id: log.user_id,
            group_id: log.group_id,
            start_time: log.start_time,
            end_time: log.end_time,
            duration: log.duration || durationSeconds,
            created_at: log.created_at,
            user_name: log.profiles?.full_name || null,
            user_unique_id: log.profiles?.unique_id || null,
            user_role: log.profiles?.user_role || null,
            group_name: log.groups?.name || null,
            is_violation: (log.duration || durationSeconds) > 15, // More than 15 seconds is a violation
            is_within_schedule: isWithinSchedule,
            time_ago: formatTimeAgo(new Date(log.start_time))
          };
        });

        setUsageLogs(logs);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching mobile usage logs:", error);
        setIsLoading(false);
      }
    };

    fetchUsageLogs();

    // Set up real-time subscription to mobile_usage table for this group
    const channel = supabase
      .channel(mobile-usage-group-${groupId})
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mobile_usage',
          filter: group_id=eq.${groupId}
        },
        async (payload) => {
          console.log("Received real-time update for mobile usage:", payload);
          
          // Refresh all data to ensure consistency
          // This avoids complex merge logic and potential inconsistencies
          await fetchUsageLogs();
        }
      )
      .subscribe();

    // Store the channel for cleanup
    setSubscriptionChannel(channel);

    // Fetch data every 30 seconds to ensure it stays up to date
    // This is a fallback in case the real-time subscription fails
    const interval = setInterval(() => {
      fetchUsageLogs();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [groupId]);

  /**
   * Check if a timestamp is within any scheduled period
   */
  const checkIfWithinSchedule = (timestamp: string, schedules: any[]): boolean => {
    if (!schedules || schedules.length === 0) return true; // If no schedules, assume everything is valid
    
    try {
      const date = new Date(timestamp);
      const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
      
      // Extract time components for comparison
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      const timeString = ${hours}:${minutes}:${seconds};
      
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
    } catch (error) {
      console.error("Error checking schedule:", error);
      return false;
    }
  };

  return { isLoading, usageLogs };
}
