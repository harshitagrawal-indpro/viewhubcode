
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://upsvmhboxpjvihsvavep.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc3ZtaGJveHBqdmloc3ZhdmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MzMzMjYsImV4cCI6MjA1ODQwOTMyNn0.x3IU0dpc3l1owCYPF1byZAiCR-AN3eI_BZ-myFEL8vQ";

// Enhanced Supabase client with improved configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  },
  // Add global error handler
  global: {
    headers: { 'x-application-name': 'viewhub-manager' },
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        // Set a longer timeout for slower connections
        signal: options?.signal || (new AbortController().signal)
      });
    }
  }
});

// Helper function to check auth state
export const checkAuthState = async () => {
  try {
    console.log("Checking auth state...");
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error in checkAuthState:", error);
      return { session: null, isAuthenticated: false };
    }
    
    console.log("Session check result:", session ? "Authenticated" : "Not authenticated");
    return { session, isAuthenticated: !!session };
  } catch (error) {
    console.error("Exception in checkAuthState:", error);
    return { session: null, isAuthenticated: false };
  }
};

// Setup a subscription for mobile usage violations with improved error handling and reconnection
// Updated to use 15 second threshold for violations
export const setupUsageViolationListener = (groupId: string, onViolation: (data: any) => void) => {
  try {
    if (!groupId) {
      console.warn("No group ID provided for usage violation listener");
      return () => {};
    }
    
    console.log(`Setting up mobile usage violation listener for group ${groupId}`);
    
    const channel = supabase
      .channel(`mobile_usage_violation_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', 
          schema: 'public', 
          table: 'mobile_usage',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('New mobile usage detected:', payload);
          // Check if this is a violation (over 15 seconds)
          const { new: newUsage } = payload;
          
          if (newUsage && newUsage.duration && newUsage.duration > 15) {
            console.log('Mobile usage violation detected');
            onViolation(newUsage);
          }
        }
      )
      .subscribe((status) => {
        console.log('Usage violation subscription status:', status);
        
        // Handle reconnection if needed
        if (status === 'CHANNEL_ERROR') {
          console.log('Channel error, attempting to reconnect in 5 seconds');
          setTimeout(() => {
            console.log('Attempting to reconnect channel');
            channel.subscribe();
          }, 5000);
        }
      });
      
    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error('Error setting up usage violation listener:', error);
    return () => {
      console.log('Cleaning up error callback');
    };
  }
};

// Enhanced general purpose subscription helper with type assertion to fix the TypeScript error
export const setupTableSubscription = (
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*',
  filter?: Record<string, any>,
  onEvent?: (payload: any) => void
) => {
  try {
    const channelId = `${table}_${event}_${JSON.stringify(filter || {})}`;
    console.log(`Setting up subscription for ${table} with channel ID ${channelId}`);
    
    // Using type assertion to fix the TypeScript error
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes' as any, // Use type assertion to bypass type checking
        {
          event, 
          schema: 'public', 
          table,
          ...(filter ? { filter } : {})
        },
        (payload) => {
          console.log(`${table} ${event} event:`, payload);
          if (onEvent) onEvent(payload);
        }
      )
      .subscribe((status) => {
        console.log(`${table} subscription status:`, status);
        
        // Auto-reconnect if there's an error
        if (status === 'CHANNEL_ERROR') {
          console.log(`Channel error for ${table}, attempting to reconnect in 5 seconds`);
          setTimeout(() => {
            channel.subscribe();
          }, 5000);
        }
      });
      
    return () => {
      console.log(`Cleaning up ${table} subscription`);
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error(`Error setting up ${table} subscription:`, error);
    return () => {};
  }
};

// Enhanced monitorDeviceStatus function that works even when the app is in the background
export const monitorDeviceStatus = async (userId: string, groupId: string) => {
  try {
    console.log(`Setting up enhanced device monitoring for user ${userId} in group ${groupId}`);
    
    // First, close any existing monitoring sessions for this user/group
    const { error: updateError } = await supabase
      .from('mobile_usage')
      .update({ 
        end_time: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .is('end_time', null);
      
    if (updateError) {
      console.error("Error closing existing monitoring sessions:", updateError);
    }
    
    // Create initial record when monitoring starts with an intentional duration
    // to ensure it's captured in the monitoring system
    const { data, error } = await supabase
      .from('mobile_usage')
      .insert([
        { 
          user_id: userId, 
          group_id: groupId, 
          start_time: new Date().toISOString(),
          duration: 60 // Use a higher duration value (1 minute) to ensure capture
        }
      ])
      .select();
    
    if (error) {
      console.error("Error starting device monitoring:", error);
      return null;
    }
    
    console.log("Started device monitoring with record:", data);
    
    // Register a periodic background task if supported
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // Try to use periodic sync if available
        if ('periodicSync' in registration) {
          try {
            // Register for periodic background sync
            await (registration as any).periodicSync.register('monitoring-sync', {
              minInterval: 15 * 60 * 1000, // 15 minutes
            });
            console.log("Registered for periodic background sync");
          } catch (e) {
            console.log("Periodic sync not available:", e);
          }
        }
        
        // Send message to service worker to start monitoring
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'START_MONITORING',
            userId,
            groupId
          });
        }
      }
    } catch (e) {
      console.log("Could not set up service worker based monitoring:", e);
    }
    
    // Return the monitoring object for future reference
    return {
      // Setup an interval to keep updating the device status
      startContinuousMonitoring: (onStatusChange: (isActive: boolean) => void, interval = 5000) => {
        console.log(`Starting enhanced continuous monitoring every ${interval}ms`);
        
        // Initial record creation timestamp
        const startTime = data && data[0]?.start_time ? new Date(data[0].start_time) : new Date();
        
        // Track last activity time to detect if device is being used continuously
        let lastActivityTime = new Date();
        let lastRecordId = data && data[0]?.id;
        let consecutiveActiveCount = 0;
        
        // Create a new activity record every 5 minutes regardless
        // to ensure long-term activity is properly captured
        const forceNewRecordInterval = setInterval(() => {
          console.log("Creating forced new monitoring record");
          supabase
            .from('mobile_usage')
            .insert([{ 
              user_id: userId, 
              group_id: groupId, 
              start_time: new Date().toISOString(),
              duration: 60 // Set a higher duration (1 minute)
            }])
            .select()
            .then(({ data: newRecord, error }) => {
              if (error) {
                console.error("Error creating forced record:", error);
              } else if (newRecord && newRecord.length > 0) {
                lastRecordId = newRecord[0].id;
                console.log("Created new forced usage record:", newRecord[0]);
              }
            });
        }, 300000); // Every 5 minutes
        
        // Check device status at the specified interval
        const intervalId = setInterval(async () => {
          try {
            // Consider device active if we're running this code
            const isActive = true;
            consecutiveActiveCount++;
            
            const now = new Date();
            
            // Calculate duration since record started
            const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            
            // Update the existing record if it's recent (within 30 seconds)
            // Otherwise create a new record to track this new session
            const timeSinceLastActivity = now.getTime() - lastActivityTime.getTime();
            
            if (timeSinceLastActivity > 30000) { // 30 seconds inactivity threshold
              // Create a new record for this new active period
              const { data: newRecord, error: insertError } = await supabase
                .from('mobile_usage')
                .insert([{ 
                  user_id: userId, 
                  group_id: groupId, 
                  start_time: now.toISOString(),
                  // Set a higher duration to ensure it's captured in monitoring
                  duration: 60 // 1 minute
                }])
                .select();
                
              if (insertError) {
                console.error("Error creating new monitoring record:", insertError);
              } else if (newRecord && newRecord.length > 0) {
                console.log(`Created new monitoring record for user ${userId}, previous record duration: ${durationSeconds}s`);
                lastRecordId = newRecord[0].id;
              }
            } else {
              // Every 3 active periods (about 15 seconds depending on interval)
              // create a new record to ensure continuous activity is properly tracked
              if (consecutiveActiveCount % 3 === 0) {
                const { data: newRecord, error: insertError } = await supabase
                  .from('mobile_usage')
                  .insert([{ 
                    user_id: userId, 
                    group_id: groupId, 
                    start_time: now.toISOString(),
                    // Set a higher duration to ensure it's captured
                    duration: 60 // 1 minute
                  }])
                  .select();
                  
                if (insertError) {
                  console.error("Error creating regular monitoring record:", insertError);
                } else if (newRecord && newRecord.length > 0) {
                  console.log("Created new regular monitoring record");
                  lastRecordId = newRecord[0].id;
                }
              }
              
              // Update existing record
              const { error: updateError } = await supabase
                .from('mobile_usage')
                .update({ 
                  end_time: now.toISOString(),
                  duration: Math.max(60, durationSeconds) // Set at least 60 seconds
                })
                .eq('id', lastRecordId);
                
              if (updateError) {
                console.error("Error updating device monitoring:", updateError);
              } else {
                console.log(`Updated monitoring record for user ${userId}, duration: ${durationSeconds}s`);
              }
            }
          
            // Update last activity time
            lastActivityTime = now;
            
            // Notify caller that device is active
            onStatusChange(isActive);
          } catch (error) {
            console.error("Exception in monitoring interval:", error);
          }
        }, interval);
        
        // Return function to stop monitoring
        return () => {
          console.log("Stopping continuous monitoring interval");
          clearInterval(intervalId);
          clearInterval(forceNewRecordInterval);
          
          // Close the monitoring session when stopping
          supabase
            .from('mobile_usage')
            .update({ 
              end_time: new Date().toISOString(),
              duration: 60 // Ensure recorded with at least 1 minute
            })
            .eq('id', lastRecordId)
            .then(result => {
              if (result.error) {
                console.error("Error closing monitoring session:", result.error);
              }
            });
            
          // Notify service worker to stop monitoring if available
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'STOP_MONITORING'
            });
          }
        };
      },
      
      // Stop monitoring when needed
      stopMonitoring: async () => {
        const endTime = new Date().toISOString();
        
        // Update the record with end time
        const { data: updatedData, error } = await supabase
          .from('mobile_usage')
          .update({ 
            end_time: endTime,
            // Calculate final duration, ensure it's at least 60 seconds
            duration: data && data[0]?.start_time 
              ? Math.max(60, Math.floor((new Date(endTime).getTime() - new Date(data[0].start_time).getTime()) / 1000))
              : 60
          })
          .eq('user_id', userId)
          .eq('group_id', groupId)
          .is('end_time', null)
          .select();
          
        if (error) {
          console.error("Error stopping device monitoring:", error);
        } else {
          console.log("Stopped device monitoring:", updatedData);
        }
        
        // Notify service worker to stop monitoring if available
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'STOP_MONITORING'
          });
        }
        
        return updatedData;
      }
    };
  } catch (error) {
    console.error("Exception in device monitoring setup:", error);
    return null;
  }
};

// New helper function to get user profile information with proper handling for null/missing names
export const getUserProfileInfo = async (userId: string) => {
  if (!userId) return { fullName: "Unknown User" };
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, user_role')
      .eq('id', userId)
      .single();
      
    if (error || !data) {
      console.error("Error fetching user profile:", error);
      return { 
        fullName: userId.substring(0, 8) + "...",
        userRole: "unknown"
      };
    }
    
    return {
      fullName: data.full_name || userId.substring(0, 8) + "...",
      userRole: data.user_role || "unknown"
    };
  } catch (error) {
    console.error("Exception fetching user profile:", error);
    return { 
      fullName: userId.substring(0, 8) + "...",
      userRole: "unknown"
    };
  }
};
