// ==============================================================================
// VEYRA AUTHORITATIVE BIDDING & AUTO-BID AGENT ENGINE
// Deterministic server-side bidding engine with concurrency locking,
// authoritative timestamp validation, seller exclusion, and Auto-Bid agent loops.
// ==============================================================================

import {
  getAuctionById,
  updateAuctionRecord,
  getAuctionBids,
  addAuctionBid,
  getAuctionAutoBids
} from './store.js';

// Per-auction sequential concurrency queue to guarantee atomicity and race-free bidding
const auctionQueues = new Map();

function enqueueAuctionTask(auctionId, taskFn) {
  const currentPromise = auctionQueues.get(auctionId) || Promise.resolve();
  const nextPromise = currentPromise
    .catch(() => {})
    .then(() => taskFn());
  auctionQueues.set(auctionId, nextPromise);
  return nextPromise;
}

/**
 * Calculates authoritative auction status and remaining seconds based on server time.
 * @param {Object} auction
 * @param {number} now
 * @returns {{ status: string, remainingSeconds: number, isLive: boolean }}
 */
export function calculateAuctionStatus(auction, now = Date.now()) {
  const start = auction.startTimestamp || (auction.start_time ? new Date(auction.start_time).getTime() : 0);
  const end = auction.endTimestamp || (auction.end_time ? new Date(auction.end_time).getTime() : 0);

  if (auction.status === 'cancelled') {
    return { status: 'cancelled', remainingSeconds: 0, isLive: false };
  }

  if (now < start) {
    return {
      status: 'scheduled',
      remainingSeconds: Math.max(0, Math.floor((start - now) / 1000)),
      isLive: false
    };
  }

  if (now >= start && now < end) {
    return {
      status: 'active',
      remainingSeconds: Math.max(0, Math.floor((end - now) / 1000)),
      isLive: true
    };
  }

  return {
    status: 'ended',
    remainingSeconds: 0,
    isLive: false
  };
}

/**
 * Formats currency in INR.
 */
function formatINR(val) {
  return '₹' + Number(val).toLocaleString('en-IN');
}

/**
 * Executes a manual bid on an auction with full authoritative validation.
 * Triggers the Auto-Bid agent engine upon successful placement.
 *
 * @param {string} auctionId
 * @param {Object} bidParams - { amount, bidderId, bidderName }
 * @returns {Promise<{ success: boolean, auction?: Object, bid?: Object, error?: string }>}
 */
export async function placeManualBid(auctionId, { amount, bidderId, bidderName }) {
  return enqueueAuctionTask(auctionId, async () => {
    const now = Date.now();
    const auction = getAuctionById(auctionId);

    if (!auction) {
      return { success: false, error: 'Auction not found.' };
    }

    // 1. Authoritative lifecycle check
    const { status, isLive } = calculateAuctionStatus(auction, now);
    if (status === 'scheduled') {
      return {
        success: false,
        error: 'This auction is scheduled and has not opened yet. Bids are only accepted during the live session.'
      };
    }
    if (status === 'ended' || !isLive) {
      return {
        success: false,
        error: 'This auction has concluded. Further bids are strictly closed.'
      };
    }

    // 2. Prevent sellers from bidding on their own lots
    if (auction.sellerId && bidderId && String(auction.sellerId) === String(bidderId)) {
      return {
        success: false,
        error: 'Sellers are strictly prohibited from bidding on their own auction lots.'
      };
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return { success: false, error: 'Please enter a valid bid amount.' };
    }

    const existingBids = getAuctionBids(auctionId);
    const topBid = existingBids.length > 0 ? existingBids[0] : null;

    // 3. Duplicate and leading bidder checks
    if (topBid) {
      if (amountNum <= Number(topBid.amount)) {
        return {
          success: false,
          error: `A bid of ${formatINR(topBid.amount)} has already been recorded.`
        };
      }
      if (String(topBid.bidderId) === String(bidderId)) {
        return {
          success: false,
          error: 'You are already the leading bidder on this lot.'
        };
      }
    }

    // 4. Minimum bid increment validation
    const minIncrement = Number(auction.minIncrement || 50);
    const minRequired = Number(auction.currentBid) + minIncrement;

    if (amountNum < minRequired) {
      return {
        success: false,
        error: `Your bid must be at least ${formatINR(minRequired)}. The minimum bid increment for this auction is ${formatINR(minIncrement)}.`
      };
    }

    // 5. Record accepted manual bid
    const bidRecord = {
      id: 'bid-' + now + '-' + Math.random().toString(36).substring(2, 6),
      auctionId,
      bidder: bidderName || 'Floor Collector',
      bidderId: bidderId || 'anonymous-collector',
      amount: amountNum,
      bidType: 'manual',
      time: 'Just now',
      timestamp: now
    };

    addAuctionBid(auctionId, bidRecord);

    const updatedAuction = updateAuctionRecord(auctionId, {
      currentBid: amountNum,
      bidCount: (auction.bidCount || 0) + 1,
      status: 'active'
    });

    // 6. Trigger Auto-Bid Agent evaluation loop
    const autoBidEvents = await runAutoBidAgentLoop(auctionId, bidderId);

    // Fetch latest authoritative auction state
    const finalAuction = getAuctionById(auctionId);
    const finalBids = getAuctionBids(auctionId);

    return {
      success: true,
      auction: {
        ...finalAuction,
        ...calculateAuctionStatus(finalAuction, Date.now()),
        bidHistory: finalBids
      },
      placedBid: bidRecord,
      autoBidsTriggered: autoBidEvents
    };
  });
}

