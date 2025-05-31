
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import DashboardHeader from "@/components/DashboardHeader";
import { LogOut, User, Shield, Bell } from "lucide-react";

const Settings = () => {
  const { signOut, user, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background/80">
      <DashboardHeader toggleSidebar={() => {}} />
      
      <main className="flex-1 container mx-auto p-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Settings</h1>
          <p className="text-foreground/60">Manage your account preferences and settings</p>
        </div>
        
        <div className="grid gap-6">
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center mb-4">
              <User className="mr-2 text-primary" />
              <h2 className="text-xl font-semibold">Account</h2>
            </div>
            
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground/70">Email</h3>
                  <p>{user?.email || "Not available"}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground/70">Role</h3>
                  <p>{profile?.user_role ? profile.user_role.charAt(0).toUpperCase() + profile.user_role.slice(1) : "Not available"}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <Button 
                  variant="destructive" 
                  onClick={handleSignOut}
                  className="flex items-center"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
          
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center mb-4">
              <Bell className="mr-2 text-primary" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>
            
            <p className="text-foreground/60 mb-4">Manage how you receive notifications</p>
            
            <div className="flex items-center justify-between py-2">
              <span>Email notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
          
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center mb-4">
              <Shield className="mr-2 text-primary" />
              <h2 className="text-xl font-semibold">Security</h2>
            </div>
            
            <div className="space-y-4">
              <Button variant="outline" className="w-full sm:w-auto">
                Change Password
              </Button>
              
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-foreground/60">Last sign in: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Unknown"}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
