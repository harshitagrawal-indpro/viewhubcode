import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Bell, Smartphone, User, Clock, Search, Filter, Calendar, Users, AlertTriangle, CheckCircle, BadgeAlert, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { MobileUsageStats } from "@/components/MobileUsageStats";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Define interfaces for type safety
interface UsageLog {
  id: string;
  user_id: string;
  group_id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  created_at: string;
  user_name?: string;
  group_name?: string;
  user_unique_id?: string;
  user_role?: string;
  is_violation?: boolean;
  is_within_schedule?: boolean;
}

// Utility function to format duration
const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined) return "0s";
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

// Custom hook for mobile monitoring data
const useMobileMonitoring = (groupId: string | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    if (!groupId) {
      setUsageLogs([]);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch usage logs with profile information
      const { data: logsData, error: logsError } = await supabase
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

      if (logsError) throw logsError;

      // Transform data to match interface
      const formattedLogs: UsageLog[] = (logsData || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        group_id: log.group_id,
        start_time: log.start_time,
        end_time: log.end_time,
        duration: log.duration,
        created_at: log.created_at,
        user_name: log.profiles?.full_name || null,
        group_name: log.groups?.name || null,
        user_unique_id: log.profiles?.unique_id || null,
        user_role: log.profiles?.user_role || null,
        is_violation: (log.duration || 0) > 15, // Consider >15 seconds as violation
        is_within_schedule: true // You can implement schedule checking logic here
      }));

      setUsageLogs(formattedLogs);
    } catch (error: any) {
      console.error("Error fetching usage logs:", error);
      toast({
        title: "Error",
        description: "Failed to load monitoring data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [groupId, toast]);

  const refreshLogs = useCallback(async () => {
    await fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { isLoading, usageLogs, refreshLogs };
};

const Monitoring = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [scheduleFilter, setScheduleFilter] = useState<string | "all">("all");
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const isMobile = useIsMobile();
  const { user, userGroups } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const activeGroupId = id || selectedGroup;
  
  const { isLoading, usageLogs, refreshLogs } = useMobileMonitoring(activeGroupId);

  // Set default group when component mounts
  useEffect(() => {
    if (!id && userGroups.length > 0 && !selectedGroup) {
      setSelectedGroup(userGroups[0].id);
    }
  }, [id, userGroups, selectedGroup]);

  // Enhanced auto-refresh with better timing
  useEffect(() => {
    if (!isAutoRefresh || !activeGroupId) return;

    const interval = setInterval(async () => {
      console.log("Auto-refreshing monitoring data...");
      try {
        await refreshLogs();
        setLastRefresh(new Date());
      } catch (error) {
        console.error("Auto-refresh error:", error);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoRefresh, activeGroupId, refreshLogs]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      await refreshLogs();
      setLastRefresh(new Date());
      toast({
        title: "Refreshed",
        description: "Monitoring data has been updated",
      });
    } catch (error) {
      console.error("Manual refresh error:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh monitoring data",
        variant: "destructive",
      });
    }
  };

  // Memoized filtered logs to prevent unnecessary re-renders
  const filteredLogs = useMemo(() => {
    if (!Array.isArray(usageLogs)) return [];
    
    return usageLogs.filter(log => {
      // Search filter
      const searchTerm = searchQuery.toLowerCase().trim();
      const matchesSearch = searchTerm === "" || 
        (log.user_name || '').toLowerCase().includes(searchTerm) ||
        (log.group_name || '').toLowerCase().includes(searchTerm) ||
        (log.user_unique_id || '').toLowerCase().includes(searchTerm) ||
        (log.user_id || '').toLowerCase().includes(searchTerm);
      
      // Role filter
      const matchesRole = roleFilter === null || roleFilter === 'all_roles' ? 
        true : 
        (log.user_role || '').toLowerCase() === roleFilter.toLowerCase();
      
      // Schedule filter
      const matchesSchedule = 
        scheduleFilter === "all" ? true : 
        scheduleFilter === "in" ? log.is_within_schedule === true : 
        scheduleFilter === "out" ? log.is_within_schedule === false : true;
      
      return matchesSearch && matchesRole && matchesSchedule;
    });
  }, [usageLogs, searchQuery, roleFilter, scheduleFilter]);

  // Get unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    if (!Array.isArray(usageLogs)) return [];
    
    const roles = usageLogs
      .map(log => log.user_role)
      .filter((role): role is string => Boolean(role));
    
    return [...new Set(roles)];
  }, [usageLogs]);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString;
    }
  };

  // Loading state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // No groups state
  if (userGroups.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No Groups Found</h2>
          <p className="text-muted-foreground mb-4">
            You need to be a member of at least one group to view monitoring data.
          </p>
          <Button onClick={() => window.location.href = '/groups'}>
            Go to Groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center gap-2 mb-2 md:mb-0">
          <h1 className="text-2xl font-bold">Real-time Monitoring</h1>
          <Badge variant={isAutoRefresh ? "default" : "secondary"} className="ml-2">
            {isAutoRefresh ? "Live" : "Paused"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={isAutoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className="flex items-center gap-1"
          >
            {isAutoRefresh ? "Pause" : "Resume"}
          </Button>
        </div>
      </div>

      {lastRefresh && (
        <div className="text-sm text-muted-foreground mb-4">
          Last updated: {format(lastRefresh, "h:mm:ss a")}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Group</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={activeGroupId || ''} 
            onValueChange={(value) => setSelectedGroup(value)}
          >
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select a group" />
            </SelectTrigger>
            <SelectContent>
              {userGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Enhanced Usage Stats Dashboard */}
      {activeGroupId && (
        <div className="mb-6">
          <MobileUsageStats groupId={activeGroupId} />
        </div>
      )}

      {/* Enhanced filters and usage logs section */}
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Search users, IDs or groups" 
              className="pl-9" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          
          <div className="w-full md:w-[200px]">
            <Select 
              value={roleFilter || 'all_roles'} 
              onValueChange={(value) => setRoleFilter(value === 'all_roles' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_roles">All Roles</SelectItem>
                {uniqueRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-[200px]">
            <Select 
              value={scheduleFilter} 
              onValueChange={(value: "all" | "in" | "out") => setScheduleFilter(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Times</SelectItem>
                <SelectItem value="in">Within Schedule</SelectItem>
                <SelectItem value="out">Outside Schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {!isMobile && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </Button>
              <Button variant="outline" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </Button>
            </div>
          )}
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="space-y-4 mt-8">
                  <h3 className="text-lg font-medium">Advanced Filters</h3>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Date Range</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="mr-2 h-4 w-4" />
                        Select Date Range
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Status</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">All</Button>
                      <Button variant="outline" className="w-full justify-start">Violations Only</Button>
                      <Button variant="outline" className="w-full justify-start">Within Limit Only</Button>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">User Role</h4>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setRoleFilter(null)}
                      >
                        All Roles
                      </Button>
                      {uniqueRoles.map(role => (
                        <Button 
                          key={role} 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => setRoleFilter(role)}
                        >
                          {role}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Auto Refresh</h4>
                    <Button 
                      variant={isAutoRefresh ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                    >
                      {isAutoRefresh ? "Pause Auto Refresh" : "Enable Auto Refresh"}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-lg">Live Usage Monitoring</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isAutoRefresh ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isAutoRefresh ? 'Live updates' : 'Updates paused'}
              </span>
            </div>
          </div>
          
          {/* Enhanced logs rendering with loading states */}
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading monitoring data...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {activeGroupId ? (
                <div>
                  <Smartphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No usage logs found</p>
                  <p className="text-xs mt-1">Usage will appear here when monitoring detects activity</p>
                </div>
              ) : (
                <div>
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select a group to view monitoring logs</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className={`bg-gray-50 border ${log.is_within_schedule === false ? 'border-amber-200' : 'border-gray-100'} rounded-xl p-4 transition-all duration-200 hover:shadow-md`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className={`${log.is_violation ? 'bg-red-100' : 'bg-green-100'} p-2 rounded-full`}>
                        <Smartphone className={`h-5 w-5 ${log.is_violation ? 'text-red-600' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-medium">{log.user_name || "Unknown User"}</h3>
                        {log.user_unique_id && (
                          <div className="text-xs text-muted-foreground flex items-center space-x-1 mt-1">
                            <BadgeAlert className="h-3 w-3" />
                            <span>ID: {log.user_unique_id}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">{log.group_name || "Unknown Group"}</p>
                          {log.user_role && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              log.user_role === 'associate' ? 'bg-blue-100 text-blue-700' : 
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {log.user_role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
                      <Badge variant={log.is_violation ? "destructive" : "outline"} className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(log.duration)}
                      </Badge>
                      {log.is_within_schedule === false && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Outside Schedule
                        </Badge>
                      )}
                      {log.is_within_schedule === true && (
                        <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300 flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          In Schedule
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-sm border-t pt-3 flex flex-wrap justify-between gap-2">
                    <span className="text-gray-500">{formatDate(log.created_at)}</span>
                    <span className={`${log.is_violation ? 'text-red-600' : 'text-green-600'} font-medium flex items-center`}>
                      {log.is_violation ? (
                        <>
                          <Bell className="h-3 w-3 mr-1" />
                          Violation Detected
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          Within Limit
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Monitoring;