import React from 'react';
import { Link } from 'react-router-dom';
import { formatINR } from '../data/products';
import { useAuctions } from '../context/AuctionContext';
import { Bell, Check, Calendar, Eye } from 'lucide-react';

export const UpcomingAuctionRow = ({ auction }) => {
  const { isReminderSet, toggleReminder, isRegistered, toggleRegistration } = useAuctions();

  const reminderActive = isReminderSet(auction.id);
  const registered = isRegistered(auction.id);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        padding: '20px 0',
        borderBottom: '1px solid var(--border-color)',
        transition: 'background-color 150ms ease'
      }}
      className="upcoming-auction-row"
    >
      {/* Left Thumbnail & Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: '1 1 320px' }}>
        <div
          style={{
            width: '84px',
            height: '84px',
            flexShrink: 0,
            borderRadius: 'var(--radius-xs)',
            overflow: 'hidden',
            backgroundColor: 'var(--surface-secondary)'
          }}
        >
          <img
            src={auction.thumbnail || auction.image}
            alt={auction.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div>
          <span className="badge-tag" style={{ marginBottom: '4px' }}>
            {auction.category}
          </span>
          <Link to={`/product/${auction.productId || auction.id}`}>
            <h4
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.2rem',
                fontWeight: 500,
                lineHeight: 1.25,
                margin: '4px 0',
                color: 'var(--text-primary)'
              }}
              className="hover-burgundy"
            >
              {auction.name}
            </h4>
          </Link>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>
            Atelier:{' '}
            {auction.sellerId ? (
              <Link
                to={`/seller/${auction.sellerId}`}
                className="hover-burgundy"
                style={{ color: 'var(--text-secondary)', fontWeight: 500 }}
              >
                {auction.seller || auction.maker}
              </Link>
            ) : (
              <span>{auction.seller || auction.maker}</span>
            )}
            {auction.curatorNote ? ` — ${auction.curatorNote}` : ''}
          </p>
        </div>
      </div>

      {/* Middle: Schedule */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
        <Calendar size={15} color="var(--accent-burgundy)" />
        <div>
          <span
            style={{
              fontSize: '10px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              display: 'block'
            }}
          >
            Opening Session
          </span>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-primary)' }}>
            {auction.scheduledDate}
          </span>
        </div>
      </div>

      {/* Right: Starting Bid & Actions (Register, Set Reminder, Shop) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ marginRight: '8px' }}>
          <span
            style={{
              fontSize: '10px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              display: 'block'
            }}
          >
            Starting Bid
          </span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatINR(auction.startingBid)}
          </span>
        </div>

        {/* 1. Register Action */}
        <button
          onClick={() => toggleRegistration(auction.id)}
          className={`btn ${registered ? 'btn-primary' : 'btn-burgundy'} btn-sm`}
          style={{ height: '36px', fontSize: '12px' }}
        >
          {registered ? <Check size={13} /> : null}
          <span>{registered ? 'Registered' : 'Register'}</span>
        </button>

        {/* 2. Set Reminder Action */}
        <button
          onClick={() => toggleReminder(auction.id)}
          className={`btn ${reminderActive ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ height: '36px', gap: '6px', fontSize: '12px' }}
          aria-label={reminderActive ? `Reminder active for ${auction.name}` : `Set reminder for ${auction.name}`}
        >
          {reminderActive ? <Check size={13} /> : <Bell size={13} />}
          <span>{reminderActive ? 'Reminder Set' : 'Remind Me'}</span>
        </button>

        {/* 3. Shop Action */}
        <Link
          to={`/product/${auction.productId || auction.id}`}
          className="btn btn-secondary btn-sm"
          style={{ height: '36px', gap: '4px', fontSize: '12px' }}
          title="Inspect object"
        >
          <Eye size={13} />
          <span>Shop</span>
        </Link>
      </div>
    </div>
  );
};
