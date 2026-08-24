'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Lock,
  ArrowLeft,
  ShoppingBag,
  User,
  Mail,
  Phone,
  CreditCard,
  QrCode,
  Building2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  Clock,
  Receipt,
  ServerOff,
} from 'lucide-react';
import { defaultCheckoutConfig } from './checkoutConfig';
import { api } from '../../lib/api';

export default function CheckoutPage() {
  const [config] = useState(defaultCheckoutConfig);
  const [selectedMethod, setSelectedMethod] = useState('CARD'); // CARD | UPI | NETBANKING | MANDATE

  // Customer Inputs
  const [customerName, setCustomerName] = useState(config.customer.name);
  const [customerEmail, setCustomerEmail] = useState(config.customer.email);
  const [customerPhone, setCustomerPhone] = useState(config.customer.phone);

  // Method Specific Inputs (Form State Only - Not sent to backend)
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('731');

  const [upiId, setUpiId] = useState('alex.morgan@okhdfcbank');

  const [selectedBank, setSelectedBank] = useState('HDFC');

  const [accountNumber, setAccountNumber] = useState('918237465012');
  const [ifscCode, setIfscCode] = useState('HDFC0001234');
  const [mandateAuthorized, setMandateAuthorized] = useState(true);

  // UI Flow States: 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'ERROR'
  const [uiState, setUiState] = useState('IDLE');
  const [validationError, setValidationError] = useState('');
  const [simulatedFailure, setSimulatedFailure] = useState(false);

  // Dynamic Backend Response Object
  const [apiResponseData, setApiResponseData] = useState(null);
  const [apiErrorData, setApiErrorData] = useState(null);

  const calculateTotal = () => {
    const itemsTotal = config.order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return itemsTotal + config.order.tax;
  };

  const totalAmount = calculateTotal();

  const validateForm = () => {
    if (!customerName.trim()) {
      setValidationError('Please enter customer name');
      return false;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setValidationError('Please enter a valid customer email address');
      return false;
    }

    if (selectedMethod === 'CARD') {
      if (!cardNumber.trim()) { setValidationError('Please enter card number'); return false; }
      if (!cardExpiry.trim()) { setValidationError('Please enter card expiry date'); return false; }
      if (!cardCvv.trim()) { setValidationError('Please enter CVV'); return false; }
    } else if (selectedMethod === 'UPI') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setValidationError('Please enter a valid UPI ID (e.g. user@bank)');
        return false;
      }
    } else if (selectedMethod === 'MANDATE') {
      if (!accountNumber.trim()) { setValidationError('Please enter bank account number'); return false; }
      if (!ifscCode.trim()) { setValidationError('Please enter IFSC code'); return false; }
      if (!mandateAuthorized) { setValidationError('You must authorize the recurring e-mandate agreement'); return false; }
    }

    setValidationError('');
    return true;
  };

  // Sub-phase 2D-3 & 2D-4: Connect Pay button to POST /api/payments/attempt API
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (uiState === 'PROCESSING') return; // Prevent duplicate click submissions

    setUiState('PROCESSING');
    setApiResponseData(null);
    setApiErrorData(null);

    const payload = {
      amount: totalAmount,
      currency: config.order.currency || 'INR',
      paymentMethod: selectedMethod,
      customerName,
      customerEmail,
      customerPhone,
      merchantId: config.merchant.merchantId || 'mer_default',
      simulateResult: simulatedFailure ? 'FAILED' : 'SUCCESS',
    };

    try {
      const result = await api.attemptPayment(payload);

      if (!result.success) {
        setApiErrorData(result.error);
        setUiState('ERROR');
        return;
      }

      setApiResponseData(result.data);

      const paymentStatus = result.data?.payment?.status;
      if (paymentStatus === 'SUCCESS') {
        setUiState('SUCCESS');
      } else {
        setUiState('FAILED');
      }
    } catch (err) {
      setApiErrorData({
        code: 'CLIENT_NETWORK_ERROR',
        message: err.message || 'Unexpected network connectivity error',
      });
      setUiState('ERROR');
    }
  };

  const handleReset = () => {
    setUiState('IDLE');
    setValidationError('');
    setApiResponseData(null);
    setApiErrorData(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans select-none">
      {/* Merchant Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight">
                {config.merchant.name}
              </h1>
              <p className="text-xs text-slate-500 font-medium">Official Merchant Checkout</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>256-Bit SSL Secured</span>
            </div>

            <Link
              href="/"
              className="flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Responsive Layout */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Order & Customer Context */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Order Summary
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  Ref: {config.order.orderId}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {config.order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500 font-medium">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-slate-900">
                      {config.order.currencySymbol}
                      {item.price.toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>

              {/* Subtotal & Taxes */}
              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs font-medium text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    {config.order.currencySymbol}
                    {totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST / Taxes</span>
                  <span className="text-emerald-600 font-semibold">Included</span>
                </div>
              </div>

              {/* Total Amount Due */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Total Payable
                  </span>
                  <span className="text-2xl font-black text-slate-900">
                    {config.order.currencySymbol}
                    {totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  {config.order.currency}
                </span>
              </div>
            </div>

            {/* Customer Information Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Customer Context
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={uiState === 'PROCESSING'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    disabled={uiState === 'PROCESSING'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={uiState === 'PROCESSING'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Merchant Support Link */}
            <div className="text-center text-xs text-slate-500 font-medium">
              Need help? Contact merchant at{' '}
              <a href={`mailto:${config.merchant.supportEmail}`} className="text-blue-600 hover:underline">
                {config.merchant.supportEmail}
              </a>
            </div>
          </div>

          {/* Right Column: Payment Form & Dynamic Response Views */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Payment Details
                </h2>
                <div className="flex items-center space-x-1 text-xs text-slate-500 font-medium">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Razorpay Verified Gateway</span>
                </div>
              </div>

              {/* Validation Warning Alert */}
              {validationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 flex items-center space-x-3 text-xs font-semibold text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* DYNAMIC SUCCESS VIEW (Sub-phase 2D-4) */}
              {uiState === 'SUCCESS' && apiResponseData && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center space-y-5">
                  <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-950">Payment Captured</h3>
                    <p className="text-xs text-emerald-800 font-medium mt-1">
                      Backend Gateway Response Returned HTTP 201 Created
                    </p>
                  </div>

                  {/* Dynamic MongoDB Data Box */}
                  <div className="bg-white rounded-xl p-5 border border-emerald-200 text-left text-xs space-y-3 font-mono text-slate-800 shadow-sm max-w-md mx-auto">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-500 flex items-center space-x-1">
                        <Receipt className="w-3.5 h-3.5 text-slate-400" />
                        <span>Payment ID</span>
                      </span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {apiResponseData.payment?.paymentId}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Gateway Txn ID</span>
                      <span className="font-semibold text-emerald-700">
                        {apiResponseData.payment?.gatewayResponse?.gatewayTxnId ||
                          apiResponseData.gatewayResult?.gatewayResponse?.gatewayTxnId ||
                          'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Amount Paid</span>
                      <span className="font-bold text-slate-900">
                        {config.order.currencySymbol}
                        {(apiResponseData.payment?.amount || totalAmount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Payment Method</span>
                      <span className="font-semibold">{apiResponseData.payment?.paymentMethod}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Persisted At</span>
                      </span>
                      <span className="text-[11px] text-slate-600 font-medium">
                        {new Date(apiResponseData.payment?.createdAt || Date.now()).toLocaleTimeString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <span>Initiate Another Payment</span>
                  </button>
                </div>
              )}

              {/* DYNAMIC DECLINED VIEW (Sub-phase 2D-4) */}
              {uiState === 'FAILED' && apiResponseData && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center space-y-5">
                  <div className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-rose-950">Payment Declined by Gateway</h3>
                    <p className="text-xs text-rose-800 font-medium mt-1">
                      Transaction declined by bank gateway simulator.
                    </p>
                  </div>

                  {/* Dynamic MongoDB Failed Response Box */}
                  <div className="bg-white rounded-xl p-5 border border-rose-200 text-left text-xs space-y-3 font-mono text-slate-800 shadow-sm max-w-md mx-auto">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-500 flex items-center space-x-1">
                        <Receipt className="w-3.5 h-3.5 text-slate-400" />
                        <span>Payment ID</span>
                      </span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {apiResponseData.payment?.paymentId}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Error Code</span>
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                        {apiResponseData.payment?.errorCode || apiResponseData.gatewayResult?.errorCode}
                      </span>
                    </div>

                    <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Failure Reason</span>
                      <span className="font-semibold text-right text-slate-800 max-w-[200px]">
                        {apiResponseData.payment?.failureReason || apiResponseData.gatewayResult?.failureReason}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Gateway Txn ID</span>
                      <span className="font-semibold text-slate-700">
                        {apiResponseData.payment?.gatewayResponse?.gatewayTxnId ||
                          apiResponseData.gatewayResult?.gatewayResponse?.gatewayTxnId ||
                          'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Gateway Latency</span>
                      <span className="text-[11px] text-slate-600 font-medium">
                        {apiResponseData.gatewayResult?.gatewayResponse?.latencyMs || 180}ms
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Another Method</span>
                  </button>
                </div>
              )}

              {/* DYNAMIC API ERROR / NETWORK ERROR VIEW */}
              {uiState === 'ERROR' && apiErrorData && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center space-y-5">
                  <div className="w-14 h-14 rounded-full bg-amber-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <ServerOff className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-950">Gateway Connectivity Error</h3>
                    <p className="text-xs text-amber-800 font-medium mt-1">
                      Could not reach RecoverAI Backend API at http://localhost:5000
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-amber-200 text-left text-xs space-y-2 font-mono text-slate-800 max-w-md mx-auto">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Error Code:</span>
                      <span className="font-bold text-amber-700">{apiErrorData.code || 'API_UNAVAILABLE'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Message:</span>
                      <span className="font-semibold text-slate-800">{apiErrorData.message}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Request</span>
                  </button>
                </div>
              )}

              {/* PAYMENT FORM (IDLE & PROCESSING STATES) */}
              {(uiState === 'IDLE' || uiState === 'PROCESSING') && (
                <form onSubmit={handleSubmitPayment} className="space-y-6">
                  {/* Payment Method Selector Tabs */}
                  <div className="grid grid-cols-4 gap-2 border-b border-slate-200 pb-4">
                    <button
                      type="button"
                      disabled={uiState === 'PROCESSING'}
                      onClick={() => setSelectedMethod('CARD')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition-all ${
                        selectedMethod === 'CARD'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mb-1 text-blue-600" />
                      <span>Card</span>
                    </button>

                    <button
                      type="button"
                      disabled={uiState === 'PROCESSING'}
                      onClick={() => setSelectedMethod('UPI')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition-all ${
                        selectedMethod === 'UPI'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <QrCode className="w-5 h-5 mb-1 text-emerald-600" />
                      <span>UPI</span>
                    </button>

                    <button
                      type="button"
                      disabled={uiState === 'PROCESSING'}
                      onClick={() => setSelectedMethod('NETBANKING')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition-all ${
                        selectedMethod === 'NETBANKING'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Building2 className="w-5 h-5 mb-1 text-purple-600" />
                      <span>NetBanking</span>
                    </button>

                    <button
                      type="button"
                      disabled={uiState === 'PROCESSING'}
                      onClick={() => setSelectedMethod('MANDATE')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition-all ${
                        selectedMethod === 'MANDATE'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <RefreshCw className="w-5 h-5 mb-1 text-amber-600" />
                      <span>Mandate</span>
                    </button>
                  </div>

                  {/* Method Specific Field Panels */}
                  {selectedMethod === 'CARD' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          disabled={uiState === 'PROCESSING'}
                          placeholder="4532 •••• •••• 8892"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Expiry (MM/YY)</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            disabled={uiState === 'PROCESSING'}
                            placeholder="MM/YY"
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">CVV Code</label>
                          <input
                            type="password"
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            disabled={uiState === 'PROCESSING'}
                            placeholder="731"
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'UPI' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">UPI ID / VPA</label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          disabled={uiState === 'PROCESSING'}
                          placeholder="username@bank"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">Supports Google Pay, PhonePe, Paytm, HDFC, SBI UPI IDs</p>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'NETBANKING' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Select Bank</label>
                        <select
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          disabled={uiState === 'PROCESSING'}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white disabled:bg-slate-100"
                        >
                          <option value="HDFC">HDFC Bank</option>
                          <option value="ICICI">ICICI Bank</option>
                          <option value="SBI">State Bank of India</option>
                          <option value="AXIS">Axis Bank</option>
                          <option value="KOTAK">Kotak Mahindra Bank</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'MANDATE' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Bank Account Number</label>
                        <input
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          disabled={uiState === 'PROCESSING'}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value)}
                          disabled={uiState === 'PROCESSING'}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase disabled:bg-slate-100"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="checkbox"
                          id="mandateCheck"
                          checked={mandateAuthorized}
                          onChange={(e) => setMandateAuthorized(e.target.checked)}
                          disabled={uiState === 'PROCESSING'}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <label htmlFor="mandateCheck" className="text-xs text-slate-600 font-medium">
                          Authorize recurring e-mandate auto-debit agreement
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Dev Test Control Checkbox */}
                  <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Simulate Gateway Decline</span>
                    <input
                      type="checkbox"
                      checked={simulatedFailure}
                      onChange={(e) => setSimulatedFailure(e.target.checked)}
                      disabled={uiState === 'PROCESSING'}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300"
                    />
                  </div>

                  {/* Pay Button */}
                  <button
                    type="submit"
                    disabled={uiState === 'PROCESSING'}
                    className={`w-full py-3.5 px-4 rounded-lg font-bold text-sm text-white shadow-sm flex items-center justify-center space-x-2 transition-all ${
                      uiState === 'PROCESSING'
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                    }`}
                  >
                    {uiState === 'PROCESSING' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Communicating with Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-white" />
                        <span>Pay {config.order.currencySymbol}{totalAmount.toLocaleString('en-IN')}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
