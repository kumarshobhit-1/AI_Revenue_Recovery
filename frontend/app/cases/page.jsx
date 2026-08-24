'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import CaseAuditDrawer from '../../components/CaseAuditDrawer';
import { api } from '../../lib/api';
import {
  Receipt,
  Search,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCases();
  }, [activeFilter]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await api.getCases(activeFilter);
      setCases(res.data.cases || []);
    } catch (err) {
      console.error(err);
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
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">RECOVERED</span>;
      case 'ACTION_SCHEDULED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">ACTION SCHEDULED</span>;
      case 'ESCALATED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">ESCALATED</span>;
      case 'STOPPED':
      case 'FAILED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">{state}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">{state}</span>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Recovery Cases Directory"
          subtitle="Detailed audit view and lifecycle management for all ingested failure cases"
          onRefresh={fetchCases}
        />

        <main className="p-8 space-y-8 flex-1 max-w-7xl w-full mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
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

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Case ID</th>
                    <th className="py-3.5 px-5">Payment ID</th>
                    <th className="py-3.5 px-5">Customer</th>
                    <th className="py-3.5 px-5">Failure Category</th>
                    <th className="py-3.5 px-5">Base Amount</th>
                    <th className="py-3.5 px-5">At Risk (LTV)</th>
                    <th className="py-3.5 px-5">State</th>
                    <th className="py-3.5 px-5 text-right">Audit Trail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <div className="flex justify-center items-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Loading cases...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400 font-normal">
                        No cases found matching query.
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
                            <span>Inspect</span>
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

      {selectedCaseId && (
        <CaseAuditDrawer
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onRefresh={fetchCases}
        />
      )}
    </div>
  );
}
