// VEYRA Seller Directory
// Derived from the existing product catalog — each sellerId maps to a seller profile

export const SELLERS = {
  'seller-vayu': {
    id: 'seller-vayu',
    name: 'Studio Vayu',
    location: 'Pondicherry, India',
    avatar: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=200&q=80',
    description: 'A Pondicherry-based ceramics studio specialising in wheel-thrown raku and stoneware vessels using traditional wood-firing techniques and natural mineral slips.',
    memberSince: '2021',
    verified: true,
    policies: {
      shipping: 'All orders are shipped within 5–7 business days via insured white-glove courier. International shipping available.',
      returns: 'Returns accepted within 14 days of delivery for items in original condition. Custom pieces are non-refundable.',
      payment: 'We accept all major credit and debit cards, UPI, and bank transfers. Payment is processed securely at checkout.'
    }
  },
  'seller-morandi': {
    id: 'seller-morandi',
    name: 'Atelier Morandi',
    location: 'Milan, Italy',
    avatar: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=200&q=80',
    description: 'Historic Milanese foundry and design atelier producing limited-edition cast bronze and sculptural objects rooted in Italian material culture.',
    memberSince: '2020',
    verified: true,
    policies: {
      shipping: 'European orders dispatched within 3–5 days. International shipments via DHL Express with full insurance coverage.',
      returns: 'Returns accepted within 21 days. Buyer covers return shipping for international orders.',
      payment: 'Secure payments via credit card, PayPal, and wire transfer.'
    }
  },
  'seller-sen': {
    id: 'seller-sen',
    name: 'Arjun Sen Fine Art',
    location: 'Kolkata, India',
    avatar: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=200&q=80',
    description: 'Studio Sen creates singular monotype prints and fine art exploring minimalism, negative space, and tonal gradients on archival cotton rag.',
    memberSince: '2022',
    verified: true,
    policies: {
      shipping: 'Prints are shipped flat with acid-free tissue and rigid protection. Delivery within 7–10 business days.',
      returns: 'Framed works are final sale. Unframed prints may be returned within 7 days.',
      payment: 'Accepts credit cards and bank transfers.'
    }
  },
  'seller-brahmaputra': {
    id: 'seller-brahmaputra',
    name: 'Brahmaputra Loom Collective',
    location: 'Assam, India',
    avatar: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=200&q=80',
    description: 'A weaver-led collective from Sualkuchi preserving the art of hand-loomed wild muga and eri peace silk using century-old pit-loom traditions.',
    memberSince: '2023',
    verified: true,
    policies: {
      shipping: 'Textiles are carefully folded in muslin and shipped within 5 business days. Free domestic shipping on orders above ₹10,000.',
      returns: 'Returns accepted within 10 days for unused items in original packaging.',
      payment: 'Accepts UPI, credit cards, and net banking.'
    }
  },
  'seller-komorebi': {
    id: 'seller-komorebi',
    name: 'Komorebi Ceramics',
    location: 'Kyoto, Japan',
    avatar: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=200&q=80',
    description: 'Master-crafted Japanese ceramics from the Shigaraki kiln tradition. Each piece undergoes a four-day anagama wood-firing process.',
    memberSince: '2021',
    verified: true,
    policies: {
      shipping: 'Ships worldwide from Kyoto with specialist ceramic packaging. Delivery 10–14 business days internationally.',
      returns: 'Damage claims must be filed within 48 hours of delivery with photographs. No returns on undamaged goods.',
      payment: 'Accepts credit cards and PayPal.'
    }
  },
  'seller-aura': {
    id: 'seller-aura',
    name: 'Aura Archives',
    location: 'Berlin, Germany',
    avatar: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=200&q=80',
    description: 'Curated vintage design archive specialising in authenticated mid-century modern furniture, Bauhaus lighting, and industrial-era design objects.',
    memberSince: '2019',
    verified: true,
    policies: {
      shipping: 'Large items shipped via specialist freight with white-glove delivery. Smaller items via insured parcel service.',
      returns: 'All vintage items are sold as described. Returns accepted only if item significantly differs from listing.',
      payment: 'Wire transfer, credit card, and PayPal accepted.'
    }
  },
  'seller-havn': {
    id: 'seller-havn',
    name: 'Havn Studio',
    location: 'Copenhagen, Denmark',
    avatar: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=200&q=80',
    description: 'Scandinavian woodturning studio creating minimalist timber vessels and objects from salvaged Danish estate hardwoods.',
    memberSince: '2022',
    verified: true,
    policies: {
      shipping: 'Ships within Europe in 3–5 days. International orders 7–12 business days.',
      returns: 'Returns accepted within 14 days. Items must be unused and in original packaging.',
      payment: 'Accepts all major cards and MobilePay.'
    }
  },
  'seller-mineral': {
    id: 'seller-mineral',
    name: 'Maison Mineral',
    location: 'Rome, Italy',
    avatar: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=200&q=80',
    description: 'Natural stone atelier sourcing and hand-cutting travertine, marble, and volcanic rock from Italian quarries into sculptural functional objects.',
    memberSince: '2021',
    verified: true,
    policies: {
      shipping: 'Stone items require specialist shipping. Delivery 10–15 business days with full insurance.',
      returns: 'Due to weight and fragility, returns must be pre-approved. Contact within 7 days of delivery.',
      payment: 'Wire transfer and credit card.'
    }
  },
  'seller-niloufar': {
    id: 'seller-niloufar',
    name: 'Niloufar Textiles',
    location: 'Isfahan, Iran',
    avatar: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=200&q=80',
    description: 'Master dyers and weavers of Isfahan creating plant-dyed linens and textiles using traditional natural indigo and botanical pigments.',
    memberSince: '2023',
    verified: true,
    policies: {
      shipping: 'International shipping 10–18 business days. All items shipped with care instructions.',
      returns: 'Returns accepted within 14 days for unwashed and unaltered items.',
      payment: 'Credit card and wire transfer.'
    }
  },
  'seller-dharohar': {
    id: 'seller-dharohar',
    name: 'Dharohar Craft',
    location: 'Jodhpur, India',
    avatar: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=200&q=80',
    description: 'Jodhpur stone carving guild preserving Rajasthani architectural sculpture traditions through master artisan-crafted sandstone and marble objects.',
    memberSince: '2022',
    verified: true,
    policies: {
      shipping: 'Heavy stone items shipped via insured freight. Delivery 7–14 business days domestically.',
      returns: 'Custom carved items are non-refundable. Standard items returnable within 10 days.',
      payment: 'Accepts UPI, cards, and bank transfers.'
    }
  },
  'seller-tannery4': {
    id: 'seller-tannery4',
    name: 'Tannery No. 4',
    location: 'Kanpur, India',
    avatar: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=200&q=80',
    description: 'Heritage leather workshop specialising in hand-stitched vegetable-tanned saddle leather goods using full-grain bovine hides and solid copper hardware.',
    memberSince: '2021',
    verified: true,
    policies: {
      shipping: 'All leather goods shipped in cotton dust bags. Delivery within 5–7 business days.',
      returns: 'Returns accepted within 14 days for unused items. Personalised items are final sale.',
      payment: 'Accepts all major payment methods.'
    }
  },
  'seller-rostova': {
    id: 'seller-rostova',
    name: 'Elena Rostova',
    location: 'Stockholm, Sweden',
    avatar: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=200&q=80',
    description: 'Printmaker and artist based in Stockholm creating limited-edition reduction relief prints and linocuts on Japanese washi paper.',
    memberSince: '2023',
    verified: true,
    policies: {
      shipping: 'Prints shipped flat in rigid mailers. European delivery 3–5 days, international 7–14 days.',
      returns: 'Limited edition prints are final sale. Damaged items will be replaced.',
      payment: 'Credit card and Swish payments accepted.'
    }
  },
  'seller-jeanneret': {
    id: 'seller-jeanneret',
    name: 'Pierre Jeanneret Workshop',
    location: 'Chandigarh / Paris',
    avatar: 'https://images.unsplash.com/photo-1580481077195-c3a821a58875?auto=format&fit=crop&w=200&q=80',
    description: 'Archival furniture workshop dealing in authenticated Pierre Jeanneret chairs and furnishings from the Chandigarh Capitol Complex project.',
    memberSince: '2019',
    verified: true,
    policies: {
      shipping: 'White-glove delivery with specialist packing. Fully insured international shipping.',
      returns: 'Returns accepted within 30 days with pre-approval. Buyer covers return freight.',
      payment: 'Wire transfer, escrow service, and credit card.'
    }
  },
  'seller-kuroda': {
    id: 'seller-kuroda',
    name: 'Atelier Kuroda',
    location: 'Nagano Prefecture, Japan',
    avatar: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=200&q=80',
    description: 'Stone sculptor Master Kuroda creates contemplation basins and sculptural vessels from volcanic basalt boulders in the mountains of Nagano.',
    memberSince: '2020',
    verified: true,
    policies: {
      shipping: 'Specialist freight required for all stone works. International delivery 14–21 business days.',
      returns: 'All stone sculptures are final sale due to weight and shipping complexity.',
      payment: 'Wire transfer preferred. Credit cards accepted for pieces under ¥500,000.'
    }
  },
  'seller-raman': {
    id: 'seller-raman',
    name: 'Master Craftsman H. Raman',
    location: 'Thanjavur, Tamil Nadu',
    avatar: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=200&q=80',
    description: 'Third-generation silversmith from the Thanjavur Royal Guild creating repoussé and chased sterling silver ceremonial objects.',
    memberSince: '2021',
    verified: true,
    policies: {
      shipping: 'Silver items packed in velvet-lined cases. Insured delivery 5–10 business days.',
      returns: 'Returns accepted within 14 days. Items must be in original condition with all certificates.',
      payment: 'Accepts UPI, cards, and bank transfers.'
    }
  },
  'seller-guild': {
    id: 'seller-guild',
    name: 'Royal Instrument Guild',
    location: 'Jaipur, Rajasthan',
    avatar: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=200&q=80',
    description: 'Heritage guild of brass instrument makers preserving the craft of astronomical and navigational instruments from the Jaipur Observatory tradition.',
    memberSince: '2020',
    verified: true,
    policies: {
      shipping: 'Instruments packed with custom foam inserts. Insured global shipping 7–14 days.',
      returns: 'Antique instruments may be returned within 21 days if authenticity is disputed.',
      payment: 'Wire transfer and credit card.'
    }
  },
  'seller-faarup': {
    id: 'seller-faarup',
    name: 'Ib Kofod-Larsen for Faarup Møbelfabrik',
    location: 'Copenhagen, Denmark',
    avatar: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=200&q=80',
    description: 'Specialist dealer in authenticated Danish mid-century modern furniture from the golden age of Scandinavian design.',
    memberSince: '2020',
    verified: true,
    policies: {
      shipping: 'White-glove freight delivery with blanket wrap protection. European delivery 5–10 days.',
      returns: 'Returns accepted within 14 days with pre-approval.',
      payment: 'Wire transfer and credit card.'
    }
  },
  'seller-ghosh': {
    id: 'seller-ghosh',
    name: 'Kavita Ghosh Ceramics',
    location: 'Santiniketan, India',
    avatar: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=200&q=80',
    description: 'Contemporary ceramic artist from Santiniketan creating large-scale raku-fired sculptural works inspired by the human form and natural forces.',
    memberSince: '2023',
    verified: true,
    policies: {
      shipping: 'Sculptures are crated and shipped via insured freight. Delivery 10–14 business days.',
      returns: 'Sculptures are final sale. Damage claims must be filed within 48 hours.',
      payment: 'Accepts cards, UPI, and bank transfers.'
    }
  },
  'seller-himalaya': {
    id: 'seller-himalaya',
    name: 'Himalayan Silversmith Guild (c. 1910)',
    location: 'Lhasa / Kathmandu',
    avatar: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=200&q=80',
    description: 'Curators and dealers of authenticated antique Himalayan silverwork, ritual objects, and ceremonial jewellery from Tibet and Nepal.',
    memberSince: '2020',
    verified: true,
    policies: {
      shipping: 'All antique items shipped with full insurance and tracking. International delivery 10–21 days.',
      returns: 'Returns accepted within 30 days with certificate verification.',
      payment: 'Wire transfer preferred for high-value pieces.'
    }
  },
  'seller-alchemist': {
    id: 'seller-alchemist',
    name: 'Studio Alchemist, Jaipur',
    location: 'Jaipur, Rajasthan',
    avatar: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=200&q=80',
    description: 'Experimental foundry and design studio in Jaipur creating cast bronze furniture and sculptural objects using traditional sand-mold techniques.',
    memberSince: '2022',
    verified: true,
    policies: {
      shipping: 'Heavy bronze items shipped via specialist freight with white-glove delivery.',
      returns: 'Limited edition cast pieces are final sale. Contact within 7 days for damage claims.',
      payment: 'Wire transfer and credit card.'
    }
  }
};

export const getSellerById = (sellerId) => {
  return SELLERS[sellerId] || null;
};

export const getSellerByName = (sellerName) => {
  return Object.values(SELLERS).find(s => s.name === sellerName) || null;
};
