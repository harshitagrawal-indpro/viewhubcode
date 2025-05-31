
import * as React from "react"
import { Device } from "@capacitor/device"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [isNativeMobile, setIsNativeMobile] = React.useState<boolean>(false)

  // Check if we're running in a mobile browser or native app
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Check for native mobile platform using Capacitor
    const checkNativePlatform = async () => {
      try {
        if (typeof window !== 'undefined' && 'Capacitor' in window) {
          const info = await Device.getInfo()
          const isNative = info.platform !== 'web'
          setIsNativeMobile(isNative)
          console.log(`Platform check: ${info.platform}, native mobile: ${isNative}`)
          
          // If we're on native mobile, force isMobile to true regardless of screen size
          if (isNative) {
            setIsMobile(true)
          }
        }
      } catch (error) {
        console.error("Error checking native platform:", error)
      }
    }
    
    checkNativePlatform()
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Return a primitive boolean value for backward compatibility with existing code,
  // but also return the additional properties for new code
  return isMobile === undefined ? false : isMobile
}

// Expanded version of the hook with more properties
export function useIsMobileExtended() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [isNativeMobile, setIsNativeMobile] = React.useState<boolean>(false)

  // Check if we're running in a mobile browser or native app
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Check for native mobile platform using Capacitor
    const checkNativePlatform = async () => {
      try {
        if (typeof window !== 'undefined' && 'Capacitor' in window) {
          const info = await Device.getInfo()
          const isNative = info.platform !== 'web'
          setIsNativeMobile(isNative)
          console.log(`Platform check: ${info.platform}, native mobile: ${isNative}`)
          
          // If we're on native mobile, force isMobile to true regardless of screen size
          if (isNative) {
            setIsMobile(true)
          }
        }
      } catch (error) {
        console.error("Error checking native platform:", error)
      }
    }
    
    checkNativePlatform()
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return {
    isMobile: isMobile === undefined ? false : isMobile,
    isNativeMobile
  }
}
