
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import DashboardHeader from "../components/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Group name must be at least 3 characters.",
  }).refine(
    (value) => /[a-z]/.test(value) && /[0-9]/.test(value), 
    { message: "Group name must contain both letters and numbers." }
  ),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }).refine(
    (value) => /[a-z]/.test(value) && /[0-9]/.test(value), 
    { message: "Password must contain lowercase letters and numbers." }
  ),
});

const CreateGroup = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      password: "",
    },
  });

  // Check for user auth on component mount
  useEffect(() => {
    if (!user) {
      console.log("No user found, redirecting to signin");
      navigate("/signin");
    } else if (profile && profile.user_role !== 'organizer') {
      console.log("User is not an organizer, redirecting to dashboard");
      toast({
        title: "Access Denied",
        description: "Only organizers can create groups.",
        variant: "destructive",
      });
      navigate("/dashboard");
    } else {
      console.log("User authenticated as organizer:", profile?.user_role);
    }
  }, [user, profile, navigate, toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !user.id) {
      toast({
        title: "Access Denied",
        description: "You must be logged in to create groups.",
        variant: "destructive",
      });
      navigate("/signin");
      return;
    }

    if (profile?.user_role !== 'organizer') {
      toast({
        title: "Access Denied",
        description: "Only organizers can create groups.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("Creating group with organizer ID:", user.id);
      console.log("User profile:", profile);
      
      // Generate a unique code for the group
      const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Insert the new group into the database
      const { data, error } = await supabase.from('groups').insert({
        name: values.name,
        password: values.password,
        organizer_id: user.id,
        unique_code: uniqueCode,
      }).select();

      if (error) {
        console.error("Error creating group:", error);
        throw error;
      }

      if (data && data[0]) {
        console.log("Group created:", data[0]);
        
        // Insert the organizer directly as a group member with correct role format
        const { error: memberError } = await supabase.from('group_members').insert({
          group_id: data[0].id,
          user_id: user.id,
          user_role: 'organizer',
        });

        if (memberError) {
          console.error("Error adding organizer as member:", memberError);
          // If there's an error, we'll try to handle it but still consider the group created
          toast({
            title: "Group Created",
            description: `Your group "${values.name}" has been created, but there was an issue adding you as a member. Please try joining the group manually.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Group Created",
            description: `Your group "${values.name}" has been created successfully.`,
          });
        }
        
        navigate('/groups');
      } else {
        throw new Error("Failed to create group: No data returned");
      }
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({
        title: "Failed to Create Group",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render the form
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader toggleSidebar={toggleSidebar} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-border transition-all duration-300 flex flex-col ${
            isSidebarOpen ? "w-64" : "w-16"
          }`}
        >
          <div className="flex-1 py-4">
            <nav className="px-2">
              <div className="space-y-1">
                <Link
                  to="/dashboard"
                  className="flex items-center text-foreground/70 hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <span className="mr-3">🏠</span>
                  {isSidebarOpen && <span>Dashboard</span>}
                </Link>

                <Link
                  to="/groups"
                  className="flex items-center text-foreground px-3 py-2 rounded-lg bg-primary-100 text-primary"
                >
                  <span className="mr-3">👥</span>
                  {isSidebarOpen && <span>Groups</span>}
                </Link>

                <Link
                  to="/monitoring"
                  className="flex items-center text-foreground/70 hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <span className="mr-3">📱</span>
                  {isSidebarOpen && <span>Monitoring</span>}
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center text-foreground/70 hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <span className="mr-3">⚙️</span>
                  {isSidebarOpen && <span>Settings</span>}
                </Link>
              </div>
            </nav>
          </div>

          <div className="p-4 border-t border-border">
            <button 
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center text-foreground/70 hover:text-foreground"
            >
              {isSidebarOpen ? "◀" : "▶"}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-2 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/groups')}
              className="mr-2"
            >
              ← Back
            </Button>
            <h1 className="text-2xl font-bold">Create a New Group</h1>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm max-w-md mx-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter group name" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Must contain both letters and numbers (e.g., group123).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter group password" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Must contain lowercase letters and numbers (e.g., password123).
                      </FormDescription>
                      <FormMessage />
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
                    "Create Group"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateGroup;
