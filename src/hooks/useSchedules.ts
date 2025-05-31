
import { useState, useCallback } from "react";
import { useToast } from "../components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Schedule {
  id: string;
  group_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  description: string | null;
  created_at: string;
}

export interface ScheduleFormData {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  description?: string;
}

// Helper for formatting time - changed from object to function to fix type error
export const formatTime = (timeString: string): string => {
  try {
    // If timeString is already in the format HH:MM, we'll append :00 to make it work with date
    const fullTimeString = timeString.includes(':') ? 
      (timeString.split(':').length === 2 ? `${timeString}:00` : timeString) : 
      `${timeString}:00:00`;
      
    const date = new Date(`1970-01-01T${fullTimeString}`);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    console.error("Error formatting time:", e);
    return timeString;
  }
};

// Helper for formatting days of week
export const dayOfWeekNames = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

interface SchedulesByDay {
  [key: string]: Schedule[];
}

export const useSchedules = (groupId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchSchedules = useCallback(async () => {
    if (!groupId) return [];
    
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('group_id', groupId)
        .order('day_of_week');
        
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (err) {
      console.error("Error fetching schedules:", err);
      toast({
        title: "Error",
        description: "Failed to load schedules. Please try again.",
        variant: "destructive",
      });
      return [];
    }
  }, [groupId, toast]);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules', groupId],
    queryFn: fetchSchedules,
    enabled: !!groupId,
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (scheduleData: ScheduleFormData) => {
      if (!groupId) {
        throw new Error("No group selected");
      }

      // Convert day of week from string to number
      const dayOfWeek = getDayOfWeekNumber(scheduleData.dayOfWeek);
      
      const { data, error } = await supabase
        .from('schedules')
        .insert({
          group_id: groupId,
          day_of_week: dayOfWeek,
          start_time: scheduleData.startTime,
          end_time: scheduleData.endTime,
          is_break: scheduleData.isBreak,
          description: scheduleData.description || null,
        })
        .select();

      if (error) {
        console.error("Error creating schedule:", error);
        throw error;
      }

      return data[0];
    },
    onSuccess: () => {
      toast({
        title: "Schedule Created",
        description: "The schedule has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['schedules', groupId] });
    },
    onError: (error: any) => {
      toast({
        title: "Schedule Creation Failed",
        description: error.message || "Failed to create schedule. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) {
        throw error;
      }
      
      return scheduleId;
    },
    onSuccess: () => {
      toast({
        title: "Schedule Deleted",
        description: "The schedule has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['schedules', groupId] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete schedule. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Helper function to group schedules by day
  const schedulesByDay = schedules.reduce<SchedulesByDay>((acc, schedule) => {
    const day = `${schedule.day_of_week}`;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(schedule);
    return acc;
  }, {});

  // Helper to convert day string to number
  const getDayOfWeekNumber = (day: string): number => {
    const dayMap: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return dayMap[day.toLowerCase()] || 0; // Default to Sunday (0) if not found
  };

  const createSchedule = async (data: ScheduleFormData) => {
    try {
      return await createScheduleMutation.mutateAsync(data);
    } catch (error) {
      return null;
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    try {
      await deleteScheduleMutation.mutateAsync(scheduleId);
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    schedules,
    schedulesByDay,
    isLoading,
    createSchedule,
    deleteSchedule,
    fetchSchedules,
    isCreating: createScheduleMutation.isPending,
    isDeleting: deleteScheduleMutation.isPending,
  };
};
