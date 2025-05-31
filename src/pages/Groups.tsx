
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Users, PlusCircle, Eye, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Group {
  id: string;
  name: string;
  unique_code: string;
  created_at: string;
  role: string;
}

const Groups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch user's groups
  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        console.log("Fetching groups for user:", user.id);
        
        // Get groups the user is a member of
        const { data: memberships, error: membershipError } = await supabase
          .from('group_members')
          .select('group_id, user_role, groups(id, name, unique_code, created_at)')
          .eq('user_id', user.id);

        if (membershipError) {
          console.error("Error fetching group memberships:", membershipError);
          throw membershipError;
        }

        // Get groups the user is an organizer for (as a backup)
        const { data: organizedGroups, error: organizedError } = await supabase
          .from('groups')
          .select('id, name, unique_code, created_at')
          .eq('organizer_id', user.id);

        if (organizedError) {
          console.error("Error fetching organized groups:", organizedError);
        }

        // Format the data from memberships
        const memberGroups = memberships
          .filter(membership => membership.groups) // Filter out null groups
          .map(membership => ({
            id: membership.groups.id,
            name: membership.groups.name,
            unique_code: membership.groups.unique_code,
            created_at: membership.groups.created_at,
            role: membership.user_role
          }));
        
        // Add organized groups if they're not already in the list
        const existingGroupIds = new Set(memberGroups.map(g => g.id));
        const additionalGroups = (organizedGroups || [])
          .filter(group => !existingGroupIds.has(group.id))
          .map(group => ({
            id: group.id,
            name: group.name,
            unique_code: group.unique_code,
            created_at: group.created_at,
            role: 'organizer'
          }));

        // Combine both lists and update state
        const combinedGroups = [...memberGroups, ...additionalGroups];
        setGroups(combinedGroups);
      } catch (error: any) {
        console.error("Error fetching groups:", error);
        toast({
          title: "Failed to load groups",
          description: error.message || "Something went wrong while fetching your groups.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user, toast]);

  const handleManageSchedules = (groupId: string) => {
    navigate(`/create-schedule?groupId=${groupId}`);
  };
  
  const handleViewDetails = (groupId: string) => {
    navigate(`/group/${groupId}`);
  };
  
  const openDeleteDialog = (groupId: string) => {
    setGroupToDelete(groupId);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteGroup = async () => {
    if (!groupToDelete || !user || profile?.user_role !== 'organizer') {
      toast({
        title: "Access Denied",
        description: "Only organizers can delete groups.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupToDelete);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setGroups(groups.filter(group => group.id !== groupToDelete));
      
      toast({
        title: "Group Deleted",
        description: "The group has been successfully deleted.",
      });
      
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Groups</h1>
        <p className="text-foreground/70">Manage your groups</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        {profile?.user_role === 'organizer' ? (
          <div className="flex flex-col md:flex-row gap-4">
            <Button asChild className="flex-1">
              <Link to="/create-group" className="flex items-center justify-center">
                <PlusCircle className="mr-2 h-4 w-4" />
                <span>Create a New Group</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/join-group" className="flex items-center justify-center">
                <Users className="mr-2 h-4 w-4" />
                <span>Join Existing Group</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Button asChild className="w-full md:w-auto">
              <Link to="/join-group">Join a Group</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Groups list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Your Groups</h2>
          <p className="text-sm text-foreground/70">Groups you've created or joined</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : groups.length > 0 ? (
            <div className="divide-y divide-border">
              {groups.map((group) => (
                <div key={group.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="font-medium">{group.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-primary-100 text-primary px-2 py-0.5 rounded-full">
                          {group.role}
                        </span>
                        <span className="text-xs text-gray-500">
                          Code: {group.unique_code}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(profile?.user_role === 'organizer' || group.role === 'organizer') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleManageSchedules(group.id)}
                          className="flex items-center"
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Schedules</span>
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(group.id)}
                        className="flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        <span>Details</span>
                      </Button>
                      
                      {(profile?.user_role === 'organizer' && group.role === 'organizer') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openDeleteDialog(group.id)}
                          className="flex items-center text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          <span>Delete</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>You haven't joined any groups yet.</p>
              {profile?.user_role === 'organizer' ? (
                <p className="mt-2">Create a new group or join an existing one to get started.</p>
              ) : (
                <p className="mt-2">Join a group to get started.</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the group
              and all associated schedules, members, and monitoring data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Groups;
