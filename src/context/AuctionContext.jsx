import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { INITIAL_LIVE_AUCTIONS, UPCOMING_AUCTIONS, DEMO_AUCTION_IDS, getDemoBaselineAuction } from '../data/auctions';
import { useToast } from './ToastContext';

const AuctionContext = createContext(null);
const AUCTIONS_STORAGE_KEY = 'veyra_live_auctions_data';
const CUSTOM_AUCTIONS_STORAGE_KEY = 'veyra_custom_auctions';
const REMINDERS_STORAGE_KEY = 'veyra_auction_reminders';
const REGISTRATIONS_STORAGE_KEY = 'veyra_auction_registrations';
const USER_BIDS_STORAGE_KEY = 'veyra_user_bids_history';
const AUCTION_COMMENTS_KEY = 'veyra_auction_comments';
const AUTO_BIDS_STORAGE_KEY = 'veyra_user_auto_bids';

export const AuctionProvider = ({ children }) => {
  const { addToast } = useToast();

  // 1. Authoritative Live Auctions state
  const [liveAuctions, setLiveAuctions] = useState(() => {
    const now = Date.now();
    try {
      const saved = localStorage.getItem(AUCTIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((auc) => {
            const start = auc.startTimestamp || auc.scheduledTimestamp || (now - 3600000);
            const end = auc.endTimestamp || auc.endTime || (start + (auc.endsInSeconds || 7200) * 1000);
            const isStarted = now >= start;
            const isEnded = now >= end;
            const status = isEnded ? 'ended' : isStarted ? 'active' : 'upcoming';
            const remaining = isEnded ? 0 : isStarted ? Math.max(0, Math.floor((end - now) / 1000)) : Math.max(0, Math.floor((start - now) / 1000));
            return {
              ...auc,
              startTimestamp: start,
              scheduledTimestamp: start,
              endTimestamp: end,
              endTime: end,
              minIncrement: Number(auc.minIncrement || 50),
              status,
              remainingSeconds: remaining
            };
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved auctions', e);
    }

    return INITIAL_LIVE_AUCTIONS.map((auc, idx) => {
      const isUpcoming = idx === 3;
      const start = isUpcoming ? now + 3600000 : now - 3600000;
      const durationMs = (auc.endsInSeconds || 7200) * 1000;
      const end = start + durationMs;
      const isStarted = now >= start;
      const isEnded = now >= end;
      const status = isEnded ? 'ended' : isStarted ? 'active' : 'upcoming';
      const remaining = isEnded ? 0 : isStarted ? Math.max(0, Math.floor((end - now) / 1000)) : Math.max(0, Math.floor((start - now) / 1000));

      return {
        ...auc,
        startTimestamp: start,
        scheduledTimestamp: start,
        endTimestamp: end,
        endTime: end,
        minIncrement: Number(auc.minIncrement || 100),
        remainingSeconds: remaining,
        status,
        winner: null
      };
    });
  });

  // 2. Custom Seller-Submitted Auctions
  const [customAuctions, setCustomAuctions] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_AUCTIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 3. Base Upcoming auctions
  const [baseUpcomingAuctions] = useState(UPCOMING_AUCTIONS);

  // 4. User registrations & reminders
  const [registrations, setRegistrations] = useState(() => {
    try {
      const saved = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['up-1'];
    } catch (e) {
      return [];
    }
  });

  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem(REMINDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['up-2'];
    } catch (e) {
      return [];
    }
  });

  // 5. User bids history (for My Bids in Account)
  const [userBids, setUserBids] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_BIDS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 6. User Auto-Bids store (buyer private configurations: auctionId -> config)
  const [autoBids, setAutoBids] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTO_BIDS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // 7. Live auction comments / chat feeds with deduplication
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

  // Fetch initial authoritative auctions from backend if available
  useEffect(() => {
    let mounted = true;
    fetch('/api/auctions')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data || !Array.isArray(data.auctions)) return;
        setLiveAuctions((prev) => {
          // Merge server data seamlessly
          const serverMap = new Map(data.auctions.map((a) => [a.id, a]));
          return prev.map((localAuc) => {
            const serverAuc = serverMap.get(localAuc.id);
            if (!serverAuc) return localAuc;
            return {
              ...localAuc,
              ...serverAuc,
              currentBid: serverAuc.currentBid || localAuc.currentBid,
              bidCount: serverAuc.bidCount ?? localAuc.bidCount,
              bidHistory: serverAuc.bidHistory || localAuc.bidHistory || []
            };
          });
        });
      })
      .catch(() => {
        // Fallback to client state
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Persistence effects
  useEffect(() => {
    try {
      localStorage.setItem(AUCTIONS_STORAGE_KEY, JSON.stringify(liveAuctions));
    } catch (e) {}
  }, [liveAuctions]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_AUCTIONS_STORAGE_KEY, JSON.stringify(customAuctions));
    } catch (e) {}
  }, [customAuctions]);

  useEffect(() => {
    try {
      localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(registrations));
    } catch (e) {}
  }, [registrations]);

  useEffect(() => {
    try {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
    } catch (e) {}
  }, [reminders]);

  useEffect(() => {
    try {
      localStorage.setItem(USER_BIDS_STORAGE_KEY, JSON.stringify(userBids));
    } catch (e) {}
  }, [userBids]);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_BIDS_STORAGE_KEY, JSON.stringify(autoBids));
    } catch (e) {}
  }, [autoBids]);

  useEffect(() => {
    try {
      localStorage.setItem(AUCTION_COMMENTS_KEY, JSON.stringify(comments));
    } catch (e) {}
  }, [comments]);

  // Synchronized cross-tab broadcast listener with strict message deduplication
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
          setCustomAuctions((prev) =>
            prev.map((auc) => (auc.id === payload.auctionId ? payload.updatedAuction : auc))
          );
        } else if (type === 'COMMENT_ADDED') {
          // Strict deduplication by ID
          setComments((prev) => {
            const lotList = prev[payload.auctionId] || [];
            if (lotList.some((c) => c.id === payload.comment.id)) {
              return prev; // already present, avoid duplicate echo
            }
            return {
              ...prev,
              [payload.auctionId]: [...lotList, payload.comment]
            };
          });
        } else if (type === 'AUCTION_RESET') {
          if (payload.updatedAuctions) {
            setLiveAuctions(payload.updatedAuctions);
          } else if (payload.updatedAuction) {
            setLiveAuctions((prev) =>
              prev.map((auc) => (auc.id === payload.updatedAuction.id ? payload.updatedAuction : auc))
            );
          }
        }
      };
    }

    return () => {
      if (broadcast) broadcast.close();
    };
  }, []);

  // Authoritative server-synced countdown clock (runs every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      // 1. Tick base live auctions
      setLiveAuctions((prevAuctions) => {
        let hasChanges = false;
        const updated = prevAuctions.map((auc) => {
          const start = auc.startTimestamp || 0;
          const end = auc.endTimestamp || auc.endTime || (start + 3600000);

          let targetStatus;
          let remaining;
          let winner = auc.winner;

          if (now < start) {
            targetStatus = 'upcoming';
            remaining = Math.max(0, Math.floor((start - now) / 1000));
            winner = null;
          } else if (now >= start && now < end) {
            targetStatus = 'active';
            remaining = Math.max(0, Math.floor((end - now) / 1000));
            winner = null;
          } else {
            targetStatus = 'ended';
            remaining = 0;
            if (!winner && auc.bidHistory && auc.bidHistory.length > 0) {
              winner = auc.bidHistory[0];
            }
          }

          if (auc.remainingSeconds !== remaining || auc.status !== targetStatus || auc.winner !== winner) {
            hasChanges = true;
            return {
              ...auc,
              remainingSeconds: remaining,
              status: targetStatus,
              winner
            };
          }

          return auc;
        });

        return hasChanges ? updated : prevAuctions;
      });

      // 2. Tick custom auctions
      setCustomAuctions((prevCustom) => {
        let hasChanges = false;
        const updated = prevCustom.map((auc) => {
          if (auc.approvalStatus !== 'approved') {
            return auc;
          }

          const start = auc.startTimestamp || auc.scheduledTimestamp || 0;
          const end = auc.endTimestamp || auc.endTime || (start + 86400000);

          let targetStatus;
          let remaining;
          let winner = auc.winner;

          if (now < start) {
            targetStatus = 'scheduled';
            remaining = Math.max(0, Math.floor((start - now) / 1000));
            winner = null;
          } else if (now >= start && now < end) {
            targetStatus = 'active';
            remaining = Math.max(0, Math.floor((end - now) / 1000));
            winner = null;
          } else {
            targetStatus = 'ended';
            remaining = 0;
            if (!winner && auc.bidHistory && auc.bidHistory.length > 0) {
              winner = auc.bidHistory[0];
            }
          }

          if (auc.status !== targetStatus || auc.remainingSeconds !== remaining || auc.winner !== winner) {
            hasChanges = true;
            return {
              ...auc,
              status: targetStatus,
              remainingSeconds: remaining,
              winner
            };
          }

          return auc;
        });

        return hasChanges ? updated : prevCustom;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Approved active custom auctions
  const activeApprovedCustomAuctions = useMemo(() => {
    const now = Date.now();
    return customAuctions
      .filter((a) => a.approvalStatus === 'approved' && now >= (a.startTimestamp || a.scheduledTimestamp || 0))
      .map((a) => {
        const remaining = Math.max(0, Math.floor(((a.endTimestamp || a.endTime) - now) / 1000));
        const isEnded = remaining <= 0;
        return {
          ...a,
          remainingSeconds: remaining,
          status: isEnded ? 'ended' : 'active'
        };
      });
  }, [customAuctions]);

  // Combined Live Auctions
  const combinedLiveAuctions = useMemo(() => {
    return [...liveAuctions, ...activeApprovedCustomAuctions];
  }, [liveAuctions, activeApprovedCustomAuctions]);

  // Combined Upcoming Auctions
  const upcomingApprovedCustomAuctions = useMemo(() => {
    const now = Date.now();
    return customAuctions
      .filter((a) => a.approvalStatus === 'approved' && now < (a.startTimestamp || a.scheduledTimestamp || 0))
      .map((a) => ({
        ...a,
        thumbnail: a.image || (a.images && a.images[0]) || ''
      }));
  }, [customAuctions]);

  const combinedUpcomingAuctions = useMemo(() => {
    return [...baseUpcomingAuctions, ...upcomingApprovedCustomAuctions];
  }, [baseUpcomingAuctions, upcomingApprovedCustomAuctions]);

  // Create & Register a New Auction Lot
  const createAuctionLot = useCallback(
    async (lotData) => {
      if (!lotData.name || !lotData.name.trim()) {
        return { success: false, error: 'Product title is required.' };
      }
      if (!lotData.seller || !lotData.seller.trim()) {
        return { success: false, error: 'Seller or workshop name is required.' };
      }

      const startingBidNum = Number(lotData.startingBid);
      if (isNaN(startingBidNum) || startingBidNum <= 0) {
        return { success: false, error: 'Starting bid must be a valid positive amount in INR.' };
      }

      const minIncrementNum = Number(lotData.minIncrement || 50);
      if (isNaN(minIncrementNum) || minIncrementNum <= 0) {
        return { success: false, error: 'Minimum bid increment must be a valid positive amount.' };
      }

      if (!lotData.startDate || !lotData.startTime) {
        return { success: false, error: 'Auction start date and time are required.' };
      }

      // Parse start and end timestamps in Asia/Kolkata
      let startTimestamp = new Date(`${lotData.startDate}T${lotData.startTime}`).getTime();
      let endTimestamp = 0;

      if (lotData.endDate && lotData.endTime) {
        endTimestamp = new Date(`${lotData.endDate}T${lotData.endTime}`).getTime();
      } else if (lotData.durationDays) {
        endTimestamp = startTimestamp + Math.round(parseFloat(lotData.durationDays) * 86400000);
      } else {
        endTimestamp = startTimestamp + 86400000;
      }

      if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
        return { success: false, error: 'Invalid auction start or end date/time format.' };
      }

      if (endTimestamp <= startTimestamp) {
        return { success: false, error: 'Auction end time must be strictly later than the start time.' };
      }

      if (startTimestamp <= Date.now() && !lotData.allowPastStart) {
        return { success: false, error: 'Auction start time must be scheduled in the future.' };
      }

      const primaryImage = lotData.image || (lotData.images && lotData.images[0]) || '';
      const imagesList = lotData.images && lotData.images.length > 0 ? lotData.images : [primaryImage];

      const newLot = {
        id: 'auc-lot-' + Date.now(),
        productId: lotData.productId || ('prod-' + Date.now()),
        name: lotData.name.trim(),
        maker: lotData.maker || lotData.seller,
        seller: lotData.seller.trim(),
        sellerId: lotData.sellerId || 'seller-atelier',
        location: lotData.location || 'Studio Atelier',
        provenance: lotData.provenance || 'Authenticated studio masterwork',
        category: lotData.category || 'Handmade',
        startingBid: startingBidNum,
        currentBid: startingBidNum,
        estimatedValue: Number(lotData.estimatedValue || lotData.price || startingBidNum * 1.5),
        minIncrement: minIncrementNum,
        bidCount: 0,
        bidHistory: [],
        startTimestamp,
        endTimestamp,
        startDate: lotData.startDate,
        startTime: lotData.startTime,
        endDate: lotData.endDate,
        endTime: lotData.endTime,
        durationDays: lotData.durationDays || (endTimestamp - startTimestamp) / 86400000,
        remainingSeconds: Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000)),
        approvalStatus: 'approved',
        status: startTimestamp <= Date.now() ? 'active' : 'scheduled',
        winner: null,
        image: primaryImage,
        images: imagesList,
        description: lotData.description || '',
        materials: lotData.materials || '',
        dimensions: lotData.dimensions || '',
        condition: lotData.condition || 'Pristine Studio Original',
        authenticityCertificate: 'Certificate of Provenance & Studio Hallmark',
        submittedAt: new Date().toISOString()
      };

      // Also persist to server endpoint if reachable
      try {
        await fetch('/api/auctions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLot)
        });
      } catch (err) {
        // Fall back to client storage
      }

      setCustomAuctions((prev) => [newLot, ...prev]);
      addToast(`"${newLot.name}" created successfully and published to catalogue.`);

      return { success: true, auction: newLot };
    },
    [addToast]
  );

  // Authoritative Bid Placement Function (Manual bidding + Auto-Bid trigger)
  const placeBid = useCallback(
    async (auctionId, amount, bidderName = 'Collector', userId = 'user-current') => {
      const now = Date.now();
      const amountNum = Number(amount);

      // Attempt server-side authoritative bidding first
      try {
        const response = await fetch(`/api/auctions/${auctionId}/bid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amountNum, bidderName, bidderId: userId })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.auction) {
            // Update live auction state from authoritative server response
            setLiveAuctions((prev) =>
              prev.map((auc) => (auc.id === auctionId ? { ...auc, ...data.auction } : auc))
            );
            setCustomAuctions((prev) =>
              prev.map((auc) => (auc.id === auctionId ? { ...auc, ...data.auction } : auc))
            );

            // Record in user's bids
            setUserBids((prev) => [
              {
                id: 'ub-' + Date.now(),
                auctionId,
                auctionTitle: data.auction.name,
                amount: amountNum,
                time: 'Just now',
                timestamp: now,
                status: 'Leading',
                image: data.auction.image || ''
              },
              ...prev.filter((b) => b.auctionId !== auctionId)
            ]);

            // Broadcast to other tabs
            if (typeof BroadcastChannel !== 'undefined') {
              try {
                const bc = new BroadcastChannel('veyra_auction_realtime_sync');
                bc.postMessage({
                  type: 'BID_PLACED',
                  payload: { auctionId, updatedAuction: data.auction }
                });
                bc.close();
              } catch (e) {}
            }

            addToast(`Bid of ₹${amountNum.toLocaleString('en-IN')} placed successfully.`);
            return { success: true, updatedAuction: data.auction };
          } else {
            return { success: false, error: data.error || 'Bid rejected by server.' };
          }
        } else {
          const errData = await response.json().catch(() => null);
          if (errData && errData.error) {
            return { success: false, error: errData.error };
          }
        }
      } catch (networkErr) {
        // Fall back to client authoritative engine if backend is offline
      }

      // Client-side fallback engine with identical rules
      let outcome = { success: false, error: '' };

      const applyBid = (auction) => {
        if (!auction) return null;

        const start = auction.startTimestamp || 0;
        const end = auction.endTimestamp || auction.endTime || 0;

        if (auction.status === 'ended' || (end > 0 && now >= end) || (auction.remainingSeconds ?? 0) <= 0) {
          outcome = { success: false, error: 'This auction has concluded. Bids are closed.' };
          return auction;
        }

        if (auction.status === 'upcoming' || (start > 0 && now < start)) {
          outcome = { success: false, error: 'This auction has not opened yet. Bidding begins at scheduled start.' };
          return auction;
        }

        if (auction.sellerId && userId && String(auction.sellerId) === String(userId)) {
          outcome = { success: false, error: 'Sellers are strictly prohibited from bidding on their own auction lots.' };
          return auction;
        }

        const minInc = Number(auction.minIncrement || 50);
        const minAcceptable = Number(auction.currentBid) + minInc;
        if (amountNum < minAcceptable) {
          outcome = {
            success: false,
            error: `Your bid must be at least ₹${minAcceptable.toLocaleString('en-IN')}. The minimum bid increment for this auction is ₹${minInc.toLocaleString('en-IN')}.`
          };
          return auction;
        }

        const topBid = auction.bidHistory && auction.bidHistory.length > 0 ? auction.bidHistory[0] : null;
        if (topBid) {
          if (amountNum <= Number(topBid.amount)) {
            outcome = {
              success: false,
              error: `A bid of ₹${amountNum.toLocaleString('en-IN')} has already been recorded.`
            };
            return auction;
          }

          if (String(topBid.bidderId) === String(userId)) {
            outcome = {
              success: false,
              error: 'You are already the leading bidder on this lot.'
            };
            return auction;
          }
        }

        const newRecord = {
          id: 'b-' + now,
          bidder: bidderName,
          bidderId: userId,
          amount: amountNum,
          bidType: 'manual',
          time: 'Just now',
          timestamp: now
        };

        const updated = {
          ...auction,
          currentBid: amountNum,
          bidCount: (auction.bidCount || 0) + 1,
          bidHistory: [newRecord, ...(auction.bidHistory || [])]
        };

        outcome = { success: true, updatedAuction: updated };
        return updated;
      };

      setLiveAuctions((prev) => {
        const found = prev.find((a) => a.id === auctionId || a.productId === auctionId);
        if (found) {
          const updated = applyBid(found);
          if (outcome.success) {
            return prev.map((a) => (a.id === found.id ? updated : a));
          }
        }
        return prev;
      });

      setCustomAuctions((prev) => {
        const found = prev.find((a) => a.id === auctionId || a.productId === auctionId);
        if (found) {
          const updated = applyBid(found);
          if (outcome.success) {
            return prev.map((a) => (a.id === found.id ? updated : a));
          }
        }
        return prev;
      });

      if (outcome.success) {
        addToast(`Bid of ₹${amountNum.toLocaleString('en-IN')} placed successfully.`);

        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const bc = new BroadcastChannel('veyra_auction_realtime_sync');
            bc.postMessage({
              type: 'BID_PLACED',
              payload: { auctionId, updatedAuction: outcome.updatedAuction }
            });
            bc.close();
          } catch (e) {}
        }

        setUserBids((prev) => [
          {
            id: 'ub-' + Date.now(),
            auctionId,
            auctionTitle: outcome.updatedAuction?.name || 'Curated Lot',
            amount: amountNum,
            time: 'Just now',
            timestamp: now,
            status: 'Leading',
            image: outcome.updatedAuction?.image || ''
          },
          ...prev.filter((b) => b.auctionId !== auctionId)
        ]);
      }

      return outcome;
    },
    [addToast]
  );

  // Auto-Bid Agent Configuration Functions
  const getAutoBidConfig = useCallback(
    (auctionId, userId) => {
      if (!auctionId || !userId) return null;
      const key = `${auctionId}_${userId}`;
      return autoBids[key] || null;
    },
    [autoBids]
  );

  const saveAutoBidConfig = useCallback(
    async ({ auctionId, userId, userName, maxLimit, preferredIncrement, isActive = true }) => {
      const payload = {
        auctionId,
        userId: String(userId),
        userName: userName || 'Collector',
        maxLimit: Number(maxLimit),
        preferredIncrement: Number(preferredIncrement),
        isActive
      };

      const key = `${auctionId}_${userId}`;
      setAutoBids((prev) => ({
        ...prev,
        [key]: { ...payload, updatedAt: new Date().toISOString() }
      }));

      // Send to server Auto-Bid endpoint
      try {
        const response = await fetch(`/api/auctions/${auctionId}/auto-bid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.auction) {
            setLiveAuctions((prev) =>
              prev.map((auc) => (auc.id === auctionId ? { ...auc, ...data.auction } : auc))
            );
          }
        }
      } catch (err) {}

      addToast(
        isActive
          ? `Auto-Bid Agent activated (Max: ₹${Number(maxLimit).toLocaleString('en-IN')}).`
          : 'Auto-Bid Agent paused.'
      );

      return { success: true, autoBid: payload };
    },
    [addToast]
  );

  const cancelAutoBidConfig = useCallback(
    async (auctionId, userId) => {
      const key = `${auctionId}_${userId}`;
      setAutoBids((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });

      try {
        await fetch(`/api/auctions/${auctionId}/auto-bid`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
      } catch (err) {}

      addToast('Auto-Bid Agent disabled and removed.');
      return { success: true };
    },
    [addToast]
  );

  // Send auction live comment with stable IDs and strict deduplication
  const sendAuctionComment = useCallback(
    (auctionId, message, userName = 'Collector', userId = 'user-current') => {
      if (!message || !message.trim()) return;

      const commentId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newComment = {
        id: commentId,
        auctionId,
        user: userName,
        userId,
        message: message.trim(),
        time: 'Just now',
        timestamp: Date.now()
      };

      // Optimistically add to state if not already present
      setComments((prev) => {
        const existing = prev[auctionId] || [];
        if (existing.some((c) => c.id === commentId)) {
          return prev;
        }
        return {
          ...prev,
          [auctionId]: [...existing, newComment]
        };
      });

      // Broadcast comment with ID
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel('veyra_auction_realtime_sync');
          bc.postMessage({
            type: 'COMMENT_ADDED',
            payload: { auctionId, comment: newComment }
          });
          bc.close();
        } catch (e) {}
      }

      // Send to server
      fetch(`/api/auctions/${auctionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newComment.message,
          userName: newComment.user,
          userId: newComment.userId,
          clientMessageId: commentId
        })
      }).catch(() => {});
    },
    []
  );

  // Registrations management
  const isRegistered = (auctionId) => registrations.includes(auctionId);

  const toggleRegistration = (auctionId) => {
    const auction = combinedUpcomingAuctions.find((a) => a.id === auctionId);
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
    const auction = combinedUpcomingAuctions.find((a) => a.id === auctionId);
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
    const auction = combinedLiveAuctions.find((a) => a.id === auctionId || a.productId === auctionId);
    if (!auction || !auction.bidHistory || auction.bidHistory.length === 0) {
      return [];
    }

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
      bidderId: entry.bidderId,
      amount: entry.amount,
      bidType: entry.bidType || 'manual',
      time: entry.time,
      timestamp: entry.timestamp,
      isLeading: index === 0,
      isWinner: auction.status === 'ended' && index === 0
    }));
  };

  // Safe Demo Reset Function
  const resetDemoAuction = useCallback(
    (auctionId, options = {}) => {
      if (!DEMO_AUCTION_IDS.includes(auctionId)) {
        return { success: false, error: 'Only designated demo auctions can be reset.' };
      }

      const baseline = getDemoBaselineAuction(auctionId);
      if (!baseline) return { success: false, error: 'Baseline not found.' };

      const now = Date.now();
      const durMin = options.durationMinutes ? Number(options.durationMinutes) : 30;
      const start = now;
      const end = now + durMin * 60 * 1000;

      let updatedAuctionRecord = null;

      setLiveAuctions((prev) => {
        const nextList = prev.map((auc) => {
          if (auc.id === auctionId) {
            const merged = {
              ...baseline,
              startTimestamp: start,
              endTimestamp: end,
              endTime: end,
              status: 'active',
              remainingSeconds: durMin * 60,
              winner: null
            };
            updatedAuctionRecord = merged;
            return merged;
          }
          return auc;
        });
        return nextList;
      });

      addToast(`Demo lot reset to active (${durMin}m remaining).`);
      return { success: true, auction: updatedAuctionRecord };
    },
    [addToast]
  );

  const resetAllDemoAuctions = useCallback(
    (options = {}) => {
      const now = Date.now();
      const durMin = options.durationMinutes ? Number(options.durationMinutes) : 30;

      setLiveAuctions((prev) => {
        return prev.map((auc, idx) => {
          if (DEMO_AUCTION_IDS.includes(auc.id)) {
            const baseline = getDemoBaselineAuction(auc.id) || auc;
            return {
              ...baseline,
              startTimestamp: now,
              endTimestamp: now + (durMin + idx) * 60 * 1000,
              endTime: now + (durMin + idx) * 60 * 1000,
              status: 'active',
              remainingSeconds: (durMin + idx) * 60,
              winner: null
            };
          }
          return auc;
        });
      });

      addToast(`All demo lots reset to active.`);
      return { success: true };
    },
    [addToast]
  );

  return (
    <AuctionContext.Provider
      value={{
        liveAuctions: combinedLiveAuctions,
        upcomingAuctions: combinedUpcomingAuctions,
        customAuctions,
        createAuctionLot,
        placeBid,
        comments,
        sendAuctionComment,
        getAutoBidConfig,
        saveAutoBidConfig,
        cancelAutoBidConfig,
        isRegistered,
        toggleRegistration,
        registrations,
        isReminderSet,
        toggleReminder,
        reminders,
        userBids,
        getLeaderboard,
        resetDemoAuction,
        resetAllDemoAuctions,
        DEMO_AUCTION_IDS
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
