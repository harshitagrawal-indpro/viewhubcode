
import { supabase } from "./client";

/**
 * Helper function to check group_members user_role constraints
 * @returns Array of allowed user_role values or null if error
 */
export const checkUserRoleConstraints = async (): Promise<string[] | null> => {
  try {
    // Try to get allowed values by querying existing data
    const { data, error } = await supabase
      .from('group_members')
      .select('user_role')
      .limit(10);
    
    if (error) {
      console.error("Error checking user_role constraints:", error);
      return null;
    }
    
    // Extract unique user_role values
    const uniqueRoles = Array.from(new Set(data.map(item => item.user_role)))
      .filter(role => role !== null && role !== undefined);
    
    return uniqueRoles.length > 0 ? uniqueRoles : ['organizer', 'executor', 'associate'];
  } catch (error) {
    console.error("Exception checking user_role constraints:", error);
    return null;
  }
};
