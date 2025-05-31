import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Smartphone, AlertTriangle, Clock, User, Users, Calendar } from "lucide-react";

interface MobileUsageStats {
  totalUsageCount: number;
  violationCount: number;
  averageDuration: number;
  lastActivity: string | null;
  activeUsersCount: number;
  outsideScheduleCount: number;
}

interface MobileUsageStatsProps {
  groupId: string | null;
  autoRefresh?: boolean; // Add prop to control auto-refresh
}

interface Schedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

export function MobileUsageStats({ groupId, autoRefresh = true }: MobileUsageStatsProps) {
  const [stats, setStats] = useState<MobileUsageStats>({
    totalUsageCount: 0,
    violationCount: 0,
    averageDuration: 0,
    lastActivity: null,
    activeUsersCount: 0,
    outsideScheduleCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch schedules for this group
  const fetchSchedules = useCallback(async () => {
    if (!groupId) return;
    
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('day_of_week, start_time, end_time, is_break')
        .eq('group_id', groupId);
        
      if (error) {
        console.error("Error fetching schedules:", error);
        return;
      }
      
      setSchedules(data || []);
    } catch (error) {
      console.error("Exception fetching schedules:", error);
    }
  }, [groupId]);

  // Main stats fetch function
  const fetchStats = useCallback(async () => {
    if (!groupId) return;
    
    try {
      setLoading(true);
      
      // Get total count
      const { count: totalCount, error: countError } = await supabase
        .from('mobile_usage')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);
        
      if (countError) throw countError;
      
      // Get violation count - consider usage with duration > 15 seconds as violation
      const { count: violationCount, error: violationError } = await supabase
        .from('mobile_usage')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .gt('duration', 15);
        
      if (violationError) throw violationError;
      
      // Get mobile usage data for calculations
      const { data: usageData, error: usageDataError } = await supabase
        .from('mobile_usage')
        .select('id, user_id, group_id, start_time, end_time, duration')
        .eq('group_id', groupId)
        .order('start_time', { ascending: false });
        
      if (usageDataError) throw usageDataError;
      
      // Calculate average duration safely
      let avgDuration = 0;
      const validDurations = usageData?.filter(item => item.duration !== null && item.duration !== undefined) || [];
      if (validDurations.length > 0) {
        const sum = validDurations.reduce((acc, item) => acc + (item.duration || 0), 0);
        avgDuration = sum / validDurations.length;
      }
      
      // Get last activity
      const { data: lastActivity, error: lastActivityError } = await supabase
        .from('mobile_usage')
        .select('created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (lastActivityError) throw lastActivityError;
      
      // Count unique users with activity
      const { data: uniqueUsers, error: uniqueUsersError } = await supabase
        .from('mobile_usage')
        .select('user_id')
        .eq('group_id', groupId)
        .limit(1000);
        
      if (uniqueUsersError) throw uniqueUsersError;
      
      // Count distinct users
      const distinctUserIds = new Set((uniqueUsers || []).map(u => u.user_id)).size;
      
      setStats({
        totalUsageCount: totalCount || 0,
        violationCount: violationCount || 0,
        averageDuration: avgDuration,
        lastActivity: lastActivity && lastActivity.length > 0 ? lastActivity[0].created_at : null,
        activeUsersCount: distinctUserIds,
        outsideScheduleCount: 0 // Calculate this based on schedules if needed
      });
    } catch (error) {
      console.error("Error fetching mobile usage stats:", error);
      toast({
        title: "Error",
        description: "Failed to load mobile usage statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, toast]);

  // Fetch schedules when groupId changes
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Initial data fetch and set up subscriptions
  useEffect(() => {
    if (!groupId || schedules.length === 0) return;
    
    fetchStats();
    
    // Set up auto-refresh only if enabled
    if (autoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      refreshIntervalRef.current = setInterval(() => {
        fetchStats();
      }, 3000); // Refresh every 3 seconds for real-time updates
    }
    
    // Clean up any previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    
    // Set up subscription for real-time updates
    const channel = supabase
      .channel(`mobile_usage_stats_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mobile_usage',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('Mobile usage changed, refreshing stats');
          fetchStats();
        }
      )
      .subscribe();
      
    channelRef.current = channel;
      
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [groupId, schedules, fetchStats, autoRefresh]);
  
  // Format the average duration
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "0s";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };
  
  // Format the last activity date
  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return "No activity";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    }
    
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Smartphone className="h-4 w-4 mr-2" />
            Total Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          ) : (
            <p className="text-2xl font-bold">{formatDuration(stats.averageDuration)}</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Active Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          ) : (
            <p className="text-2xl font-bold">{stats.activeUsersCount}</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Outside Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          ) : (
            <p className="text-2xl font-bold text-amber-500">{stats.outsideScheduleCount}</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <User className="h-4 w-4 mr-2" />
            Last Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          ) : (
            <p className="text-lg font-medium">{formatLastActivity(stats.lastActivity)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
