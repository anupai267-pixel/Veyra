import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';

const FollowContext = createContext(null);
const FOLLOW_STORAGE_KEY = 'veyra_followed_sellers';

export const FollowProvider = ({ children }) => {
  const { addToast } = useToast();

  const [followedSellers, setFollowedSellers] = useState(() => {
    try {
      const saved = localStorage.getItem(FOLLOW_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FOLLOW_STORAGE_KEY, JSON.stringify(followedSellers));
    } catch (e) {
      console.warn('Failed to persist followed sellers', e);
    }
  }, [followedSellers]);

  const isFollowing = (sellerId) => followedSellers.includes(sellerId);

  const toggleFollow = (sellerId, sellerName) => {
    if (isFollowing(sellerId)) {
      setFollowedSellers(prev => prev.filter(id => id !== sellerId));
      addToast(`Unfollowed ${sellerName}.`);
    } else {
      setFollowedSellers(prev => [...prev, sellerId]);
      addToast(`Now following ${sellerName}.`);
    }
  };

  return (
    <FollowContext.Provider
      value={{
        followedSellers,
        isFollowing,
        toggleFollow,
        followCount: followedSellers.length
      }}
    >
      {children}
    </FollowContext.Provider>
  );
};

export const useFollow = () => {
  const context = useContext(FollowContext);
  if (!context) throw new Error('useFollow must be used within a FollowProvider');
  return context;
};
