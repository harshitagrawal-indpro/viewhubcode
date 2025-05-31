
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft, Plus, Trash2, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchedules, formatTime, dayOfWeekNames } from "@/hooks/useSchedules";
import { useHolidays } from "@/hooks/useHolidays";

const formSchema = z.object({
  dayOfWeek: z.string().min(1, { message: "Day of week is required" }),
  startTime: z.string().min(1, { message: "Start time is required" }),
  endTime: z.string().min(1, { message: "End time is required" }),
  isBreak: z.boolean().default(false),
  description: z.string().optional(),
});

const CreateSchedule = () => {
  const [groupName, setGroupName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("create");
  const [isSubmittingHoliday, setIsSubmittingHoliday] = useState(false);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId");
  
  const { 
    isLoading,
    schedulesByDay,
    fetchSchedules,
    createSchedule,
    deleteSchedule
  } = useSchedules(groupId);
  
  const {
    isLoading: isLoadingHolidays,
    holidays,
    fetchHolidays,
    createHoliday,
    upcomingHolidays
  } = useHolidays(groupId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dayOfWeek: "",
      startTime: "",
      endTime: "",
      isBreak: false,
      description: "",
    },
  });

  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!groupId) return;

      try {
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('name')
          .eq('id', groupId)
          .single();

        if (groupError) {
          console.error("Error fetching group:", groupError);
          toast({
            title: "Error",
            description: "Couldn't fetch group details. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (groupData) {
          setGroupName(groupData.name);
        }
        
        await fetchSchedules();
        await fetchHolidays();
      } catch (err) {
        console.error("Error fetching group details:", err);
      }
    };

    fetchGroupDetails();
  }, [groupId, toast, fetchSchedules, fetchHolidays]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !user.id) {
      toast({
        title: "Access Denied",
        description: "You must be logged in to create schedules.",
        variant: "destructive",
      });
      navigate("/signin");
      return;
    }

    if (profile?.user_role !== 'organizer') {
      toast({
        title: "Access Denied",
        description: "Only organizers can create schedules.",
        variant: "destructive",
      });
      return;
    }

    const scheduleData = {
      dayOfWeek: values.dayOfWeek,
      startTime: values.startTime,
      endTime: values.endTime,
      isBreak: values.isBreak,
      description: values.description
    };

    const result = await createSchedule(scheduleData);
    
    if (result) {
      toast({
        title: "Schedule Created",
        description: `Schedule for ${values.dayOfWeek} has been created successfully.`,
      });
      
      form.reset({
        dayOfWeek: "",
        startTime: "",
        endTime: "",
        isBreak: false,
        description: "",
      });
      
      setActiveTab("view");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!user || profile?.user_role !== 'organizer') {
      toast({
        title: "Access Denied",
        description: "Only organizers can delete schedules.",
        variant: "destructive",
      });
      return;
    }

    await deleteSchedule(scheduleId);
  };

  const handleHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || profile?.user_role !== 'organizer' || !groupId) {
      toast({
        title: "Access Denied",
        description: "Only organizers can declare holidays.",
        variant: "destructive",
      });
      return;
    }

    if (!holidayDate) {
      toast({
        title: "Date Required",
        description: "Please select a date for the holiday.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingHoliday(true);

      const result = await createHoliday(holidayDate, holidayDescription || null);
      
      if (result) {
        toast({
          title: "Holiday Created",
          description: `Holiday on ${holidayDate} has been declared successfully.`,
        });

        setHolidayDate("");
        setHolidayDescription("");
      }
    } finally {
      setIsSubmittingHoliday(false);
    }
  };

  return (
    <div className="p-6 pb-16">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/groups')}
          className="mr-2 flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Groups
        </Button>
        <h1 className="text-2xl font-bold">Schedule Management</h1>
      </div>

      {groupName && (
        <div className="mb-6 bg-muted/30 p-4 rounded-lg border">
          <h2 className="font-medium text-lg">Group: {groupName}</h2>
          <p className="text-sm text-muted-foreground">Managing schedule for this group</p>
        </div>
      )}

      {!groupId ? (
        <div className="bg-white rounded-xl p-6 shadow-sm max-w-md mx-auto">
          <p className="text-center text-gray-500 mb-4">No group selected for scheduling.</p>
          <Button className="w-full" onClick={() => navigate('/groups')}>
            Go to Groups
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="create">Create Schedule</TabsTrigger>
              <TabsTrigger value="view">View Schedules</TabsTrigger>
              <TabsTrigger value="holidays">Holidays</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Schedule</CardTitle>
                  <CardDescription>
                    Set up a new monitoring schedule or break time for your group
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="dayOfWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day of Week</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="monday">Monday</SelectItem>
                                <SelectItem value="tuesday">Tuesday</SelectItem>
                                <SelectItem value="wednesday">Wednesday</SelectItem>
                                <SelectItem value="thursday">Thursday</SelectItem>
                                <SelectItem value="friday">Friday</SelectItem>
                                <SelectItem value="saturday">Saturday</SelectItem>
                                <SelectItem value="sunday">Sunday</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="E.g., Morning session, Lunch break"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isBreak"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Break Time</FormLabel>
                              <FormDescription>
                                Check this if this period is a break time (mobile usage allowed).
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Schedule
                          </div>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="view" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Current Schedules</CardTitle>
                  <CardDescription>
                    All scheduled monitoring sessions for your group
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : Object.keys(schedulesByDay).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No schedules created yet</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setActiveTab("create")}
                      >
                        Create Your First Schedule
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(schedulesByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([day, daySchedules]) => (
                        <div key={day} className="border-b pb-4 last:border-0 last:pb-0">
                          <h3 className="font-medium text-lg mb-2">
                            {dayOfWeekNames[parseInt(day) as keyof typeof dayOfWeekNames] || day}
                          </h3>
                          <div className="space-y-2">
                            {daySchedules.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(schedule => (
                              <div 
                                key={schedule.id} 
                                className={`p-3 rounded-md flex justify-between items-center ${
                                  schedule.is_break ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
                                }`}
                              >
                                <div>
                                  <div className="font-medium">
                                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {schedule.description || (schedule.is_break ? 'Break Time' : 'Monitoring Session')}
                                  </div>
                                  <div className="mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      schedule.is_break ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {schedule.is_break ? 'Break - Mobile Allowed' : 'Monitoring Active'}
                                    </span>
                                  </div>
                                </div>
                                {profile?.user_role === 'organizer' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteSchedule(schedule.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="holidays" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Declare Holidays</CardTitle>
                  <CardDescription>
                    Set days when there will be no monitoring for your group
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleHolidaySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Holiday Date</label>
                      <Input
                        type="date"
                        value={holidayDate}
                        onChange={(e) => setHolidayDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description (Optional)</label>
                      <Input
                        placeholder="E.g., National Holiday, Group Outing"
                        value={holidayDescription}
                        onChange={(e) => setHolidayDescription(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isSubmittingHoliday}
                    >
                      {isSubmittingHoliday ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          Declare Holiday
                        </div>
                      )}
                    </Button>
                  </form>

                  {upcomingHolidays.length > 0 && (
                    <div className="mt-8 border-t pt-4">
                      <h3 className="font-medium mb-3">Upcoming Holidays</h3>
                      <div className="space-y-2">
                        {upcomingHolidays.map(holiday => (
                          <div key={holiday.id} className="p-3 rounded-md bg-amber-50 border border-amber-200">
                            <div className="font-medium">
                              {new Date(holiday.date).toLocaleDateString(undefined, { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </div>
                            {holiday.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {holiday.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default CreateSchedule;
