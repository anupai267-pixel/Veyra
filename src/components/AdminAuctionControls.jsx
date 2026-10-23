import React, { useState } from 'react';
import {
  Settings,
  RotateCcw,
  Clock,
  Play,
  Calendar,
  ShieldCheck,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Flame
} from 'lucide-react';
import { useAuctions } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';

export const AdminAuctionControls = ({ auction = null, isGlobal = false, compact = false }) => {
  const { resetDemoAuction, resetAllDemoAuctions, DEMO_AUCTION_IDS } = useAuctions();
  const { user } = useAuth();

  const [unlocked, setUnlocked] = useState(() => {
    try {
      return (
        sessionStorage.getItem('veyra_demo_admin_unlocked') === 'true' ||
        localStorage.getItem('veyra_demo_admin_unlocked') === 'true'
      );
    } catch (e) {
      return false;
    }
  });

  const [showPassModal, setShowPassModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom configuration form state
  const now = new Date();
  const formatDateTimeLocal = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const defaultStartTime = formatDateTimeLocal(now);
  const defaultEndTime = formatDateTimeLocal(new Date(now.getTime() + 30 * 60000));

  const [customStart, setCustomStart] = useState(defaultStartTime);
  const [customEnd, setCustomEnd] = useState(defaultEndTime);
  const [customDuration, setCustomDuration] = useState('30');
  const [useDurationMode, setUseDurationMode] = useState(true);
  const [resetBidsOption, setResetBidsOption] = useState(true);
  const [startingBidOverride, setStartingBidOverride] = useState(auction?.startingBid ? String(auction.startingBid) : '');

  // Authorize: Admin role, admin email, or unlocked presentation session
  const isAdminRole = Boolean(
    user && (user.role === 'admin' || user.role === 'administrator' || user.email === 'admin@veyra.art' || user.isAdmin)
  );
  const isAuthorized = isAdminRole || unlocked;

  const handleUnlockSubmit = (e) => {
    e.preventDefault();
    setPassError('');
    // Accept standard demo admin credentials or presenter quick pass
    const clean = passcode.trim().toLowerCase();
    if (clean === 'veyra-admin' || clean === 'admin' || clean === 'demo2026' || clean === 'presenter') {
      try {
        sessionStorage.setItem('veyra_demo_admin_unlocked', 'true');
      } catch (err) {}
      setUnlocked(true);
      setShowPassModal(false);
      setPasscode('');
    } else {
      setPassError('Invalid admin passcode. (Hint: use "veyra-admin" or click Presenter Unlock)');
    }
  };

  const handleInstantPresenterUnlock = () => {
    try {
      sessionStorage.setItem('veyra_demo_admin_unlocked', 'true');
    } catch (err) {}
    setUnlocked(true);
    setShowPassModal(false);
  };

  // Preset quick triggers
  const handlePresetReset = async (preset) => {
    setIsSubmitting(true);
    try {
      if (auction) {
        resetDemoAuction(auction.id, { preset, resetBids: true });
      } else {
        const duration = preset === '15m' ? 15 : preset === '1h' ? 60 : preset === '2h' ? 120 : 30;
        resetAllDemoAuctions({ durationMinutes: duration });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom configuration trigger
  const handleCustomReset = (e) => {
    e.preventDefault();
    if (!auction && !isGlobal) return;

    setIsSubmitting(true);
    try {
      let config = {
        resetBids: resetBidsOption,
        startingBid: startingBidOverride ? Number(startingBidOverride) : undefined
      };

      if (useDurationMode) {
        config.durationMinutes = Math.max(1, Number(customDuration));
        config.startTimestamp = customStart ? new Date(customStart).getTime() : Date.now();
      } else {
        config.startTimestamp = new Date(customStart).getTime();
        config.endTimestamp = new Date(customEnd).getTime();
      }

      if (auction) {
        resetDemoAuction(auction.id, config);
      } else {
        resetAllDemoAuctions(config);
      }
      setExpanded(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not authorized yet, show quick unlock pill
  if (!isAuthorized) {
    return (
      <div style={{ margin: compact ? '4px 0' : '12px 0' }}>
        <button
          type="button"
          onClick={() => setShowPassModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '11.5px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: 'var(--text-secondary)',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xs)',
            cursor: 'pointer',
            transition: 'all 150ms ease'
          }}
          className="hover-burgundy"
          title="Administrator Demo Auction Controls"
        >
          <Lock size={12} color="var(--accent-burgundy)" />
          <span>Demo Admin Controls</span>
        </button>

        {/* Admin Password Modal */}
        {showPassModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-color)',
                maxWidth: '400px',
                width: '100%',
                padding: '24px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={20} color="var(--accent-burgundy)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Demo Auction Admin</h3>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                Enter administrator credentials to configure and reset demo auctions for live testing and presentations.
              </p>

              <form onSubmit={handleUnlockSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Admin Passcode
                  </label>
                  <input
                    type="password"
                    placeholder="Enter admin passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  {passError && (
                    <span style={{ fontSize: '11px', color: 'var(--error-color)', display: 'block', marginTop: '4px' }}>
                      {passError}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    type="submit"
                    className="btn btn-burgundy"
                    style={{ flex: 1, height: '38px', fontSize: '12.5px', fontWeight: 600 }}
                  >
                    Unlock Admin Tools
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassModal(false)}
                    className="btn btn-outline"
                    style={{ height: '38px', fontSize: '12.5px' }}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '12px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={handleInstantPresenterUnlock}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-burgundy)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    1-Click Presentation Quick Unlock (Demo Mode)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If this is a specific non-demo custom auction, demo reset is safely disabled
  if (auction && !DEMO_AUCTION_IDS.includes(auction.id)) {
    return null;
  }

  const currentStatus = auction?.status || 'active';
  const remainingSec = auction?.remainingSeconds ?? 0;
  const isCurrentlyActive = currentStatus === 'active' && remainingSec > 0;

  return (
    <div
      style={{
        backgroundColor: '#FCFAF7',
        border: '1px solid rgba(120, 59, 75, 0.25)',
        borderRadius: 'var(--radius-xs)',
        padding: compact ? '10px 14px' : '14px 18px',
        margin: compact ? '8px 0' : '16px 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="var(--accent-burgundy)" />
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--accent-burgundy)' }}>
            {auction ? `Demo Lot Controls (${auction.id.toUpperCase()})` : 'Demo Auction Admin Controls'}
          </span>

          {auction && (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: isCurrentlyActive ? 'rgba(40, 167, 69, 0.12)' : currentStatus === 'upcoming' ? 'rgba(255, 193, 7, 0.15)' : 'rgba(108, 117, 125, 0.12)',
                color: isCurrentlyActive ? '#1e7e34' : currentStatus === 'upcoming' ? '#856404' : '#495057'
              }}
            >
              {isCurrentlyActive ? 'LIVE' : currentStatus === 'upcoming' ? 'UPCOMING' : 'CLOSED'}
            </span>
          )}
        </div>

        {/* Quick Action Preset Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Reopen / Set:</span>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handlePresetReset('15m')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }}
            className="hover-burgundy"
            title="Open Live for 15 minutes"
          >
            15m Live
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handlePresetReset('30m')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }}
            className="hover-burgundy"
            title="Open Live for 30 minutes"
          >
            30m Live
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handlePresetReset('1h')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }}
            className="hover-burgundy"
            title="Open Live for 1 hour"
          >
            1h Live
          </button>

          {auction && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handlePresetReset('upcoming-5m')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
              className="hover-burgundy"
              title="Schedule to start in 5 minutes"
            >
              Start in 5m
            </button>
          )}

          {/* Toggle Custom Settings Drawer */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: expanded ? 'var(--accent-burgundy)' : '#FFFFFF',
              color: expanded ? '#FFFFFF' : 'var(--accent-burgundy)',
              border: '1px solid var(--accent-burgundy)',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer'
            }}
          >
            <Sliders size={11} />
            <span>{expanded ? 'Hide Config' : 'Custom Config'}</span>
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>

      {/* Expandable Custom Scheduling & Configuration Drawer */}
      {expanded && (
        <form
          onSubmit={handleCustomReset}
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px dashed rgba(120, 59, 75, 0.2)'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '12px'
            }}
          >
            {/* Start Time */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Auction Start Time
              </label>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '12px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none'
                }}
              />
            </div>

            {/* Duration Mode or End Time */}
            {useDurationMode ? (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '12px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Auction End Time
                </label>
                <input
                  type="datetime-local"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '12px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Starting Bid override */}
            {auction && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Starting Bid (INR)
                </label>
                <input
                  type="number"
                  placeholder={`Default: ₹${auction.startingBid.toLocaleString('en-IN')}`}
                  value={startingBidOverride}
                  onChange={(e) => setStartingBidOverride(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '12px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Toggle Mode & Reset Bids checkbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={resetBidsOption}
                  onChange={(e) => setResetBidsOption(e.target.checked)}
                  style={{ accentColor: 'var(--accent-burgundy)' }}
                />
                <span>Revert bid history to baseline</span>
              </label>

              <button
                type="button"
                onClick={() => setUseDurationMode(!useDurationMode)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '11px',
                  color: 'var(--accent-burgundy)',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Switch to {useDurationMode ? 'Exact End Date & Time' : 'Duration in Minutes'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-burgundy"
                style={{ height: '34px', padding: '0 16px', fontSize: '12px', fontWeight: 600 }}
              >
                {isSubmitting ? 'Configuring...' : auction ? 'Apply & Reopen Demo Lot' : 'Apply to All Demo Lots'}
              </button>

              {auction && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => resetAllDemoAuctions({ durationMinutes: 30 })}
                  className="btn btn-outline"
                  style={{ height: '34px', padding: '0 12px', fontSize: '11.5px' }}
                  title="Reopen all 4 demo lots simultaneously"
                >
                  Reset All 4 Demo Lots
                </button>
              )}
            </div>
          </div>

          <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block' }}>
            Safe Demo Mode: This action modifies only designated demo records ({DEMO_AUCTION_IDS.join(', ')}). Real user listings, orders, reviews, and database tables are protected.
          </span>
        </form>
      )}
    </div>
  );
};
