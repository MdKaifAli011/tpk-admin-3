'use client';
import { useEffect, useState, useCallback } from 'react';

// Base path for API calls
const BASE_PATH = '/self-study';

export const useVisitTracking = (level, itemId, itemSlug) => {
  console.log('🔥 useVisitTracking HOOK CALLED with:', { level, itemId, itemSlug });
  
  const [isTracked, setIsTracked] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState('idle');

  // Helper function to get/create session ID
  const getSessionId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    let sessionId = sessionStorage.getItem('visit_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('visit_session_id', sessionId);
    }
    return sessionId;
  }, []);

  // Helper function to get user ID
  const getUserId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        return userData._id || userData.id || null;
      }
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
    return null;
  }, []);

  // Track visit function
  const trackVisit = useCallback(async () => {
    if (!level || !itemId || isTracked) {
      console.log('Track visit skipped:', { level, itemId, isTracked });
      return;
    }

    try {
      console.log('Starting visit tracking for:', { level, itemId, itemSlug });
      setTrackingStatus('checking');

      // Check if IP is blocked
      const checkResponse = await fetch(`${BASE_PATH}/api/analytics/check-ip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!checkResponse.ok) {
        console.error('IP check failed:', checkResponse.status);
        // Continue with tracking even if IP check fails
      } else {
        const checkData = await checkResponse.json();
        
        if (checkData.isBlocked) {
          setIsBlocked(true);
          setTrackingStatus('blocked');
          console.log('Visit tracking blocked for IP:', checkData.ipAddress);
          return;
        }
      }

      // Proceed with visit tracking
      setTrackingStatus('tracking');

      const trackingData = {
        level,
        itemId,
        itemSlug,
        referrer: typeof document !== 'undefined' ? document.referrer : 'direct',
        sessionId: getSessionId(),
        userId: getUserId(),
        metadata: {
          pageInfo: {
            url: typeof window !== 'undefined' ? window.location.href : '',
            title: typeof document !== 'undefined' ? document.title : '',
            referrer: typeof document !== 'undefined' ? document.referrer : '',
            timestamp: new Date().toISOString()
          },
          browser: typeof navigator !== 'undefined' ? {
            language: navigator.language,
            platform: navigator.platform,
            userAgent: navigator.userAgent.substring(0, 500)
          } : {}
        }
      };

      const response = await fetch(`${BASE_PATH}/api/analytics/track-visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingData)
      });

      if (!response.ok) {
        throw new Error('Failed to track visit');
      }

      const result = await response.json();
      
      if (result.success) {
        setIsTracked(true);
        setTrackingStatus('tracking');
        
        console.log('Visit tracked successfully:', {
          level,
          itemId,
          itemSlug,
          result
        });
      } else {
        setTrackingStatus('error');
        console.error('Visit tracking failed:', result.message);
      }

    } catch (error) {
      setTrackingStatus('error');
      console.error('Error tracking visit:', error);
    }
  }, [level, itemId, itemSlug, isTracked, getSessionId, getUserId]);

  useEffect(() => {
    console.log('useVisitTracking useEffect called:', { level, itemId, isTracked, trackingStatus });
    
    if (!level || !itemId || isTracked) {
      console.log('useVisitTracking early return:', { level, itemId, isTracked });
      return;
    }

    console.log('useVisitTracking proceeding with trackVisit');

    // Add small delay to avoid immediate tracking on page load
    const timeoutId = setTimeout(trackVisit, 1000);

    return () => clearTimeout(timeoutId);
  }, [level, itemId, isTracked, trackVisit, trackingStatus]);

  return { 
    isTracked, 
    isBlocked, 
    trackingStatus,
    sessionId: getSessionId()
  };
};

// Hook for getting visit statistics
export const useVisitStats = (level, itemId) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!level || !itemId) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${BASE_PATH}/api/analytics/track-visit?level=${level}&itemId=${itemId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch visit statistics');
        }

        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`Visit stats fetched for ${level} ${itemId}:`, result.data);
          }
        } else {
          setError(result.error);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [level, itemId]);

  return { stats, loading, error };
};

// Hook for real-time visit updates
export const useRealtimeVisits = (level, itemId) => {
  const [realtimeStats, setRealtimeStats] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!level || !itemId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${BASE_PATH}/api/analytics/track-visit?level=${level}&itemId=${itemId}`
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setRealtimeStats(result.data);
            setIsConnected(true);
          }
        }
      } catch (error) {
        console.error('Real-time visit update failed:', error);
        setIsConnected(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [level, itemId]);

  return { realtimeStats, isConnected };
};

export default useVisitTracking;
