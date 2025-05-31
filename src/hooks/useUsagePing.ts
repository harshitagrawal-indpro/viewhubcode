
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type UsagePingProps = {
  groupId: string | null;
  isWithinSchedule: (timestamp: string) => boolean;
  isMobileApp: boolean;
  screenIsOn: boolean;
  hasInternetConnection: boolean;
};

export function useUsagePing({ 
  groupId, 
  isWithinSchedule, 
  isMobileApp,
  screenIsOn,
  hasInternetConnection 
}: UsagePingProps) {
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);

  // Function to create usage records
  const createUsageRecord = async () => {
    if (!groupId) return;
    
    // Only create usage record if we're on mobile, screen is on, and connected to internet
    if (!isMobileApp || !screenIsOn || !hasInternetConnection) {
      console.log("Skipping usage ping: ", { isMobileApp, screenIsOn, hasInternetConnection });
      return;
    }
    
    // Check if within schedule
    const now = new Date();
    const isMonitoringTime = isWithinSchedule(now.toISOString());
    
    // Only create records when within schedule
    if (!isMonitoringTime) {
      console.log("Skipping usage ping: Outside of scheduled monitoring hours");
      return;
    }
    
    try {
      setLastPingTime(now);
      
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      
      if (userId) {
        const { error } = await supabase.from('mobile_usage').insert([{ 
          user_id: userId, 
          group_id: groupId, 
          start_time: now.toISOString(),
          duration: 60, // 1 minute default duration
          is_within_schedule: true // We already checked this above
        }]);
        
        if (error) {
          console.error("Error creating usage ping record:", error);
          
          // Implement retry mechanism with exponential backoff
          let retryCount = 0;
          const retryMaxAttempts = 3;
          let retrySuccess = false;
          
          const attemptRetry = async () => {
            if (retryCount >= retryMaxAttempts || retrySuccess) return;
            
            retryCount++;
            console.log(`Retrying usage record creation (attempt ${retryCount})...`);
            
            setTimeout(async () => {
              const { error: retryError } = await supabase.from('mobile_usage').insert([{ 
                user_id: userId, 
                group_id: groupId, 
                start_time: new Date().toISOString(),
                duration: 60,
                is_within_schedule: true
              }]);
              
              if (!retryError) {
                console.log(`Retry successful on attempt ${retryCount}`);
                retrySuccess = true;
              } else if (retryCount < retryMaxAttempts) {
                console.error(`Retry ${retryCount} failed:`, retryError);
                attemptRetry();
              }
            }, 2000 * Math.pow(2, retryCount-1));
          };
          
          attemptRetry();
        } else {
          console.log("Created usage ping record at", now.toISOString());
        }
      }
    } catch (e) {
      console.error("Exception creating usage record:", e);
    }
  };

  // Function to maintain an aggressive ping service
  const startUsagePingService = () => {
    if (!groupId || !isMobileApp) return;
    
    // Create an initial usage record
    createUsageRecord();
    
    // Set up regular pings - aggressively ping every 30 seconds
    const pingInterval = setInterval(() => {
      createUsageRecord();
    }, 30000);
    
    // Return cleanup function
    return () => clearInterval(pingInterval);
  };

  // Monitor app state changes
  useEffect(() => {
    if (!groupId || !isMobileApp) return;

    try {
      // Setup app state tracking for Capacitor
      if (typeof window !== 'undefined' && 'Capacitor' in window) {
        const { App } = require('@capacitor/app');
        
        // Monitor app state changes
        const subscription = App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
          console.log(`App is ${isActive ? 'active' : 'inactive'}`);
          
          if (isActive) {
            createUsageRecord();
          } else {
            const getUserSession = async () => {
              const { data } = await supabase.auth.getUser();
              const userId = data?.user?.id;
              
              if (userId) {
                // Close any active sessions
                supabase.from('mobile_usage')
                  .update({ 
                    end_time: new Date().toISOString(),
                    duration: 60 // Default duration (1 minute)
                  })
                  .eq('user_id', userId)
                  .eq('group_id', groupId)
                  .is('end_time', null)
                  .then(result => {
                    if (result.error) {
                      console.error("Error updating app inactive record:", result.error);
                    }
                  });
              }
            };
            
            getUserSession();
          }
        });
        
        console.log("Mobile app state tracking set up");
        
        return () => {
          subscription.remove();
        };
      }
    } catch (e) {
      console.log("Error setting up app state tracking:", e);
    }
  }, [groupId, isMobileApp]);

  // Start ping service when conditions are met
  useEffect(() => {
    const pingCleanup = startUsagePingService();
    return () => {
      if (pingCleanup) pingCleanup();
    };
  }, [groupId, isMobileApp, screenIsOn, hasInternetConnection]);

  return {
    lastPingTime,
    createUsageRecord
  };
}
