// ==============================================================================
// VEYRA MARKETPLACE - SECURE BACKEND API SERVER
// Authoritative auction lifecycle, deterministic manual bidding,
// server-side Auto-Bid agents, and OpenAI integration.
// ==============================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables (.env.local first, then fallback to .env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

import {
  initStore,
  getAllAuctions,
  getAuctionById,
  addAuction,
  updateAuctionRecord,
  getAuctionBids,
  getUserAutoBid,
  setAuctionAutoBid,
  deleteAuctionAutoBid,
  getAuctionComments,
  addAuctionComment
} from './store.js';

import {
  calculateAuctionStatus,
  placeManualBid,
  runAutoBidAgentLoop,
  determineWinner
} from './biddingEngine.js';

import {
  generateProductDescription,
  generateBiddingInsights,
  isOpenAIConfigured
} from './ai.js';

// Initialize persistent store
initStore();

export const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ------------------------------------------------------------------------------
// 1. Authoritative Server Time Endpoint (Asia/Kolkata)
// ------------------------------------------------------------------------------
app.get('/api/time', (req, res) => {
  const now = Date.now();
  const dateObj = new Date(now);
  const kolkataTimeString = dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  res.json({
    serverTime: now,
    iso: dateObj.toISOString(),
    timezone: 'Asia/Kolkata',
    kolkataTime: kolkataTimeString
  });
});

// ------------------------------------------------------------------------------
// 2. Auctions Endpoints
// ------------------------------------------------------------------------------

// Get all auctions with authoritative real-time calculated statuses
app.get('/api/auctions', (req, res) => {
  const now = Date.now();
  const rawAuctions = getAllAuctions();

  const auctions = rawAuctions.map(auc => {
    const statusInfo = calculateAuctionStatus(auc, now);
    const bids = getAuctionBids(auc.id);
    const topBid = bids.length > 0 ? bids[0] : null;
    const winner = statusInfo.status === 'ended' ? determineWinner(auc.id) : null;

    return {
      ...auc,
      ...statusInfo,
      currentBid: topBid ? topBid.amount : auc.currentBid,
      bidCount: bids.length,
      winner
    };
  });

  res.json({ success: true, auctions });
});

// Get single auction by ID with bid history and leaderboard
app.get('/api/auctions/:id', (req, res) => {
  const { id } = req.params;
  const now = Date.now();
  const auc = getAuctionById(id);

  if (!auc) {
    return res.status(404).json({ success: false, error: 'Auction not found' });
  }

  const statusInfo = calculateAuctionStatus(auc, now);
  const bids = getAuctionBids(auc.id);
  const topBid = bids.length > 0 ? bids[0] : null;
  const winner = statusInfo.status === 'ended' ? determineWinner(auc.id) : null;

  // Build leaderboard (unique bidders ordered by highest bid)
  const bidderMap = new Map();
  bids.forEach(b => {
    if (!bidderMap.has(b.bidderId) || bidderMap.get(b.bidderId).amount < b.amount) {
      bidderMap.set(b.bidderId, b);
    }
  });
  const leaderboard = Array.from(bidderMap.values()).sort((a, b) => b.amount - a.amount);

  res.json({
    success: true,
    auction: {
      ...auc,
      ...statusInfo,
      currentBid: topBid ? topBid.amount : auc.currentBid,
      bidCount: bids.length,
      bidHistory: bids,
      leaderboard,
      winner
    }
  });
});

