import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { format, differenceInSeconds, parseISO } from "date-fns";
import {
  Calendar,
  ArrowLeft,
  Trash2,
  AlertCircle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  user_role: string;
  profile: {
    full_name: string | null;
    user_role: string;
    unique_id?: string | null; 
  };
}

interface MobileUsage {
  id: string;
  user_id: string;
  group_id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  profile: {
    full_name: string | null;
    unique_id?: string | null;
  };
}

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  group_id: string;
  description?: string;
}

interface Holiday {
  id: string;
  date: string;
  description: string | null;
  is_recurring: boolean;
}

interface Group {
  id: string;
  name: string;
  unique_code: string;
  organizer_id: string;
  created_at: string;
}

const dayMapReverse: { [key: number]: string } = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null || seconds === undefined) return "N/A";
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

const formatDate = (dateString: string) => {
  try {
    return format(parseISO(dateString), "MMM d, yyyy 'at' h:mm a");
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateString;
  }
};

// Helper function to generate a display name with proper fallbacks
const getDisplayName = (member: GroupMember | null): string => {
  if (!member) return "Unknown User";
  
  if (member.profile?.full_name) {
    return member.profile.full_name;
  } else if (member.profile?.unique_id) {
    return `User ${member.profile.unique_id}`;
  } else {
    return `User ${member.user_id.substring(0, 6)}`;
  }
};

