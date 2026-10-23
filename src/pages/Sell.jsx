import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext';
import { useAuctions } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../data/products';
import {
  Upload,
  CheckCircle2,
  ArrowRight,
  Eye,
  Camera,
  Trash2,
  Gavel,
  ShoppingBag,
  Store,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  ShieldCheck,
  Loader2,
  Lock,
  Tag,
  MapPin,
  Sparkles
} from 'lucide-react';

const MAX_IMAGES = 6;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Curated image presets for easy high-resolution demonstrations
const CURATED_IMAGE_PRESETS = [
  {
    label: 'Studio Teak & Cane Chair',
    url: 'https://images.unsplash.com/photo-1580481077195-c3a821a58875?auto=format&fit=crop&w=1000&q=80'
  },
  {
    label: 'Carved Basalt Basin',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80'
  },
  {
    label: 'Silver Ewer & Basin',
    url: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1000&q=80'
  },
  {
    label: 'Soapstone Vessel',
    url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80'
  }
];

export const Sell = () => {
  const navigate = useNavigate();
  const { addProduct, customProducts } = useProducts();
  const { createAuctionLot } = useAuctions();
  const { user } = useAuth();

  const fileInputRef = useRef(null);

  // Authoritative seller name from authenticated user profile
  const defaultSellerName = useMemo(() => {
    if (!user) return 'Studio Atelier';
    if (user.studio && user.studio.trim()) return user.studio.trim();
    if (user.name && user.name !== 'Complete your profile') return user.name.trim();
    return 'Studio Atelier';
  }, [user]);

  // Default start date (tomorrow) and start time (18:00)
  const defaultStartDate = useMemo(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  }, []);
  const defaultStartTime = '18:00';

  // Toggle between Marketplace Sale ('direct') and Live Auction Lot ('auction')
  const [listingType, setListingType] = useState('auction');

  // Form fields state
  const [formData, setFormData] = useState({
    name: 'Archival Chandigarh Teak & Cane Lounge Chair',
    seller: defaultSellerName,
    location: 'Chandigarh, India',
    category: 'Handmade',
    price: 45000,          // Estimated Lot Value in INR (or direct price)
    startingBid: 28000,    // Starting Bid in INR
    startDate: defaultStartDate,
    startTime: defaultStartTime,
    durationDays: 3,       // Duration in Days (supports decimals e.g. 0.5, 1, 2.5, 3)
    description: 'Original solid Burma teak framework with renewed hand-woven natural cane seating. Features documented stenciled archival inventory markings on the rear apron.',
    materials: 'Aged reclaimed Burma teak, natural hand-woven cane',
    dimensions: '78cm H × 51cm W × 54cm D',
    provenance: 'Certified masterwork from Chandigarh architectural restoration',
    condition: 'Pristine Museum Restored'
  });

  // Images state (up to 6 images)
  const [images, setImages] = useState([
    'https://images.unsplash.com/photo-1580481077195-c3a821a58875?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1000&q=80'
  ]);

  const [customImageUrl, setCustomImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // Keep seller updated if user profile loads asynchronously
  useEffect(() => {
    if (user && formData.seller === 'Studio Atelier') {
      setFormData((prev) => ({ ...prev, seller: defaultSellerName }));
    }
  }, [user, defaultSellerName]);

  // Handle generic form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  // Automatically calculate end date and time based on start date, time, and duration
  const calculatedSchedule = useMemo(() => {
    if (!formData.startDate || !formData.startTime || !formData.durationDays) {
      return null;
    }
    const durationNum = parseFloat(formData.durationDays);
    if (isNaN(durationNum) || durationNum <= 0) return null;

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    if (isNaN(startDateTime.getTime())) return null;

    const endDateTime = new Date(startDateTime.getTime() + Math.round(durationNum * 86400000));
    const isPast = startDateTime.getTime() <= Date.now();

    const formatDateString = (d) =>
      d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

    const formatTimeString = (d) =>
      d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

    return {
      startDateTime,
      endDateTime,
      isPast,
      startFormatted: `${formatDateString(startDateTime)} • ${formatTimeString(startDateTime)} IST`,
      endFormatted: `${formatDateString(endDateTime)} • ${formatTimeString(endDateTime)} IST`,
      durationHours: Math.round(durationNum * 24)
    };
  }, [formData.startDate, formData.startTime, formData.durationDays]);

  // Handle file uploads with type & size validation
  const handleFileSelect = (e) => {
    setImageError('');
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > MAX_IMAGES) {
      setImageError(`You can attach up to ${MAX_IMAGES} photos per object listing.`);
      return;
    }

    files.forEach((file) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setImageError(`Unsupported image format (${file.name}). Please upload PNG, JPG, or WEBP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setImageError(`Image "${file.name}" exceeds the 5MB size limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target?.result;
        if (dataUrl) {
          setImages((prev) => (prev.length < MAX_IMAGES ? [...prev, dataUrl] : prev));
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add image by URL
  const handleAddUrlImage = () => {
    setImageError('');
    const trimmed = customImageUrl.trim();
    if (!trimmed) return;

    if (images.length >= MAX_IMAGES) {
      setImageError(`You can attach up to ${MAX_IMAGES} photos per object listing.`);
      return;
    }

    setImages((prev) => [...prev, trimmed]);
    setCustomImageUrl('');
  };

  // Remove individual image
  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setImageError('');
  };

  // Main Form Submission Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // 1. Authentication check
    if (!user) {
      setFormError('You must be signed in with an artisan account to publish listings on Veyra.');
      navigate('/signin?redirect=/sell');
      return;
    }

    // 2. Specifications validation
    if (!formData.name.trim()) {
      setFormError('Please provide an authoritative product title.');
      return;
    }
    if (!formData.seller.trim()) {
      setFormError('Please specify the seller or studio name.');
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      setFormError('Please enter a valid estimated lot value / price in INR.');
      return;
    }
    if (!images.length) {
      setFormError('Please upload at least one photograph for the lot preview.');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Please provide a description of the craftsmanship story and provenance.');
      return;
    }

    const priceNum = Number(formData.price);

    // 3. Auction specific validation
    if (listingType === 'auction') {
      const startingBidNum = Number(formData.startingBid);
      if (isNaN(startingBidNum) || startingBidNum <= 0) {
        setFormError('Starting bid must be a valid positive amount in INR.');
        return;
      }
      if (startingBidNum > priceNum) {
        setFormError('Starting bid cannot exceed the estimated lot value.');
        return;
      }
      if (!formData.startDate || !formData.startTime) {
        setFormError('Please provide an auction start date and time.');
        return;
      }
      if (calculatedSchedule && calculatedSchedule.isPast) {
        setFormError('Auction start date and time cannot be in the past. Please schedule a future time.');
        return;
      }
      const durationNum = parseFloat(formData.durationDays);
      if (isNaN(durationNum) || durationNum <= 0) {
        setFormError('Auction duration must be at least 0.1 days.');
        return;
      }
    }

    // Prevent duplicate submission
    setIsSubmitting(true);

    try {
      // 1. Create product record in Products catalog
      const productPayload = {
        name: formData.name.trim(),
        seller: formData.seller.trim(),
        sellerId: user.id, // Enforce authenticated seller identity
        location: formData.location.trim() || 'Studio Atelier',
        category: formData.category,
        price: priceNum,
        isAuction: listingType === 'auction',
        startingBid: listingType === 'auction' ? Number(formData.startingBid) : undefined,
        images: images,
        image: images[0],
        description: formData.description.trim(),
        materials: formData.materials.trim(),
        dimensions: formData.dimensions.trim(),
        provenance: formData.provenance.trim(),
        condition: formData.condition || 'Pristine Studio Original',
        listingStatus: 'pending' // Mandatory pending approval
      };

      const createdProduct = addProduct(productPayload);

      // 2. If auction format, create and schedule lot in AuctionContext
      let createdAuction = null;
      if (listingType === 'auction') {
        const auctionPayload = {
          productId: createdProduct.id,
          name: formData.name.trim(),
          seller: formData.seller.trim(),
          maker: formData.seller.trim(),
          sellerId: user.id,
          location: formData.location.trim() || 'Studio Atelier',
          category: formData.category,
          startingBid: Number(formData.startingBid),
          estimatedValue: priceNum,
          startDate: formData.startDate,
          startTime: formData.startTime,
          durationDays: parseFloat(formData.durationDays),
          images: images,
          image: images[0],
          description: formData.description.trim(),
          dimensions: formData.dimensions.trim(),
          materials: formData.materials.trim(),
          provenance: formData.provenance.trim(),
          condition: formData.condition || 'Pristine Studio Original'
        };

        const auctionOutcome = createAuctionLot(auctionPayload);
        if (!auctionOutcome.success) {
          throw new Error(auctionOutcome.error || 'Failed to register auction lot with scheduler.');
        }
        createdAuction = auctionOutcome.auction;
      }

      setSubmittedData({
        product: createdProduct,
        auction: createdAuction,
        listingType
      });
    } catch (err) {
      console.error('Submission error:', err);
      setFormError(err.message || 'An error occurred while saving your listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedData(null);
    setFormError('');
    setImageError('');
    setFormData((prev) => ({
      ...prev,
      name: '',
      price: '',
      startingBid: '',
      description: ''
    }));
    setImages([]);
  };

  return (
    <div style={{ paddingTop: '36px', paddingBottom: '96px', backgroundColor: 'var(--bg-primary)' }}>
      <div className="container" style={{ maxWidth: '1240px' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="eyebrow" style={{ letterSpacing: '0.12em' }}>
              ATELIER WORKSHOP PORTAL
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.2rem, 3.8vw, 3rem)',
              lineHeight: 1.15,
              fontWeight: 500,
              color: 'var(--text-primary)',
              margin: '0 0 10px 0'
            }}
          >
            Live Auction Listing
          </h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', maxWidth: '640px', margin: 0, lineHeight: 1.55 }}>
            Submit studio ceramics, cast bronzes, archival monotypes, and living art for curated live auction scheduling and collector bidding.
          </p>
        </div>

        {/* Authentication Notice if Guest */}
        {!user && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--accent-burgundy)',
              borderRadius: 'var(--radius-xs)',
              padding: '20px 24px',
              marginBottom: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--surface-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-burgundy)',
                  flexShrink: 0
                }}
              >
                <Lock size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>Artisan Account Required</h4>
                <p style={{ margin: '3px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  You are currently browsing as a guest. Please sign in or register to publish items and schedule live auctions.
                </p>
              </div>
            </div>
            <Link to="/signin?redirect=/sell" className="btn btn-burgundy btn-sm">
              <span>Sign In to Atelier</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Success Confirmation Card */}
        {submittedData && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--accent-burgundy)',
              borderRadius: 'var(--radius-xs)',
              padding: '28px 32px',
              marginBottom: '36px',
              boxShadow: '0 4px 16px rgba(120, 59, 75, 0.08)'
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={28} color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                  {submittedData.listingType === 'auction'
                    ? 'Live Auction Lot Submitted for Approval!'
                    : 'Marketplace Listing Submitted for Approval!'}
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 18px 0' }}>
                  <strong>"{submittedData.product.name}"</strong> has been successfully registered and queued for atelier curator review with status{' '}
                  <span style={{ fontWeight: 600, color: 'var(--accent-burgundy)' }}>Pending Approval</span>. Once reviewed, it will be automatically published to the upcoming auction schedule.
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Link to="/my-products" className="btn btn-burgundy" style={{ height: '40px', padding: '0 20px', fontSize: '12.5px' }}>
                    <Store size={15} />
                    <span>View Your Atelier Listings</span>
                  </Link>
                  <button
                    onClick={handleResetForm}
                    className="btn btn-secondary"
                    style={{ height: '40px', padding: '0 20px', fontSize: '12.5px' }}
                  >
                    <span>Submit Another Lot</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Two-Column Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.85fr)',
            gap: '36px',
            alignItems: 'flex-start'
          }}
          className="sell-page-grid"
        >

          {/* LEFT COLUMN: Listing Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              padding: 'clamp(24px, 3.5vw, 36px)',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
            }}
          >

            {/* SECTION A: Object Specifications */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Object Specifications
                </h2>

                {/* Toggle: Marketplace Sale vs Live Auction Lot */}
                <div
                  style={{
                    display: 'inline-flex',
                    backgroundColor: 'var(--bg-primary)',
                    padding: '3px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setListingType('direct')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: listingType === 'direct' ? '#191919' : 'transparent',
                      color: listingType === 'direct' ? '#FFFFFF' : 'var(--text-secondary)',
                      transition: 'all 120ms ease'
                    }}
                  >
                    <ShoppingBag size={13} />
                    <span>Marketplace Sale</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setListingType('auction')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: listingType === 'auction' ? 'var(--accent-burgundy)' : 'transparent',
                      color: listingType === 'auction' ? '#FFFFFF' : 'var(--text-secondary)',
                      transition: 'all 120ms ease'
                    }}
                  >
                    <Gavel size={13} />
                    <span>Live Auction Lot</span>
                  </button>
                </div>
              </div>

              {/* Product Title */}
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  Product Title *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Archival Chandigarh Teak & Cane V-Leg Chair"
                  required
                />
              </div>

              {/* 2 Columns: Seller / Studio Name & Studio Location */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="seller">
                    Seller / Studio Name *
                  </label>
                  <input
                    id="seller"
                    name="seller"
                    type="text"
                    className="form-input"
                    value={formData.seller}
                    onChange={handleInputChange}
                    placeholder="e.g. Studio Pierre Jeanneret"
                    required
                  />
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Populated from your authenticated artisan profile
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="location">
                    Studio Location
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g. Chandigarh, India"
                  />
                </div>
              </div>

              {/* 2 Columns: Category & Estimated Lot Value */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="category">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    className="form-select"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="Handmade">Handmade</option>
                    <option value="Vintage Finds">Vintage Finds</option>
                    <option value="Collectibles">Collectibles</option>
                    <option value="Home & Living">Home & Living</option>
                    <option value="Art & Prints">Art & Prints</option>
                    <option value="Fashion & Accessories">Fashion & Accessories</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="price">
                    {listingType === 'auction' ? 'Estimated Lot Value (₹) *' : 'Marketplace Price (₹) *'}
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="500"
                    step="500"
                    className="form-input"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g. 45000"
                    required
                  />
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Authoritative catalog appraisal benchmark
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION B: Auction Configuration (Only active when Live Auction Lot selected) */}
            {listingType === 'auction' && (
              <div
                style={{
                  backgroundColor: 'rgba(120, 59, 75, 0.02)',
                  border: '1px solid rgba(120, 59, 75, 0.18)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '22px',
                  marginBottom: '28px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Gavel size={17} color="var(--accent-burgundy)" />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--accent-burgundy)' }}>
                    Auction Configuration
                  </h3>
                </div>

                {/* Starting Bid & Duration in Days */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="startingBid">
                      Starting Bid (₹) *
                    </label>
                    <input
                      id="startingBid"
                      name="startingBid"
                      type="number"
                      min="500"
                      step="500"
                      className="form-input"
                      value={formData.startingBid}
                      onChange={handleInputChange}
                      placeholder="e.g. 28000"
                      required={listingType === 'auction'}
                    />
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      Minimum valid opening bid required
                    </span>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="durationDays">
                      Auction Duration (Days) *
                    </label>
                    <input
                      id="durationDays"
                      name="durationDays"
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="30"
                      className="form-input"
                      value={formData.durationDays}
                      onChange={handleInputChange}
                      placeholder="e.g. 3 (or 0.5 for 12 hours)"
                      required={listingType === 'auction'}
                    />
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      Supports decimals (e.g. 0.5 for 12h, 1, 2.5, 3 days)
                    </span>
                  </div>
                </div>

                {/* Start Date & Start Time */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="startDate">
                      Auction Start Date *
                    </label>
                    <input
                      id="startDate"
                      name="startDate"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      className="form-input"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required={listingType === 'auction'}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="startTime">
                      Auction Start Time *
                    </label>
                    <input
                      id="startTime"
                      name="startTime"
                      type="time"
                      className="form-input"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      required={listingType === 'auction'}
                    />
                  </div>
                </div>

                {/* Automatically Calculated End Date & Time Display Card */}
                {calculatedSchedule && (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: calculatedSchedule.isPast ? '1px solid var(--error-color)' : '1px dashed var(--accent-burgundy)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, color: 'var(--accent-burgundy)' }}>
                        Calculated Schedule Summary
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {calculatedSchedule.durationHours} Hours Total
                      </span>
                    </div>

                    <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '2px' }}>
                      <strong>Opening:</strong> {calculatedSchedule.startFormatted}
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                      <strong>Closing:</strong> {calculatedSchedule.endFormatted}
                    </div>

                    {calculatedSchedule.isPast && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--error-color)', fontSize: '11.5px', marginTop: '4px' }}>
                        <AlertCircle size={13} />
                        <span>Scheduled start time is in the past. Please select a future date and time.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SECTION C: Product Photography (Up to 6 images) */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Product Photography
                </h2>
                <span style={{ fontSize: '12px', fontWeight: 600, color: images.length >= MAX_IMAGES ? 'var(--accent-burgundy)' : 'var(--text-secondary)' }}>
                  {images.length} / {MAX_IMAGES} Photos Selected
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                Upload up to 6 high-resolution photographs. The first photo will be presented as the main catalog image.
              </p>

              {/* Selected Images Thumbnail Strip */}
              {images.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: '74px',
                        height: '74px',
                        borderRadius: 'var(--radius-xs)',
                        overflow: 'hidden',
                        border: idx === 0 ? '2px solid var(--accent-burgundy)' : '1px solid var(--border-color)',
                        backgroundColor: 'var(--surface-secondary)'
                      }}
                    >
                      <img src={imgUrl} alt={`Lot photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                      {idx === 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            right: '0',
                            backgroundColor: 'rgba(120, 59, 75, 0.9)',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: 700,
                            textAlign: 'center',
                            padding: '1px 0',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}
                        >
                          Main
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        style={{
                          position: 'absolute',
                          top: '3px',
                          right: '3px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0, 0, 0, 0.72)',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                        title="Remove photo"
                        aria-label="Remove image"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload & Add Photo Controls */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= MAX_IMAGES}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '38px', gap: '6px' }}
                >
                  <Camera size={14} />
                  <span>Add Photo</span>
                </button>

                <div style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '220px' }}>
                  <input
                    type="url"
                    placeholder="Or paste external image URL"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    style={{
                      flex: 1,
                      height: '38px',
                      padding: '0 10px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '12px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddUrlImage}
                    disabled={!customImageUrl.trim() || images.length >= MAX_IMAGES}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '38px' }}
                  >
                    <Plus size={13} />
                    <span>Attach</span>
                  </button>
                </div>
              </div>

              {/* Quick Preset Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Presets:</span>
                {CURATED_IMAGE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!images.includes(preset.url) && images.length < MAX_IMAGES) {
                        setImages((prev) => [...prev, preset.url]);
                      }
                    }}
                    style={{
                      border: '1px solid var(--border-color)',
                      backgroundColor: '#FFFFFF',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>

              {imageError && (
                <p className="form-error" style={{ marginTop: '8px' }}>
                  {imageError}
                </p>
              )}
            </div>

            {/* SECTION D: Craftsmanship & Additional Specifications */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                Craftsmanship & Provenance
              </h2>

              <div className="form-group">
                <label className="form-label" htmlFor="description">
                  Description & Craftsmanship Story *
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="form-textarea"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Detail the firing method, joinery technique, wood patina, or architectural history..."
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="materials">
                    Materials
                  </label>
                  <input
                    id="materials"
                    name="materials"
                    type="text"
                    className="form-input"
                    value={formData.materials}
                    onChange={handleInputChange}
                    placeholder="e.g. Solid Teak, Hand-woven Rattan"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="dimensions">
                    Dimensions
                  </label>
                  <input
                    id="dimensions"
                    name="dimensions"
                    type="text"
                    className="form-input"
                    value={formData.dimensions}
                    onChange={handleInputChange}
                    placeholder="e.g. 78cm H × 51cm W × 54cm D"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="provenance">
                  Provenance & Certification Note
                </label>
                <input
                  id="provenance"
                  name="provenance"
                  type="text"
                  className="form-input"
                  value={formData.provenance}
                  onChange={handleInputChange}
                  placeholder="e.g. Studio signature seal, European Design Council Certificate"
                />
              </div>
            </div>

            {/* Error Message Display */}
            {formError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(158, 58, 58, 0.08)',
                  border: '1px solid rgba(158, 58, 58, 0.25)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--error-color)',
                  fontSize: '12.5px',
                  marginBottom: '20px'
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            {/* Prominent Burgundy Submit for Approval Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-burgundy"
              style={{
                width: '100%',
                height: '48px',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: isSubmitting ? 0.75 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting for Atelier Review...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>
                    {listingType === 'auction' ? 'Submit for Approval' : 'Publish Marketplace Listing'}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* RIGHT COLUMN: Live Interactive Product Preview */}
          <div style={{ position: 'sticky', top: '96px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={15} color="var(--accent-burgundy)" />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Live Product Preview
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Updates in real-time
              </span>
            </div>

            {/* Preview Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)'
              }}
            >
              {/* Main Product Image Container */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  backgroundColor: 'var(--surface-secondary)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {images.length > 0 ? (
                  <img
                    src={images[0]}
                    alt={formData.name || 'Authoritative Lot Preview'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                    <Camera size={36} strokeWidth={1.5} style={{ opacity: 0.35, marginBottom: '8px' }} />
                    <span style={{ fontSize: '12px', display: 'block', letterSpacing: '0.02em' }}>
                      Select or upload photography
                    </span>
                  </div>
                )}

                {/* Handmade / Category Badge */}
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    padding: '3px 8px',
                    backgroundColor: 'rgba(248, 247, 244, 0.94)',
                    backdropFilter: 'blur(4px)',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--accent-burgundy)',
                    borderRadius: 'var(--radius-xs)'
                  }}
                >
                  {formData.category}
                </span>

                {/* Auction Lot Badge */}
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '3px 9px',
                    backgroundColor: listingType === 'auction' ? 'var(--accent-burgundy)' : '#191919',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    borderRadius: 'var(--radius-xs)'
                  }}
                >
                  {listingType === 'auction' ? 'AUCTION LOT' : 'MARKETPLACE'}
                </span>
              </div>

              {/* Gallery Thumbnails Strip (if multiple photos attached) */}
              {images.length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: 'var(--bg-primary)',
                    borderBottom: '1px solid var(--border-color)',
                    overflowX: 'auto'
                  }}
                >
                  {images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Thumb ${i + 1}`}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '2px',
                        objectFit: 'cover',
                        border: i === 0 ? '1.5px solid var(--accent-burgundy)' : '1px solid var(--border-color)'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Body Content */}
              <div style={{ padding: '22px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.35rem',
                    fontWeight: 600,
                    lineHeight: 1.25,
                    marginBottom: '4px',
                    color: 'var(--text-primary)'
                  }}
                >
                  {formData.name || 'Untitled Object'}
                </h3>

                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {formData.seller || 'Independent Maker'} • {formData.location || 'Studio'}
                </p>

                {/* Pricing / Bid Block */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '14px'
                  }}
                >
                  {listingType === 'auction' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'block' }}>
                          Starting Bid
                        </span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-burgundy)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatINR(Number(formData.startingBid) || 0)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'block' }}>
                          Est. Lot Value
                        </span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatINR(Number(formData.price) || 0)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'block' }}>
                        Marketplace Price
                      </span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatINR(Number(formData.price) || 0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Auction Timing Summary in Preview */}
                {listingType === 'auction' && calculatedSchedule && (
                  <div
                    style={{
                      borderLeft: '2px solid var(--accent-burgundy)',
                      paddingLeft: '10px',
                      marginBottom: '14px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Opening:</strong> {calculatedSchedule.startFormatted}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Closing:</strong> {calculatedSchedule.endFormatted} ({formData.durationDays} days)
                    </div>
                  </div>
                )}

                {/* Description Preview */}
                {formData.description && (
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.55,
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {formData.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Existing Submitted Atelier Listings Quick Preview */}
        {customProducts.length > 0 && (
          <div style={{ marginTop: '56px', borderTop: '1px solid var(--border-color)', paddingTop: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Your Atelier Catalog Submissions ({customProducts.length})
              </h3>
              <Link to="/my-products" style={{ fontSize: '12px', color: 'var(--accent-burgundy)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>Manage all listings</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {customProducts.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 14px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-xs)',
                    gap: '14px'
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-xs)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '13px', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                      {item.category} • {formatINR(item.isAuction ? item.startingBid : item.price)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: item.listingStatus === 'active' ? 'var(--badge-shipping-bg)' : 'rgba(234, 228, 220, 0.7)',
                      color: item.listingStatus === 'active' ? 'var(--badge-shipping-text)' : '#7A6A56',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}
                  >
                    {item.listingStatus || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @media (max-width: 960px) {
          .sell-page-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
