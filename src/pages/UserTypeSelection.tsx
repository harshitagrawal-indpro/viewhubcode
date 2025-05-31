import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import UserTypeSelectionComponent from "@/components/UserTypeSelection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type UserType = "organizer" | "associate";

const UserTypeSelectionPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Redirect if already logged in and has a profile
  useEffect(() => {
    if (user && profile?.user_role) {
      const redirectTo = location.state?.from || "/dashboard";
      navigate(redirectTo, { replace: true });
    }
  }, [user, profile, navigate, location.state]);

  const handleUserTypeSelection = async (userType: UserType) => {
    // If user is already authenticated, update their profile
    if (user) {
      setIsLoading(true);
      try {
        // Update user profile with selected role
        const { error } = await supabase
          .from("profiles")
          .update({ user_role: userType })
          .eq("id", user.id);

        if (error) {
          console.error("Profile update error:", error);
          throw error;
        }
        
        toast({
          title: "Profile updated",
          description: `You've been registered as ${userType}`,
        });
        
        const redirectTo = location.state?.from || "/dashboard";
        navigate(redirectTo, { replace: true });
      } catch (error: any) {
        console.error("Error updating user type:", error);
        toast({
          title: "Update failed",
          description: error.message || "Failed to update user type. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // If not authenticated, navigate to sign in with the selected user type
      navigate("/signin", { state: { userType, from: location.state?.from } });
    }
  };

  // Show loading if we're checking auth state
  if (user && profile?.user_role) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Select User Type</CardTitle>
          <CardDescription className="text-center">
            Choose how you'll use the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserTypeSelectionComponent onSelect={handleUserTypeSelection} />
        </CardContent>
        <CardFooter className="flex flex-col">
          {isLoading && (
            <div className="flex justify-center w-full mb-4">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          {!user && (
            <div className="text-center text-sm mt-4">
              Already have an account?{" "}
              <Button 
                variant="link" 
                className="p-0" 
                onClick={() => navigate("/signin", { state: { from: location.state?.from } })}
                disabled={isLoading}
              >
                Sign In
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default UserTypeSelectionPage;