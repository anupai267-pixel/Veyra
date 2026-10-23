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
  Sparkles,
  Bot,
  XCircle,
  RotateCcw
} from 'lucide-react';

const MAX_IMAGES = 6;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Curated image presets for high-resolution demonstrations
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
  const { addProduct } = useProducts();
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

  // Default dates in Asia/Kolkata
  const { defaultStartDate, defaultEndDate } = useMemo(() => {
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 86400000 * 4);
    return {
      defaultStartDate: start.toISOString().split('T')[0],
      defaultEndDate: end.toISOString().split('T')[0]
    };
  }, []);

  const defaultStartTime = '18:00';
  const defaultEndTime = '18:00';

  // Toggle between Marketplace Sale ('direct') and Live Auction Lot ('auction')
  const [listingType, setListingType] = useState('auction');

  // Form fields state
  const [formData, setFormData] = useState({
    name: 'Archival Chandigarh Teak & Cane Lounge Chair',
    seller: defaultSellerName,
    location: 'Chandigarh, India',
    category: 'Handmade',
    brand: 'Pierre Jeanneret Workshop',
    model: 'PJ-SI-028-A',
    condition: 'Pristine Museum Restored',
    age: 'c. 1956',
    price: 45000,          // Estimated Lot Value in INR
    startingBid: 28000,    // Starting Bid in INR
    minIncrement: 500,     // Seller configured minimum bid increment
    startDate: defaultStartDate,
    startTime: defaultStartTime,
    endDate: defaultEndDate,
    endTime: defaultEndTime,
    description: 'Original solid Burma teak framework with renewed hand-woven natural cane seating. Features documented stenciled archival inventory markings on the rear apron.',
    materials: 'Aged reclaimed Burma teak, natural hand-woven cane',
    dimensions: '78cm H × 51cm W × 54cm D',
    provenance: 'Certified masterwork from Chandigarh architectural restoration',
    features: 'V-leg floating architecture, authentic stenciled inventory marks',
    specifications: 'Solid teak mortise and tenon joinery, natural cane weave',
    accessories: 'Certificate of Archival Authenticity included',
    defects: 'Authentic historic surface patina consistent with 1950s architectural usage',
    authenticity: 'Authenticated against European Design Council archives'
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

  // AI Description Generator Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiDetails, setAiDetails] = useState({
    name: '',
    category: '',
    brand: '',
    model: '',
    condition: '',
    age: '',
    materials: '',
    dimensions: '',
    features: '',
    specifications: '',
    accessories: '',
    defects: '',
    authenticity: '',
    provenance: ''
  });
  const [aiGeneratedText, setAiGeneratedText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

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

  // Authoritative calculated schedule in Asia/Kolkata
  const calculatedSchedule = useMemo(() => {
    if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
      return null;
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) return null;

    const isPast = startDateTime.getTime() <= Date.now();
    const isEndBeforeStart = endDateTime.getTime() <= startDateTime.getTime();
    const durationHours = Math.round((endDateTime.getTime() - startDateTime.getTime()) / 3600000);

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
      isEndBeforeStart,
      startFormatted: `${formatDateString(startDateTime)} • ${formatTimeString(startDateTime)} IST`,
      endFormatted: `${formatDateString(endDateTime)} • ${formatTimeString(endDateTime)} IST`,
      durationHours: Math.max(0, durationHours)
    };
  }, [formData.startDate, formData.startTime, formData.endDate, formData.endTime]);

  // Handle file uploads with validation
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

  // Remove photo
  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setImageError('');
  };

  // Open AI Generator Modal and synchronize current form data
  const handleOpenAiModal = () => {
    setAiDetails({
      name: formData.name || '',
      category: formData.category || '',
      brand: formData.brand || formData.seller || '',
      model: formData.model || '',
      condition: formData.condition || '',
      age: formData.age || '',
      materials: formData.materials || '',
      dimensions: formData.dimensions || '',
      features: formData.features || '',
      specifications: formData.specifications || '',
      accessories: formData.accessories || '',
      defects: formData.defects || '',
      authenticity: formData.authenticity || '',
      provenance: formData.provenance || ''
    });
    setAiGeneratedText(formData.description || '');
    setAiError('');
    setShowAiModal(true);
  };

  // Trigger AI Description Generation via backend OpenAI endpoint
  const handleGenerateAiDescription = async () => {
    setAiLoading(true);
    setAiError('');

    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiDetails)
      });

      const data = await response.json();
      if (data.success && data.description) {
        setAiGeneratedText(data.description);
      } else {
        setAiError(data.error || 'Failed to generate description with OpenAI.');
      }
    } catch (err) {
      setAiError('Could not reach backend AI service. You can write your description manually.');
    } finally {
      setAiLoading(false);
    }
  };

  // Apply reviewed AI description to the form
  const handleApplyAiDescription = () => {
    if (aiGeneratedText.trim()) {
      setFormData((prev) => ({
        ...prev,
        description: aiGeneratedText.trim(),
        brand: aiDetails.brand || prev.brand,
        model: aiDetails.model || prev.model,
        condition: aiDetails.condition || prev.condition,
        age: aiDetails.age || prev.age,
        features: aiDetails.features || prev.features,
        specifications: aiDetails.specifications || prev.specifications,
        accessories: aiDetails.accessories || prev.accessories,
        defects: aiDetails.defects || prev.defects,
        authenticity: aiDetails.authenticity || prev.authenticity
      }));
    }
    setShowAiModal(false);
  };

  // Main Form Submission Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!user) {
      setFormError('You must be signed in with an artisan account to publish listings on Veyra.');
      navigate('/signin?redirect=/sell');
      return;
    }

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

    // Auction-specific validation
    if (listingType === 'auction') {
      const startingBidNum = Number(formData.startingBid);
      const minIncNum = Number(formData.minIncrement);

      if (isNaN(startingBidNum) || startingBidNum <= 0) {
        setFormError('Starting bid must be a valid positive amount in INR.');
        return;
      }
      if (isNaN(minIncNum) || minIncNum <= 0) {
        setFormError('Minimum bid increment must be a positive amount in INR (e.g. ₹50 or ₹100).');
        return;
      }
      if (startingBidNum > priceNum) {
        setFormError('Starting bid cannot exceed the estimated lot value.');
        return;
      }
      if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
        setFormError('Please provide both auction start date/time and end date/time.');
        return;
      }
      if (calculatedSchedule) {
        if (calculatedSchedule.isEndBeforeStart) {
          setFormError('Auction end time must be strictly later than the start time.');
          return;
        }
        if (calculatedSchedule.isPast) {
          setFormError('Auction start time cannot be in the past. Please schedule a future time.');
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const productPayload = {
        name: formData.name.trim(),
        seller: formData.seller.trim(),
        sellerId: user.id,
        location: formData.location.trim() || 'Studio Atelier',
        category: formData.category,
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        condition: formData.condition,
        price: priceNum,
        isAuction: listingType === 'auction',
        startingBid: listingType === 'auction' ? Number(formData.startingBid) : undefined,
        minIncrement: listingType === 'auction' ? Number(formData.minIncrement) : undefined,
        images: images,
        image: images[0],
        description: formData.description.trim(),
        materials: formData.materials.trim(),
        dimensions: formData.dimensions.trim(),
        provenance: formData.provenance.trim(),
        listingStatus: 'active'
      };

      const createdProduct = addProduct(productPayload);

      let createdAuction = null;
      if (listingType === 'auction') {
        const auctionPayload = {
          productId: createdProduct.id,
          name: formData.name.trim(),
          seller: formData.seller.trim(),
          maker: formData.brand.trim() || formData.seller.trim(),
          sellerId: user.id,
          location: formData.location.trim() || 'Studio Atelier',
          category: formData.category,
          startingBid: Number(formData.startingBid),
          estimatedValue: priceNum,
          minIncrement: Number(formData.minIncrement || 100),
          startDate: formData.startDate,
          startTime: formData.startTime,
          endDate: formData.endDate,
          endTime: formData.endTime,
          images: images,
          image: images[0],
          description: formData.description.trim(),
          dimensions: formData.dimensions.trim(),
          materials: formData.materials.trim(),
          provenance: formData.provenance.trim(),
          condition: formData.condition || 'Pristine Studio Original'
        };

        const auctionOutcome = await createAuctionLot(auctionPayload);
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
      setFormError(err.message || 'An error occurred while saving your listing.');
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
  };

  // Success view
  if (submittedData) {
    const isAuc = submittedData.listingType === 'auction';
    const lotId = submittedData.auction?.id;

    return (
      <div style={{ paddingTop: '56px', paddingBottom: '96px', backgroundColor: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: '640px', textAlign: 'center' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              padding: 'clamp(28px, 5vw, 44px)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(120, 59, 75, 0.08)',
                color: 'var(--accent-burgundy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto'
              }}
            >
              <CheckCircle2 size={30} />
            </div>

            <span className="eyebrow" style={{ marginBottom: '6px' }}>
              Submission Confirmed
            </span>

            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 3vw, 2.3rem)', marginBottom: '14px', color: 'var(--text-primary)' }}>
              {isAuc ? 'Auction Lot Scheduled' : 'Item Published to Catalogue'}
            </h1>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              Your item <strong>"{submittedData.product.name}"</strong> has been registered in the catalog and the live floor schedule.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {isAuc && lotId && (
                <Link to={`/live/${lotId}`} className="btn btn-burgundy">
                  <Hammer size={15} />
                  <span>Enter Floor Room</span>
                </Link>
              )}
              <Link to="/my-products" className="btn btn-secondary">
                <Store size={15} />
                <span>Manage My Listings</span>
              </Link>
              <button onClick={handleResetForm} className="btn btn-secondary">
                <Plus size={15} />
                <span>Create Another Listing</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '40px', paddingBottom: '96px', backgroundColor: 'var(--bg-primary)' }}>
      <div className="container" style={{ maxWidth: '820px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <span className="eyebrow" style={{ marginBottom: '6px' }}>
            Artisan Atelier Portal
          </span>
          <h1 style={{ fontSize: 'clamp(2.1rem, 3.8vw, 3rem)', marginBottom: '8px', color: 'var(--text-primary)' }}>
            List Masterwork or Live Auction Lot
          </h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Publish authenticated works for direct collector acquisition or register for synchronized live floor bidding.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              padding: 'clamp(22px, 4vw, 36px)',
              boxShadow: 'var(--shadow-xs)'
            }}
          >
            {/* SECTION A: Object Classification & Basic Details */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Listing Format & Basic Details
                </h2>

                {/* Format Toggle Pill */}
                <div
                  style={{
                    display: 'inline-flex',
                    backgroundColor: 'var(--surface-secondary)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '3px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setListingType('direct')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: listingType === 'direct' ? 'var(--accent-burgundy)' : 'transparent',
                      color: listingType === 'direct' ? '#FFFFFF' : 'var(--text-secondary)',
                      transition: 'all 120ms ease'
                    }}
                  >
                    <ShoppingBag size={13} />
                    <span>Direct Sale</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setListingType('auction')}
                    style={{
                      display: 'flex',
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
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
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
                    {listingType === 'auction' ? 'Estimated Lot Value / Reserve (₹) *' : 'Marketplace Price (₹) *'}
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
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
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
                    Auction Configuration & Date Management (Asia/Kolkata)
                  </h3>
                </div>

                {/* Starting Bid & Seller Min Increment */}
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
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
                      Minimum valid opening bid required
                    </span>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="minIncrement">
                      Seller Minimum Bid Increment (₹) *
                    </label>
                    <input
                      id="minIncrement"
                      name="minIncrement"
                      type="number"
                      step="50"
                      min="50"
                      className="form-input"
                      value={formData.minIncrement}
                      onChange={handleInputChange}
                      placeholder="e.g. 50, 100, 500"
                      required={listingType === 'auction'}
                    />
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
                      Enforced on all manual and Auto-Bid counter-bids
                    </span>
                  </div>
                </div>

                {/* Start Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
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

                {/* End Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="endDate">
                      Auction End Date *
                    </label>
                    <input
                      id="endDate"
                      name="endDate"
                      type="date"
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      className="form-input"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      required={listingType === 'auction'}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="endTime">
                      Auction End Time *
                    </label>
                    <input
                      id="endTime"
                      name="endTime"
                      type="time"
                      className="form-input"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      required={listingType === 'auction'}
                    />
                  </div>
                </div>

                {/* Calculated Schedule Summary Card */}
                {calculatedSchedule && (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: calculatedSchedule.isPast || calculatedSchedule.isEndBeforeStart
                        ? '1px solid var(--error-color)'
                        : '1px dashed var(--accent-burgundy)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, color: 'var(--accent-burgundy)' }}>
                        Authoritative Schedule Summary (Asia/Kolkata)
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {calculatedSchedule.durationHours} Hours Duration
                      </span>
                    </div>

                    <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '2px' }}>
                      <strong>Floor Opens:</strong> {calculatedSchedule.startFormatted}
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                      <strong>Floor Closes:</strong> {calculatedSchedule.endFormatted}
                    </div>

                    {calculatedSchedule.isEndBeforeStart && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--error-color)', fontSize: '11.5px', marginTop: '4px' }}>
                        <AlertCircle size={13} />
                        <span>Closing time must be strictly later than opening time.</span>
                      </div>
                    )}

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

              {/* Selected Images Strip */}
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

              {/* Upload Controls */}
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

              {/* Presets */}
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

            {/* SECTION D: Craftsmanship & AI Description Generator */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Craftsmanship Story & Specifications
                </h2>

                {/* AI Product Description Button (Section 2) */}
                <button
                  type="button"
                  onClick={handleOpenAiModal}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: 'var(--accent-burgundy)',
                    color: 'var(--accent-burgundy)'
                  }}
                >
                  <Sparkles size={14} color="var(--accent-burgundy)" />
                  <span>Generate with AI</span>
                </button>
              </div>

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
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  You can compose your description manually or click "Generate with AI" above to generate a draft using your product specifications.
                </span>
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
                  backgroundColor: 'rgba(158, 58, 58, 0.08)',
                  border: '1px solid rgba(158, 58, 58, 0.25)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  color: 'var(--error-color)',
                  fontSize: '13px'
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {/* Submit Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/my-products')}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-burgundy"
                style={{ height: '46px', padding: '0 28px', fontSize: '13.5px', gap: '8px' }}
              >
                {isSubmitting ? <Loader2 size={16} className="spinning" /> : <Gavel size={16} />}
                <span>{listingType === 'auction' ? 'Register & Schedule Auction Lot' : 'Publish to Marketplace'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* AI Product Description Generator Modal (Section 2) */}
      {showAiModal && (
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
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={22} color="var(--accent-burgundy)" />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', margin: 0 }}>
                  Generate Description with AI (OpenAI)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Provide the verified details of your item below. The configured OpenAI model will generate a concise, truthful description based <strong>only</strong> on these facts. You can review, edit, and approve it before saving.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Brand / Maker
                </label>
                <input
                  type="text"
                  value={aiDetails.brand}
                  onChange={(e) => setAiDetails({ ...aiDetails, brand: e.target.value })}
                  placeholder="e.g. Pierre Jeanneret"
                  className="form-input"
                  style={{ height: '34px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Model / Identifier
                </label>
                <input
                  type="text"
                  value={aiDetails.model}
                  onChange={(e) => setAiDetails({ ...aiDetails, model: e.target.value })}
                  placeholder="e.g. PJ-SI-028-A"
                  className="form-input"
                  style={{ height: '34px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Condition
                </label>
                <input
                  type="text"
                  value={aiDetails.condition}
                  onChange={(e) => setAiDetails({ ...aiDetails, condition: e.target.value })}
                  placeholder="e.g. Museum restored, minor patina"
                  className="form-input"
                  style={{ height: '34px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Age / Period
                </label>
                <input
                  type="text"
                  value={aiDetails.age}
                  onChange={(e) => setAiDetails({ ...aiDetails, age: e.target.value })}
                  placeholder="e.g. c. 1956"
                  className="form-input"
                  style={{ height: '34px', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Key Features & Specifications
                </label>
                <textarea
                  rows={2}
                  value={aiDetails.features}
                  onChange={(e) => setAiDetails({ ...aiDetails, features: e.target.value })}
                  placeholder="e.g. Solid Burma teak joinery, natural woven cane..."
                  className="form-textarea"
                  style={{ fontSize: '12px', padding: '8px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Known Defects or Wear
                </label>
                <textarea
                  rows={2}
                  value={aiDetails.defects}
                  onChange={(e) => setAiDetails({ ...aiDetails, defects: e.target.value })}
                  placeholder="e.g. Slight surface patina consistent with age..."
                  className="form-textarea"
                  style={{ fontSize: '12px', padding: '8px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Seller-Provided Authenticity & Provenance
              </label>
              <input
                type="text"
                value={aiDetails.authenticity}
                onChange={(e) => setAiDetails({ ...aiDetails, authenticity: e.target.value })}
                placeholder="e.g. Documented stenciled archival markings on rear apron"
                className="form-input"
                style={{ height: '34px', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={handleGenerateAiDescription}
                disabled={aiLoading}
                className="btn btn-burgundy btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {aiLoading ? <Loader2 size={14} className="spinning" /> : <Sparkles size={14} />}
                <span>{aiGeneratedText ? 'Regenerate Draft' : 'Generate Description'}</span>
              </button>
            </div>

            {aiError && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.4)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: '#856404'
                }}
              >
                {aiError}
              </div>
            )}

            {/* Editable Review Area */}
            {aiGeneratedText && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Review and Edit Generated Description Before Applying:
                </label>
                <textarea
                  rows={5}
                  value={aiGeneratedText}
                  onChange={(e) => setAiGeneratedText(e.target.value)}
                  className="form-textarea"
                  style={{ fontSize: '12.5px', lineHeight: 1.5, backgroundColor: 'var(--bg-primary)' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyAiDescription}
                disabled={!aiGeneratedText.trim()}
                className="btn btn-burgundy btn-sm"
              >
                Approve & Insert into Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
