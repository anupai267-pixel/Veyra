import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Clock,
  Hammer,
  Send,
  MessageSquare,
  Trophy,
  Award,
  Video,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  Heart,
  Bot,
  Sparkles,
  Loader2,
  Sliders,
  XCircle,
  Info
} from 'lucide-react';
import { useAuctions } from '../context/AuctionContext';
import { useProducts } from '../context/ProductsContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { formatINR } from '../data/products';
import { ProductGallery } from '../components/ProductGallery';
import { AuctionCallModal } from '../components/AuctionCallModal';

export const LiveAuctionRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    liveAuctions,
    placeBid,
    comments,
    sendAuctionComment,
    getLeaderboard,
    getAutoBidConfig,
    saveAutoBidConfig,
    cancelAutoBidConfig
  } = useAuctions();
  const { products } = useProducts();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Find authoritative auction
  const auction = liveAuctions.find((a) => a.id === id || a.productId === id) || liveAuctions[0];

  const minIncrement = Number(auction?.minIncrement || 50);
  const minRequiredBid = auction ? Number(auction.currentBid) + minIncrement : 0;

  // Local state
  const [customBid, setCustomBid] = useState('');
  const [bidError, setBidError] = useState('');
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);

  // Auto-Bid Form State
  const [showAutoBidModal, setShowAutoBidModal] = useState(false);
  const [autoBidMaxLimit, setAutoBidMaxLimit] = useState('');
  const [autoBidIncrement, setAutoBidIncrement] = useState(String(minIncrement));
  const [autoBidError, setAutoBidError] = useState('');
  const [isSubmittingAutoBid, setIsSubmittingAutoBid] = useState(false);

  // AI Bidding Insights State
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Active Auto-Bid Config for the current user
  const userAutoBid = useMemo(() => {
    if (!user || !auction) return null;
    return getAutoBidConfig(auction.id, user.id);
  }, [user, auction, getAutoBidConfig]);

  // Sync custom bid input when minimum required bid changes
  useEffect(() => {
    if (minRequiredBid) {
      setCustomBid(String(minRequiredBid));
    }
  }, [minRequiredBid]);

  // Initialize auto-bid increment to auction minimum
  useEffect(() => {
    if (minIncrement && !autoBidIncrement) {
      setAutoBidIncrement(String(minIncrement));
    }
  }, [minIncrement, autoBidIncrement]);

  if (!auction) {
    return (
      <div className="container" style={{ paddingTop: '80px', paddingBottom: '80px', textAlign: 'center' }}>
        <h2>Auction lot not found</h2>
        <p style={{ marginTop: '12px', marginBottom: '24px' }}>
          This lot is unavailable or has been archived.
        </p>
        <Link to="/live-auctions" className="btn btn-primary">
          Return to Live Auctions
        </Link>
      </div>
    );
  }

  const isLive = auction.status === 'active' && (auction.remainingSeconds ?? 0) > 0;
  const isUpcoming = auction.status === 'upcoming';
  const isEnded = auction.status === 'ended' || (!isLive && !isUpcoming);
  const isFavorited = isInWishlist(auction.productId || auction.id);

  // Check if current user is the seller
  const isSellerOfThisLot = Boolean(
    user &&
    (auction.sellerId === user.id ||
      (user.studio && user.studio.toLowerCase() === (auction.seller || '').toLowerCase()) ||
      (user.name && user.name.toLowerCase() === (auction.seller || '').toLowerCase()))
  );

  // Countdown formatter
  const formatCountdown = (totalSeconds) => {
    if (totalSeconds <= 0) return 'Concluded';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  };

  // Strictly deduplicated chat comments
  const rawComments = comments[auction.id] || [];
  const uniqueLotComments = useMemo(() => {
    const seen = new Set();
    return rawComments.filter((c) => {
      if (!c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [rawComments]);

  // Ranked Leaderboard
  const leaderboard = getLeaderboard(auction.id);
  const leadingBidder = leaderboard[0];

  // Winner calculation
  const winner = !isLive && leaderboard.length > 0 ? leaderboard[0] : null;

  // Determine if current user is authorized to call
  const isWinningUser =
    user &&
    winner &&
    (user.name.toLowerCase() === winner.bidder.toLowerCase() ||
      winner.bidder.includes(user.name.split(' ')[0]) ||
      winner.bidder.includes('You'));

  const isSellerUser =
    user &&
    (user.role === 'artisan' ||
      user.role === 'seller' ||
      user.studio === auction.seller ||
      user.name.toLowerCase() === auction.seller.toLowerCase());

  // Check if user is currently leading via Auto-Bid
  const isUserLeadingWithAutoBid = Boolean(
    user &&
    userAutoBid &&
    userAutoBid.isActive &&
    leadingBidder &&
    (leadingBidder.bidderId === user.id || leadingBidder.bidder === user.name) &&
    leadingBidder.bidType === 'auto'
  );

  // Handle manual bid submit
  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setBidError('');

    if (!user) {
      setBidError('Please sign in to submit authoritative bids on live lots.');
      return;
    }

    if (isSellerOfThisLot) {
      setBidError('Sellers are strictly prohibited from bidding on their own auction lots.');
      return;
    }

    const amountNum = Number(customBid);
    if (isNaN(amountNum) || amountNum < minRequiredBid) {
      setBidError(
        `Your bid must be at least ${formatINR(minRequiredBid)}. The minimum bid increment for this auction is ${formatINR(minIncrement)}.`
      );
      return;
    }

    setIsSubmittingBid(true);
    try {
      const res = await placeBid(auction.id, amountNum, user.name, user.id);
      if (!res.success) {
        setBidError(res.error || 'Bid rejected by authoritative server.');
      } else {
        setCustomBid(String(amountNum + minIncrement));
      }
    } finally {
      setIsSubmittingBid(false);
    }
  };

  // Quick preset bid buttons
  const handleQuickBid = (incrementValue) => {
    const calculated = auction.currentBid + incrementValue;
    setCustomBid(String(calculated));
  };

  // Handle chat submit with strict double-submit prevention
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    const trimmed = chatMessage.trim();
    if (!trimmed || isSendingComment) return;

    if (!user) {
      navigate('/signin?redirect=/live/' + auction.id);
      return;
    }

    setIsSendingComment(true);
    try {
      sendAuctionComment(auction.id, trimmed, user.name, user.id);
      setChatMessage('');
    } finally {
      setIsSendingComment(false);
    }
  };

  // Handle Auto-Bid Save
  const handleSaveAutoBid = async (e) => {
    e.preventDefault();
    setAutoBidError('');

    if (!user) {
      setAutoBidError('Please sign in to configure an Auto-Bid Agent.');
      return;
    }

    if (isSellerOfThisLot) {
      setAutoBidError('Sellers cannot configure Auto-Bid on their own listings.');
      return;
    }

    const maxLimitNum = Number(autoBidMaxLimit);
    const incNum = Number(autoBidIncrement || minIncrement);

    if (isNaN(maxLimitNum) || maxLimitNum <= 0) {
      setAutoBidError('Please specify a valid maximum budget limit in INR.');
      return;
    }

    if (incNum < minIncrement) {
      setAutoBidError(`Your increment cannot be less than the seller minimum increment of ${formatINR(minIncrement)}.`);
      return;
    }

    if (maxLimitNum < minRequiredBid) {
      setAutoBidError(`Your maximum limit must be at least ${formatINR(minRequiredBid)}.`);
      return;
    }

    setIsSubmittingAutoBid(true);
    try {
      await saveAutoBidConfig({
        auctionId: auction.id,
        userId: user.id,
        userName: user.name,
        maxLimit: maxLimitNum,
        preferredIncrement: incNum,
        isActive: true
      });
      setShowAutoBidModal(false);
    } catch (err) {
      setAutoBidError('Failed to save Auto-Bid configuration.');
    } finally {
      setIsSubmittingAutoBid(false);
    }
  };

  // Handle Auto-Bid Cancel
  const handleCancelAutoBid = async () => {
    if (!user) return;
    await cancelAutoBidConfig(auction.id, user.id);
  };

  // Request AI Bidding Insights
  const handleFetchAiInsights = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const response = await fetch('/api/ai/bidding-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: auction.name,
          currentBid: auction.currentBid,
          startingBid: auction.startingBid,
          minIncrement,
          bidCount: auction.bidCount,
          remainingSeconds: auction.remainingSeconds,
          recentBids: auction.bidHistory || []
        })
      });

      const data = await response.json();
      if (data.success && data.insights) {
        setAiInsights(data.insights);
      } else {
        setAiError(data.error || 'AI Insights currently unavailable.');
      }
    } catch (err) {
      setAiError('Could not connect to AI insights server.');
    } finally {
      setAiLoading(false);
    }
  };

  // Similar products for the left column
  const similarProducts = products
    .filter((p) => p.category === auction.category && p.id !== auction.productId)
    .slice(0, 3);

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: 'calc(100vh - 120px)', paddingBottom: '80px' }}>
      {/* Top Breadcrumb & Live Strip */}
      <div
        style={{
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: '#FFFFFF',
          padding: '12px 0'
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {/* Back Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link
              to="/live-auctions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--text-secondary)'
              }}
              className="hover-burgundy"
            >
              <ArrowLeft size={14} />
              <span>All Live Auctions</span>
            </Link>

            <span style={{ color: 'var(--border-color)' }}>/</span>

            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 500 }}>
              LOT #{auction.id.toUpperCase()}
            </span>
          </div>

          {/* Right Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isLive ? (
              <span className="badge-live">
                <span className="dot" />
                <span>Synchronized Room Live</span>
              </span>
            ) : isUpcoming ? (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  padding: '3px 8px',
                  backgroundColor: 'rgba(255, 193, 7, 0.15)',
                  color: '#856404',
                  borderRadius: 'var(--radius-xs)'
                }}
              >
                UPCOMING SESSION
              </span>
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  padding: '3px 8px',
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-xs)'
                }}
              >
                AUCTION CONCLUDED
              </span>
            )}

            <button
              onClick={() =>
                toggleWishlist({
                  id: auction.productId || auction.id,
                  name: auction.name,
                  image: auction.image,
                  price: auction.currentBid,
                  category: auction.category
                })
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <Heart size={14} fill={isFavorited ? 'var(--accent-burgundy)' : 'none'} color="var(--accent-burgundy)" />
              <span>{isFavorited ? 'Saved' : 'Watch Lot'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '28px' }}>
        {/* 3-Column Studio Grid Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(260px, 310px) minmax(320px, 1fr) minmax(280px, 330px)',
            gap: '24px',
            alignItems: 'start'
          }}
          className="live-room-grid"
        >
          {/* ========================================================
              LEFT COLUMN: Product Information & Live Comments / Feed
              ======================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Atelier & Provenance Specs Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                padding: '20px'
              }}
            >
              <span className="eyebrow" style={{ marginBottom: '8px' }}>
                Lot Provenance & Condition
              </span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '8px' }}>
                {auction.name}
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                {auction.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Maker / Studio:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{auction.maker || auction.seller}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{auction.category}</span>
                </div>
                {auction.dimensions && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Dimensions:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{auction.dimensions}</span>
                  </div>
                )}
                {auction.materials && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Materials:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{auction.materials}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Min Increment:</span>
                  <strong style={{ color: 'var(--accent-burgundy)' }}>+{formatINR(minIncrement)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Condition:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{auction.condition || 'Studio Original'}</span>
                </div>
              </div>
            </div>

            {/* Live Chat & Floor Notes Card (Strictly Deduplicated) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                padding: '16px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={16} color="var(--accent-burgundy)" />
                  <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Auction Floor Notes</h3>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {uniqueLotComments.length} messages
                </span>
              </div>

              {/* Messages Scroll Area */}
              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  paddingRight: '4px',
                  marginBottom: '14px'
                }}
              >
                {uniqueLotComments.length > 0 ? (
                  uniqueLotComments.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border-color)',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{msg.user}</strong>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{msg.time}</span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {msg.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0' }}>
                    No comments yet. Share an inquiry or floor note below.
                  </p>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder={user ? 'Post a note to the floor...' : 'Sign in to post notes'}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  disabled={isSendingComment}
                  style={{
                    flex: 1,
                    height: '36px',
                    padding: '0 10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '12px',
                    outline: 'none',
                    backgroundColor: 'var(--bg-primary)'
                  }}
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim() || isSendingComment}
                  className="btn btn-burgundy btn-sm"
                  style={{ height: '36px', width: '40px', padding: 0 }}
                  title="Send floor note"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>

            {/* Similar Products */}
            {similarProducts.length > 0 && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '16px'
                }}
              >
                <span className="eyebrow" style={{ marginBottom: '8px', fontSize: '10px' }}>
                  Related Lots from Atelier
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {similarProducts.map((sp) => (
                    <Link
                      key={sp.id}
                      to={`/product/${sp.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px',
                        borderRadius: 'var(--radius-xs)',
                        transition: 'background-color 150ms ease'
                      }}
                      className="hover-bg-primary"
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: 'var(--radius-xs)',
                          overflow: 'hidden',
                          backgroundColor: 'var(--surface-secondary)',
                          flexShrink: 0
                        }}
                      >
                        <img src={sp.image} alt={sp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sp.name}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--accent-burgundy)', fontWeight: 600 }}>
                          {formatINR(sp.price)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              CENTER COLUMN: Main Showcase Gallery & Bidding Controls
              ======================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Image Gallery Frame */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                padding: '16px'
              }}
            >
              <ProductGallery
                images={auction.images || [auction.image]}
                fallbackImage={auction.image}
                alt={auction.name}
                aspectRatio="16 / 11"
              />
            </div>

            {/* Bidding Core Arena Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                padding: 'clamp(20px, 3vw, 28px)'
              }}
            >
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <span className="eyebrow" style={{ marginBottom: '2px' }}>
                    Authoritative Bidding Hall
                  </span>
                  <h1 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', margin: 0 }}>
                    {auction.name}
                  </h1>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Studio Workshop: <strong>{auction.seller || auction.maker}</strong>
                  </span>
                </div>

                {/* Live Countdown Display */}
                <div
                  style={{
                    backgroundColor: isLive
                      ? 'rgba(120, 59, 75, 0.08)'
                      : isUpcoming
                      ? 'rgba(255, 193, 7, 0.12)'
                      : 'var(--surface-secondary)',
                    border: `1px solid ${
                      isLive
                        ? 'rgba(120, 59, 75, 0.25)'
                        : isUpcoming
                        ? 'rgba(255, 193, 7, 0.35)'
                        : 'var(--border-color)'
                    }`,
                    borderRadius: 'var(--radius-xs)',
                    padding: '8px 14px',
                    textAlign: 'right'
                  }}
                >
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', display: 'block' }}>
                    {isLive ? 'Time Remaining' : isUpcoming ? 'Bidding Opens In' : 'Auction State'}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: isLive ? 'var(--accent-burgundy)' : isUpcoming ? '#856404' : 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    <Clock size={16} />
                    <span>{formatCountdown(auction.remainingSeconds)}</span>
                  </div>
                </div>
              </div>

              {/* Price & Bid Stats Metric Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '16px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', display: 'block' }}>
                    Current Highest Bid
                  </span>
                  <strong style={{ fontSize: '1.45rem', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatINR(auction.currentBid)}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', display: 'block' }}>
                    Minimum Next Bid
                  </span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--accent-burgundy)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatINR(minRequiredBid)}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', display: 'block' }}>
                    Total Bids Accepted
                  </span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                    {auction.bidCount} Bids
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', display: 'block' }}>
                    Seller Min Increment
                  </span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                    +{formatINR(minIncrement)}
                  </strong>
                </div>
              </div>

              {/* AI Tactical Bidding Insights Strip */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(120, 59, 75, 0.2)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '12px 14px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="var(--accent-burgundy)" />
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--accent-burgundy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      AI Bidding Floor Insights
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchAiInsights}
                    disabled={aiLoading}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--accent-burgundy)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {aiLoading ? <Loader2 size={12} className="spinning" /> : <Sparkles size={12} />}
                    <span>{aiInsights ? 'Refresh Analysis' : 'Analyze Momentum'}</span>
                  </button>
                </div>

                {aiInsights ? (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {aiInsights}
                  </p>
                ) : aiError ? (
                  <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {aiError} Ordinary manual and automated bidding remain 100% active.
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Click "Analyze Momentum" to retrieve tactical commentary on floor activity and next valid bid.
                  </p>
                )}
              </div>

              {/* BIDDING CONTROLS OR CONCLUDED STATE */}
              {isLive ? (
                <div>
                  {/* Seller Warning if Viewing Own Lot */}
                  {isSellerOfThisLot && (
                    <div
                      style={{
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid rgba(255, 193, 7, 0.4)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '10px 14px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#856404'
                      }}
                    >
                      <AlertCircle size={15} />
                      <span>You are registered as the artisan/seller of this lot. Sellers cannot place bids on their own listings.</span>
                    </div>
                  )}

                  {/* Manual Bid Form */}
                  <form onSubmit={handleBidSubmit}>
                    {/* Suggested Increments */}
                    <div style={{ marginBottom: '14px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                        Suggested Next Floor Bids
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleQuickBid(minIncrement)}
                          disabled={isSellerOfThisLot}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, minWidth: '90px', fontWeight: 600 }}
                        >
                          +{formatINR(minIncrement)}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickBid(minIncrement * 2)}
                          disabled={isSellerOfThisLot}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, minWidth: '90px', fontWeight: 600 }}
                        >
                          +{formatINR(minIncrement * 2)}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickBid(minIncrement * 5)}
                          disabled={isSellerOfThisLot}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, minWidth: '90px', fontWeight: 600 }}
                        >
                          +{formatINR(minIncrement * 5)}
                        </button>
                      </div>
                    </div>

                    {/* Custom Bid Input & Submit */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Custom Bid Amount (INR) — Minimum valid: {formatINR(minRequiredBid)}
                      </label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                            ₹
                          </span>
                          <input
                            type="number"
                            step={minIncrement}
                            min={minRequiredBid}
                            disabled={isSellerOfThisLot}
                            value={customBid}
                            onChange={(e) => setCustomBid(e.target.value)}
                            placeholder={`Enter at least ${minRequiredBid}`}
                            style={{
                              width: '100%',
                              height: '44px',
                              paddingLeft: '28px',
                              paddingRight: '12px',
                              border: '1.5px solid var(--border-color)',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: '15px',
                              fontWeight: 600,
                              outline: 'none',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSellerOfThisLot || isSubmittingBid}
                          className="btn btn-burgundy"
                          style={{
                            height: '44px',
                            padding: '0 22px',
                            fontWeight: 600,
                            fontSize: '13px',
                            letterSpacing: '0.04em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {isSubmittingBid ? <Loader2 size={15} className="spinning" /> : <Hammer size={16} />}
                          <span>Submit Official Bid</span>
                        </button>
                      </div>

                      {bidError && (
                        <p style={{ color: 'var(--error-color)', fontSize: '12px', marginTop: '6px', margin: '6px 0 0' }}>
                          {bidError}
                        </p>
                      )}
                    </div>
                  </form>

                  {/* ========================================================
                      AI AUTO-BID AGENT CONFIGURATION PANEL (SECTION 5)
                      ======================================================== */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '18px',
                      marginTop: '18px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bot size={18} color="var(--accent-burgundy)" />
                        <div>
                          <h4 style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                            AI Auto-Bid Agent
                          </h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Server-side autonomous counter-bidding within your maximum budget
                          </span>
                        </div>
                      </div>

                      {!userAutoBid ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!user) {
                              navigate('/signin?redirect=/live/' + auction.id);
                              return;
                            }
                            setShowAutoBidModal(true);
                          }}
                          disabled={isSellerOfThisLot}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '12px', height: '32px' }}
                        >
                          Configure Auto-Bid
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setAutoBidMaxLimit(String(userAutoBid.maxLimit));
                              setAutoBidIncrement(String(userAutoBid.preferredIncrement));
                              setShowAutoBidModal(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11.5px', height: '30px', padding: '0 8px' }}
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelAutoBid}
                            className="btn btn-sm"
                            style={{
                              fontSize: '11.5px',
                              height: '30px',
                              padding: '0 8px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: '#FFF',
                              color: 'var(--error-color)'
                            }}
                          >
                            Disable
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Active Auto-Bid Status Badge */}
                    {userAutoBid && (
                      <div
                        style={{
                          backgroundColor: isUserLeadingWithAutoBid ? 'rgba(76, 175, 80, 0.08)' : 'var(--bg-primary)',
                          border: `1px solid ${isUserLeadingWithAutoBid ? '#B8D4BE' : 'var(--border-color)'}`,
                          borderRadius: 'var(--radius-xs)',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} color={isUserLeadingWithAutoBid ? '#2e7d32' : 'var(--accent-burgundy)'} />
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                              Auto-Bid Agent Active: Max Limit {formatINR(userAutoBid.maxLimit)}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Preferred Increment: +{formatINR(userAutoBid.preferredIncrement)} • Limit is strictly confidential
                            </span>
                          </div>
                        </div>

                        {isUserLeadingWithAutoBid && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: '#2e7d32',
                              backgroundColor: '#E8F5E9',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-xs)'
                            }}
                          >
                            AGENT CURRENTLY LEADING
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : isUpcoming ? (
                /* Scheduled State */
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '24px',
                    textAlign: 'center'
                  }}
                >
                  <Clock size={32} color="var(--accent-burgundy)" style={{ margin: '0 auto 10px' }} />
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '6px' }}>Auction Scheduled — Opens Soon</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    This lot opens in <strong>{formatCountdown(auction.remainingSeconds)}</strong>. Starting bid is set at <strong>{formatINR(auction.startingBid)}</strong>.
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                    <ShieldCheck size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                    Terminal bidding controls will activate automatically as soon as the scheduled start time arrives.
                  </p>
                </div>
              ) : (
                /* Concluded State */
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1.5px solid var(--accent-burgundy)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '24px',
                    textAlign: 'center'
                  }}
                >
                  <Trophy size={32} color="var(--accent-burgundy)" style={{ margin: '0 auto 10px' }} />
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Auction Successfully Concluded</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Winning Bidder: <strong style={{ color: 'var(--text-primary)' }}>{winner?.bidder || 'Authoritative Bidder'}</strong> with final hammer price of <strong>{formatINR(auction.currentBid)}</strong>.
                  </p>

                  {(isWinningUser || isSellerUser) ? (
                    <button
                      onClick={() => setCallModalOpen(true)}
                      className="btn btn-burgundy"
                      style={{ height: '42px', padding: '0 24px', fontSize: '13px', gap: '8px' }}
                    >
                      <Video size={16} />
                      <span>{isWinningUser ? 'Initiate Private Call with Maker' : 'Enter Winner Video Consultation'}</span>
                    </button>
                  ) : (
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                      Post-auction video consultations are reserved for the winning collector and artisan workshop.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: Maximum Bid & Live Leaderboard
              ======================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top: Current Maximum Bid Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="eyebrow" style={{ margin: 0 }}>
                  High Bid Authority
                </span>
                <span className="badge-tag">
                  {auction.bidCount} Bids Total
                </span>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', display: 'block' }}>
                  Leading Accepted Amount
                </span>
                <span style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatINR(auction.currentBid)}
                </span>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: '12px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Leader:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{leadingBidder?.bidder || 'Pierre Curator'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Bid Type:</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: leadingBidder?.bidType === 'auto' ? 'var(--accent-burgundy)' : 'var(--text-secondary)' }}>
                    {leadingBidder?.bidType === 'auto' ? 'Auto-Bid Agent' : 'Floor Bid'}
                  </span>
                </div>
              </div>

              {/* Collapsible Complete Bid Audit History */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--accent-burgundy)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer'
                }}
              >
                <span>{showHistory ? 'Hide Complete Bid Audit' : 'View Complete Bid Audit'}</span>
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showHistory && (
                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '10px',
                    marginTop: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {auction.bidHistory && auction.bidHistory.length > 0 ? (
                    auction.bidHistory.map((bh) => (
                      <div
                        key={bh.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11.5px',
                          padding: '6px 0',
                          borderBottom: '1px dashed var(--border-color)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{bh.bidder}</strong>
                            {bh.bidType === 'auto' && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  backgroundColor: 'rgba(120, 59, 75, 0.1)',
                                  color: 'var(--accent-burgundy)',
                                  borderRadius: 'var(--radius-xs)'
                                }}
                              >
                                AUTO
                              </span>
                            )}
                          </div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px' }}>{bh.time}</span>
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatINR(bh.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No bids recorded yet.</span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom: Live Leaderboard */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Trophy size={18} color="var(--accent-burgundy)" />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Live Leaderboard</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry) => (
                    <div
                      key={entry.rank}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: entry.isLeading ? 'rgba(120, 59, 75, 0.04)' : 'var(--bg-primary)',
                        border: entry.isLeading ? '1px solid var(--accent-burgundy)' : '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: entry.rank === 1 ? 'var(--accent-burgundy)' : 'var(--border-color)',
                            color: entry.rank === 1 ? '#FFFFFF' : 'var(--text-primary)'
                          }}
                        >
                          {entry.rank}
                        </span>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                            {entry.bidder}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {entry.bidType === 'auto' ? 'Auto-Bid Agent' : 'Floor Bid'}
                          </span>
                        </div>
                      </div>

                      <strong style={{ fontSize: '13px', color: entry.isLeading ? 'var(--accent-burgundy)' : 'var(--text-primary)' }}>
                        {formatINR(entry.amount)}
                      </strong>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
                    Opening bids pending.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Bid Configuration Modal */}
      {showAutoBidModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-xs)',
              width: '100%',
              maxWidth: '480px',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Bot size={22} color="var(--accent-burgundy)" />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', margin: 0 }}>
                Configure Auto-Bid Agent
              </h3>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Your Auto-Bid Agent will monitor the live floor and place counter-bids on your behalf whenever a competing bid arrives, up to your absolute maximum limit.
            </p>

            <form onSubmit={handleSaveAutoBid}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="maxLimit">
                  Maximum Bid Budget (INR) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    ₹
                  </span>
                  <input
                    id="maxLimit"
                    type="number"
                    min={minRequiredBid}
                    step={minIncrement}
                    value={autoBidMaxLimit}
                    onChange={(e) => setAutoBidMaxLimit(e.target.value)}
                    placeholder={`e.g. ${auction.currentBid + minIncrement * 10}`}
                    className="form-input"
                    style={{ paddingLeft: '28px' }}
                    required
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  The agent will never exceed this ceiling. This limit is strictly confidential.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" htmlFor="preferredInc">
                  Preferred Automatic Increment (INR)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    ₹
                  </span>
                  <input
                    id="preferredInc"
                    type="number"
                    min={minIncrement}
                    step={minIncrement}
                    value={autoBidIncrement}
                    onChange={(e) => setAutoBidIncrement(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '28px' }}
                    required
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  Seller's minimum increment is {formatINR(minIncrement)}. Your preferred increment cannot be lower.
                </span>
              </div>

              {/* Clear summary preview */}
              {autoBidMaxLimit && Number(autoBidMaxLimit) >= minRequiredBid && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px dashed var(--accent-burgundy)',
                    marginBottom: '20px',
                    fontSize: '12px'
                  }}
                >
                  <strong style={{ color: 'var(--accent-burgundy)', display: 'block', marginBottom: '4px' }}>
                    Agent Execution Summary
                  </strong>
                  <span>Next counter-bid: <strong>{formatINR(minRequiredBid)}</strong></span>
                  <br />
                  <span>Maximum ceiling: <strong>{formatINR(Number(autoBidMaxLimit))}</strong></span>
                </div>
              )}

              {autoBidError && (
                <p style={{ color: 'var(--error-color)', fontSize: '12px', marginBottom: '16px' }}>
                  {autoBidError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAutoBidModal(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '38px', padding: '0 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAutoBid}
                  className="btn btn-burgundy btn-sm"
                  style={{ height: '38px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSubmittingAutoBid && <Loader2 size={13} className="spinning" />}
                  <span>Activate Auto-Bid Agent</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WebRTC Video Call Modal */}
      {callModalOpen && (
        <AuctionCallModal
          isOpen={callModalOpen}
          onClose={() => setCallModalOpen(false)}
          auction={auction}
          currentUser={user}
        />
      )}
    </div>
  );
};
