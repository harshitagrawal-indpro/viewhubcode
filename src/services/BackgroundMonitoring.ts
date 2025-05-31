import { supabase } from "@/integrations/supabase/client";

interface UserGroup {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  group_id: string;
}

export class BackgroundMonitoring {
  private static instance: BackgroundMonitoring;
  private userId: string | null = null;
  private userGroups: UserGroup[] = [];
  private schedules: Schedule[] = [];
  private isActiveStatus = false;
  private currentUsageSession: string | null = null;
  private activityTimeout: NodeJS.Timeout | null = null;
  private networkCheckInterval: NodeJS.Timeout | null = null;
  private scheduleCheckInterval: NodeJS.Timeout | null = null;
  private isNetworkConnected = true;
  private screenActiveTime = 0;
  private lastActivityTime = Date.now();

  private constructor() {}

  static getInstance(): BackgroundMonitoring {
    if (!BackgroundMonitoring.instance) {
      BackgroundMonitoring.instance = new BackgroundMonitoring();
    }
    return BackgroundMonitoring.instance;
  }

  async initialize(userId: string, userGroups: UserGroup[]): Promise<void> {
    this.userId = userId;
    this.userGroups = userGroups;
    this.isActiveStatus = true;
    
    console.log("Background monitoring initialized for enhanced monitoring");
    
    // Load schedules for all user groups
    await this.loadSchedules();
    
    // Start enhanced monitoring systems
    this.startNetworkMonitoring();
    this.startActivityMonitoring();
    this.startScheduleChecking();
  }

  private async loadSchedules(): Promise<void> {
    if (this.userGroups.length === 0) return;

    try {
      const groupIds = this.userGroups.map(group => group.id);
      
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .in('group_id', groupIds);

      if (error) throw error;
      
      this.schedules = data || [];
      console.log("Loaded schedules:", this.schedules);
    } catch (error) {
      console.error("Error loading schedules:", error);
    }
  }

  private startNetworkMonitoring(): void {
    // Check network status every 5 seconds
    this.networkCheckInterval = setInterval(async () => {
      const wasConnected = this.isNetworkConnected;
      this.isNetworkConnected = navigator.onLine;
      
      // If network just came back online, start monitoring if in scheduled time
      if (!wasConnected && this.isNetworkConnected) {
        console.log("Network reconnected - checking if monitoring should start");
        await this.checkAndStartMonitoring();
      }
      
      // If network disconnected, stop current session
      if (wasConnected && !this.isNetworkConnected) {
        console.log("Network disconnected - ending current session");
        await this.handleActivityEnd();
      }
    }, 5000);

    // Listen for online/offline events
    window.addEventListener('online', async () => {
      console.log("Online event - network connected");
      this.isNetworkConnected = true;
      await this.checkAndStartMonitoring();
    });

    window.addEventListener('offline', async () => {
      console.log("Offline event - network disconnected");
      this.isNetworkConnected = false;
      await this.handleActivityEnd();
    });
  }

