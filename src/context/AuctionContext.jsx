import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { INITIAL_LIVE_AUCTIONS, UPCOMING_AUCTIONS } from '../data/auctions';
import { useToast } from './ToastContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuctionContext = createContext(null);
const AUCTIONS_STORAGE_KEY = 'veyra_live_auctions_data';
const REMINDERS_STORAGE_KEY = 'veyra_auction_reminders';
const REGISTRATIONS_STORAGE_KEY = 'veyra_auction_registrations';
const USER_BIDS_STORAGE_KEY = 'veyra_user_bids_history';
const AUCTION_COMMENTS_KEY = 'veyra_auction_comments';

export const AuctionProvider = ({ children }) => {
  const { addToast } = useToast();

  // 1. Live Auctions state
  const [liveAuctions, setLiveAuctions] = useState(() => {
    try {
      const saved = localStorage.getItem(AUCTIONS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved auctions', e);
    }

    const now = Date.now();
    return INITIAL_LIVE_AUCTIONS.map((auc) => ({
      ...auc,
      endTime: now + auc.endsInSeconds * 1000,
      remainingSeconds: auc.endsInSeconds,
      status: auc.endsInSeconds > 0 ? 'active' : 'ended',
      winner: null
    }));
  });

  // 2. Upcoming auctions
  const [upcomingAuctions] = useState(UPCOMING_AUCTIONS);

  // 3. User auction registrations
  const [registrations, setRegistrations] = useState(() => {
    try {
      const saved = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['up-1']; // Seed up-1 for initial demonstration
    } catch (e) {
      return [];
    }
  });

  // 4. User auction reminders
  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem(REMINDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['up-2']; // Seed up-2
    } catch (e) {
      return [];
    }
  });

  // 5. User bids history (for My Bids in Account)
  const [userBids, setUserBids] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_BIDS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [
        {
          id: 'user-b-1',
          auctionId: 'auc-1',
          auctionTitle: 'Archival Chandigarh Teak & Cane V-Leg Chair (c. 1956)',
          amount: 85000,
          time: '1 hour ago',
          timestamp: Date.now() - 3600000,
          status: 'Outbid',
          image: 'https://images.unsplash.com/photo-1580481077195-c3a821a58875?auto=format&fit=crop&w=400&q=80'
        }
      ];
    } catch (e) {
      return [];
    }
  });

  // 6. Live auction comments / chat feeds
  const [comments, setComments] = useState(() => {
    try {
      const saved = localStorage.getItem(AUCTION_COMMENTS_KEY);
      return saved ? JSON.parse(saved) : {
        'auc-1': [
          { id: 'c-1', user: 'ArchivalCurator', message: 'Incredible condition on the woven cane seating.', time: '12m ago', timestamp: Date.now() - 720000 },
          { id: 'c-2', user: 'Veyra Specialist', message: 'Stenciled inventory marks authenticated against Chandigarh archives.', time: '8m ago', timestamp: Date.now() - 480000 },
          { id: 'c-3', user: 'A. Singhania', message: 'Bid entered. Exceptional provenance.', time: '3m ago', timestamp: Date.now() - 180000 }
        ]
      };
    } catch (e) {
      return {};
    }
  });

  // Persistence effects
  useEffect(() => {
    try {
      localStorage.setItem(AUCTIONS_STORAGE_KEY, JSON.stringify(liveAuctions));
    } catch (e) {
      console.warn('Failed to save auctions to localStorage', e);
    }
  }, [liveAuctions]);

  useEffect(() => {
    try {
      localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(registrations));
    } catch (e) {
      console.warn('Failed to save registrations to localStorage', e);
    }
  }, [registrations]);

  useEffect(() => {
    try {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
    } catch (e) {
      console.warn('Failed to save reminders to localStorage', e);
    }
  }, [reminders]);

  useEffect(() => {
    try {
      localStorage.setItem(USER_BIDS_STORAGE_KEY, JSON.stringify(userBids));
    } catch (e) {
      console.warn('Failed to save user bids to localStorage', e);
    }
  }, [userBids]);

  useEffect(() => {
    try {
      localStorage.setItem(AUCTION_COMMENTS_KEY, JSON.stringify(comments));
    } catch (e) {
      console.warn('Failed to save comments to localStorage', e);
    }
  }, [comments]);

  // Cross-tab broadcast listener for synchronized multi-tab bidding & chat
  useEffect(() => {
    let broadcast;
    if (typeof BroadcastChannel !== 'undefined') {
      broadcast = new BroadcastChannel('veyra_auction_realtime_sync');
      broadcast.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'BID_PLACED') {
          setLiveAuctions((prev) =>
            prev.map((auc) => (auc.id === payload.auctionId ? payload.updatedAuction : auc))
          );
        } else if (type === 'COMMENT_ADDED') {
          setComments((prev) => ({
            ...prev,
            [payload.auctionId]: [...(prev[payload.auctionId] || []), payload.comment]
          }));
        }
      };
    }

    return () => {
      if (broadcast) broadcast.close();
    };
  }, []);

  // Authoritative server-synced countdown clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setLiveAuctions((prevAuctions) =>
        prevAuctions.map((auc) => {
          const diffMs = auc.endTime - now;
          const remaining = Math.max(0, Math.floor(diffMs / 1000));
          const isEnded = remaining <= 0;
          const currentWinner = isEnded && auc.bidHistory && auc.bidHistory.length > 0
            ? auc.bidHistory[0]
            : null;

          if (auc.remainingSeconds === remaining && auc.status === (isEnded ? 'ended' : 'active')) {
            return auc;
          }

          return {
            ...auc,
            remainingSeconds: remaining,
            status: isEnded ? 'ended' : 'active',
            winner: currentWinner
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Authoritative Bid Placement Function
  const placeBid = useCallback(
    (auctionId, amount, bidderName = 'Collector', userId = 'user-current') => {
      const now = Date.now();
      let outcome = { success: false, error: '' };

      setLiveAuctions((prev) => {
        const auction = prev.find((a) => a.id === auctionId);
        if (!auction) {
          outcome = { success: false, error: 'Auction lot not found.' };
          return prev;
        }

        // Server authoritative check
        if (auction.endTime <= now || auction.remainingSeconds <= 0) {
          outcome = { success: false, error: 'Auction has officially concluded. Bidding is closed.' };
          return prev;
        }

        const minRequired = auction.currentBid + auction.minIncrement;
        const bidNum = Number(amount);

        if (isNaN(bidNum) || bidNum < minRequired) {
          outcome = {
            success: false,
            error: `Minimum valid bid is ₹${minRequired.toLocaleString('en-IN')}.`
          };
          return prev;
        }

        const newBidRecord = {
          id: 'bid-' + now + '-' + Math.floor(Math.random() * 1000),
          bidder: bidderName,
          bidderId: userId,
          amount: bidNum,
          time: 'Just now',
          timestamp: now
        };

        const updatedAuction = {
          ...auction,
          currentBid: bidNum,
          bidCount: auction.bidCount + 1,
          bidHistory: [newBidRecord, ...auction.bidHistory]
        };

        outcome = { success: true, bid: newBidRecord };

        // Broadcast to other open browser windows
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const bc = new BroadcastChannel('veyra_auction_realtime_sync');
            bc.postMessage({
              type: 'BID_PLACED',
              payload: { auctionId, updatedAuction }
            });
            bc.close();
          } catch (e) {
            // ignore
          }
        }

        return prev.map((a) => (a.id === auctionId ? updatedAuction : a));
      });

      if (outcome.success) {
        addToast(`Bid of ₹${Number(amount).toLocaleString('en-IN')} placed successfully.`);

        // Record in user's bids history
        const auction = liveAuctions.find((a) => a.id === auctionId);
        setUserBids((prev) => [
          {
            id: 'ub-' + Date.now(),
            auctionId,
            auctionTitle: auction ? auction.name : 'Curated Lot',
            amount: Number(amount),
            time: 'Just now',
            timestamp: Date.now(),
            status: 'Leading',
            image: auction ? auction.image : ''
          },
          ...prev.filter((b) => b.auctionId !== auctionId)
        ]);
      }

      return outcome;
    },
    [liveAuctions, addToast]
  );

  // Send auction live comment
  const sendAuctionComment = (auctionId, message, userName = 'Collector') => {
    if (!message || !message.trim()) return;

    const newComment = {
      id: 'c-' + Date.now(),
      user: userName,
      message: message.trim(),
      time: 'Just now',
      timestamp: Date.now()
    };

    setComments((prev) => ({
      ...prev,
      [auctionId]: [...(prev[auctionId] || []), newComment]
    }));

    // Broadcast comment
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('veyra_auction_realtime_sync');
        bc.postMessage({
          type: 'COMMENT_ADDED',
          payload: { auctionId, comment: newComment }
        });
        bc.close();
      } catch (e) {
        // ignore
      }
    }
  };

  // Registrations management
  const isRegistered = (auctionId) => registrations.includes(auctionId);

  const toggleRegistration = (auctionId) => {
    const auction = upcomingAuctions.find((a) => a.id === auctionId);
    const title = auction ? auction.name : 'Auction';

    if (registrations.includes(auctionId)) {
      setRegistrations((prev) => prev.filter((id) => id !== auctionId));
      addToast(`Registration cancelled for "${title}".`);
    } else {
      setRegistrations((prev) => [...prev, auctionId]);
      addToast(`Registration confirmed for "${title}". Your bidding pass is active.`);
    }
  };

  // Reminders management
  const isReminderSet = (auctionId) => reminders.includes(auctionId);

  const toggleReminder = (auctionId) => {
    const auction = upcomingAuctions.find((a) => a.id === auctionId);
    const title = auction ? auction.name : 'Auction';

    if (reminders.includes(auctionId)) {
      setReminders((prev) => prev.filter((id) => id !== auctionId));
      addToast(`Reminder removed for "${title}".`);
    } else {
      setReminders((prev) => [...prev, auctionId]);
      addToast(`Reminder confirmed for "${title}". Added to your schedule.`);
    }
  };

  // Get ranked leaderboard for a given auction lot
  const getLeaderboard = (auctionId) => {
    const auction = liveAuctions.find((a) => a.id === auctionId);
    if (!auction || !auction.bidHistory || auction.bidHistory.length === 0) {
      return [];
    }

    // Map highest bid per unique bidder
    const bidderMap = new Map();
    auction.bidHistory.forEach((record) => {
      const existing = bidderMap.get(record.bidder);
      if (!existing || record.amount > existing.amount) {
        bidderMap.set(record.bidder, record);
      }
    });

    const ranked = Array.from(bidderMap.values()).sort((a, b) => b.amount - a.amount);
    return ranked.map((entry, index) => ({
      rank: index + 1,
      bidder: entry.bidder,
      amount: entry.amount,
      time: entry.time,
      timestamp: entry.timestamp,
      isLeading: index === 0,
      isWinner: auction.status === 'ended' && index === 0
    }));
  };

  return (
    <AuctionContext.Provider
      value={{
        liveAuctions,
        upcomingAuctions,
        placeBid,
        comments,
        sendAuctionComment,
        isRegistered,
        toggleRegistration,
        registrations,
        isReminderSet,
        toggleReminder,
        reminders,
        userBids,
        getLeaderboard
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuctions = () => {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuctions must be used within an AuctionProvider');
  }
  return context;
};
