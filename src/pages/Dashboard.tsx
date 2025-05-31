import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Users, UserPlus, Calendar } from "lucide-react";

const Dashboard = () => {
  const { user, profile, userGroups } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}, {profile?.full_name || user?.email?.split('@')[0] || "User"}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your activities and groups.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Groups Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">My Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userGroups.length}</div>
            <p className="text-xs text-muted-foreground">
              {userGroups.length === 0
                ? "You haven't joined any groups yet"
                : userGroups.length === 1
                ? "You're a member of 1 group"
                : `You're a member of ${userGroups.length} groups`}
            </p>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate("/groups")}
            >
              View Groups
            </Button>
          </CardContent>
        </Card>

        {/* Create Group Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Create Group</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-6">
              Create a new group to organize your team and activities
            </p>
            <Button
              className="w-full"
              onClick={() => navigate("/create-group")}
            >
              Create New Group
            </Button>
          </CardContent>
        </Card>

        {/* Schedule Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Schedules</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-6">
              Create and manage schedules for your groups
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/create-schedule")}
            >
              Create Schedule
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>Your recent actions and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {userGroups.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-2" />
                <h3 className="text-lg font-medium">No Recent Activity</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Join or create a group to get started
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => navigate("/create-group")}>
                    Create Group
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/join-group")}>
                    Join Group
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {userGroups.slice(0, 3).map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between border-b border-border pb-2"
                  >
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Group Code: {group.unique_code}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/group/${group.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