const GroupDetails = () => {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [usageData, setUsageData] = useState<MobileUsage[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const fetchGroupDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      // Fetch group data
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

      if (groupError) {
        throw groupError;
      }
      
      setGroup(groupData);

      // Fetch members data
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select(`
          id, 
          user_id, 
          group_id,
          user_role,
          profiles:user_id (
            full_name,
            user_role,
            unique_id
          )
        `)
        .eq('group_id', id);

      if (membersError) {
        throw membersError;
      }

      console.log("Members data with profiles:", membersData);
      
      // Transform the data to match our interface
      const formattedMembers = membersData?.map(member => ({
        id: member.id,
        user_id: member.user_id,
        group_id: member.group_id,
        user_role: member.user_role,
        profile: {
          full_name: member.profiles?.full_name || null,
          user_role: member.profiles?.user_role || member.user_role,
          unique_id: member.profiles?.unique_id || null
        }
      })) || [];
      
      setMembers(formattedMembers);

      // Fetch usage data
      const { data: usageData, error: usageError } = await supabase
        .from('mobile_usage')
        .select(`
          *, 
          profile:profiles!user_id (
            full_name,
            unique_id
          )
        `)
        .eq('group_id', id)
        .order('start_time', { ascending: false });

      if (usageError) {
        throw usageError;
      }

      console.log("Fetched usage data:", usageData);
      setUsageData(usageData || []);

      // Fetch schedule data
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('group_id', id)
        .order('day_of_week')
        .order('start_time');
        
      if (scheduleError) {
        throw scheduleError;
      }
      
      setSchedules(scheduleData || []);

      // Fetch holiday data
      const { data: holidayData, error: holidayError } = await supabase
        .from('holidays')
        .select('*')
        .eq('group_id', id)
        .order('date');
        
      if (holidayError) {
        throw holidayError;
      }
      
      setHolidays(holidayData || []);
      
    } catch (error: any) {
      console.error('Error fetching group details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group details. ' + error.message,
        variant: 'destructive',
      });
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  }, [id, toast, navigate]);

  useEffect(() => {
    fetchGroupDetails();

    if (!id) return;

    // Set up real-time subscriptions
    const membersChannel = supabase
      .channel('group_members_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'group_members',
          filter: `group_id=eq.${id}`
        },
        () => {
          console.log('Group members changed, refreshing data');
          fetchGroupDetails();
        }
      )
      .subscribe();

    const usageChannel = supabase
      .channel('mobile_usage_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'mobile_usage',
          filter: `group_id=eq.${id}`
        },
        () => {
          console.log('Mobile usage changed, refreshing data');
          fetchGroupDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(usageChannel);
    };
  }, [fetchGroupDetails]);

  const handleDeleteGroup = async () => {
    if (!group || !user || profile?.user_role !== 'organizer') {
      toast({
        title: 'Access Denied',
        description: 'Only organizers can delete groups.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Group Deleted',
        description: 'The group has been successfully deleted.',
      });
      
      navigate('/groups');
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the group: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      console.error("Time formatting error:", error);
      return time;
    }
  };

  const schedulesByDay = schedules.reduce((acc, schedule) => {
    const day = schedule.day_of_week;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(schedule);
    return acc;
  }, {} as Record<number, Schedule[]>);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm max-w-md mx-auto">
          <p className="text-center text-gray-500 mb-4">Group not found or you don't have access.</p>
          <Button className="w-full" onClick={() => navigate('/groups')}>
            Go to Groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-16 md:pb-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/groups')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="md:inline hidden">Back</span>
          </Button>
          <h1 className="text-lg md:text-2xl font-bold">Group Details</h1>
        </div>
        
        {profile?.user_role === 'organizer' && group?.organizer_id === user?.id && (
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="flex items-center">
                <Trash2 className="h-4 w-4 mr-1" />
                <span className="md:inline hidden">Delete</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] md:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Group</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this group? This action cannot be undone
                  and will remove all associated schedules, memberships, and monitoring data.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteGroup}>
                  Delete Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4 md:space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{group.name}</CardTitle>
            <CardDescription className="flex flex-col md:flex-row md:items-center gap-1">
              <span>Group Code:</span> 
              <span className="font-mono bg-secondary px-2 py-1 rounded text-sm">{group.unique_code}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3">
              {profile?.user_role === 'organizer' && (
                <Button 
                  onClick={() => navigate(`/create-schedule?groupId=${group.id}`)}
                  className="flex items-center"
                  size="sm"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Manage Schedules
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 md:mb-6">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
            <TabsTrigger value="usage">Mobile Usage</TabsTrigger>
          </TabsList>
          
          <TabsContent value="members" className="mt-2 md:mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Group Members</CardTitle>
                <CardDescription>
                  People who are part of this group
                </CardDescription>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No members found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              {member.profile?.full_name || "Unnamed User"}
                            </TableCell>
                            <TableCell>
                              {member.profile?.unique_id || `${member.user_id.substring(0, 6)}...`}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary">
                                {member.user_role}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="schedules" className="mt-2 md:mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>
                  Regular monitoring and break times
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(schedulesByDay).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No schedules created yet</p>
                    {profile?.user_role === 'organizer' && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => navigate(`/create-schedule?groupId=${group.id}`)}
                      >
                        Create Schedule
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 md:space-y-6">
                    {Object.entries(schedulesByDay)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([day, daySchedules]) => (
                        <div key={day} className="border-b pb-4 last:border-0 last:pb-0">
                          <h3 className="font-medium text-md md:text-lg mb-2">
                            {dayMapReverse[Number(day)] || `Day ${day}`}
                          </h3>
                          <div className="space-y-2">
                            {daySchedules
                              .sort((a, b) => a.start_time.localeCompare(b.start_time))
                              .map(schedule => (
                                <div 
                                  key={schedule.id} 
                                  className={`p-2 md:p-3 rounded-md ${
                                    schedule.is_break 
                                      ? 'bg-green-50 border border-green-200' 
                                      : 'bg-blue-50 border border-blue-200'
                                  }`}
                                >
                                  <div className="font-medium">
                                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                  </div>
                                  <div className="text-xs md:text-sm text-muted-foreground">
                                    {schedule.description || (schedule.is_break ? 'Break Time' : 'Monitoring Session')}
                                  </div>
                                  <div className="mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      schedule.is_break 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {schedule.is_break ? 'Break - Mobile Allowed' : 'Monitoring Active'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="mt-4 md:mt-8 pt-4 border-t">
                  <h3 className="font-medium text-md md:text-lg mb-4">Upcoming Holidays</h3>
                  {holidays.length === 0 ? (
                    <p className="text-muted-foreground text-center py-2">No holidays scheduled</p>
                  ) : (
                    <div className="space-y-2">
                      {holidays
                        .filter(h => new Date(h.date) >= new Date())
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map(holiday => (
                          <div key={holiday.id} className="p-2 md:p-3 rounded-md bg-amber-50 border border-amber-200">
                            <div className="font-medium text-sm md:text-base">
                              {format(new Date(holiday.date), 'EEE, MMM d, yyyy')}
                            </div>
                            {holiday.description && (
                              <div className="text-xs md:text-sm text-muted-foreground">
                                {holiday.description}
                              </div>
                            )}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="usage" className="mt-2 md:mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Mobile Usage</CardTitle>
                <CardDescription>
                  Records of mobile phone usage during monitored times
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usageData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No usage data recorded yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead className="hidden md:table-cell">Date</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageData.map((usage) => {
                          const startDate = new Date(usage.start_time);
                          const durationInSeconds = usage.duration || 
                            (usage.end_time 
                              ? differenceInSeconds(new Date(usage.end_time), startDate) 
                              : differenceInSeconds(new Date(), startDate));
                          const isViolation = durationInSeconds > 15;

                          return (
                            <TableRow key={usage.id}>
                              <TableCell className="whitespace-nowrap">
                                {usage.profile?.full_name || `Unknown User`}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs">
                                {usage.profile?.unique_id || usage.user_id.substring(0, 6)}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {format(new Date(usage.start_time), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                {format(new Date(usage.start_time), 'h:mm a')}
                              </TableCell>
                              <TableCell>
                                {usage.end_time 
                                  ? `${formatDuration(durationInSeconds)}` 
                                  : 'Ongoing'}
                              </TableCell>
                              <TableCell>
                                {isViolation ? (
                                  <div className="flex items-center">
                                    <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                                    <span className="text-red-500 text-xs md:text-sm">Violation</span>
                                  </div>
                                ) : (
                                  <span className="text-green-600 text-xs md:text-sm">OK</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GroupDetails;