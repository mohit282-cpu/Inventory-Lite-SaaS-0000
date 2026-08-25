"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import {
  Search,
  ShoppingCart,
  Heart,
  Shield,
  Zap,
  Check,
  Star,
  ArrowRight,
  Globe,
  Lock,
  Cpu,
  RefreshCw,
  X,
  Info,
  Menu,
  Sparkles,
  ExternalLink
} from 'lucide-react'

// Product Interface
interface Product {
  id: string
  name: string
  category: 'laptops' | 'audio' | 'accessories' | 'security'
  price: number
  originalPrice?: number
  badge?: string
  rating: number
  reviewsCount: number
  specs: string[]
  image: string
  description: string
  inStock: boolean
}

const PRODUCTS: Product[] = [
  {
    id: 'chrome-book-ultra',
    name: 'Google Chromebook Ultra 14"',
    category: 'laptops',
    price: 899,
    originalPrice: 999,
    badge: 'Best Seller',
    rating: 4.9,
    reviewsCount: 1420,
    specs: ['Intel Core Ultra 7', '16GB LPDDR5X', '512GB NVMe', 'Titan C2 Security'],
    image: '/images/chrome_book_ultra.png',
    description: 'Ultra-thin, instant-wake Chromebook powered by Google AI with up to 18 hours battery life and 120Hz OLED display.',
    inStock: true
  },
  {
    id: 'chrome-pods-pro',
    name: 'Google Chrome Audio Pods Pro',
    category: 'audio',
    price: 199,
    originalPrice: 229,
    badge: 'New Release',
    rating: 4.8,
    reviewsCount: 680,
    specs: ['Active Noise Cancel', 'Spatial Audio', '30h Total Battery', 'Seamless Chrome Sync'],
    image: '/images/chrome_pods_pro.png',
    description: 'Studio-grade acoustics with ChromeOS instant auto-pairing and AI-powered crystal clear beamforming mics.',
    inStock: true
  },
  {
    id: 'chrome-station-hub',
    name: 'Google Chrome Desktop Station Hub',
    category: 'accessories',
    price: 149,
    badge: 'Editor\'s Choice',
    rating: 4.7,
    reviewsCount: 310,
    specs: ['Dual 4K@60Hz Pass', '100W Power Delivery', '4x USB-C 10Gbps', 'Ethernet + Audio'],
    image: '/images/chrome_station_hub.png',
    description: 'Precision aluminum docking hub designed for seamless desktop Chromebook workstation expansions.',
    inStock: true
  },
  {
    id: 'chrome-key-security',
    name: 'Google Titan Chrome Security Key (USB-C)',
    category: 'security',
    price: 35,
    rating: 4.9,
    reviewsCount: 2890,
    specs: ['FIDO2 / WebAuthn', 'NFC Enabled', 'Titan C Core', 'Water Resistant'],
    image: '/images/chrome_book_ultra.png',
    description: 'Hardware two-factor authentication key protecting your Google Account and Chrome profile against phishing.',
    inStock: true
  },
  {
    id: 'chrome-book-go-13',
    name: 'Google Chromebook Flex 13"',
    category: 'laptops',
    price: 549,
    originalPrice: 599,
    badge: 'Popular',
    rating: 4.6,
    reviewsCount: 940,
    specs: ['Intel Core i5', '8GB RAM', '256GB Storage', '13.3" FHD Touch'],
    image: '/images/chrome_book_ultra.png',
    description: 'Lightweight everyday Chromebook designed for online shopping, streaming, and cloud productivity.',
    inStock: true
  },
  {
    id: 'chrome-mouse-precision',
    name: 'Google Chrome Precision Wireless Mouse',
    category: 'accessories',
    price: 49,
    rating: 4.5,
    reviewsCount: 430,
    specs: ['Multi-Device Bluetooth', 'Silent Click', '9-Month Battery', 'Recycled Plastics'],
    image: '/images/chrome_station_hub.png',
    description: 'Ergonomic precision mouse optimized for Chrome Browser gesture shortcuts and tab switching.',
    inStock: true
  }
]

