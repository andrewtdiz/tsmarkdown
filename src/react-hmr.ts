import { useEffect, useRef, useState, useCallback } from 'react';
import { HMRUpdate } from './hmr';

export interface HMROptions {
  enabled?: boolean;
  debounceMs?: number;
  onUpdate?: (update: HMRUpdate) => void;
  onError?: (error: string) => void;
}

/**
 * React hook for integrating with Better-MDX Hot Module Replacement
 */
export function useBetterMDXHMR(filePath?: string, options: HMROptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<HMRUpdate | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const {
    enabled = process.env.NODE_ENV === 'development',
    debounceMs = 100,
    onUpdate,
    onError
  } = options;

  const handleUpdate = useCallback((update: HMRUpdate) => {
    // If filePath is specified, only handle updates for that specific file
    if (filePath && update.file !== filePath) {
      return;
    }

    setLastUpdate(update);

    switch (update.type) {
      case 'mdx-update':
        setErrors([]); // Clear errors on successful update
        onUpdate?.(update);
        break;
      case 'mdx-error':
        const errorMessage = update.error || 'Unknown compilation error';
        setErrors(prev => [...prev, errorMessage]);
        onError?.(errorMessage);
        break;
      case 'mdx-reload':
        // Full page reload requested
        window.location.reload();
        break;
    }
  }, [filePath, onUpdate, onError]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    // Wait for the HMR client to be available
    const checkHMRClient = () => {
      if (window.__BETTER_MDX_HMR__) {
        setIsConnected(true);

        // Subscribe to HMR updates
        const unsubscribe = window.__BETTER_MDX_HMR__.subscribe(handleUpdate);
        unsubscribeRef.current = unsubscribe;

        return true;
      }
      return false;
    };

    // Check immediately
    if (!checkHMRClient()) {
      // If not available, check periodically
      const interval = setInterval(() => {
        if (checkHMRClient()) {
          clearInterval(interval);
        }
      }, 100);

      // Clean up interval after 10 seconds if still not available
      setTimeout(() => clearInterval(interval), 10000);

      return () => clearInterval(interval);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [enabled, handleUpdate]);

  // Clean up subscription when component unmounts
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    isConnected,
    lastUpdate,
    errors,
    clearErrors: () => setErrors([])
  };
}

/**
 * React component that displays HMR status and errors
 */
export function BetterMDXHMRStatus({
  className = '',
  showWhenConnected = false,
  position = 'bottom-right' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}) {
  const { isConnected, errors } = useBetterMDXHMR();

  if (!isConnected && !errors.length) {
    return null;
  }

  const positionStyles = {
    'top-left': { top: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' }
  };

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 10000,
        fontFamily: 'monospace',
        fontSize: '12px',
        maxWidth: '300px'
      }}
    >
      {/* Connection Status */}
      {(isConnected && showWhenConnected) && (
        <div
          style={{
            background: '#28a745',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            marginBottom: errors.length > 0 ? '8px' : '0'
          }}
        >
          🔥 HMR Connected
        </div>
      )}

      {/* Error Display */}
      {errors.map((error, index) => (
        <div
          key={index}
          style={{
            background: '#dc3545',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            marginBottom: index < errors.length - 1 ? '8px' : '0',
            wordBreak: 'break-word'
          }}
        >
          <strong>HMR Error:</strong>
          <br />
          {error}
        </div>
      ))}
    </div>
  );
}

/**
 * Enhanced useMDXComponent hook that supports HMR
 */
