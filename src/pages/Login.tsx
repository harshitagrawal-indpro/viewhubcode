
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import AuthForm from "@/components/AuthForm";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userType, setUserType] = useState<"organizer" | "executor" | "associate">("organizer");
  
  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Extract user type from location state if available
  useEffect(() => {
    const state = location.state as { userType?: "organizer" | "executor" | "associate" };
    if (state?.userType) {
      setUserType(state.userType);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>
        
        <AuthForm userType={userType} />
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Don't have an account?{" "}
            <Button variant="link" className="p-0" asChild>
              <Link to="/register" state={{ userType }}>Create an account</Link>
            </Button>
          </p>
          <p className="mt-2">
            <Button variant="link" className="p-0" asChild>
              <Link to="/user-type">Choose a different user type</Link>
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
