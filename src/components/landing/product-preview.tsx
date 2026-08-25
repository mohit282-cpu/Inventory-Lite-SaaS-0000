"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { useLanguage } from '@/context/language-context'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  FileText,
  LineChart,
  CheckCircle2,
} from 'lucide-react'

type TabType = 'dashboard' | 'pos' | 'products' | 'stock' | 'udhaar' | 'invoices' | 'reports'

interface TabConfig {
  id: TabType
  labelKey: string
  icon: React.ElementType
  titleKey: string
  descKey: string
  benefits: [string, string, string]
  imageSrc: string
}

export function LandingProductPreview() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})

  const tabs: TabConfig[] = [
    {
      id: 'dashboard',
      labelKey: 'productPreview.tab1',
      icon: LayoutDashboard,
      titleKey: 'productPreview.dashTitle',
      descKey: 'productPreview.dashDesc',
      benefits: [
        'productPreview.dashB1',
        'productPreview.dashB2',
        'productPreview.dashB3',
      ],
      imageSrc: '/screenshots/hero-dashboard.png',
    },
    {
      id: 'pos',
      labelKey: 'productPreview.tab2',
      icon: ShoppingCart,
      titleKey: 'productPreview.posTitle',
      descKey: 'productPreview.posDesc',
      benefits: [
        'productPreview.posB1',
        'productPreview.posB2',
        'productPreview.posB3',
      ],
      imageSrc: '/screenshots/pos.png',
    },
    {
      id: 'products',
      labelKey: 'productPreview.tab3',
      icon: Package,
      titleKey: 'productPreview.productsTitle',
      descKey: 'productPreview.productsDesc',
      benefits: [
        'productPreview.productsB1',
        'productPreview.productsB2',
        'productPreview.productsB3',
      ],
      imageSrc: '/screenshots/products.png',
    },
    {
      id: 'stock',
      labelKey: 'productPreview.tab4',
      icon: Boxes,
      titleKey: 'productPreview.stockTitle',
      descKey: 'productPreview.stockDesc',
      benefits: [
        'productPreview.stockB1',
        'productPreview.stockB2',
        'productPreview.stockB3',
      ],
      imageSrc: '/screenshots/stock.png',
    },
    {
      id: 'udhaar',
      labelKey: 'productPreview.tab5',
      icon: Users,
      titleKey: 'productPreview.udhaarTitle',
      descKey: 'productPreview.udhaarDesc',
      benefits: [
        'productPreview.udhaarB1',
        'productPreview.udhaarB2',
        'productPreview.udhaarB3',
      ],
      imageSrc: '/screenshots/udhaar.png',
    },
    {
      id: 'invoices',
      labelKey: 'productPreview.tab6',
      icon: FileText,
      titleKey: 'productPreview.invoicesTitle',
      descKey: 'productPreview.invoicesDesc',
      benefits: [
        'productPreview.invoicesB1',
        'productPreview.invoicesB2',
        'productPreview.invoicesB3',
      ],
      imageSrc: '/screenshots/invoices.png',
    },
    {
      id: 'reports',
      labelKey: 'productPreview.tab7',
      icon: LineChart,
      titleKey: 'productPreview.reportsTitle',
      descKey: 'productPreview.reportsDesc',
      benefits: [
        'productPreview.reportsB1',
        'productPreview.reportsB2',
        'productPreview.reportsB3',
      ],
      imageSrc: '/screenshots/reports.png',
    },
  ]

  const currentTab = tabs.find((tItem) => tItem.id === activeTab) || tabs[0]

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }))
  }

  return (
    <section id="product" className="py-12 sm:py-16 lg:py-20 bg-slate-900 text-slate-100 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Section Headline */}
        <div className="max-w-3xl text-left space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-md border border-indigo-500/20">
            Interactive Showcase
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.2]">
            {t('productPreview.headline')}
          </h2>
        </div>

        {/* Tab Buttons across Top */}
        <div
          role="tablist"
          aria-label="Product feature preview tabs"
          className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`tab-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isActive
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{t(tab.labelKey)}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Panel Content Container */}
        <div
          id={`tab-panel-${currentTab.id}`}
          role="tabpanel"
          className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6 lg:p-8 shadow-2xl space-y-8"
        >
          {/* Main Screenshot Container */}
          <div className="rounded-xl overflow-x-auto overflow-y-hidden border border-slate-800 bg-slate-900 ring-1 ring-slate-800/80">
            {/* Window bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 hidden sm:inline text-slate-400">
                  inventorylite.app/app/{currentTab.id}
                </span>
              </div>
              <span className="text-indigo-400 font-sans font-semibold">
                Live Software View
              </span>
            </div>

            {/* Real Screenshot or Fallback */}
            {!failedImages[currentTab.id] ? (
              <Image
                src={currentTab.imageSrc}
                alt={`Inventory Lite ${t(currentTab.labelKey)} Interface`}
                width={1280}
                height={800}
                unoptimized
                className="w-full h-auto object-cover object-top max-h-[520px] sm:max-h-[640px]"
                onError={() => handleImageError(currentTab.id)}
              />
            ) : (
              <div className="p-8 text-center space-y-4 bg-slate-950">
                <currentTab.icon className="h-16 w-16 text-indigo-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">{t(currentTab.titleKey)}</h3>
                <p className="text-slate-400 text-sm max-w-lg mx-auto">{t(currentTab.descKey)}</p>
              </div>
            )}
          </div>

          {/* Title, Description & 3 Benefits */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
            <div className="lg:col-span-6 space-y-3 text-left">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">
                {t(currentTab.titleKey)}
              </h3>
              <p className="text-base text-slate-300 leading-[1.7]">
                {t(currentTab.descKey)}
              </p>
            </div>

            <div className="lg:col-span-6 space-y-3 bg-slate-900 p-5 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
                Key Benefits
              </h4>
              <ul className="space-y-2.5">
                {currentTab.benefits.map((bKey, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm sm:text-base text-slate-200">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{t(bKey)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
