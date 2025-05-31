import { supabase } from "@/integrations/supabase/client";
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { LocalNotifications } from '@capacitor/local-notifications';

interface UserGroup {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  group_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  description?: string;
}

interface Holiday {
  id: string;
  group_id: string;
  date: string;
  description?: string;
  is_recurring: boolean;
}

export class BackgroundMonitoring {
  private static instance: BackgroundMonitoring;
  private userId: string | null = null;
  private userGroups: UserGroup[] = [];
  private schedules: Schedule[] = [];
  private holidays: Holiday[] = [];
  private isActive: boolean = false;
  private currentUsageSession: string | null = null;
  private sessionStartTime: number | null = null;
  private monitoringInterval: number | null = null;
  private screenCheckInterval: number | null = null;
  private networkStatus: boolean = true;
  private isScreenActive: boolean = false;
  private lastActivityTime: number = Date.now();
  private consecutiveActiveTime: number = 0;

  private constructor() {
    this.setupNetworkMonitoring();
    this.setupScreenActivityMonitoring();
  }

  public static getInstance(): BackgroundMonitoring {
    if (!BackgroundMonitoring.instance) {
      BackgroundMonitoring.instance = new BackgroundMonitoring();
    }
    return BackgroundMonitoring.instance;
  }

  public async initialize(userId: string, userGroups: UserGroup[]): Promise<void> {
    this.userId = userId;
    this.userGroups = userGroups;
    
    console.log(`Initializing background monitoring for user: ${userId}`);
    console.log(`User groups:`, userGroups);

    // Fetch schedules and holidays for all user groups
    await this.refreshSchedules();
    await this.refreshHolidays();

    // Start monitoring
    this.startMonitoring();
    this.isActive = true;

    console.log("Background monitoring initialized successfully");
  }

  public async refreshSchedules(): Promise<void> {
    if (this.userGroups.length === 0) return;

    try {
      const groupIds = this.userGroups.map(group => group.id);
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .in('group_id', groupIds);

      if (error) {
        console.error("Error fetching schedules:", error);
        return;
      }

      this.schedules = data || [];
      console.log(`Refreshed ${this.schedules.length} schedules for monitoring`);
    } catch (error) {
      console.error("Exception refreshing schedules:", error);
    }
  }

  public async refreshHolidays(): Promise<void> {
    if (this.userGroups.length === 0) return;

    try {
      const groupIds = this.userGroups.map(group => group.id);
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .in('group_id', groupIds);

      if (error) {
        console.error("Error fetching holidays:", error);
        return;
      }

      this.holidays = data || [];
      console.log(`Refreshed ${this.holidays.length} holidays for monitoring`);
    } catch (error) {
      console.error("Exception refreshing holidays:", error);
    }
  }