// Create and register a new auction lot (Strict Date/Time validation in Asia/Kolkata)
app.post('/api/auctions', (req, res) => {
  const lotData = req.body;
  const now = Date.now();

  // Validate required fields
  if (!lotData.name || !lotData.name.trim()) {
    return res.status(400).json({ success: false, error: 'Authoritative product title is required.' });
  }
  if (!lotData.seller || !lotData.seller.trim()) {
    return res.status(400).json({ success: false, error: 'Seller or workshop name is required.' });
  }

  const startingBidNum = Number(lotData.startingBid);
  if (isNaN(startingBidNum) || startingBidNum <= 0) {
    return res.status(400).json({ success: false, error: 'Starting bid must be a valid positive amount in INR.' });
  }

  const minIncrementNum = Number(lotData.minIncrement || 50);
  if (isNaN(minIncrementNum) || minIncrementNum <= 0) {
    return res.status(400).json({ success: false, error: 'Minimum bid increment must be a positive amount in INR.' });
  }

  // Parse start date & time and end date & time
  if (!lotData.startDate || !lotData.startTime) {
    return res.status(400).json({ success: false, error: 'Auction start date and start time are required.' });
  }

  // Support both explicit endDate/endTime or durationDays
  let startTimestamp = 0;
  let endTimestamp = 0;

  try {
    startTimestamp = new Date(`${lotData.startDate}T${lotData.startTime}`).getTime();
    if (isNaN(startTimestamp)) throw new Error('Invalid start date/time');

    if (lotData.endDate && lotData.endTime) {
      endTimestamp = new Date(`${lotData.endDate}T${lotData.endTime}`).getTime();
    } else if (lotData.durationDays) {
      const days = parseFloat(lotData.durationDays);
      endTimestamp = startTimestamp + Math.round(days * 86400000);
    } else {
      endTimestamp = startTimestamp + 86400000; // default 24h
    }

    if (isNaN(endTimestamp)) throw new Error('Invalid end date/time');
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Invalid date or time format.' });
  }

  // Validation rules
  if (endTimestamp <= startTimestamp) {
    return res.status(400).json({
      success: false,
      error: 'The auction end time must be strictly later than the start time.'
    });
  }

  if (startTimestamp <= now && !lotData.allowPastStart) {
    return res.status(400).json({
      success: false,
      error: 'Auction start time must be scheduled in the future.'
    });
  }

  const newAuction = {
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
    startTimestamp,
    endTimestamp,
    startDate: lotData.startDate,
    startTime: lotData.startTime,
    endDate: lotData.endDate,
    endTime: lotData.endTime,
    status: startTimestamp <= now ? 'active' : 'scheduled',
    approvalStatus: 'approved', // instantly published for authorized seller
    winner: null,
    image: lotData.image || (lotData.images && lotData.images[0]) || '',
    images: lotData.images || (lotData.image ? [lotData.image] : []),
    description: lotData.description || '',
    materials: lotData.materials || '',
    dimensions: lotData.dimensions || '',
    condition: lotData.condition || 'Pristine Studio Original',
    authenticityCertificate: lotData.authenticityCertificate || 'Certificate of Authenticity',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  addAuction(newAuction);
  res.status(201).json({ success: true, auction: newAuction });
});

// Edit scheduled auction dates/times (subject to authorization, only BEFORE start time)
app.put('/api/auctions/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const now = Date.now();

  const existing = getAuctionById(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Auction not found.' });
  }

  const { status } = calculateAuctionStatus(existing, now);

  // Do not let sellers change dates of active or ended auctions silently
  if (status !== 'scheduled' && (updates.startDate || updates.startTime || updates.endDate || updates.endTime)) {
    return res.status(403).json({
      success: false,
      error: 'Cannot modify start or end timestamps of an auction that is already live or concluded.'
    });
  }

  // Validate new timestamps if supplied
  let newStart = existing.startTimestamp;
  let newEnd = existing.endTimestamp;

  if (updates.startDate && updates.startTime) {
    newStart = new Date(`${updates.startDate}T${updates.startTime}`).getTime();
  }
  if (updates.endDate && updates.endTime) {
    newEnd = new Date(`${updates.endDate}T${updates.endTime}`).getTime();
  }

  if (newEnd <= newStart) {
    return res.status(400).json({
      success: false,
      error: 'Auction end time must be strictly later than the start time.'
    });
  }

  const updatedRecord = updateAuctionRecord(id, {
    ...updates,
    startTimestamp: newStart,
    endTimestamp: newEnd
  });

  res.json({ success: true, auction: updatedRecord });
});

