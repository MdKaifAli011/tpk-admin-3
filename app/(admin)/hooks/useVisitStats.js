import { useState, useEffect } from 'react';

// Base path for API calls
const BASE_PATH = '/self-study';

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
          
          // Debug logging in development
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

// Hook for fetching multiple visit stats at once
export const useMultipleVisitStats = (items, level) => {
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!items || items.length === 0 || !level) return;

    const fetchMultipleStats = async () => {
      try {
        setLoading(true);
        setErrors({});
        
        const statsPromises = items.map(async (item) => {
          try {
            const response = await fetch(
              `${BASE_PATH}/api/analytics/track-visit?level=${level}&itemId=${item._id || item.id}`
            );

            if (!response.ok) {
              throw new Error(`Failed to fetch stats for ${item.name}`);
            }

            const result = await response.json();
            return {
              itemId: item._id || item.id,
              stats: result.success ? result.data : null,
              error: result.success ? null : result.error
            };
          } catch (err) {
            console.error(`Failed to fetch stats for ${item.name}:`, err);
            return {
              itemId: item._id || item.id,
              stats: null,
              error: err.message
            };
          }
        });

        const results = await Promise.all(statsPromises);
        
        // Create stats map
        const newStatsMap = {};
        results.forEach(result => {
          if (result.stats) {
            newStatsMap[result.itemId] = result.stats;
          }
        });
        
        setStatsMap(newStatsMap);
        
        // Debug logging in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Multiple visit stats fetched for ${level}:`, {
            totalItems: items.length,
            successfulFetches: results.filter(r => r.stats).length,
            statsMap: newStatsMap
          });
        }

      } catch (err) {
        console.error('Error fetching multiple visit stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMultipleStats();
  }, [items, level]);

  return { statsMap, loading, errors };
};

export default useVisitStats;
