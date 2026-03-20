'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

const IP_CHECK_KEY = 'visit_ip_check';
const IP_CHECK_TTL_MS = 5 * 60 * 1000; // 5 minutes – one check per session window

function getBasePath() {
  if (typeof window === 'undefined') return '/self-study';
  return (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BASE_PATH) || '/self-study';
}

function getCachedIpCheck() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(IP_CHECK_KEY);
    if (!raw) return null;
    const { isBlocked, ts } = JSON.parse(raw);
    if (Date.now() - ts > IP_CHECK_TTL_MS) return null;
    return { isBlocked: !!isBlocked };
  } catch {
    return null;
  }
}

function setCachedIpCheck(isBlocked) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(IP_CHECK_KEY, JSON.stringify({ isBlocked, ts: Date.now() }));
  } catch {}
}

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

export const useVisitTracking = (level, itemId, itemSlug) => {
  const [isTracked, setIsTracked] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState('idle'); // idle | checking | tracking | saved | blocked | error
  const [saveStatus, setSaveStatus] = useState(null); // { saved: boolean, at?: string } for instant feedback
  const didRunRef = useRef(false);
  const lastKeyRef = useRef('');

  // Reset run flag when page (level/itemId) changes so each URL is tracked
  const key = `${level}:${itemId}`;
  if (lastKeyRef.current !== key) {
    lastKeyRef.current = key;
    didRunRef.current = false;
  }

  const getSessionId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    let sessionId = sessionStorage.getItem('visit_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('visit_session_id', sessionId);
    }
    return sessionId;
  }, []);

  const getUserId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        return userData._id || userData.id || null;
      }
    } catch {}
    return null;
  }, []);

  // Paths where we never call analytics (no check-ip, no track-visit)
  const isNoTrackPath = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname || '';
    return /\/video-library(\/|$)/.test(path) || /\/blog(\/|$)/.test(path) || /\/download(\/|$)/.test(path);
  }, []);

  const trackVisit = useCallback(async () => {
    const id = itemId != null ? String(itemId) : '';
    if (!level || !id || isTracked) return;
    if (isNoTrackPath()) return; // no analytics on video-library, blog, download

    const BASE_PATH = getBasePath();
    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (isDev) {
      console.log('[VisitTracking] Page visit – URL:', pageUrl, '| level:', level, '| itemId:', id);
    }

    try {
      setTrackingStatus('checking');

      // One check-ip per session: use cache first
      let isBlocked = false;
      const cached = getCachedIpCheck();
      if (cached !== null) {
        isBlocked = cached.isBlocked;
      } else {
        try {
          const checkResponse = await fetch(`${BASE_PATH}/api/analytics/check-ip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          const checkData = await checkResponse.json().catch(() => ({}));
          if (checkResponse.ok && checkData && typeof checkData.isBlocked === 'boolean') {
            isBlocked = checkData.isBlocked;
            setCachedIpCheck(isBlocked);
          }
          // On non-ok or invalid response: fail open (isBlocked stays false)
        } catch {
          // Network or parse error: fail open so tracking can proceed
        }
      }

      if (isBlocked) {
        setIsBlocked(true);
        setTrackingStatus('blocked');
        setSaveStatus({ saved: false, reason: 'blocked' });
        if (isDev) console.log('[VisitTracking] Blocked – IP not allowed');
        return;
      }

      setTrackingStatus('tracking');

      const trackingData = {
        level,
        itemId: id,
        itemSlug: itemSlug != null ? String(itemSlug) : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer : 'direct',
        sessionId: getSessionId(),
        userId: getUserId(),
        metadata: {
          pageInfo: {
            url: pageUrl,
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

      const trackUrl = `${BASE_PATH}/api/analytics/track-visit`;
      if (isDev) console.log('[VisitTracking] POST', trackUrl, '→ level:', level, 'itemId:', id);

      const response = await fetch(trackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsTracked(true);
        setTrackingStatus('saved');
        setSaveStatus({ saved: true, at: new Date().toISOString() });
        if (isDev) {
          if (result.existing) {
            console.log('[VisitTracking] Same page already counted (same IP, last hour) – no new count');
          } else {
            console.log('[VisitTracking] Count increased – visit saved for', pageUrl);
          }
        }
      } else if (result.blocked) {
        setIsBlocked(true);
        setTrackingStatus('blocked');
        setSaveStatus({ saved: false, reason: 'blocked' });
        if (isDev) console.log('[VisitTracking] Blocked – IP not allowed');
      } else {
        setTrackingStatus('error');
        setSaveStatus({ saved: false, reason: result.message || 'tracking_failed' });
        if (isDev) console.log('[VisitTracking] Error –', response.status, result.message || result.error);
      }
    } catch (error) {
      setTrackingStatus('error');
      setSaveStatus({ saved: false, reason: 'network_error' });
      if (isDev) console.log('[VisitTracking] Network error –', error?.message || error);
    }
  }, [level, itemId, itemSlug, isTracked, getSessionId, getUserId, isNoTrackPath]);

  useEffect(() => {
    if (!level || !itemId || isTracked || didRunRef.current) return;
    didRunRef.current = true;

    let idleId = null;
    const runWhenIdle = () => {
      if (typeof requestIdleCallback !== 'undefined') {
        idleId = requestIdleCallback(() => trackVisit(), { timeout: 2000 });
      } else {
        idleId = setTimeout(trackVisit, 1200);
      }
    };

    const onLoad = () => runWhenIdle();

    if (typeof window !== 'undefined' && document.readyState === 'complete') {
      runWhenIdle();
    } else if (typeof window !== 'undefined') {
      window.addEventListener('load', onLoad, { once: true });
    } else {
      runWhenIdle();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('load', onLoad);
      }
      if (idleId != null) {
        if (typeof cancelIdleCallback !== 'undefined') {
          cancelIdleCallback(idleId);
        } else {
          clearTimeout(idleId);
        }
      }
    };
  }, [level, itemId, isTracked, trackVisit]);

  return {
    isTracked,
    isBlocked,
    trackingStatus,
    saveStatus,
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
          `${getBasePath()}/api/analytics/track-visit?level=${level}&itemId=${itemId}`
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
          `${getBasePath()}/api/analytics/track-visit?level=${level}&itemId=${itemId}`
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
