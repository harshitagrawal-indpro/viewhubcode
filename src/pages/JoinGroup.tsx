
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import DashboardHeader from "../components/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const JoinGroup = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [groupCode, setGroupCode] = useState("");
  const [groupPassword, setGroupPassword] = useState("");
  const [name, setName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
        
      if (data?.full_name) {
        setName(data.full_name);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name before joining the group.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsJoining(true);
      
      // First update the user's profile with their name
      await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('id', user?.id);

      // Get group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, name, password')
        .eq('unique_code', groupCode.toUpperCase())
        .single();

      if (groupError || !groupData) {
        toast({
          title: "Group Not Found",
          description: "Please check the group code and try again.",
          variant: "destructive",
        });
        return;
      }

      if (groupData.password !== groupPassword) {
        toast({
          title: "Invalid Password",
          description: "The password you entered is incorrect.",
          variant: "destructive",
        });
        return;
      }

      // Add user to group
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([
          { 
            user_id: user?.id, 
            group_id: groupData.id, 
            user_role: 'associate'  // Default to associate role
          }
        ]);

      if (memberError) {
        console.error("Error joining group:", memberError);
        if (memberError.code === '23505') {  // Unique violation
          toast({
            title: "Already a Member",
            description: "You are already a member of this group.",
            variant: "default",
          });
          navigate(`/group/${groupData.id}`);
          return;
        }
        
        toast({
          title: "Error",
          description: "Failed to join the group. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `You have joined ${groupData.name}!`,
      });

      navigate(`/group/${groupData.id}`);
    } catch (error) {
      console.error("Exception in join group:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="container mx-auto py-8 max-w-md">
        <h1 className="text-2xl font-bold mb-6">Join a Group</h1>

        <Card>
          <CardHeader>
            <CardTitle>Enter Group Details</CardTitle>
            <CardDescription>
              Enter the group code and password provided by the group organizer.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleJoinGroup}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-code">Group Code</Label>
                <Input
                  id="group-code"
                  placeholder="Enter 6-character group code"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-password">Group Password</Label>
                <Input
                  id="group-password"
                  type="password"
                  placeholder="Enter group password"
                  value={groupPassword}
                  onChange={(e) => setGroupPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isJoining}
              >
                {isJoining ? "Joining..." : "Join Group"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default JoinGroup;