export function useMDXComponentWithHMR(
  filePath: string,
  initialCompiled?: any,
  context: Record<string, any> = {}
) {
  const [compiled, setCompiled] = useState(initialCompiled);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use HMR hook for this specific file
  const { lastUpdate, errors } = useBetterMDXHMR(filePath, {
    onUpdate: (update) => {
      if (update.type === 'mdx-update' && update.compiled) {
        setCompiled(update.compiled);
        setError(null);
      }
    },
    onError: (errorMsg) => {
      setError(errorMsg);
    }
  });

  // Update content when compiled data changes
  useEffect(() => {
    if (!compiled) return;

    setIsLoading(true);

    try {
      // This would typically use the TemplateExecutionEngine
      // For now, we'll simulate the rendering
      const mockEngine = {
        execute: (compiledData: any, ctx: any) => ({
          content: compiledData.template || 'No content available',
          errors: []
        })
      };

      const result = mockEngine.execute(compiled, context);
      setContent(result.content);
      setError(result.errors.length > 0 ? result.errors.join(', ') : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [compiled, context]);

  return {
    content,
    isLoading,
    error: error || (errors.length > 0 ? errors[0] : null),
    compiled,
    lastUpdate
  };
}

/**
 * Higher-order component that adds HMR support to any component
 */
export function withBetterMDXHMR<P extends object>(
  Component: React.ComponentType<P>,
  filePath?: string
) {
  return function BetterMDXHMRWrapper(props: P) {
    const { isConnected, lastUpdate, errors } = useBetterMDXHMR(filePath);

    return (
      <>
        <Component {...props} />
        {process.env.NODE_ENV === 'development' && (
          <BetterMDXHMRStatus
            showWhenConnected={false}
          />
        )}
      </>
    );
  };
}

/**
 * Utility to manually trigger HMR refresh for a specific file
 */
export function refreshMDXFile(filePath: string) {
  if (typeof window !== 'undefined' && window.__BETTER_MDX_HMR__) {
    // Simulate an update for the specific file
    const update: HMRUpdate = {
      type: 'mdx-reload',
      file: filePath,
      timestamp: Date.now()
    };

    window.__BETTER_MDX_HMR__.notifyUpdate(update);
  }
}

/**
 * Dev tools component for HMR debugging
 */
export function BetterMDXHMRDevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [updates, setUpdates] = useState<HMRUpdate[]>([]);
  const { isConnected } = useBetterMDXHMR('', {
    onUpdate: (update) => {
      setUpdates(prev => [...prev.slice(-9), update]); // Keep last 10 updates
    }
  });

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 10001,
          background: isConnected ? '#28a745' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          fontSize: '18px',
          cursor: 'pointer'
        }}
        title="Better-MDX HMR Dev Tools"
      >
        🔥
      </button>

      {/* Dev Tools Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '70px',
            left: '20px',
            width: '400px',
            maxHeight: '300px',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 10000,
            overflow: 'hidden',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}
        >
          {/* Header */}
          <div
            style={{
              background: '#f8f9fa',
              padding: '8px 12px',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>Better-MDX HMR Dev Tools</span>
            <span
              style={{
                color: isConnected ? '#28a745' : '#dc3545',
                fontWeight: 'bold'
              }}
            >
              {isConnected ? '● Connected' : '● Disconnected'}
            </span>
          </div>

          {/* Updates List */}
          <div
            style={{
              maxHeight: '240px',
              overflow: 'auto',
              padding: '8px'
            }}
          >
            {updates.length === 0 ? (
              <div style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
                No updates yet
              </div>
            ) : (
              updates.map((update, index) => (
                <div
                  key={index}
                  style={{
                    padding: '4px 8px',
                    marginBottom: '4px',
                    background:
                      update.type === 'mdx-error' ? '#f8d7da' :
                      update.type === 'mdx-update' ? '#d4edda' :
                      '#fff3cd',
                    borderRadius: '4px',
                    border: '1px solid ' + (
                      update.type === 'mdx-error' ? '#f5c6cb' :
                      update.type === 'mdx-update' ? '#c3e6cb' :
                      '#ffeaa7'
                    )
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    {update.type} - {update.file}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '10px' }}>
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </div>
                  {update.error && (
                    <div style={{ color: '#721c24', marginTop: '2px' }}>
                      {update.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Type declarations for global HMR API
declare global {
  interface Window {
    __BETTER_MDX_HMR__?: {
      subscribers: Set<(update: HMRUpdate) => void>;
      notifyUpdate: (update: HMRUpdate) => void;
      subscribe: (callback: (update: HMRUpdate) => void) => () => void;
    };
  }
}