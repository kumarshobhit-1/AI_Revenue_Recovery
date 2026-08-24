// Default UI configuration for the Merchant Checkout experience.
// Phase 2D will connect this to live backend/merchant API context.

export const defaultCheckoutConfig = {
  merchant: {
    merchantId: 'mer_default',
    name: 'Acme SaaS Corp',
    supportEmail: 'support@acmesaas.com',
  },
  order: {
    orderId: 'ord_sample_1001',
    description: 'Professional Subscription Plan (Annual)',
    items: [
      { id: 'item_1', title: 'RecoverAI Pro Tier (12 Months)', price: 4999, quantity: 1 },
    ],
    tax: 0,
    currency: 'INR',
    currencySymbol: '₹',
  },
  customer: {
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    phone: '+91 98765 43210',
  },
};
