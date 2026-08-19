/**
 * Centralized Internationalization (i18n) Dictionaries
 * Supports English ('en') and Nepali ('ne') UI languages
 */

export type Language = 'en' | 'ne'

export const translations = {
  en: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      products: 'Products',
      categories: 'Categories',
      stock: 'Stock Management',
      customers: 'Customers',
      sales: 'Sales Billing',
      invoices: 'Tax Invoices',
      expenses: 'Expense Tracker',
      reports: 'Analytics & Reports',
      settings: 'Settings',
      posTerminal: 'Open POS Terminal',
      logout: 'Sign Out',
    },

    // Common UI Labels
    common: {
      search: 'Search...',
      filter: 'Filter',
      category: 'Category',
      actions: 'Actions',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save Changes',
      cancel: 'Cancel',
      confirm: 'Confirm',
      loading: 'Loading...',
      total: 'Total',
      subtotal: 'Subtotal',
      discount: 'Discount',
      vat: 'VAT (13%)',
      paid: 'Paid Amount',
      due: 'Outstanding Due',
      date: 'Date',
      status: 'Status',
      notes: 'Notes',
    },

    // Dashboard
    dashboard: {
      title: 'Business Performance Overview',
      todaySales: "Today's Sales",
      monthlySales: "This Month's Sales",
      todayExpenses: "Today's Expenses",
      monthlyExpenses: "Monthly Expenses",
      totalProducts: 'Total Products',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      customerDues: 'Customer Dues',
      estimateNotice: 'Inventory Lite provides operational profit estimates for small businesses. It is not double-entry accounting software.',
    },

    // POS & Invoices
    billing: {
      posTitle: 'POS Cashier Billing Terminal',
      searchProduct: 'Search product by name or scan barcode...',
      cart: 'Cart Items',
      cartEmpty: 'No items in cart',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      fonepay: 'Fonepay / QR',
      card: 'Card / POS',
      credit: 'Credit (Khata / Customer Due)',
      completeSale: 'Complete & Print Invoice',
      taxInvoice: 'TAX INVOICE',
      sellerPan: 'Seller PAN / VAT:',
      customerDetails: 'Customer Information',
      bsDate: 'Bikram Sambat (B.S.):',
    },
  },

  ne: {
    // Navigation
    nav: {
      dashboard: 'ड्यासबोर्ड',
      products: 'सामानहरू (Products)',
      categories: 'वर्गहरू (Categories)',
      stock: 'स्टक व्यवस्थापन',
      customers: 'ग्राहकसूची (Khata)',
      sales: 'बिक्री बिलिङ',
      invoices: 'कर बिजक (Invoices)',
      expenses: 'खर्च खाता (Expenses)',
      reports: 'रिपोर्ट र विश्लेषण',
      settings: 'सेटिङहरू',
      posTerminal: 'नयाँ बिल काट्नुहोस्',
      logout: 'बाहिरिनुहोस्',
    },

    // Common UI Labels
    common: {
      search: 'खोज्नुहोस्...',
      filter: 'फिल्टर',
      category: 'वर्ग',
      actions: 'कार्यहरू',
      edit: 'सम्पादन',
      delete: 'हटाउनुहोस्',
      save: 'सुरक्षित गर्नुहोस्',
      cancel: 'रद्द गर्नुहोस्',
      confirm: 'पक्का गर्नुहोस्',
      loading: 'लोड हुँदैछ...',
      total: 'जम्मा',
      subtotal: 'उप-जम्मा',
      discount: 'छुट',
      vat: 'मू.अ.कर (१३%)',
      paid: 'बुझाएको रकम',
      due: 'बाँकी रकम (Khata)',
      date: 'मिति',
      status: 'अवस्था',
      notes: 'कैफियत',
    },

    // Dashboard
    dashboard: {
      title: 'व्यापारिक कार्यसम्पादन विवरण',
      todaySales: 'आजको बिक्री',
      monthlySales: 'यस महिनाको बिक्री',
      todayExpenses: 'आजको खर्च',
      monthlyExpenses: 'यस महिनाको खर्च',
      totalProducts: 'जम्मा सामानहरू',
      lowStock: 'न्यून स्टक',
      outOfStock: 'स्टक सकिएको',
      customerDues: 'ग्राहकको बाँकी (Khata)',
      estimateNotice: 'इन्भेन्टरी लाइटले साना व्यवसायका लागि अनुमानित नाफा गणना गर्दछ। यो पूर्ण डबल-इन्ट्री एकाउन्टिङ सफ्टवेयर होइन।',
    },

    // POS & Invoices
    billing: {
      posTitle: 'काउन्टर बिलिङ टर्मिनल',
      searchProduct: 'सामानको नाम वा बारकोड खोज्नुहोस्...',
      cart: 'बिल गरिएका सामानहरू',
      cartEmpty: 'कार्ट खाली छ',
      paymentMethod: 'भुक्तानीको माध्यम',
      cash: 'नगद (Cash)',
      fonepay: 'फोनपे / QR',
      card: 'कार्ड (Card)',
      credit: 'उधारो (Khata)',
      completeSale: 'बिक्री सम्पन्न र बिल प्रिन्ट',
      taxInvoice: 'कर बिजक (TAX INVOICE)',
      sellerPan: 'विक्रेता स्थायी लेखा नं (PAN/VAT):',
      customerDetails: 'ग्राहकको विवरण',
      bsDate: 'विक्रम संवत् (बि.सं.):',
    },
  },
} as const

/**
 * Helper to retrieve nested translation strings
 */
export function getTranslation(lang: Language = 'en', path: string): string {
  const keys = path.split('.')
  let current: any = translations[lang] || translations.en
  for (const key of keys) {
    if (current && current[key] !== undefined) {
      current = current[key]
    } else {
      return path
    }
  }
  return typeof current === 'string' ? current : path
}
