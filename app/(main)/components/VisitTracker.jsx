'use client';
import React from 'react';
import { useVisitTracking } from '../hooks/useVisitTracking';

// Generic visit tracker – one check-ip per session (cached 5 min), then track-visit per page
const VisitTracker = ({ level, itemId, itemSlug }) => {
  const { isTracked, isBlocked, trackingStatus, saveStatus } = useVisitTracking(level, itemId, itemSlug);
  return null;
};

export default VisitTracker;
