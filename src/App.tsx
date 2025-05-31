import { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/toaster";
import { checkAuthState, supabase } from "./integrations/supabase/client";

// Pages
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import CreateGroup from "./pages/CreateGroup";
import JoinGroup from "./pages/JoinGroup";
import CreateSchedule from "./pages/CreateSchedule";
import Monitoring from "./pages/Monitoring";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Conditional imports for Capacitor (only if available)
let Device: any = null;
let Network: any = null;
let LocalNotifications: any = null;
let BackgroundMonitoring: any = null;

// Safely import Capacitor modules
const initializeCapacitorModules = async () => {
  try {
    if (typeof window !== 'undefined' && 'Capacitor' in window) {
      const { Device: DeviceModule } = await import('@capacitor/device');
      const { Network: NetworkModule } = await import('@capacitor/network');
      const { LocalNotifications: NotificationsModule } = await import('@capacitor/local-notifications');
      
      Device = DeviceModule;
      Network = NetworkModule;
      LocalNotifications = NotificationsModule;
    }
  } catch (error) {
    console.warn("Capacitor modules not available:", error);
  }

  // Conditionally import BackgroundMonitoring
  try {
    const { BackgroundMonitoring: BGMonitoring } = await import("./services/BackgroundMonitoring");
    BackgroundMonitoring = BGMonitoring;
  } catch (error) {
    console.warn("BackgroundMonitoring service not available:", error);
  }
};

// Error Boundary Component
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              An error occurred while loading the application.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Toast provider component to avoid hook usage outside provider
function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

function AppContent() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<{id: string, name: string}[]>([]);
  const [isMobileApp, setIsMobileApp] = useState(false);
  const [backgroundMonitoringInitialized, setBackgroundMonitoringInitialized] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<boolean>(true);
  const [capacitorInitialized, setCapacitorInitialized] = useState(false);

  // Initialize Capacitor modules
  useEffect(() => {
    initializeCapacitorModules().then(() => {
      setCapacitorInitialized(true);
    });
  }, []);

  // Safe toast function that doesn't rely on hook
  const showToast = useCallback((title: string, description: string, variant: "default" | "destructive" = "default") => {
    console.log(`Toast: ${title} - ${description}`);
    // You can implement a custom toast solution here if needed
  }, []);

  // Initialize background monitoring with improved error handling
  const initializeBackgroundMonitoring = useCallback(async () => {
    if (!userId || userGroups.length === 0 || !BackgroundMonitoring) return false;
    
    try {
      console.log(`Setting up monitoring for user: ${userId}, is mobile app: ${isMobileApp}`);
      const backgroundMonitoring = BackgroundMonitoring.getInstance();
      await backgroundMonitoring.initialize(userId, userGroups);
      console.log("Monitoring initialized successfully");
      
      // Enhanced monitoring for real-time schedule checking
      if (backgroundMonitoring.isActive()) {
        // Start continuous monitoring that checks schedules every 30 seconds
        const intervalId = setInterval(async () => {
          try {
            await backgroundMonitoring.checkSchedules();
          } catch (error) {
            console.error("Error in schedule check interval:", error);
          }
        }, 30000);
        
        // Store interval ID for cleanup
        (window as any).scheduleCheckInterval = intervalId;
        
        showToast(
          "Monitoring Active",
          "Real-time usage monitoring is now active and will track usage during scheduled hours"
        );
      }
      
      return true;
    } catch (error) {
      console.error("Error setting up monitoring:", error);
      showToast(
        "Monitoring Error",
        "Failed to initialize background monitoring",
        "destructive"
      );
      return false;
    }
  }, [userId, userGroups, isMobileApp, showToast]);

  // Check if we're running as a mobile app
  useEffect(() => {
    if (!capacitorInitialized) return;

    const checkPlatform = async () => {
      try {
        // Check if Capacitor is available
        if (Device && typeof window !== 'undefined' && 'Capacitor' in window) {
          try {
            const info = await Device.getInfo();
            const isMobile = info.platform !== 'web';
            setIsMobileApp(isMobile);
            console.log(`Running on platform: ${info.platform}`);
            
            if (isMobile && LocalNotifications) {
              // Only request permissions if we're actually on mobile
              try {
                const { display } = await LocalNotifications.checkPermissions();
                if (display !== 'granted') {
                  await LocalNotifications.requestPermissions();
                }
              } catch (permissionError) {
                console.warn("Could not set up notifications:", permissionError);
                // Don't fail the entire app if notifications fail
              }
            }
          } catch (deviceError) {
            console.warn("Device info not available:", deviceError);
            setIsMobileApp(false);
          }
        } else {
          setIsMobileApp(false);
          console.log("Running in web browser");
          
          // Web-only service worker registration
          if ('serviceWorker' in navigator) {
            try {
              const registration = await navigator.serviceWorker.register('/monitoring-worker.js', {
                scope: '/'
              });
              console.log('Service worker registered:', registration.scope);
              
              // Enhanced web monitoring for screen activity
              let screenActiveTime = 0;
              let lastActivityTime = Date.now();
              
              const checkScreenActivity = () => {
                const now = Date.now();
                const timeDiff = now - lastActivityTime;
                
                if (timeDiff < 1000) { // User was active in the last second
                  screenActiveTime += timeDiff;
                  
                  // Check if screen has been active for more than 15 seconds
                  if (screenActiveTime > 15000 && BackgroundMonitoring) {
                    // Check if we're in a scheduled monitoring period
                    const monitoring = BackgroundMonitoring.getInstance();
                    monitoring.checkSchedules().catch((err: any) => {
                      console.error("Error checking schedules:", err);
                    });
                    screenActiveTime = 0; // Reset counter
                  }
                } else {
                  screenActiveTime = 0; // Reset if user was inactive
                }
                
                lastActivityTime = now;
              };
              
              // Monitor user activity
              const events = ['mousemove', 'keypress', 'click', 'scroll'];
              events.forEach(event => {
                document.addEventListener(event, checkScreenActivity, { passive: true });
              });
              
            } catch (swError) {
              console.warn('Service worker registration failed:', swError);
              // Don't fail the app if service worker fails
            }
          }
        }
      } catch (error) {
        console.error("Platform detection failed:", error);
        setIsMobileApp(false); // Safe fallback
      }
    };
    
    checkPlatform();
  }, [capacitorInitialized]);

  // Enhanced network status monitoring with automatic monitoring restart
  useEffect(() => {
    if (!capacitorInitialized || !Network) return;

    const setupNetworkMonitoring = async () => {
      try {
        // Get initial status
        const status = await Network.getStatus();
        setNetworkStatus(status.connected);
        
        // Add listener for changes
        const networkListener = Network.addListener('networkStatusChange', (status: any) => {
          console.log(`Network status changed: ${status.connected ? 'connected' : 'disconnected'}`);
          setNetworkStatus(status.connected);
          
          // Automatically restart monitoring when network reconnects
          if (status.connected && userId && userGroups.length > 0) {
            setTimeout(() => {
              initializeBackgroundMonitoring()
                .then(success => {
                  if (success) {
                    setBackgroundMonitoringInitialized(true);
                    showToast(
                      "Monitoring Resumed",
                      "Background monitoring resumed after network reconnection"
                    );
                  }
                })
                .catch(error => {
                  console.error("Error resuming monitoring:", error);
                });
            }, 2000); // Wait 2 seconds for connection to stabilize
          }
        });

        // Store listener for cleanup
        (window as any).networkListener = networkListener;
      } catch (error) {
        console.error("Error setting up network monitoring:", error);
        // Fallback to assuming connected
        setNetworkStatus(true);
      }
    };
    
    setupNetworkMonitoring();

    // Cleanup function
    return () => {
      if ((window as any).networkListener) {
        try {
          (window as any).networkListener.remove();
        } catch (error) {
          console.warn("Error removing network listener:", error);
        }
      }
    };
  }, [capacitorInitialized, userId, initializeBackgroundMonitoring, showToast, userGroups.length]);

  // Initialize authentication and user data
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { isAuthenticated, session } = await checkAuthState();
        setIsAuthenticated(isAuthenticated);
        
        if (session?.user) {
          const currentUserId = session.user.id;
          setUserId(currentUserId);
          console.log("User authenticated with ID:", currentUserId);
          
          // Get all user groups regardless of role for monitoring
          const { data, error } = await supabase
            .from('group_members')
            .select('group_id, groups:group_id(id, name)')
            .eq('user_id', currentUserId);
            
          if (error) {
            console.error("Error fetching user groups:", error);
          } else if (data) {
            const formattedGroups = data
              .filter(item => item.groups) // Filter out null groups
              .map(item => ({
                id: item.group_id,
                name: item.groups?.name || 'Unknown Group'
              }));
            console.log("User groups for monitoring:", formattedGroups);
            setUserGroups(formattedGroups);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setIsAuthenticated(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();

    // Listen for schedule changes and refresh monitoring
    const scheduleChannel = supabase
      .channel('schedules_changes')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public', 
          table: 'schedules'
        },
        async (payload: any) => {
          console.log('Schedule change detected:', payload);
          try {
            if (payload && payload.new && typeof payload.new === 'object' && BackgroundMonitoring) {
              const newData = payload.new as Record<string, any>;
              if ('group_id' in newData) {
                // Refresh background monitoring schedules immediately
                const monitoring = BackgroundMonitoring.getInstance();
                await monitoring.refreshSchedules();
                console.log("Schedules refreshed due to database change");
              }
            }
          } catch (error) {
            console.error("Error refreshing monitoring schedules:", error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scheduleChannel);
    };
  }, []);

  // Enhanced background monitoring initialization
  useEffect(() => {
    if (!userId || userGroups.length === 0 || backgroundMonitoringInitialized || !networkStatus || !capacitorInitialized) return;
    
    // Wait a bit for everything to settle before starting monitoring
    const timeoutId = setTimeout(() => {
      initializeBackgroundMonitoring()
        .then(success => {
          if (success) {
            setBackgroundMonitoringInitialized(true);
          }
        })
        .catch(error => {
          console.error("Error initializing background monitoring:", error);
        });
    }, 1000);
    
    return () => {
      clearTimeout(timeoutId);
      // Clean up when component unmounts or user changes
      if (backgroundMonitoringInitialized && BackgroundMonitoring) {
        try {
          const backgroundMonitoring = BackgroundMonitoring.getInstance();
          backgroundMonitoring.stop().catch((err: any) => {
            console.error("Error stopping monitoring:", err);
          });
        } catch (error) {
          console.warn("Error stopping background monitoring:", error);
        }
      }
      
      // Clean up intervals
      if ((window as any).scheduleCheckInterval) {
        clearInterval((window as any).scheduleCheckInterval);
      }
    };
  }, [userId, userGroups, networkStatus, backgroundMonitoringInitialized, initializeBackgroundMonitoring, capacitorInitialized]);

  // Enhanced auth state change listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`Auth state changed: ${event}`);
        if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          // Reset background monitoring on sign-in to ensure it's properly initialized
          setBackgroundMonitoringInitialized(false);
        } else if (event === 'SIGNED_OUT') {
          // Clean up monitoring on sign-out
          setBackgroundMonitoringInitialized(false);
          setUserId(null);
          setUserGroups([]);
        }
      }
    );
    
    // Setup enhanced periodic notifications for mobile
    let notificationInterval: number | null = null;
    
    if (isMobileApp && userId && backgroundMonitoringInitialized && LocalNotifications && BackgroundMonitoring) {
      notificationInterval = setInterval(async () => {
        try {
          // Check if monitoring is active before sending notification
          const monitoring = BackgroundMonitoring.getInstance();
          if (monitoring.isActive()) {
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: "ViewHub Monitoring Active",
                  body: "Background monitoring is tracking device usage during scheduled hours",
                  id: new Date().getTime(),
                  schedule: { at: new Date(Date.now() + 1000) },
                  sound: null,
                  attachments: null,
                  actionTypeId: "",
                  extra: null,
                },
              ],
            });
          }
        } catch (e) {
          console.error("Error sending periodic notification:", e);
        }
      }, 1800000) as unknown as number; // Every 30 minutes
    }
    
    // Enhanced service worker message handling
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller && BackgroundMonitoring) {
      const messageHandler = async (event: MessageEvent) => {
        if (event.data && event.data.type === 'MONITORING_PULSE' && userId) {
          console.log('Received monitoring pulse from service worker:', event.data);
          
          // Create usage records if we're authenticated and in a group
          if (userGroups.length > 0) {
            try {
              const backgroundMonitoring = BackgroundMonitoring.getInstance();
              await backgroundMonitoring.checkSchedules();
            } catch (error) {
              console.error("Error handling service worker message:", error);
            }
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', messageHandler);
      
      // Store handler for cleanup
      (window as any).serviceWorkerMessageHandler = messageHandler;
    }
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
      
      if (notificationInterval !== null) {
        clearInterval(notificationInterval);
      }

      if ((window as any).serviceWorkerMessageHandler) {
        try {
          navigator.serviceWorker?.removeEventListener('message', (window as any).serviceWorkerMessageHandler);
        } catch (error) {
          console.warn("Error removing service worker message handler:", error);
        }
      }
    };
  }, [userId, isMobileApp, userGroups, backgroundMonitoringInitialized]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={!isAuthenticated ? <Index /> : <Navigate to="/dashboard" />} />
            <Route path="/signin" element={!isAuthenticated ? <SignIn /> : <Navigate to="/dashboard" />} />
            <Route path="/user-type" element={!isAuthenticated ? <SignIn /> : <Navigate to="/dashboard" />} />
            
            <Route element={<ProtectedRoute />}>
              {/* Routes with Layout (sidebar navigation) */}
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/group/:id" element={<GroupDetails />} />
                <Route path="/monitoring" element={<Monitoring />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              
              {/* Routes without Layout (full page) */}
              <Route path="/create-group" element={<CreateGroup />} />
              <Route path="/join-group" element={<JoinGroup />} />
              <Route path="/create-schedule" element={<CreateSchedule />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;