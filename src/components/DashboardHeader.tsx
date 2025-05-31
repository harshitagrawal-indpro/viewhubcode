
import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Bell, X, Search } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

interface DashboardHeaderProps {
  toggleSidebar: () => void;
}

const DashboardHeader = ({ toggleSidebar }: DashboardHeaderProps) => {
  const { user, profile, signOut } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="bg-white border-b border-border sticky top-0 z-20">
      <div className="flex justify-between items-center px-4 py-2">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <Link to="/dashboard" className="flex items-center">
            <Logo className="h-8 w-auto" />
            <span className="text-xl font-semibold ml-2">ViewHub</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center max-w-md w-full mx-4">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search..."
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
            <span className="sr-only">Notifications</span>
          </Button>

          <div className="hidden md:flex items-center ml-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
            </div>
            <div className="ml-2 flex flex-col">
              <span className="text-sm font-medium">
                {profile?.full_name || user?.email || "User"}
              </span>
              {profile?.user_role && (
                <span className="text-xs text-muted-foreground">
                  {profile.user_role.charAt(0).toUpperCase() + profile.user_role.slice(1)}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="ml-2">
              Logout
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden ml-2"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {showMobileMenu && (
        <div className="md:hidden border-t p-4">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
            </div>
            <div className="ml-2 flex flex-col">
              <span className="text-sm font-medium">
                {profile?.full_name || user?.email || "User"}
              </span>
              {profile?.user_role && (
                <span className="text-xs text-muted-foreground">
                  {profile.user_role.charAt(0).toUpperCase() + profile.user_role.slice(1)}
                </span>
              )}
            </div>
          </div>

          <div className="relative w-full mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search..."
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <nav className="space-y-1">
            <Link
              to="/dashboard"
              className="flex items-center px-3 py-2 rounded-md hover:bg-secondary"
              onClick={() => setShowMobileMenu(false)}
            >
              <span>🏠</span>
              <span className="ml-3">Dashboard</span>
            </Link>
            <Link
              to="/groups"
              className="flex items-center px-3 py-2 rounded-md hover:bg-secondary"
              onClick={() => setShowMobileMenu(false)}
            >
              <span>👥</span>
              <span className="ml-3">Groups</span>
            </Link>
            <Link
              to="/settings"
              className="flex items-center px-3 py-2 rounded-md hover:bg-secondary"
              onClick={() => setShowMobileMenu(false)}
            >
              <span>⚙️</span>
              <span className="ml-3">Settings</span>
            </Link>
            <button
              className="w-full flex items-center px-3 py-2 rounded-md hover:bg-secondary text-left"
              onClick={() => {
                signOut();
                setShowMobileMenu(false);
              }}
            >
              <span>🚪</span>
              <span className="ml-3">Sign Out</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;
