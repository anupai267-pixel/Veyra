-- ==============================================================================
-- VEYRA MARKETPLACE: AUCTIONS, BIDS, AUTO-BIDS & COMMENTS SCHEMA WITH RLS
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AUCTIONS TABLE
CREATE TABLE IF NOT EXISTS public.auctions (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    name TEXT NOT NULL,
    maker TEXT,
    seller TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    location TEXT DEFAULT 'Studio Atelier',
    provenance TEXT,
    category TEXT DEFAULT 'Handmade',
    starting_bid NUMERIC NOT NULL CHECK (starting_bid > 0),
    current_bid NUMERIC NOT NULL CHECK (current_bid >= starting_bid),
    estimated_value NUMERIC CHECK (estimated_value >= starting_bid),
    min_increment NUMERIC NOT NULL DEFAULT 50 CHECK (min_increment > 0),
    bid_count INTEGER NOT NULL DEFAULT 0 CHECK (bid_count >= 0),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    winner_id TEXT,
    winner_name TEXT,
    winner_amount NUMERIC,
    image TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    materials TEXT,
    dimensions TEXT,
    condition TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_start_end ON public.auctions(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON public.auctions(seller_id);

-- 2. BIDS TABLE
CREATE TABLE IF NOT EXISTS public.bids (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    bidder_id TEXT NOT NULL,
    bidder_name TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    bid_type TEXT NOT NULL DEFAULT 'manual' CHECK (bid_type IN ('manual', 'auto')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bids_auction_created ON public.bids(auction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_auction_amount ON public.bids(auction_id, amount DESC);

-- 3. AUTO-BIDS TABLE (STRICTLY PRIVATE TO BUYER)
CREATE TABLE IF NOT EXISTS public.auto_bids (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    max_limit NUMERIC NOT NULL CHECK (max_limit > 0),
    preferred_increment NUMERIC NOT NULL CHECK (preferred_increment > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_auction_user_autobid UNIQUE (auction_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_auto_bids_auction_active ON public.auto_bids(auction_id, is_active);
CREATE INDEX IF NOT EXISTS idx_auto_bids_user_id ON public.auto_bids(user_id);

-- 4. AUCTION COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.auction_comments (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auction_comments_auction ON public.auction_comments(auction_id, created_at ASC);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_comments ENABLE ROW LEVEL SECURITY;

-- Auctions:
-- Public can view approved auctions; sellers can view their own pending/approved auctions
CREATE POLICY "Public can view approved auctions"
ON public.auctions FOR SELECT
USING (approval_status = 'approved' OR auth.uid()::text = seller_id);

CREATE POLICY "Authenticated users can create auctions"
ON public.auctions FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = seller_id);

CREATE POLICY "Sellers can update their own scheduled auctions"
ON public.auctions FOR UPDATE
TO authenticated
USING (auth.uid()::text = seller_id AND status = 'scheduled')
WITH CHECK (auth.uid()::text = seller_id);

-- Bids:
-- Public can view bids history and leaderboard
CREATE POLICY "Public can view bids"
ON public.bids FOR SELECT
USING (true);

-- Authenticated users can insert bids (seller cannot bid on own auction)
CREATE POLICY "Authenticated users can place bids"
ON public.bids FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid()::text = bidder_id AND
    NOT EXISTS (
        SELECT 1 FROM public.auctions
        WHERE id = auction_id AND seller_id = auth.uid()::text
    )
);

-- Auto-bids:
-- STRICTLY PRIVATE: Buyers can only view, insert, update, delete their OWN auto-bids
CREATE POLICY "Buyers can view their own auto-bids"
ON public.auto_bids FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Buyers can insert their own auto-bids"
ON public.auto_bids FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Buyers can update their own auto-bids"
ON public.auto_bids FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Buyers can delete their own auto-bids"
ON public.auto_bids FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);

-- Auction Comments:
-- Public can read comments
CREATE POLICY "Public can view auction comments"
ON public.auction_comments FOR SELECT
USING (true);

-- Authenticated users can post comments
CREATE POLICY "Authenticated users can add comments"
ON public.auction_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);
