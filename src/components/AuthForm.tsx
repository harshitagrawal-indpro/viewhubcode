import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, AlertCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthFormProps {
  userType: "organizer" | "associate";
}

const AuthForm = ({ userType }: AuthFormProps) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signIn, signUp, signInWithGoogle, loading: authLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setProviderError(null);
    
    if (isSubmitting) return; // Prevent double submission
    
    try {
      setIsSubmitting(true);
      
      if (isSignUp) {
        console.log(`Signing up as ${userType} with email: ${email}`);
        await signUp(email, password, userType, userType === "associate" ? uniqueId : undefined);
        setAuthError("Account created! Please check your email for verification.");
      } else {
        await signIn(email, password);
        // Navigate is handled in the AuthContext after successful login
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setAuthError(error.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setProviderError(null);
    
    if (isSubmitting) return; // Prevent double submission
    
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
    } catch (error: any) {
      // Check for specific provider error
      if (error.message?.includes("provider is not enabled")) {
        setProviderError("Google authentication is not enabled in this application. Please use email/password or contact the administrator.");
      } else {
        setAuthError(error.message || "Google authentication failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combined loading state
  const loading = isSubmitting || authLoading;

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      <h2 className="text-xl font-semibold mb-6">
        {isSignUp ? "Create account" : "Sign in"} as {userType.charAt(0).toUpperCase() + userType.slice(1)}
      </h2>

      {providerError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{providerError}</AlertDescription>
        </Alert>
      )}

      {authError && (
        <Alert variant={authError.includes("created") ? "default" : "destructive"} className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}

      <button
        onClick={handleGoogleSignIn}
        type="button"
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 px-4 py-3 rounded-lg border border-gray-300 font-medium transition-colors hover:bg-gray-50 mb-6 disabled:opacity-70"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18.1711 8.36788H17.4998V8.33329H9.99984V11.6666H14.7094C14.0223 13.607 12.1761 15 9.99984 15C7.23859 15 4.99984 12.7612 4.99984 10C4.99984 7.23871 7.23859 5 9.99984 5C11.2744 5 12.4344 5.48683 13.3177 6.28537L15.6744 3.92871C14.1897 2.52513 12.1951 1.66663 9.99984 1.66663C5.39775 1.66663 1.6665 5.39788 1.6665 10C1.6665 14.6021 5.39775 18.3333 9.99984 18.3333C14.6019 18.3333 18.3332 14.6021 18.3332 10C18.3332 9.44121 18.2757 8.89583 18.1711 8.36788Z"
            fill="#FFC107"
          />
          <path
            d="M2.62744 6.12129L5.36536 8.12913C6.10619 6.29496 7.90036 5 9.99994 5C11.2745 5 12.4345 5.48683 13.3178 6.28537L15.6745 3.92871C14.1898 2.52513 12.1952 1.66663 9.99994 1.66663C6.74911 1.66663 3.91077 3.47371 2.62744 6.12129Z"
            fill="#FF3D00"
          />
          <path
            d="M10 18.3333C12.1525 18.3333 14.1084 17.5096 15.5871 16.1583L13.008 13.9862C12.1432 14.6326 11.0865 15 10 15C7.83255 15 5.99213 13.6179 5.2991 11.6892L2.5769 13.7829C3.84493 16.4662 6.70993 18.3333 10 18.3333Z"
            fill="#4CAF50"
          />
          <path
            d="M18.1711 8.36788H17.4998V8.33329H9.99984V11.6666H14.7094C14.3809 12.5988 13.7889 13.4016 13.0069 13.9862L13.008 13.9854L15.5871 16.1575C15.4046 16.3237 18.3332 14.1667 18.3332 10C18.3332 9.44121 18.2757 8.89583 18.1711 8.36788Z"
            fill="#1976D2"
          />
        </svg>
        {isSignUp ? "Sign up" : "Sign in"} with Google
      </button>

      <div className="relative flex items-center my-6">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="mx-4 text-sm text-gray-500">or</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {userType === "associate" && isSignUp && (
          <div>
            <Label htmlFor="uniqueId">Unique ID (USN or Employee ID)</Label>
            <div className="mt-1">
              <Input
                id="uniqueId"
                type="text"
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value)}
                placeholder="Enter your unique ID"
                required={userType === "associate" && isSignUp}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="email">Email address</Label>
          <div className="mt-1 relative">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            <Mail
              size={18}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="mt-1 relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              Processing...
            </span>
          ) : isSignUp ? "Create Account" : "Sign In"}
        </Button>

        <div className="flex justify-center mt-4">
          <Button
            type="button"
            variant="link"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AuthForm;