// ------------------------------------------------------------------------------
// 3. Manual Bidding Endpoint
// ------------------------------------------------------------------------------
app.post('/api/auctions/:id/bid', async (req, res) => {
  const { id } = req.params;
  const { amount, bidderId, bidderName } = req.body;

  if (!bidderId) {
    return res.status(401).json({ success: false, error: 'Authentication required to place a bid.' });
  }

  const result = await placeManualBid(id, { amount, bidderId, bidderName });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// ------------------------------------------------------------------------------
// 4. Auto-Bid Agent Endpoints (Strictly Private to Buyer)
// ------------------------------------------------------------------------------

// Get buyer's private Auto-Bid configuration
app.get('/api/auctions/:id/auto-bid', (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'] || req.query.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const config = getUserAutoBid(id, String(userId));
  res.json({ success: true, autoBid: config });
});

// Configure or update buyer's Auto-Bid Agent
app.post('/api/auctions/:id/auto-bid', async (req, res) => {
  const { id } = req.params;
  const { userId, userName, maxLimit, preferredIncrement, isActive } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required to configure Auto-Bid.' });
  }

  const auction = getAuctionById(id);
  if (!auction) {
    return res.status(404).json({ success: false, error: 'Auction not found.' });
  }

  const maxLimitNum = Number(maxLimit);
  const preferredIncNum = Number(preferredIncrement || auction.minIncrement || 50);

  if (isNaN(maxLimitNum) || maxLimitNum <= 0) {
    return res.status(400).json({ success: false, error: 'Please enter a valid maximum bid limit in INR.' });
  }

  const sellerMinInc = Number(auction.minIncrement || 50);
  if (preferredIncNum < sellerMinInc) {
    return res.status(400).json({
      success: false,
      error: `Preferred increment cannot be lower than the seller minimum increment of ₹${sellerMinInc.toLocaleString('en-IN')}.`
    });
  }

  if (maxLimitNum < Number(auction.currentBid) + sellerMinInc) {
    return res.status(400).json({
      success: false,
      error: `Your maximum limit must be at least ₹${(Number(auction.currentBid) + sellerMinInc).toLocaleString('en-IN')}.`
    });
  }

  const autoBidData = {
    auctionId: id,
    userId: String(userId),
    userName: userName || 'Auto-Bid Collector',
    maxLimit: maxLimitNum,
    preferredIncrement: preferredIncNum,
    isActive: isActive !== false
  };

  const saved = setAuctionAutoBid(id, autoBidData);

  // Trigger evaluation immediately if auction is active and user is not currently leading
  let triggeredBids = [];
  const statusInfo = calculateAuctionStatus(auction, Date.now());
  if (statusInfo.isLive && saved.isActive) {
    const bids = getAuctionBids(id);
    const topBid = bids.length > 0 ? bids[0] : null;
    if (!topBid || String(topBid.bidderId) !== String(userId)) {
      triggeredBids = await runAutoBidAgentLoop(id, null);
    }
  }

  const latestAuction = getAuctionById(id);
  res.json({
    success: true,
    autoBid: saved,
    triggeredBids,
    auction: {
      ...latestAuction,
      ...calculateAuctionStatus(latestAuction, Date.now()),
      bidHistory: getAuctionBids(id)
    }
  });
});

// Disable or delete buyer's Auto-Bid Agent
app.delete('/api/auctions/:id/auto-bid', (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  deleteAuctionAutoBid(id, String(userId));
  res.json({ success: true, message: 'Auto-Bid agent disabled successfully.' });
});

// ------------------------------------------------------------------------------
// 5. Comments & Chat Endpoints (with stable IDs and Deduplication)
// ------------------------------------------------------------------------------
app.get('/api/auctions/:id/comments', (req, res) => {
  const { id } = req.params;
  const comments = getAuctionComments(id);
  res.json({ success: true, comments });
});

app.post('/api/auctions/:id/comments', (req, res) => {
  const { id } = req.params;
  const { message, userName, userId, clientMessageId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
  }

  const now = Date.now();
  const commentRecord = {
    id: clientMessageId || `c-${now}-${Math.random().toString(36).substring(2, 6)}`,
    auctionId: id,
    user: userName || 'Collector',
    userId: userId || 'anonymous',
    message: message.trim(),
    timestamp: now,
    time: 'Just now'
  };

  const saved = addAuctionComment(id, commentRecord);
  res.status(201).json({ success: true, comment: saved });
});

// ------------------------------------------------------------------------------
// 6. OpenAI Integration Endpoints
// ------------------------------------------------------------------------------

// Product description generator
app.post('/api/ai/generate-description', async (req, res) => {
  const details = req.body;
  const result = await generateProductDescription(details);

  if (!result.success) {
    return res.status(result.error?.includes('not configured') ? 503 : 400).json(result);
  }

  res.json(result);
});

// Auction bidding floor insights
app.post('/api/ai/bidding-insights', async (req, res) => {
  const auctionState = req.body;
  const result = await generateBiddingInsights(auctionState);

  if (!result.success) {
    return res.status(result.error?.includes('not configured') ? 503 : 400).json(result);
  }

  res.json(result);
});

// ------------------------------------------------------------------------------
// 7. Safe Demo Reset Endpoint
// ------------------------------------------------------------------------------
app.post('/api/admin/reset-demo', (req, res) => {
  const { auctionId, durationMinutes } = req.body;
  const now = Date.now();
  const durMs = (durationMinutes || 30) * 60 * 1000;

  if (auctionId) {
    const auc = getAuctionById(auctionId);
    if (!auc) return res.status(404).json({ success: false, error: 'Auction not found' });

    const updated = updateAuctionRecord(auctionId, {
      startTimestamp: now,
      endTimestamp: now + durMs,
      status: 'active',
      winner: null
    });

    return res.json({ success: true, auction: updated });
  }

  // Reset all
  const all = getAllAuctions();
  all.forEach(a => {
    updateAuctionRecord(a.id, {
      startTimestamp: now,
      endTimestamp: now + durMs,
      status: 'active',
      winner: null
    });
  });

  res.json({ success: true, count: all.length });
});

// ------------------------------------------------------------------------------
// Server Startup
// ------------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[VEYRA API Server] Running on http://localhost:${PORT}`);
    console.log(`[OpenAI Status] ${isOpenAIConfigured() ? 'Connected with model ' + (process.env.OPENAI_MODEL || 'gpt-4o-mini') : 'API key not configured (graceful fallback active)'}`);
  });
}
