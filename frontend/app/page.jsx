'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import CaseAuditDrawer from '../components/CaseAuditDrawer';
import { api } from '../lib/api';
import {
  TrendingUp,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Search,
  Filter,
} from 'lucide-react';

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [activeFilter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        api.getMetrics('mer_default'),
        api.getCases(activeFilter),
      ]);
      setMetrics(mRes.data);
      setCases(cRes.data.cases || []);
    } catch (err) {
      console.error('[Dashboard Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(
    (c) =>
      c.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.paymentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (state) => {
    switch (state) {
      case 'RECOVERED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>RECOVERED</span>
          </span>
        );
      case 'ACTION_SCHEDULED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>ACTION SCHEDULED</span>
          </span>
        );
      case 'ESCALATED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            <span>ESCALATED</span>
          </span>
        );
      case 'STOPPED':
      case 'FAILED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            <span>{state}</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans select-none">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Merchant Dashboard Overview"
          subtitle="Real-time Revenue Recovery & AI Agent Performance Metrics"
          onRefresh={fetchDashboardData}
        />

        <main className="p-8 space-y-8 flex-1 max-w-7xl w-full mx-auto">
          {/* Financial Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Revenue At Risk */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue At Risk</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">
                ₹{(metrics?.totalRevenueAtRisk || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Weighted by customer LTV & risk score</p>
            </div>

            {/* Card 2: Revenue Recovered */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue Recovered</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-600 tracking-tight">
                ₹{(metrics?.totalRevenueRecovered || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-emerald-600 inline" />
                <span>{metrics?.recoveryRate || 0}% Total Recovery Rate</span>
              </p>
            </div>

            {/* Card 3: Recovery Rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recovery Efficiency</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-600 tracking-tight">{metrics?.recoveryRate || 0}%</p>
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics?.recoveryRate || 0)}%` }}
                ></div>
              </div>
            </div>

            {/* Card 4: Total Cases */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cases Processed</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{metrics?.totalCases || 0}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="text-emerald-700 font-bold">{metrics?.recoveredCasesCount || 0} Recovered</span>
                <span className="text-amber-700 font-bold">{metrics?.escalatedCasesCount || 0} Escalated</span>
              </div>
            </div>
          </div>

          {/* Recovery Cases Management Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Filter Tabs & Search Bar */}
            <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              {/* Filter Tabs */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
                {[
                  { label: 'All Cases', value: '' },
                  { label: 'Scheduled', value: 'ACTION_SCHEDULED' },
                  { label: 'Recovered', value: 'RECOVERED' },
                  { label: 'Escalated', value: 'ESCALATED' },
                  { label: 'Stopped', value: 'STOPPED' },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveFilter(tab.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeFilter === tab.value
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Payment or Case ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Cases Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Case ID</th>
                    <th className="py-3.5 px-5">Payment ID</th>
                    <th className="py-3.5 px-5">Customer</th>
                    <th className="py-3.5 px-5">Failure Issue</th>
                    <th className="py-3.5 px-5">Base Amount</th>
                    <th className="py-3.5 px-5">At Risk (LTV)</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <div className="flex justify-center items-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Loading active cases...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400 font-normal">
                        No recovery cases found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c) => (
                      <tr
                        key={c.caseId}
                        onClick={() => setSelectedCaseId(c.caseId)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-5 font-bold font-mono text-slate-900">{c.caseId}</td>
                        <td className="py-4 px-5 font-mono text-slate-600">{c.paymentId}</td>
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-900">{c.customerName || c.customerId}</div>
                          {c.customerEmail && <div className="text-[11px] text-slate-400 font-normal">{c.customerEmail}</div>}
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-700 font-bold">{c.failureCategory || 'INSUFFICIENT_FUNDS'}</td>
                        <td className="py-4 px-5 font-semibold text-slate-900">₹{c.amount.toLocaleString()}</td>
                        <td className="py-4 px-5 font-bold text-blue-700">₹{c.revenueAtRisk.toLocaleString()}</td>
                        <td className="py-4 px-5">{getStatusBadge(c.state)}</td>
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCaseId(c.caseId);
                            }}
                            className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <span>Audit Trail</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Case Audit Slide-Over Drawer */}
      {selectedCaseId && (
        <CaseAuditDrawer
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onRefresh={fetchDashboardData}
        />
      )}
    </div>
  );
}