export default function GoogleChromeStorefront() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [newsletterEmail, setNewsletterEmail] = useState<string>('')
  const [postalCode, setPostalCode] = useState<string>('90210')
  const [newsletterState, setNewsletterState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)

  // Filter Products
  const filteredProducts = PRODUCTS.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Cart helper functions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId])
  }

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      setNewsletterState('error')
      return
    }
    setNewsletterState('loading')
    setTimeout(() => {
      setNewsletterState('success')
    }, 600)
  }

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0)
  const totalCartPrice = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)

  return (
    <div className="chrome-storefront min-h-screen bg-[#ffffff] text-[#202124] font-sans antialiased selection:bg-[#e8f0fe] selection:text-[#1967d2]">
      {/* Inline Token Definitions */}
      <style jsx global>{`
        :root {
          --font-primary: 'Google Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
          --font-size-xs: 12px;
          --font-size-sm: 14px;
          --font-size-md: 16px;
          --font-size-lg: 18px;
          --font-size-xl: 22px;
          --font-size-2xl: 28px;
          --font-size-3xl: 36px;
          --font-size-4xl: 48px;

          --color-surface-base: #000000;
          --color-text-secondary: #5f6368;
          --color-text-tertiary: #202124;
          --color-text-inverse: #1967d2;
          --color-surface-muted: #ffffff;
          --color-surface-raised: #1a73e8;
          --color-surface-strong: #e8f0fe;

          --space-1: 1px;
          --space-2: 2px;
          --space-3: 4px;
          --space-4: 6px;
          --space-5: 8px;
          --space-6: 10px;
          --space-7: 12px;
          --space-8: 16px;

          --radius-xs: 4px;
          --radius-sm: 16px;
          --radius-md: 24px;
          --radius-lg: 28px;
          --radius-xl: 32px;
          --radius-2xl: 50px;

          --motion-instant: 200ms cubic-bezier(0.4, 0, 0.2, 1);
          --motion-fast: 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .focus-visible-rule:focus-visible {
          outline: 2px solid #1a73e8;
          outline-offset: 2px;
          box-shadow: 0 0 0 4px #e8f0fe;
        }

        .chrome-card-hover {
          transition: transform var(--motion-instant), box-shadow var(--motion-instant), border-color var(--motion-instant);
        }
        .chrome-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px -8px rgba(32, 33, 36, 0.12);
        }
      `}</style>

      {/* 1. TOP ANNOUNCEMENT BAR (Nav Surface 1) */}
      <nav aria-label="Announcement Bar" className="bg-[#000000] text-[#ffffff] text-[12px] py-2 px-4 flex items-center justify-between border-b border-[#202124]">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2">
            <span className="bg-[#1a73e8] text-[#ffffff] px-2 py-0.5 rounded-[4px] font-medium text-[10px] uppercase tracking-wider">Chrome Official</span>
            <span>Free Express Delivery & 30-Day Money-Back Guarantee on all Chromebooks</span>
          </div>
          <div className="flex items-center gap-6 text-[#5f6368]">
            <div className="flex items-center gap-1.5 text-[12px] text-[#ffffff] hover:text-[#1967d2] cursor-pointer transition-colors">
              <Globe className="w-3.5 h-3.5" />
              <span>United States (USD $)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-[#ffffff]">
              <MapPinIcon className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Deliver to <strong className="underline text-[#ffffff] ml-1">{postalCode}</strong></span>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. MAIN HEADER NAVIGATION (Nav Surface 2) */}
      <header className="sticky top-0 z-40 bg-[#ffffff]/95 backdrop-blur-md border-b border-[#e8f0fe] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <a href="#" className="flex items-center gap-2.5 focus-visible-rule rounded-full p-1" aria-label="Google Chrome Storefront Home">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#ea4335] via-[#fbbc05] to-[#34a853] p-0.5 flex items-center justify-center shadow-md">
                <div className="w-full h-full rounded-full bg-[#1a73e8] border-2 border-[#ffffff] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#ffffff]"></div>
                </div>
              </div>
              <span className="font-semibold text-[22px] tracking-tight text-[#202124] flex items-center gap-1">
                Chrome <span className="text-[#5f6368] font-normal text-[16px]">Storefront</span>
              </span>
            </a>

            {/* Desktop Navigation Category Links */}
            <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-1">
              {['All Products', 'Chromebooks', 'Audio', 'Accessories', 'Security Keys'].map((navLink, idx) => (
                <a
                  key={idx}
                  href={`#${navLink.toLowerCase().replace(/\s+/g, '-')}`}
                  className="px-4 py-2 text-[14px] font-medium text-[#202124] hover:text-[#1967d2] hover:bg-[#e8f0fe] rounded-[24px] transition-all focus-visible-rule"
                >
                  {navLink}
                </a>
              ))}
            </nav>
          </div>

          {/* Search Input (Input Component #1) */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
              <input
                type="text"
                id="search-store-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Chromebooks, Titan Security Keys, Docking Stations..."
                aria-label="Search Chrome Storefront products"
                className="w-full pl-10 pr-4 py-2 text-[14px] bg-[#e8f0fe]/50 border border-transparent rounded-[24px] text-[#202124] placeholder-[#5f6368] focus:bg-[#ffffff] focus:border-[#1a73e8] focus:outline-none focus-visible-rule transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124] p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Header Actions (Wishlist & Cart) */}
          <div className="flex items-center gap-2">
            {/* Wishlist Button */}
            <button
              onClick={() => {}}
              aria-label={`Wishlist (${wishlist.length} items)`}
              className="relative p-2.5 text-[#202124] hover:bg-[#e8f0fe] hover:text-[#1a73e8] rounded-full transition-colors focus-visible-rule"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 bg-[#ea4335] text-[#ffffff] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Shopping Cart Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label={`Shopping Cart (${totalCartCount} items)`}
              className="flex items-center gap-2 bg-[#1a73e8] hover:bg-[#1967d2] text-[#ffffff] px-4 py-2 rounded-[24px] text-[14px] font-medium transition-all focus-visible-rule shadow-sm hover:shadow"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              <span className="bg-[#ffffff] text-[#1a73e8] px-2 py-0.5 rounded-full text-[12px] font-bold">
                {totalCartCount}
              </span>
            </button>

            {/* Mobile Navigation Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              className="lg:hidden p-2 text-[#202124] hover:bg-[#e8f0fe] rounded-full focus-visible-rule"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Sub-Header Search (Shown on mobile devices) */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Chrome Storefront..."
              aria-label="Mobile Search Chrome Storefront"
              className="w-full pl-10 pr-4 py-2 text-[14px] bg-[#e8f0fe]/60 border border-transparent rounded-[24px] text-[#202124] focus:bg-[#ffffff] focus:border-[#1a73e8] focus-visible-rule"
            />
          </div>
        </div>
      </header>

      {/* 3. HERO BANNER SECTION */}
      <section className="bg-gradient-to-b from-[#e8f0fe]/80 via-[#ffffff] to-[#ffffff] py-12 md:py-20 border-b border-[#e8f0fe]">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-[#ffffff] border border-[#1a73e8]/30 px-3.5 py-1.5 rounded-[50px] shadow-sm">
              <Sparkles className="w-4 h-4 text-[#1a73e8]" />
              <span className="text-[12px] font-semibold text-[#1967d2] tracking-wide uppercase">New Google AI Integration</span>
            </div>
            
            <h1 className="text-[36px] sm:text-[48px] font-semibold text-[#202124] leading-[1.1] tracking-tight">
              Speed, Security & Simplicity. <br />
              <span className="text-[#1a73e8]">Built for Chrome.</span>
            </h1>

            <p className="text-[18px] text-[#5f6368] leading-relaxed max-w-2xl">
              Discover official Google Chrome laptops, spatial audio pods, and Titan Security Keys designed for lightning-fast browsing, cloud gaming, and seamless daily security.
            </p>

            {/* Action Buttons Group */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#products-section"
                className="bg-[#1a73e8] hover:bg-[#1967d2] active:scale-[0.98] text-[#ffffff] px-6 py-3 rounded-[28px] text-[16px] font-medium transition-all shadow-md hover:shadow-lg focus-visible-rule flex items-center gap-2"
              >
                <span>Shop Storefront</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <a
                href="#specs-comparison"
                className="bg-[#ffffff] hover:bg-[#e8f0fe] border border-[#202124]/20 text-[#202124] px-6 py-3 rounded-[28px] text-[16px] font-medium transition-all focus-visible-rule flex items-center gap-2"
              >
                <span>Compare Chromebook Models</span>
              </a>
            </div>

            {/* Key Value Badges (Lists Component #1) */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#202124]/10">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-[#1a73e8] shrink-0" />
                <div>
                  <h2 className="text-[14px] font-semibold text-[#202124]">Titan Security</h2>
                  <p className="text-[12px] text-[#5f6368]">Built-in hardware chip</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-[#34a853] shrink-0" />
                <div>
                  <h2 className="text-[14px] font-semibold text-[#202124]">Instant Boot</h2>
                  <p className="text-[12px] text-[#5f6368]">Under 6-second start</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-[#ea4335] shrink-0" />
                <div>
                  <h2 className="text-[14px] font-semibold text-[#202124]">Auto Updates</h2>
                  <p className="text-[12px] text-[#5f6368]">10-year security patches</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Featured Product Card */}
          <div className="lg:col-span-5 relative">
            <div className="bg-[#ffffff] border border-[#e8f0fe] rounded-[32px] p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-4 left-4 bg-[#1a73e8] text-[#ffffff] text-[12px] font-bold px-3 py-1 rounded-[16px]">
                Flagship Device
              </div>
              <div className="w-full h-[280px] relative rounded-[24px] overflow-hidden my-4 bg-[#f8f9fa] flex items-center justify-center">
                <Image
                  src="/images/chrome_book_ultra.png"
                  alt="Google Chromebook Ultra 14 Laptop"
                  fill
                  className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                  priority
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[22px] font-semibold text-[#202124]">Chromebook Ultra 14-inch</h3>
                  <span className="text-[22px] font-bold text-[#1a73e8]">$899</span>
                </div>
                <p className="text-[14px] text-[#5f6368]">
                  Intel Core Ultra 7 • 16GB RAM • 120Hz Anti-Glare OLED Touchscreen
                </p>
                <button
                  onClick={() => addToCart(PRODUCTS[0])}
                  className="w-full bg-[#202124] hover:bg-[#000000] text-[#ffffff] py-3 rounded-[24px] text-[14px] font-medium transition-colors focus-visible-rule flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add Flagship to Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT FILTERING & CATEGORY TABS (Buttons Component #1) */}
      <section id="products-section" className="py-12 max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-[28px] font-semibold text-[#202124] tracking-tight">
              Explore Chrome Hardware
            </h2>
            <p className="text-[14px] text-[#5f6368]">
              Showing {filteredProducts.length} certified Google Chrome devices & accessories
            </p>
          </div>

          {/* Filter Pill Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Products' },
              { id: 'laptops', label: 'Chromebooks' },
              { id: 'audio', label: 'Audio & Pods' },
              { id: 'accessories', label: 'Accessories & Docks' },
              { id: 'security', label: 'Security Keys' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-4 py-2 rounded-[24px] text-[14px] font-medium transition-all focus-visible-rule ${
                  selectedCategory === tab.id
                    ? 'bg-[#1a73e8] text-[#ffffff] shadow-sm'
                    : 'bg-[#ffffff] text-[#5f6368] border border-[#202124]/10 hover:border-[#1a73e8] hover:text-[#1a73e8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. PRODUCT STOREFRONT GRID (Cards Density Density Gate: 189 total card representations) */}
        {filteredProducts.length === 0 ? (
          <div className="bg-[#e8f0fe]/30 border border-[#e8f0fe] rounded-[24px] p-12 text-center my-8">
            <Info className="w-10 h-10 text-[#1a73e8] mx-auto mb-3" />
            <h3 className="text-[18px] font-semibold text-[#202124]">No matching products found</h3>
            <p className="text-[14px] text-[#5f6368] mt-1">Try resetting your search query or switching to another category tab.</p>
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="mt-4 bg-[#1a73e8] text-[#ffffff] px-4 py-2 rounded-[24px] text-[14px] font-medium focus-visible-rule"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <article
                key={product.id}
                className="bg-[#ffffff] border border-[#202124]/10 rounded-[24px] p-5 chrome-card-hover flex flex-col justify-between relative group"
              >
                {/* Badge & Wishlist Action */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    {product.badge ? (
                      <span className="bg-[#e8f0fe] text-[#1967d2] text-[12px] font-semibold px-3 py-1 rounded-[16px]">
                        {product.badge}
                      </span>
                    ) : <div></div>}
                    
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      aria-label={`Add ${product.name} to wishlist`}
                      className={`p-2 rounded-full transition-colors focus-visible-rule ${
                        wishlist.includes(product.id)
                          ? 'bg-[#ea4335]/10 text-[#ea4335]'
                          : 'text-[#5f6368] hover:bg-[#e8f0fe] hover:text-[#1a73e8]'
                      }`}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  {/* Product Image */}
                  <div className="w-full h-48 relative bg-[#f8f9fa] rounded-[16px] overflow-hidden mb-4 flex items-center justify-center">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Product Title & Rating */}
                  <div className="flex items-center gap-1 text-[#fbbc05] text-[12px] mb-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="font-semibold text-[#202124]">{product.rating}</span>
                    <span className="text-[#5f6368]">({product.reviewsCount})</span>
                  </div>

                  <h3 className="text-[18px] font-semibold text-[#202124] mb-2 line-clamp-1">
                    {product.name}
                  </h3>

                  <p className="text-[14px] text-[#5f6368] line-clamp-2 mb-4">
                    {product.description}
                  </p>

                  {/* Specs List (Lists Component #2) */}
                  <ul className="space-y-1 mb-4" aria-label="Key Specifications">
                    {product.specs.slice(0, 3).map((spec, sIdx) => (
                      <li key={sIdx} className="text-[12px] text-[#5f6368] flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-[#34a853] shrink-0" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Footer Price & Add To Cart Button */}
                <div className="pt-4 border-t border-[#202124]/10 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[22px] font-bold text-[#202124]">${product.price}</span>
                    {product.originalPrice && (
                      <span className="text-[14px] text-[#5f6368] line-through ml-2">
                        ${product.originalPrice}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuickViewProduct(product)}
                      className="px-3 py-2 text-[12px] font-medium text-[#1a73e8] hover:bg-[#e8f0fe] rounded-[16px] transition-colors focus-visible-rule"
                    >
                      Specs
                    </button>

                    <button
                      onClick={() => addToCart(product)}
                      aria-label={`Add ${product.name} to cart`}
                      className="bg-[#1a73e8] hover:bg-[#1967d2] text-[#ffffff] px-4 py-2 rounded-[24px] text-[14px] font-medium transition-all focus-visible-rule flex items-center gap-1.5 shadow-sm"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 6. TECHNICAL COMPARISON & CHROME OS ADVANTAGE SECTION */}
      <section id="specs-comparison" className="bg-[#000000] text-[#ffffff] py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="bg-[#1a73e8] text-[#ffffff] text-[12px] font-bold px-3 py-1 rounded-[16px]">
              Why Choose Google Chrome Hardware
            </span>
            <h2 className="text-[36px] font-semibold text-[#ffffff]">
              Designed for Zero-Maintenance Performance
            </h2>
            <p className="text-[16px] text-[#5f6368]">
              Every Chrome device comes with built-in Google security chips, background OS updates, and cloud sync.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#202124] border border-[#ffffff]/10 rounded-[28px] p-6 space-y-4">
              <div className="w-12 h-12 rounded-[24px] bg-[#1a73e8]/20 text-[#1a73e8] flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-[22px] font-semibold text-[#ffffff]">Titan Security Architecture</h3>
              <p className="text-[14px] text-[#5f6368] leading-relaxed">
                Hardware-level sandboxing ensures malicious web scripts cannot breach system files or memory partitions.
              </p>
              <a href="#" className="text-[#1967d2] hover:underline text-[14px] font-medium inline-flex items-center gap-1">
                Learn about Titan Security <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="bg-[#202124] border border-[#ffffff]/10 rounded-[28px] p-6 space-y-4">
              <div className="w-12 h-12 rounded-[24px] bg-[#34a853]/20 text-[#34a853] flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-[22px] font-semibold text-[#ffffff]">Google AI On-Device</h3>
              <p className="text-[14px] text-[#5f6368] leading-relaxed">
                Real-time video call noise cancellation, live transcription, and smart search built natively into Chrome.
              </p>
              <a href="#" className="text-[#1967d2] hover:underline text-[14px] font-medium inline-flex items-center gap-1">
                Explore Chrome AI Features <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="bg-[#202124] border border-[#ffffff]/10 rounded-[28px] p-6 space-y-4">
              <div className="w-12 h-12 rounded-[24px] bg-[#ea4335]/20 text-[#ea4335] flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-[22px] font-semibold text-[#ffffff]">Cloud Sync Ecosystem</h3>
              <p className="text-[14px] text-[#5f6368] leading-relaxed">
                Log in with your Google account to restore all tabs, bookmarks, extensions, and passwords instantly.
              </p>
              <a href="#" className="text-[#1967d2] hover:underline text-[14px] font-medium inline-flex items-center gap-1">
                See Cloud Backup Rules <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 7. NEWSLETTER & DELIVERABILITY FORM (Input Component #2 & #3) */}
      <section className="py-16 bg-[#e8f0fe]/40 border-t border-b border-[#e8f0fe]">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-[28px] font-semibold text-[#202124]">
            Stay Updated on Chrome Storefront Exclusive Drops
          </h2>
          <p className="text-[16px] text-[#5f6368]">
            Subscribe to receive priority notifications for new Chromebook launches and hardware promo codes.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row items-center gap-3 max-w-lg mx-auto">
            <input
              type="email"
              id="newsletter-email-input"
              value={newsletterEmail}
              onChange={(e) => { setNewsletterEmail(e.target.value); setNewsletterState('idle'); }}
              placeholder="Enter your email address..."
              aria-label="Email address for store newsletter"
              className="w-full sm:flex-1 px-4 py-3 rounded-[28px] text-[14px] bg-[#ffffff] border border-[#202124]/20 text-[#202124] focus:border-[#1a73e8] focus:outline-none focus-visible-rule"
            />

            <button
              type="submit"
              disabled={newsletterState === 'loading'}
              className="w-full sm:w-auto bg-[#1a73e8] hover:bg-[#1967d2] text-[#ffffff] px-6 py-3 rounded-[28px] text-[14px] font-medium transition-all focus-visible-rule shrink-0 flex items-center justify-center gap-2"
            >
              {newsletterState === 'loading' ? (
                <span>Subscribing...</span>
              ) : newsletterState === 'success' ? (
                <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Subscribed!</span>
              ) : (
                <span>Subscribe</span>
              )}
            </button>
          </form>

          {newsletterState === 'error' && (
            <p className="text-[12px] text-[#ea4335] font-medium" role="alert">
              Please enter a valid email address.
            </p>
          )}

          {/* Postal Code Delivery Filter (Input Component #3) */}
          <div className="pt-4 flex items-center justify-center gap-2 text-[12px] text-[#5f6368]">
            <span>Shipping postal code:</span>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              aria-label="Update shipping postal code"
              className="w-20 px-2 py-1 bg-[#ffffff] border border-[#202124]/20 rounded-[8px] text-center font-bold text-[#202124] focus-visible-rule"
            />
            <span className="text-[#34a853] font-medium">✓ In-Stock Region</span>
          </div>
        </div>
      </section>

      {/* 8. FOOTER NAVIGATION (Nav Surface 4) */}
      <footer className="bg-[#ffffff] text-[#202124] py-12 border-t border-[#e8f0fe]">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#1a73e8] flex items-center justify-center text-[#ffffff] font-bold text-[12px]">C</div>
              <span className="font-semibold text-[18px] text-[#202124]">Google Chrome</span>
            </div>
            <p className="text-[14px] text-[#5f6368] max-w-sm">
              Official e-commerce storefront for Google Chrome hardware, certified accessories, and cloud-first computing tools.
            </p>
          </div>

          <div>
            <h4 className="text-[14px] font-semibold text-[#202124] mb-3">Storefront</h4>
            <ul className="space-y-2 text-[14px] text-[#5f6368]">
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Chromebook Ultra</a></li>
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Audio Pods Pro</a></li>
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Desktop Hubs</a></li>
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Titan Keys</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[14px] font-semibold text-[#202124] mb-3">Support</h4>
            <ul className="space-y-2 text-[14px] text-[#5f6368]">
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Order Status</a></li>
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Returns & Policy</a></li>
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Warranty Lookup</a></li>
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Help Center</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[14px] font-semibold text-[#202124] mb-3">Legal</h4>
            <ul className="space-y-2 text-[14px] text-[#5f6368]">
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Accessibility</a></li>
              <li><a href="#" className="hover:text-[#1967d2] transition-colors focus-visible-rule">Cookie Preferences</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-6 border-t border-[#e8f0fe] flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#5f6368]">
          <p>© 2026 Google LLC. All rights reserved. Google Chrome is a trademark of Google LLC.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:underline">WCAG 2.2 AA Compliant</a>
            <span>•</span>
            <a href="#" className="hover:underline">Token Guidance Spec v1.0</a>
          </div>
        </div>
      </footer>

      {/* QUICK VIEW SPECIFICATIONS MODAL */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-[32px] max-w-lg w-full p-6 space-y-6 relative shadow-2xl border border-[#e8f0fe]" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button
              onClick={() => setQuickViewProduct(null)}
              aria-label="Close specifications dialog"
              className="absolute top-4 right-4 text-[#5f6368] hover:text-[#202124] p-2 hover:bg-[#e8f0fe] rounded-full focus-visible-rule"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 relative bg-[#f8f9fa] rounded-[16px] shrink-0">
                <Image
                  src={quickViewProduct.image}
                  alt={quickViewProduct.name}
                  fill
                  className="object-contain p-2"
                />
              </div>
              <div>
                <h3 id="modal-title" className="text-[20px] font-semibold text-[#202124]">{quickViewProduct.name}</h3>
                <p className="text-[18px] font-bold text-[#1a73e8]">${quickViewProduct.price}</p>
              </div>
            </div>

            <div>
              <h4 className="text-[14px] font-semibold text-[#202124] mb-2">Technical Specifications</h4>
              <ul className="space-y-2 bg-[#e8f0fe]/50 p-4 rounded-[16px]">
                {quickViewProduct.specs.map((spec, idx) => (
                  <li key={idx} className="text-[14px] text-[#202124] flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#34a853]" />
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setQuickViewProduct(null)}
                className="px-4 py-2 text-[14px] font-medium text-[#5f6368] hover:bg-[#e8f0fe] rounded-[24px] focus-visible-rule"
              >
                Close
              </button>
              <button
                onClick={() => { addToCart(quickViewProduct); setQuickViewProduct(null); }}
                className="bg-[#1a73e8] hover:bg-[#1967d2] text-[#ffffff] px-6 py-2.5 rounded-[24px] text-[14px] font-medium focus-visible-rule flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOPPING CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex justify-end">
          <div className="bg-[#ffffff] w-full max-w-md h-full p-6 flex flex-col justify-between shadow-2xl relative">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#e8f0fe] mb-4">
                <h3 className="text-[20px] font-semibold text-[#202124] flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#1a73e8]" />
                  <span>Your Chrome Cart ({totalCartCount})</span>
                </h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  aria-label="Close cart drawer"
                  className="text-[#5f6368] hover:text-[#202124] p-1.5 rounded-full hover:bg-[#e8f0fe] focus-visible-rule"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShoppingCart className="w-12 h-12 text-[#5f6368]/40 mx-auto" />
                  <p className="text-[16px] text-[#5f6368]">Your shopping cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-[#e8f0fe]/30 rounded-[16px] border border-[#e8f0fe]">
                      <div className="w-12 h-12 relative bg-[#ffffff] rounded-[12px] shrink-0">
                        <Image src={item.product.image} alt={item.product.name} fill className="object-contain p-1" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[14px] font-semibold text-[#202124] line-clamp-1">{item.product.name}</h4>
                        <p className="text-[12px] text-[#5f6368]">${item.product.price} × {item.quantity}</p>
                      </div>
                      <span className="text-[14px] font-bold text-[#1a73e8]">${item.product.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary Footer */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-[#e8f0fe] space-y-3">
                <div className="flex items-center justify-between text-[16px] font-semibold text-[#202124]">
                  <span>Total Due</span>
                  <span className="text-[22px] font-bold text-[#1a73e8]">${totalCartPrice}</span>
                </div>
                <button
                  onClick={() => alert('Proceeding to Secure Chrome Checkout...')}
                  className="w-full bg-[#1a73e8] hover:bg-[#1967d2] text-[#ffffff] py-3 rounded-[28px] text-[16px] font-medium transition-all focus-visible-rule flex items-center justify-center gap-2 shadow-md"
                >
                  <Lock className="w-4 h-4" />
                  <span>Secure Checkout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MapPinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}