  private startActivityMonitoring(): void {
    if (typeof window === 'undefined') return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      const now = Date.now();
      this.lastActivityTime = now;
      
      // Calculate screen active time
      const timeDiff = now - this.lastActivityTime;
      if (timeDiff < 1000) { // User was active in the last second
        this.screenActiveTime += timeDiff;
      } else {
        this.screenActiveTime = 0; // Reset if user was inactive
      }
      
      // Check if screen has been active for more than 15 seconds
      if (this.screenActiveTime > 15000 && this.isNetworkConnected) {
        this.handleViolation();
        this.screenActiveTime = 0; // Reset counter
      }
      
      // Reset inactivity timer
      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout);
      }
      
      this.activityTimeout = setTimeout(() => {
        this.handleActivityEnd();
      }, 5000); // 5 seconds of inactivity
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Store cleanup function
    (window as any).backgroundMonitoringCleanup = () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout);
      }
    };
  }

  private startScheduleChecking(): void {
    // Check schedules every 30 seconds for precise timing
    this.scheduleCheckInterval = setInterval(async () => {
      await this.checkAndStartMonitoring();
    }, 30000);
  }

  private async checkAndStartMonitoring(): Promise<void> {
    if (!this.shouldMonitorNow() || !this.isNetworkConnected) return;

    // Only start if not already monitoring
    if (!this.currentUsageSession) {
      await this.handleActivityStart();
    }
  }

  private async handleViolation(): Promise<void> {
    if (!this.shouldMonitorNow() || !this.isNetworkConnected) return;

    try {
      const activeGroup = this.getCurrentActiveGroup();
      if (!activeGroup) return;

      // Create violation record
      const { data, error } = await supabase
        .from('mobile_usage')
        .insert({
          user_id: this.userId,
          group_id: activeGroup.id,
          start_time: new Date(Date.now() - 15000).toISOString(), // 15 seconds ago
          end_time: new Date().toISOString(),
          duration: 15 // 15 seconds violation
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log("Violation recorded:", data.id);
      
      // Send notification if possible
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ViewHub Violation', {
          body: 'Screen active for more than 15 seconds during monitoring period',
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error("Error recording violation:", error);
    }
  }

  private async handleActivityStart(): Promise<void> {
    if (!this.shouldMonitorNow() || !this.isNetworkConnected) return;

    try {
      if (this.currentUsageSession) return;

      const activeGroup = this.getCurrentActiveGroup();
      if (!activeGroup) return;

      const { data, error } = await supabase
        .from('mobile_usage')
        .insert({
          user_id: this.userId,
          group_id: activeGroup.id,
          start_time: new Date().toISOString(),
          end_time: null,
          duration: null
        })
        .select()
        .single();

      if (error) throw error;
      
      this.currentUsageSession = data.id;
      console.log("Started monitoring session:", data.id);
    } catch (error) {
      console.error("Error starting monitoring session:", error);
    }
  }

  private async handleActivityEnd(): Promise<void> {
    if (!this.currentUsageSession) return;

    try {
      const endTime = new Date().toISOString();
      
      const { data: session, error: fetchError } = await supabase
        .from('mobile_usage')
        .select('start_time')
        .eq('id', this.currentUsageSession)
        .single();

      if (fetchError) throw fetchError;

      const startTime = new Date(session.start_time);
      const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

      const { error } = await supabase
        .from('mobile_usage')
        .update({
          end_time: endTime,
          duration: duration
        })
        .eq('id', this.currentUsageSession);

      if (error) throw error;
      
      console.log("Ended monitoring session:", this.currentUsageSession, "Duration:", duration);
      this.currentUsageSession = null;
    } catch (error) {
      console.error("Error ending monitoring session:", error);
      this.currentUsageSession = null;
    }
  }

  private shouldMonitorNow(): boolean {
    if (!this.isActiveStatus || this.schedules.length === 0) return false;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format

    // Check if current time is EXACTLY within any scheduled monitoring period
    const isInSchedule = this.schedules.some(schedule => {
      return schedule.day_of_week === dayOfWeek &&
             !schedule.is_break &&
             currentTime >= schedule.start_time &&
             currentTime <= schedule.end_time;
    });

    return isInSchedule;
  }

  private getCurrentActiveGroup(): UserGroup | null {
    return this.userGroups.length > 0 ? this.userGroups[0] : null;
  }

  async checkSchedules(): Promise<void> {
    await this.loadSchedules();
    await this.checkAndStartMonitoring();
  }

  async refreshSchedules(): Promise<void> {
    await this.loadSchedules();
  }

  isActive(): boolean {
    return this.isActiveStatus;
  }

  async stop(): Promise<void> {
    this.isActiveStatus = false;
    
    // End any active session
    if (this.currentUsageSession) {
      await this.handleActivityEnd();
    }
    
    // Clear all intervals
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }
    
    if (this.scheduleCheckInterval) {
      clearInterval(this.scheduleCheckInterval);
      this.scheduleCheckInterval = null;
    }
    
    // Clean up event listeners
    if (typeof window !== 'undefined' && (window as any).backgroundMonitoringCleanup) {
      (window as any).backgroundMonitoringCleanup();
    }
    
    console.log("Background monitoring stopped");
  }
}