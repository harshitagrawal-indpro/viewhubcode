import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Users, Settings, Smartphone } from "lucide-react";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { profile, signOut } = useAuth();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const isActive = (path: string) => location.pathname.startsWith(path);
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  // Check if current route should show the sidebar navigation
  const shouldShowSidebar = () => {
    // Don't show sidebar in specific create/edit pages to avoid duplicate navigation
    const noSidebarRoutes = [
      '/create-schedule', 
      '/join-group',
      '/create-group',
    ];
    
    return !noSidebarRoutes.some(route => location.pathname.startsWith(route));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader toggleSidebar={toggleSidebar} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Only show in appropriate routes */}
        {shouldShowSidebar() && (!isMobile || isSidebarOpen) && (
          <aside
            className={`bg-white border-r border-border transition-all duration-300 flex flex-col ${
              isSidebarOpen ? "w-64" : "w-16"
            } ${isMobile ? "absolute z-30 h-full" : ""}`}
          >
            <div className="flex-1 py-4">
              <div className="px-4 mb-4">
                <div className="text-sm font-medium text-primary">
                  {profile?.user_role ? 
                    `Role: ${profile.user_role.charAt(0).toUpperCase() + profile.user_role.slice(1)}` : 
                    "Loading role..."}
                </div>
              </div>
              <nav className="px-2">
                <div className="space-y-1">
                  <Link
                    to="/dashboard"
                    className={`flex items-center px-3 py-2 rounded-lg hover:bg-secondary transition-colors ${
                      isActive("/dashboard")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    <Home size={18} className="mr-3" />
                    {isSidebarOpen && <span>Dashboard</span>}
                  </Link>

                  <Link
                    to="/groups"
                    className={`flex items-center px-3 py-2 rounded-lg hover:bg-secondary transition-colors ${
                      isActive("/groups") || isActive("/group/")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    <Users size={18} className="mr-3" />
                    {isSidebarOpen && <span>Groups</span>}
                  </Link>
                  
                  <Link
                    to="/monitoring"
                    className={`flex items-center px-3 py-2 rounded-lg hover:bg-secondary transition-colors ${
                      isActive("/monitoring")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    <Smartphone size={18} className="mr-3" />
                    {isSidebarOpen && <span>Monitoring</span>}
                  </Link>

                  <Link
                    to="/settings"
                    className={`flex items-center px-3 py-2 rounded-lg hover:bg-secondary transition-colors ${
                      isActive("/settings")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    <Settings size={18} className="mr-3" />
                    {isSidebarOpen && <span>Settings</span>}
                  </Link>
                </div>
              </nav>
            </div>

            {/* Logout button in sidebar */}
            <div className="p-4 border-t border-border">
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-foreground/70 hover:text-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut size={18} className="mr-2" />
                  {isSidebarOpen && <span>Log out</span>}
                </Button>
                
                <button 
                  onClick={toggleSidebar}
                  className="w-full flex items-center justify-center text-foreground/70 hover:text-foreground"
                >
                  {isSidebarOpen ? "◀" : "▶"}
                </button>
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation - Only show in appropriate routes and avoid duplication */}
      {isMobile && shouldShowSidebar() && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-10 px-2 py-1">
          <div className="flex justify-around">
            <Link to="/dashboard" className={`flex flex-col items-center py-1 px-3 ${isActive("/dashboard") ? "text-primary" : ""}`}>
              <Home size={20} />
              <span className="text-xs">Home</span>
            </Link>
            <Link to="/groups" className={`flex flex-col items-center py-1 px-3 ${
              isActive("/groups") || isActive("/group/") ? "text-primary" : ""}`}>
              <Users size={20} />
              <span className="text-xs">Groups</span>
            </Link>
            <Link to="/monitoring" className={`flex flex-col items-center py-1 px-3 ${isActive("/monitoring") ? "text-primary" : ""}`}>
              <Smartphone size={20} />
              <span className="text-xs">Monitor</span>
            </Link>
            <Link to="/settings" className={`flex flex-col items-center py-1 px-3 ${isActive("/settings") ? "text-primary" : ""}`}>
              <Settings size={20} />
              <span className="text-xs">Settings</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;