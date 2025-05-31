import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QueryCache, MutationCache } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// Create separate cache instances for better error handling
const queryCache = new QueryCache({
  onError: (error, query) => {
    console.error('Query error:', error);
    console.error('Failed query:', query.queryKey);
  },
});

const mutationCache = new MutationCache({
  onError: (error, variables, context, mutation) => {
    console.error('Mutation error:', error);
    console.error('Failed mutation:', mutation.options.mutationKey);
  },
});

// Create a client with enhanced error handling
const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object') {
          // Check for HTTP status in various error formats
          const status = (error as any).status || 
                        (error as any).response?.status || 
                        ((error as any).message && (error as any).message.includes('4') ? 400 : null);
          
          if (status && status >= 400 && status < 500) {
            console.warn(`Not retrying client error (${status}):`, error);
            return false;
          }
          
          // Don't retry on network errors that are likely permanent
          if ((error as any).name === 'TypeError' && 
              (error as any).message?.includes('Failed to fetch')) {
            console.warn('Not retrying network fetch error:', error);
            return false;
          }
        }
        
        // Retry up to 2 times for other errors
        const shouldRetry = failureCount < 2;
        if (!shouldRetry) {
          console.warn(`Max retries (${failureCount}) reached for query:`, error);
        }
        return shouldRetry;
      },
      retryDelay: attemptIndex => {
        const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
        console.log(`Retrying query in ${delay}ms (attempt ${attemptIndex + 1})`);
        return delay;
      },
      // Add these for better error handling
      refetchOnWindowFocus: false, // Disable refetch on window focus to prevent unnecessary requests
      refetchOnReconnect: true, // Refetch when network reconnects
      networkMode: 'online', // Only run queries when online
    },
    mutations: {
      retry: false, // Don't retry mutations by default
      networkMode: 'online', // Only run mutations when online
    },
  },
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior (logging to console)
  event.preventDefault();
});

// Safe root element access
const rootElement = document.getElementById("root");

if (!rootElement) {
  // Create a more informative error message
  const errorMessage = 'Root element not found. Make sure there is an element with id="root" in your HTML.';
  console.error(errorMessage);
  
  // Try to create a fallback error display
  document.body.innerHTML = `
    <div style="
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      font-family: Arial, sans-serif;
      background: #f5f5f5;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    ">
      <div style="
        background: white; 
        padding: 2rem; 
        border-radius: 8px; 
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        text-align: center;
        max-width: 500px;
      ">
        <h1 style="color: #dc2626; margin-bottom: 1rem;">Application Error</h1>
        <p style="color: #666; margin-bottom: 1rem;">${errorMessage}</p>
        <button onclick="window.location.reload()" style="
          background: #3b82f6; 
          color: white; 
          border: none; 
          padding: 0.5rem 1rem; 
          border-radius: 4px; 
          cursor: pointer;
        ">
          Reload Page
        </button>
      </div>
    </div>
  `;
  
  throw new Error(errorMessage);
}

// Enhanced error boundary for React rendering errors
const renderApp = () => {
  try {
    const root = createRoot(rootElement);
    
    root.render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    
    console.log('Application rendered successfully');
  } catch (error) {
    console.error('Failed to render application:', error);
    
    // Fallback rendering
    rootElement.innerHTML = `
      <div style="
        display: flex; 
        justify-content: center; 
        align-items: center; 
        height: 100vh; 
        font-family: Arial, sans-serif;
        background: #f5f5f5;
        margin: 0;
        padding: 20px;
        box-sizing: border-box;
      ">
        <div style="
          background: white; 
          padding: 2rem; 
          border-radius: 8px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 500px;
        ">
          <h1 style="color: #dc2626; margin-bottom: 1rem;">Rendering Error</h1>
          <p style="color: #666; margin-bottom: 1rem;">Failed to load the application. Please try refreshing the page.</p>
          <p style="color: #999; font-size: 0.875rem; margin-bottom: 1rem;">Error: ${(error as Error).message}</p>
          <button onclick="window.location.reload()" style="
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 0.5rem 1rem; 
            border-radius: 4px; 
            cursor: pointer;
          ">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
};

// Add DOM ready check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}