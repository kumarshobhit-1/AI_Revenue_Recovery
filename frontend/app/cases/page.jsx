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
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>RECOVERED</span>
          </span>
        );
      case 'ACTION_SCHEDULED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center space-x-1 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>SCHEDULED</span>
          </span>
        );
      case 'ESCALATED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center space-x-1 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            <span>ESCALATED</span>
          </span>
        );
      case 'STOPPED':
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center space-x-1 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            <span>{state}</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-y-auto overflow-x-hidden">
        <Header
          title="Recovery Cases Directory"
          subtitle="Detailed audit view and lifecycle management for all ingested failure cases"
          onRefresh={fetchCases}
        />

        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto flex-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
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
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[220px]">
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

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Case ID</th>
                    <th className="py-3 px-3">Payment ID</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Failure Category</th>
                    <th className="py-3 px-3">Base Amount</th>
                    <th className="py-3 px-3">At Risk (LTV)</th>
                    <th className="py-3 px-3">State</th>
                    <th className="py-3 px-3 text-right">Audit Trail</th>
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
                        <td className="py-3 px-3 font-bold font-mono text-slate-900">
                          <span className="max-w-[120px] truncate block" title={c.caseId}>
                            {c.caseId}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          <span className="max-w-[100px] truncate block" title={c.paymentId}>
                            {c.paymentId}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 max-w-[120px] truncate">
                            {c.customerName || c.customerId}
                          </div>
                          {c.customerEmail && (
                            <div className="text-[11px] text-slate-400 font-normal max-w-[120px] truncate">
                              {c.customerEmail}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div
                            className="max-w-[140px] truncate font-medium text-slate-700 text-xs"
                            title={c.failureCategory || 'INSUFFICIENT_FUNDS'}
                          >
                            {c.failureCategory || 'INSUFFICIENT_FUNDS'}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          ₹{c.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-blue-700 whitespace-nowrap">
                          ₹{c.revenueAtRisk.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          {getStatusBadge(c.state)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCaseId(c.caseId);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all border border-blue-200 shrink-0 whitespace-nowrap shadow-2xs"
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
