
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileUsageLog } from "@/types/mobile-monitoring";

type UseUsageLogsProps = {
  groupId: string | null;
  isWithinSchedule: (timestamp: string) => boolean;
};

export function useUsageLogs({ groupId, isWithinSchedule }: UseUsageLogsProps) {
  // Function to fetch mobile usage logs
  const fetchMobileUsageLogs = useCallback(async (): Promise<MobileUsageLog[]> => {
    if (!groupId) return [];
    
    try {
      // Fetch the logs with user information
      const { data, error } = await supabase
        .from('mobile_usage')
        .select(`
          *,
          profiles:user_id (
            full_name,
            unique_id,
            user_role
          ),
          groups:group_id (
            name
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (error) {
        console.error("Error fetching mobile usage logs:", error);
        return [];
      }
      
      // Process the returned data
      const processedLogs = data.map(log => {
        // Calculate if the usage was outside of the scheduled times
        const startTime = log.start_time;
        const isWithinScheduleTime = isWithinSchedule(startTime);
        
        // Calculate if this is a violation (duration > 15 seconds)
        const isViolation = (log.duration || 0) > 15;
        
        return {
          id: log.id,
          user_id: log.user_id,
          group_id: log.group_id,
          start_time: log.start_time,
          end_time: log.end_time,
          duration: log.duration,
          created_at: log.created_at,
          is_within_schedule: isWithinScheduleTime,
          is_violation: isViolation,
          user_name: log.profiles?.full_name || null,
          user_unique_id: log.profiles?.unique_id || null,
          user_role: log.profiles?.user_role || null,
          group_name: log.groups?.name || null
        };
      });
      
      return processedLogs;
    } catch (error) {
      console.error("Exception fetching mobile usage logs:", error);
      return [];
    }
  }, [groupId, isWithinSchedule]);

  // Function to set up realtime subscription for usage logs
  const setupRealtimeSubscription = useCallback((onUpdate?: (logs: MobileUsageLog[]) => void) => {
    if (!groupId) return () => {};
    
    console.log(`Setting up realtime subscription for group ${groupId}`);
    
    const channel = supabase
      .channel('mobile_usage_changes')
      .on(
        'postgres_changes' as any,
        { 
          event: '*', 
          schema: 'public', 
          table: 'mobile_usage',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          console.log('Mobile usage changed:', payload);
          
          // If using callback-based updates, fetch only the new/updated logs
          if (onUpdate) {
            try {
              // For inserts, get only the new record
              if (payload.eventType === 'INSERT') {
                const { data, error } = await supabase
                  .from('mobile_usage')
                  .select(`
                    *,
                    profiles:user_id (
                      full_name,
                      unique_id,
                      user_role
                    ),
                    groups:group_id (
                      name
                    )
                  `)
                  .eq('id', payload.new.id)
                  .limit(1);
                  
                if (!error && data.length > 0) {
                  const processedLog = data.map(log => {
                    const isWithinScheduleTime = isWithinSchedule(log.start_time);
                    const isViolation = (log.duration || 0) > 15;
                    
                    return {
                      id: log.id,
                      user_id: log.user_id,
                      group_id: log.group_id,
                      start_time: log.start_time,
                      end_time: log.end_time,
                      duration: log.duration,
                      created_at: log.created_at,
                      is_within_schedule: isWithinScheduleTime,
                      is_violation: isViolation,
                      user_name: log.profiles?.full_name || null,
                      user_unique_id: log.profiles?.unique_id || null,
                      user_role: log.profiles?.user_role || null,
                      group_name: log.groups?.name || null
                    };
                  });
                  
                  onUpdate(processedLog);
                }
              }
              // For updates, get the updated record
              else if (payload.eventType === 'UPDATE') {
                const { data, error } = await supabase
                  .from('mobile_usage')
                  .select(`
                    *,
                    profiles:user_id (
                      full_name,
                      unique_id,
                      user_role
                    ),
                    groups:group_id (
                      name
                    )
                  `)
                  .eq('id', payload.new.id)
                  .limit(1);
                  
                if (!error && data.length > 0) {
                  const processedLog = data.map(log => {
                    const isWithinScheduleTime = isWithinSchedule(log.start_time);
                    const isViolation = (log.duration || 0) > 15;
                    
                    return {
                      id: log.id,
                      user_id: log.user_id,
                      group_id: log.group_id,
                      start_time: log.start_time,
                      end_time: log.end_time,
                      duration: log.duration,
                      created_at: log.created_at,
                      is_within_schedule: isWithinScheduleTime,
                      is_violation: isViolation,
                      user_name: log.profiles?.full_name || null,
                      user_unique_id: log.profiles?.unique_id || null,
                      user_role: log.profiles?.user_role || null,
                      group_name: log.groups?.name || null
                    };
                  });
                  
                  onUpdate(processedLog);
                }
              }
            } catch (error) {
              console.error("Error processing realtime update:", error);
            }
          }
          // Without callback, full refresh will be triggered
        }
      )
      .subscribe();
      
    // Return unsubscribe function
    return () => {
      console.log("Unsubscribing from mobile usage changes");
      supabase.removeChannel(channel);
    };
  }, [groupId, isWithinSchedule]);

  return {
    fetchMobileUsageLogs,
    setupRealtimeSubscription
  };
}
