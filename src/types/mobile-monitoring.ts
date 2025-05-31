
export type MobileUsageLog = {
  id: string;
  user_id: string;
  group_id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  is_violation: boolean;
  created_at: string;
  user_name?: string;
  user_role?: string;
  user_unique_id?: string;
  group_name?: string;
  is_within_schedule?: boolean;
};

export type Schedule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
};
