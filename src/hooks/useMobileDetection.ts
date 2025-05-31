
import { useState, useEffect } from "react";
import { Device } from "@capacitor/device";
import { App } from "@capacitor/app";
import { useToast } from "../components/ui/use-toast";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Network } from "@capacitor/network";

export function useMobileDetection(groupId: string | null) {
  const [isMobileApp, setIsMobileApp] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [screenIsOn, setScreenIsOn] = useState(true); // Default to true for web
  const [hasInternetConnection, setHasInternetConnection] = useState(true); // Default to true for web
  const { toast } = useToast();

  // Check if the device is a mobile device
  const checkPlatform = async () => {
    try {
      // Check if we're in a Capacitor environment
      if (typeof window !== 'undefined' && 'Capacitor' in window) {
        const info = await Device.getInfo();
        const isMobile = info.platform !== 'web';
        setIsMobileApp(isMobile);
        console.log(`Running on platform: ${info.platform}, isMobileApp: ${isMobile}`);
        
        // Ensure we start monitoring immediately on mobile
        if (isMobile && !isInitialized) {
          setupMobileNotifications();
          setIsInitialized(true);
        }
      } else {
        setIsMobileApp(false);
      }
    } catch (error) {
      console.error("Error checking platform:", error);
      setIsMobileApp(false);
      
      // Retry platform detection after a delay
      setTimeout(() => {
        console.log("Retrying platform detection");
        checkPlatform();
      }, 3000);
    }
  };

  // Set up mobile notifications
  const setupMobileNotifications = async () => {
    if (!isMobileApp) return;
    
    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
      
      // Schedule multiple background notifications to ensure the app stays active
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "ViewHub Monitoring Active",
            body: "Your device usage is being tracked",
            id: 99,
            schedule: { at: new Date(Date.now() + 1000), every: 'minute', count: 60 },
            sound: null,
            attachments: null,
            actionTypeId: "",
            extra: null
          },
          {
            title: "ViewHub Background Service",
            body: "Continuous device monitoring is active",
            id: 100,
            schedule: { at: new Date(Date.now() + 30000), every: 'hour', count: 24 },
            sound: null,
            attachments: null,
            actionTypeId: "",
            extra: null
          },
          // Add additional persistent notification
          {
            title: "ViewHub",
            body: "Screen monitoring active",
            id: 101,
            ongoing: true, // Make notification persistent on Android
            schedule: { at: new Date(Date.now() + 5000) },
            sound: null,
            attachments: null,
            actionTypeId: "",
            extra: null
          }
        ]
      });
      
      toast({
        title: "Background Monitoring Active",
        description: "Your device usage is now being monitored in the background",
      });
      
      setMonitoringActive(true);
    } catch (error) {
      console.error("Error setting up mobile notifications:", error);
      
      // Retry notification setup
      setTimeout(() => {
        console.log("Retrying notification setup");
        setupMobileNotifications();
      }, 5000);
    }
  };

  // Monitor device screen state and network connection
  const setupDeviceMonitoring = async () => {
    if (!isMobileApp) return;
    
    try {
      if (typeof window !== 'undefined' && 'Capacitor' in window) {
        // Set up screen state monitoring
        App.addListener('appStateChange', ({ isActive }) => {
          console.log(`App is ${isActive ? 'active' : 'inactive'}`);
          setScreenIsOn(isActive);
        });
        
        // Set up network status monitoring
        Network.addListener('networkStatusChange', (status) => {
          console.log('Network status changed:', status.connected);
          setHasInternetConnection(status.connected);
        });
        
        // Get initial network status
        const initialStatus = await Network.getStatus();
        setHasInternetConnection(initialStatus.connected);
        
        // Request battery optimization exemption for more reliable background operation
        try {
          if ('requestIgnoreBatteryOptimizations' in App) {
            await (App as any).requestIgnoreBatteryOptimizations();
            console.log("Requested battery optimization exemption");
          }
        } catch (e) {
          console.log("Battery optimization request not available:", e);
        }
      }
    } catch (e) {
      console.log("Error setting up device monitoring:", e);
      
      // Retry after delay
      setTimeout(() => {
        setupDeviceMonitoring();
      }, 5000);
    }
  };

  // Check platform on mount
  useEffect(() => {
    checkPlatform();
  }, []);

  // Initialize mobile notifications when platform is detected
  useEffect(() => {
    if (isMobileApp && !isInitialized) {
      setupMobileNotifications();
      setupDeviceMonitoring();
      setIsInitialized(true);
    }
  }, [isMobileApp, isInitialized]);

  // Setup mobile state tracking when groupId changes
  useEffect(() => {
    if (groupId && isMobileApp) {
      setupDeviceMonitoring();
      
      // Refresh monitoring state every minute
      const refreshInterval = setInterval(() => {
        console.log("Periodic monitoring refresh");
        if (!monitoringActive && isMobileApp) {
          setupMobileNotifications();
        }
      }, 60000);
      
      return () => clearInterval(refreshInterval);
    }
  }, [groupId, isMobileApp, monitoringActive]);

  return {
    isMobileApp,
    monitoringActive,
    screenIsOn,
    hasInternetConnection,
    setupMobileNotifications
  };
}
