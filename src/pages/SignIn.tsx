import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AuthForm from "@/components/AuthForm";
import UserTypeSelection from "@/components/UserTypeSelection";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

type UserType = "organizer" | "associate";

const SignIn = () => {
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  // Check if user type was passed from another page
  useEffect(() => {
    if (location.state?.userType) {
      setSelectedUserType(location.state.userType);
    }
  }, [location.state]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && profile?.user_role) {
      const redirectTo = location.state?.from || "/dashboard";
      navigate(redirectTo, { replace: true });
    }
  }, [user, profile, navigate, location.state]);

  const handleUserTypeSelect = (userType: UserType) => {
    setSelectedUserType(userType);
  };

  const handleBackToSelection = () => {
    setSelectedUserType(null);
  };

  // Show loading if we're in the process of redirecting
  if (user && profile?.user_role) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Logo className="h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to ViewHub</h1>
          <p className="text-muted-foreground">
            {selectedUserType 
              ? `Sign in as ${selectedUserType.charAt(0).toUpperCase() + selectedUserType.slice(1)}`
              : "Choose your role to continue"
            }
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">
              {selectedUserType ? "Authentication" : "Get Started"}
            </CardTitle>
            <CardDescription className="text-center">
              {selectedUserType 
                ? "Enter your credentials to sign in"
                : "Select your role to access the platform"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedUserType ? (
              <UserTypeSelection onSelect={handleUserTypeSelect} />
            ) : (
              <div className="space-y-4">
                <AuthForm userType={selectedUserType} />
                <div className="text-center">
                  <button
                    onClick={handleBackToSelection}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    ← Change user type
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            By continuing, you agree to our{" "}
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
  );
};

export default SignIn;