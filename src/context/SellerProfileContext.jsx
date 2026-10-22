import React, { createContext, useContext, useState, useEffect } from 'react';

const SellerProfileContext = createContext(null);
const STORAGE_KEY = 'veyra_seller_profiles';

export const SellerProfileProvider = ({ children }) => {
  const [profiles, setProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch {}
  }, [profiles]);

  const getSellerProfile = (sellerId) => {
    if (!sellerId) return null;
    return profiles[sellerId] || null;
  };

  const updateSellerProfile = (sellerId, fields) => {
    if (!sellerId) return;
    setProfiles(prev => ({
      ...prev,
      [sellerId]: {
        ...(prev[sellerId] || {}),
        ...fields,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  return (
    <SellerProfileContext.Provider value={{ getSellerProfile, updateSellerProfile }}>
      {children}
    </SellerProfileContext.Provider>
  );
};

export const useSellerProfile = () => {
  const ctx = useContext(SellerProfileContext);
  if (!ctx) throw new Error('useSellerProfile must be used within a SellerProfileProvider');
  return ctx;
};
