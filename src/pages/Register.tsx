import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AuthForm from "@/components/AuthForm";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

type UserType = "organizer" | "associate"; // Removed "executor" as it's not used in your app

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [userType, setUserType] = useState<UserType>("associate"); // Default to associate
  const [isLoading, setIsLoading] = useState(false);
  
  // If user is already logged in and has a profile, redirect to dashboard
  useEffect(() => {
    if (user && profile?.user_role) {
      const redirectTo = location.state?.from || "/dashboard";
      navigate(redirectTo, { replace: true });
    }
  }, [user, profile, navigate, location.state]);

  // Extract user type from location state if available
  useEffect(() => {
    const state = location.state as { 
      userType?: UserType;
      from?: string;
    };
    if (state?.userType) {
      setUserType(state.userType);
    }
  }, [location.state]);

  // Handle user type change
  const handleUserTypeChange = (newUserType: UserType) => {
    setUserType(newUserType);
  };

  // Show loading state if we're in the process of redirecting
  if (user && profile?.user_role) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Logo className="h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-bold">Create Your Account</h1>
          <p className="text-muted-foreground">
            Join ViewHub as {userType === "organizer" ? "an" : "a"} {userType}
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Register</CardTitle>
            <CardDescription className="text-center">
              Create your account to get started with ViewHub
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Type Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Account Type</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={userType === "organizer" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => handleUserTypeChange("organizer")}
                  disabled={isLoading}
                >
                  Organizer
                </Button>
                <Button
                  type="button"
                  variant={userType === "associate" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => handleUserTypeChange("associate")}
                  disabled={isLoading}
                >
                  Associate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {userType === "organizer" 
                  ? "Create and manage groups, schedules, and monitor team activity"
                  : "Join groups and participate in organizational monitoring"
                }
              </p>
            </div>

            {/* Auth Form */}
            <AuthForm userType={userType} />
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Already have an account?{" "}
              <Button variant="link" className="p-0 h-auto" asChild>
                <Link 
                  to="/signin" 
                  state={{ 
                    userType, 
                    from: location.state?.from 
                  }}
                >
                  Sign in
                </Link>
              </Button>
            </p>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Want to choose a different account type?{" "}
              <Button variant="link" className="p-0 h-auto" asChild>
                <Link 
                  to="/user-type" 
                  state={{ from: location.state?.from }}
                >
                  Select User Type
                </Link>
              </Button>
            </p>
          </div>

          {/* Terms and Privacy */}
          <div className="text-center text-xs text-muted-foreground">
            <p>
              By creating an account, you agree to our{" "}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;