  private startMonitoring(): void {
    // Clear any existing intervals
    this.stopMonitoring();

    // Check schedules every 10 seconds for precise monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkSchedules();
    }, 10000) as unknown as number;

    // Check screen activity every 1 second
    this.screenCheckInterval = setInterval(() => {
      this.checkScreenActivity();
    }, 1000) as unknown as number;

    console.log("Monitoring intervals started");
  }

  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.screenCheckInterval) {
      clearInterval(this.screenCheckInterval);
      this.screenCheckInterval = null;
    }
  }

  public async checkSchedules(): Promise<void> {
    if (!this.userId || !this.networkStatus || this.userGroups.length === 0) {
      return;
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check if today is a holiday
    const isHoliday = this.holidays.some(holiday => {
      const holidayDate = new Date(holiday.date).toISOString().split('T')[0];
      return holidayDate === currentDate;
    });

    if (isHoliday) {
      console.log("Today is a holiday, skipping monitoring");
      this.endCurrentSession();
      return;
    }

    // Check if we're currently in a scheduled monitoring period
    const activeSchedules = this.schedules.filter(schedule => {
      return schedule.day_of_week === currentDay &&
             !schedule.is_break &&
             currentTime >= schedule.start_time &&
             currentTime <= schedule.end_time;
    });

    if (activeSchedules.length > 0) {
      console.log(`Currently in monitoring period: ${activeSchedules.length} active schedules`);
      
      // Check if screen has been active for more than 15 seconds with internet
      if (this.isScreenActive && this.consecutiveActiveTime > 15) {
        await this.recordViolation(activeSchedules[0]);
      } else if (this.consecutiveActiveTime > 15) {
        // Screen active for more than 15 seconds - start tracking
        await this.startUsageSession(activeSchedules[0]);
      }
    } else {
      // Not in monitoring period, end any current session
      this.endCurrentSession();
    }
  }

  private async startUsageSession(schedule: Schedule): Promise<void> {
    if (this.currentUsageSession) {
      return; // Session already active
    }

    try {
      const groupId = schedule.group_id;
      const startTime = new Date().toISOString();

      const { data, error } = await supabase
        .from('mobile_usage')
        .insert({
          user_id: this.userId,
          group_id: groupId,
          start_time: startTime,
          end_time: null,
          duration: null
        })
        .select()
        .single();

      if (error) {
        console.error("Error starting usage session:", error);
        return;
      }

      this.currentUsageSession = data.id;
      this.sessionStartTime = Date.now();
      
      console.log(`Started usage session: ${this.currentUsageSession}`);
      
      // Send notification about violation
      await this.sendViolationNotification();
    } catch (error) {
      console.error("Exception starting usage session:", error);
    }
  }

  private async recordViolation(schedule: Schedule): Promise<void> {
    if (!this.currentUsageSession) {
      await this.startUsageSession(schedule);
      return;
    }

    // Update existing session with current duration
    const currentDuration = Math.floor((Date.now() - (this.sessionStartTime || Date.now())) / 1000);
    
    try {
      const { error } = await supabase
        .from('mobile_usage')
        .update({
          duration: currentDuration,
          end_time: currentDuration > 15 ? new Date().toISOString() : null
        })
        .eq('id', this.currentUsageSession);

      if (error) {
        console.error("Error updating usage session:", error);
      } else {
        console.log(`Updated violation session with duration: ${currentDuration}s`);
      }
    } catch (error) {
      console.error("Exception updating usage session:", error);
    }
  }

  private endCurrentSession(): void {
    if (!this.currentUsageSession) {
      return;
    }

    const endSession = async () => {
      const endTime = new Date().toISOString();
      const duration = Math.floor((Date.now() - (this.sessionStartTime || Date.now())) / 1000);

      try {
        const { error } = await supabase
          .from('mobile_usage')
          .update({
            end_time: endTime,
            duration: duration
          })
          .eq('id', this.currentUsageSession);

        if (error) {
          console.error("Error ending usage session:", error);
        } else {
          console.log(`Ended usage session: ${this.currentUsageSession}, duration: ${duration}s`);
        }
      } catch (error) {
        console.error("Exception ending usage session:", error);
      }
    };

    endSession();
    this.currentUsageSession = null;
    this.sessionStartTime = null;
  }

  private setupNetworkMonitoring(): void {
    Network.addListener('networkStatusChange', status => {
      this.networkStatus = status.connected;
      console.log(`Network status changed: ${status.connected ? 'connected' : 'disconnected'}`);
      
      if (!status.connected) {
        // End current session when network disconnects
        this.endCurrentSession();
      }
    });
  }

  private setupScreenActivityMonitoring(): void {
    // For web platform
    if (typeof window !== 'undefined') {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      events.forEach(event => {
        document.addEventListener(event, this.updateActivityTime.bind(this), true);
      });

      // Check for visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.isScreenActive = false;
          this.consecutiveActiveTime = 0;
        } else {
          this.updateActivityTime();
        }
      });
    }
  }

  private updateActivityTime(): void {
    this.lastActivityTime = Date.now();
    this.isScreenActive = true;
  }

  private checkScreenActivity(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;

    if (timeSinceLastActivity < 2000) { // Active within last 2 seconds
      this.isScreenActive = true;
      this.consecutiveActiveTime += 1; // Increment by 1 second
    } else {
      this.isScreenActive = false;
      this.consecutiveActiveTime = 0;
    }
  }

  private async sendViolationNotification(): Promise<void> {
    try {
      // Check if we're in a mobile environment
      const deviceInfo = await Device.getInfo();
      
      if (deviceInfo.platform !== 'web') {
        // Mobile notification
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "ViewHub Violation Alert",
              body: "Mobile usage detected during monitoring period. Please put your device away.",
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'default',
              attachments: null,
              actionTypeId: "",
              extra: { type: 'violation' },
            },
          ],
        });
      } else {
        // Web notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('ViewHub Violation Alert', {
            body: 'Mobile usage detected during monitoring period. Please put your device away.',
            icon: '/lovable-uploads/73220fdc-fcdb-4b0a-a476-2af1916d222a.png',
            tag: 'violation'
          });
        }
      }
    } catch (error) {
      console.error("Error sending violation notification:", error);
    }
  }

  public isMonitoringActive(): boolean {
    return this.isActive;
  }

  public async stop(): Promise<void> {
    console.log("Stopping background monitoring");
    
    this.endCurrentSession();
    this.stopMonitoring();
    this.isActive = false;
    
    this.userId = null;
    this.userGroups = [];
    this.schedules = [];
    this.holidays = [];
  }

  public getCurrentStatus(): {
    isActive: boolean;
    userId: string | null;
    groupCount: number;
    scheduleCount: number;
    hasActiveSession: boolean;
    networkStatus: boolean;
    screenActive: boolean;
    consecutiveActiveTime: number;
  } {
    return {
      isActive: this.isActive,
      userId: this.userId,
      groupCount: this.userGroups.length,
      scheduleCount: this.schedules.length,
      hasActiveSession: !!this.currentUsageSession,
      networkStatus: this.networkStatus,
      screenActive: this.isScreenActive,
      consecutiveActiveTime: this.consecutiveActiveTime
    };
  }
}