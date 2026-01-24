'use client';
import React from 'react';
import { useVisitTracking } from '../hooks/useVisitTracking';

// Generic visit tracker component for all levels
const VisitTracker = ({ level, itemId, itemSlug, itemName }) => {
  console.log('VisitTracker component called with:', { level, itemId, itemSlug, itemName });
  
  const { isTracked, isBlocked, trackingStatus } = useVisitTracking(level, itemId, itemSlug);
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`${level.charAt(0).toUpperCase() + level.slice(1)} Page Visit Tracking:`, {
      itemName,
      itemId,
      isTracked,
      isBlocked,
      trackingStatus
    });
  }
  
  return null;
};

export default VisitTracker;