/**
 * Executes the genuine server-side Auto-Bid Agent loop.
 * Runs deterministically until no auto-bid agent can counter.
 *
 * @param {string} auctionId
 * @param {string} excludeUserId - User who just placed the bid
 * @returns {Promise<Array>} List of placed automated bids
 */
export async function runAutoBidAgentLoop(auctionId, excludeUserId) {
  const triggeredBids = [];
  const MAX_AGENT_ITERATIONS = 50; // Safety guard against cyclic race conditions
  let iteration = 0;

  while (iteration < MAX_AGENT_ITERATIONS) {
    iteration++;
    const now = Date.now();
    const auction = getAuctionById(auctionId);
    if (!auction) break;

    const { isLive } = calculateAuctionStatus(auction, now);
    if (!isLive) break;

    const bids = getAuctionBids(auctionId);
    const topBid = bids.length > 0 ? bids[0] : null;
    const currentLeadingUserId = topBid ? topBid.bidderId : null;

    // Get all active auto-bids for this auction
    const autoBids = getAuctionAutoBids(auctionId).filter(
      ab => ab.isActive !== false && String(ab.userId) !== String(currentLeadingUserId)
    );

    if (autoBids.length === 0) {
      break; // No eligible competing auto-bid agents
    }

    // Sort agents by highest maxLimit first, then earliest created
    autoBids.sort((a, b) => {
      if (b.maxLimit !== a.maxLimit) return b.maxLimit - a.maxLimit;
      return (new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime());
    });

    // Find the first agent capable of placing a valid counter-bid
    let placedInThisRound = false;

    for (const agent of autoBids) {
      const sellerMinInc = Number(auction.minIncrement || 50);
      const agentPreferredInc = Number(agent.preferredIncrement || sellerMinInc);
      const effectiveInc = Math.max(sellerMinInc, agentPreferredInc);

      const candidateBid = Number(auction.currentBid) + effectiveInc;

      // Agent can only bid if candidateBid <= maxLimit
      if (candidateBid <= Number(agent.maxLimit)) {
        const autoBidRecord = {
          id: 'ab-bid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          auctionId,
          bidder: agent.userName || 'Auto-Bid Agent',
          bidderId: agent.userId,
          amount: candidateBid,
          bidType: 'auto',
          time: 'Auto-Bid',
          timestamp: Date.now()
        };

        addAuctionBid(auctionId, autoBidRecord);

        updateAuctionRecord(auctionId, {
          currentBid: candidateBid,
          bidCount: (auction.bidCount || 0) + 1
        });

        triggeredBids.push(autoBidRecord);
        placedInThisRound = true;
        break; // Re-evaluate competing agents against this new highest bid
      }
    }

    if (!placedInThisRound) {
      break; // None of the competing agents could place a bid within their limits
    }
  }

  return triggeredBids;
}

/**
 * Authoritative winner determination for an auction.
 * @param {string} auctionId
 * @returns {Object|null}
 */
export function determineWinner(auctionId) {
  const bids = getAuctionBids(auctionId);
  if (!bids || bids.length === 0) return null;

  // The highest bid placed earliest is the winner
  const sorted = [...bids].sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    return a.timestamp - b.timestamp;
  });

  return sorted[0];
}
