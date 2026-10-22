import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Check,
  Bell,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useAuctions } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../data/products';

export const Schedule = () => {
  const {
    upcomingAuctions,
    registrations,
    reminders,
    toggleRegistration,
    toggleReminder
  } = useAuctions();

  const { user } = useAuth();

  // Find all registered lots
  const registeredLots = upcomingAuctions.filter((a) => registrations.includes(a.id));

  // Find all reminded lots
  const reminderLots = upcomingAuctions.filter((a) => reminders.includes(a.id));

  // Union of all tracked lots
  const allScheduledIds = Array.from(new Set([...registrations, ...reminders]));
  const allScheduledLots = upcomingAuctions.filter((a) => allScheduledIds.includes(a.id));

  return (
    <div style={{ paddingTop: '40px', paddingBottom: '96px', backgroundColor: 'var(--bg-primary)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ maxWidth: '680px', marginBottom: '36px' }}>
          <span className="eyebrow">Collector Itinerary</span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', marginBottom: '10px' }}>
            Auction Schedule & Reminders
          </h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Manage your registered bidding paddles and in-app calendar reminders for forthcoming catalog openings.
          </p>
        </div>

        {/* Authentication Notice if Guest */}
        {!user && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              padding: '16px 20px',
              marginBottom: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} color="var(--accent-burgundy)" />
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                You are currently managing local browser reminders. Sign in to synchronize your bidding registrations across all collector terminals.
              </span>
            </div>
            <Link to="/signin?redirect=/schedule" className="btn btn-burgundy btn-sm">
              Sign In to Synchronize
            </Link>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginBottom: '40px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              padding: '20px'
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
              Registered Bidding Passes
            </span>
            <strong style={{ fontSize: '1.85rem', color: 'var(--text-primary)' }}>
              {registeredLots.length}
            </strong>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              padding: '20px'
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
              Active Calendar Alerts
            </span>
            <strong style={{ fontSize: '1.85rem', color: 'var(--accent-burgundy)' }}>
              {reminderLots.length}
            </strong>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              padding: '20px'
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
              Next Opening Session
            </span>
            <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>
              {allScheduledLots[0]?.scheduledDate || 'No pending sessions'}
            </strong>
          </div>
        </div>

        {/* Scheduled Lots List */}
        {allScheduledLots.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {allScheduledLots.map((auction) => {
              const isReg = registrations.includes(auction.id);
              const isRem = reminders.includes(auction.id);

              return (
                <div
                  key={auction.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '24px'
                  }}
                  className="card-interactive"
                >
                  {/* Left: Thumbnail & Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: '1 1 340px' }}>
                    <div
                      style={{
                        width: '90px',
                        height: '90px',
                        borderRadius: 'var(--radius-xs)',
                        overflow: 'hidden',
                        backgroundColor: 'var(--surface-secondary)',
                        flexShrink: 0
                      }}
                    >
                      <img
                        src={auction.thumbnail || auction.image}
                        alt={auction.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className="badge-tag">{auction.category}</span>
                        {isReg && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: 'var(--success-color)',
                              backgroundColor: 'var(--badge-shipping-bg)',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-xs)'
                            }}
                          >
                            Pass Confirmed
                          </span>
                        )}
                        {isRem && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: 'var(--accent-burgundy)',
                              backgroundColor: 'rgba(120, 59, 75, 0.08)',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-xs)'
                            }}
                          >
                            Alert Active
                          </span>
                        )}
                      </div>

                      <Link to={`/product/${auction.productId || auction.id}`}>
                        <h3
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '1.25rem',
                            fontWeight: 500,
                            lineHeight: 1.25,
                            margin: '4px 0',
                            color: 'var(--text-primary)'
                          }}
                          className="hover-burgundy"
                        >
                          {auction.name}
                        </h3>
                      </Link>

                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                        Atelier:{' '}
                        {auction.sellerId ? (
                          <Link to={`/seller/`} className="hover-burgundy" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {auction.seller || auction.maker}
                          </Link>
                        ) : (
                          <strong style={{ color: 'var(--text-primary)' }}>{auction.seller || auction.maker}</strong>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Center: Scheduled Date & Time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' }}>
                    <Calendar size={18} color="var(--accent-burgundy)" />
                    <div>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'block' }}>
                        Opening Session
                      </span>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {auction.scheduledDate}
                      </strong>
                    </div>
                  </div>

                  {/* Starting Valuation */}
                  <div style={{ minWidth: '120px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'block' }}>
                      Starting Bid
                    </span>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                      {formatINR(auction.startingBid)}
                    </strong>
                  </div>

                  {/* Actions: Cancel Registration, Toggle Reminder, View Product */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {isReg ? (
                      <button
                        onClick={() => toggleRegistration(auction.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ height: '36px', fontSize: '11.5px', color: 'var(--error-color)' }}
                        title="Cancel registration"
                      >
                        Cancel Registration
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleRegistration(auction.id)}
                        className="btn btn-burgundy btn-sm"
                        style={{ height: '36px', fontSize: '11.5px' }}
                      >
                        Register
                      </button>
                    )}

                    <button
                      onClick={() => toggleReminder(auction.id)}
                      className={`btn ${isRem ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ height: '36px', fontSize: '11.5px', gap: '6px' }}
                    >
                      {isRem ? <Check size={13} /> : <Bell size={13} />}
                      <span>{isRem ? 'Alert Active' : 'Set Alert'}</span>
                    </button>

                    <Link
                      to={`/product/${auction.productId || auction.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ height: '36px', fontSize: '11.5px', gap: '6px' }}
                    >
                      <Eye size={13} />
                      <span>View Object</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 20px',
              backgroundColor: '#FFFFFF',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-xs)'
            }}
          >
            <Calendar size={32} color="var(--text-secondary)" style={{ margin: '0 auto 12px', opacity: 0.7 }} />
            <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Your schedule is clear</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 24px' }}>
              You have not registered for any upcoming auctions or set alerts. Explore our scheduled lots to reserve your bidding passes.
            </p>
            <Link to="/upcoming-lots" className="btn btn-burgundy">
              Browse Upcoming Lots
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
