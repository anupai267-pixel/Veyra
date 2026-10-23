// ==============================================================================
// VEYRA PERSISTENT SERVER STORE & SUPABASE CONNECTOR
// Provides reliable file-persisted storage with Supabase integration when configured.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_LIVE_AUCTIONS } from '../src/data/auctions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'auctions_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache
let database = {
  auctions: [],
  bids: {},        // auctionId -> [bids]
  autoBids: {},    // auctionId -> [autoBids]
  comments: {}     // auctionId -> [comments]
};

/**
 * Initializes database with persistent file or baseline data
 */
export function initStore() {
  const now = Date.now();

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.auctions)) {
        database = parsed;
        console.log(`[Store] Loaded ${database.auctions.length} auctions from persistent storage.`);
        return;
      }
    } catch (err) {
      console.warn('[Store] Failed to load persisted database, reinitializing with baseline:', err.message);
    }
  }

  // Seed baseline from INITIAL_LIVE_AUCTIONS
  database.auctions = INITIAL_LIVE_AUCTIONS.map((auc, index) => {
    // 3 active auctions, 1 upcoming auction
    const isUpcoming = index === 3;
    const startTimestamp = isUpcoming ? now + 3600000 : now - 3600000;
    const durationMs = (auc.endsInSeconds || 7200) * 1000;
    const endTimestamp = startTimestamp + durationMs;

    return {
      id: auc.id,
      productId: auc.productId,
      name: auc.name,
      maker: auc.maker || auc.seller,
      seller: auc.seller,
      sellerId: auc.sellerId || `seller-${auc.id}`,
      provenance: auc.provenance || 'Authenticated studio masterwork',
      category: auc.category || 'Handmade',
      startingBid: auc.startingBid,
      currentBid: auc.currentBid,
      estimatedValue: auc.estimatedValue || auc.startingBid * 1.5,
      minIncrement: auc.minIncrement || 100,
      bidCount: (auc.bidHistory && auc.bidHistory.length) || 0,
      startTimestamp,
      endTimestamp,
      status: isUpcoming ? 'scheduled' : 'active',
      approvalStatus: 'approved',
      winner: null,
      image: auc.image,
      images: auc.images || [auc.image],
      description: auc.description,
      materials: auc.materials || '',
      dimensions: auc.dimensions || '',
      condition: auc.condition || 'Pristine Studio Original',
      authenticityCertificate: auc.authenticityCertificate || 'Certificate of Authenticity',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  // Seed initial bids
  INITIAL_LIVE_AUCTIONS.forEach(auc => {
    if (auc.bidHistory && auc.bidHistory.length > 0) {
      database.bids[auc.id] = auc.bidHistory.map((b, bIdx) => ({
        id: b.id || `b-${auc.id}-${bIdx}`,
        auctionId: auc.id,
        bidder: b.bidder,
        bidderId: b.bidderId || `bidder-${bIdx}`,
        amount: b.amount,
        bidType: 'manual',
        timestamp: b.timestamp || (now - (bIdx + 1) * 300000),
        time: b.time || 'Floor bid'
      }));
    } else {
      database.bids[auc.id] = [];
    }

    // Seed default comments
    database.comments[auc.id] = [
      {
        id: `c-${auc.id}-1`,
        auctionId: auc.id,
        user: 'ArchivalCurator',
        userId: 'curator-1',
        message: 'Condition report and studio cataloguing verified.',
        timestamp: now - 900000,
        time: '15m ago'
      }
    ];

    database.autoBids[auc.id] = [];
  });

  saveToDisk();
}

/**
 * Persists current database state to disk
 */
export function saveToDisk() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Store] Failed to write database to disk:', err.message);
  }
}

export const getStore = () => database;

export function getAllAuctions() {
  return [...database.auctions];
}

export function getAuctionById(id) {
  return database.auctions.find(a => a.id === id || a.productId === id) || null;
}

export function addAuction(auctionData) {
  database.auctions.unshift(auctionData);
  if (!database.bids[auctionData.id]) database.bids[auctionData.id] = [];
  if (!database.autoBids[auctionData.id]) database.autoBids[auctionData.id] = [];
  if (!database.comments[auctionData.id]) database.comments[auctionData.id] = [];
  saveToDisk();
  return auctionData;
}

export function updateAuctionRecord(id, updates) {
  const index = database.auctions.findIndex(a => a.id === id || a.productId === id);
  if (index === -1) return null;

  database.auctions[index] = {
    ...database.auctions[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  saveToDisk();
  return database.auctions[index];
}

export function getAuctionBids(auctionId) {
  return database.bids[auctionId] || [];
}

export function addAuctionBid(auctionId, bidRecord) {
  if (!database.bids[auctionId]) {
    database.bids[auctionId] = [];
  }
  database.bids[auctionId].unshift(bidRecord);
  saveToDisk();
  return bidRecord;
}

export function getAuctionAutoBids(auctionId) {
  return database.autoBids[auctionId] || [];
}

export function getUserAutoBid(auctionId, userId) {
  const list = database.autoBids[auctionId] || [];
  return list.find(ab => ab.userId === userId) || null;
}

export function setAuctionAutoBid(auctionId, autoBid) {
  if (!database.autoBids[auctionId]) {
    database.autoBids[auctionId] = [];
  }
  const existingIdx = database.autoBids[auctionId].findIndex(ab => ab.userId === autoBid.userId);
  if (existingIdx >= 0) {
    database.autoBids[auctionId][existingIdx] = {
      ...database.autoBids[auctionId][existingIdx],
      ...autoBid,
      updatedAt: new Date().toISOString()
    };
  } else {
    database.autoBids[auctionId].push({
      ...autoBid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  saveToDisk();
  return getUserAutoBid(auctionId, autoBid.userId);
}

export function deleteAuctionAutoBid(auctionId, userId) {
  if (!database.autoBids[auctionId]) return false;
  database.autoBids[auctionId] = database.autoBids[auctionId].filter(ab => ab.userId !== userId);
  saveToDisk();
  return true;
}

export function getAuctionComments(auctionId) {
  return database.comments[auctionId] || [];
}

export function addAuctionComment(auctionId, commentRecord) {
  if (!database.comments[auctionId]) {
    database.comments[auctionId] = [];
  }
  // Deduplication check: if comment with identical id or (userId + message + within 2s) exists, ignore
  const isDuplicate = database.comments[auctionId].some(c =>
    c.id === commentRecord.id ||
    (c.userId === commentRecord.userId && c.message === commentRecord.message && Math.abs(c.timestamp - commentRecord.timestamp) < 2000)
  );
  if (isDuplicate) {
    return database.comments[auctionId].find(c => c.id === commentRecord.id) || commentRecord;
  }

  database.comments[auctionId].push(commentRecord);
  saveToDisk();
  return commentRecord;
}
