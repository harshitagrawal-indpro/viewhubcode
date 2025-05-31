
import { useState, useCallback } from "react";
import { useToast } from "../components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Holiday {
  id: string;
  date: string;
  description: string | null;
  is_recurring: boolean;
  group_id: string;
}

export const useHolidays = (groupId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create a fetch function that will be used by React Query
  const fetchHolidays = useCallback(async () => {
    if (!groupId) return [];
    
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('group_id', groupId)
        .order('date');
        
      if (error) {
        console.error("Error fetching holidays:", error);
        toast({
          title: "Error",
          description: "Couldn't fetch holidays. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
      
      return data || [];
    } catch (err) {
      console.error("Exception fetching holidays:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  }, [groupId, toast]);

  // Use React Query to fetch and cache the holidays
  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays', groupId],
    queryFn: fetchHolidays,
    enabled: !!groupId,
  });

  // Create holiday mutation
  const createHolidayMutation = useMutation({
    mutationFn: async ({ date, description }: { date: string, description: string | null }) => {
      if (!groupId) {
        throw new Error("No group selected for scheduling holidays");
      }

      // Check if the same date is already a holiday
      const existingHoliday = holidays.find(h => h.date === date);
      if (existingHoliday) {
        throw new Error(`${date} is already set as a holiday`);
      }

      const { data, error } = await supabase
        .from('holidays')
        .insert({
          group_id: groupId,
          date: date,
          description: description,
          is_recurring: false,
        })
        .select();

      if (error) {
        console.error("Error creating holiday:", error);
        throw error;
      }

      if (data && data.length > 0) {
        return data[0];
      }
      
      throw new Error("Failed to create holiday");
    },
    onSuccess: () => {
      toast({
        title: "Holiday Created",
        description: "The holiday has been scheduled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['holidays', groupId] });
    },
    onError: (error: any) => {
      toast({
        title: "Holiday Creation Failed",
        description: error.message || "Failed to create holiday. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete holiday mutation
  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayId: string) => {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', holidayId);

      if (error) {
        throw error;
      }
      
      return holidayId;
    },
    onSuccess: () => {
      toast({
        title: "Holiday Deleted",
        description: "The holiday has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['holidays', groupId] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete holiday. Please try again.",
        variant: "destructive",
      });
    }
  });

  const createHoliday = async (date: string, description: string | null): Promise<Holiday | null> => {
    try {
      return await createHolidayMutation.mutateAsync({ date, description });
    } catch {
      return null;
    }
  };

  const deleteHoliday = async (holidayId: string): Promise<boolean> => {
    try {
      await deleteHolidayMutation.mutateAsync(holidayId);
      return true;
    } catch {
      return false;
    }
  };

  // Get upcoming holidays
  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    isLoading,
    holidays,
    fetchHolidays,
    createHoliday,
    deleteHoliday,
    upcomingHolidays,
    isCreating: createHolidayMutation.isPending,
    isDeleting: deleteHolidayMutation.isPending,
  };
};
