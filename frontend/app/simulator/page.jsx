'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { api } from '../../lib/api';
import {
  FlaskConical,
  Play,
  FastForward,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export default function SimulatorLab() {
  const [formData, setFormData] = useState({
    customerName: 'Shobhit Kumar',
    customerEmail: 'shobhitkumar1437@gmail.com',
    customerPhone: '+917237810232',
    amount: 4999,
    customerLtv: 42000,
    customerSuccessfulTxns: 12,
    failureReason: 'INSUFFICIENT_FUNDS',
  });

  const [loadingSim, setLoadingSim] = useState(false);
  const [loadingWarp, setLoadingWarp] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);
  const [pendingJobs, setPendingJobs] = useState([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.getPendingJobs();
      setPendingJobs(res.data.jobs || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSim(true);
    setResultMsg(null);
    try {
      const res = await api.simulateFailure(formData);
      setResultMsg({
        type: 'success',
        text: `Synthetic failure created! Case ID: ${res.data.caseId} (State: ${res.data.state})`,
      });
      fetchJobs();
    } catch (err) {
      setResultMsg({ type: 'error', text: err.message || 'Simulation failed' });
    } finally {
      setLoadingSim(false);
    }
  };

  const handleWarp = async (minutes) => {
    setLoadingWarp(true);
    setResultMsg(null);
    try {
      const res = await api.fastForward(minutes);
      setResultMsg({
        type: 'success',
        text: `Fast-forwarded ${minutes}m! ${res.data.jobsExecutedCount} retry jobs executed, ₹${res.data.totalRecoveredInWarp.toLocaleString()} recovered.`,
      });
      fetchJobs();
    } catch (err) {
      setResultMsg({ type: 'error', text: err.message || 'Fast-forward failed' });
    } finally {
      setLoadingWarp(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Synthetic Evaluation & Simulator Lab"
          subtitle="Test failure scenarios and trigger Time-Travel Fast-Forward retries"
          onRefresh={fetchJobs}
        />

        <main className="p-8 space-y-8 flex-1 max-w-7xl w-full mx-auto">
          {resultMsg && (
            <div
              className={`p-4 rounded-xl border font-medium text-xs flex items-center space-x-2 ${
                resultMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {resultMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{resultMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Synthetic Failure Generator Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Generate Synthetic Failure</h3>
                  <p className="text-xs text-slate-500 font-medium">Trigger an out-of-band payment failure event</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Email</label>
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Amount (₹)</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Customer LTV (₹)</label>
                    <input
                      type="number"
                      value={formData.customerLtv}
                      onChange={(e) => setFormData({ ...formData, customerLtv: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Failure Reason Code</label>
                  <select
                    value={formData.failureReason}
                    onChange={(e) => setFormData({ ...formData, failureReason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="INSUFFICIENT_FUNDS">1. Payment Failure (INSUFFICIENT_FUNDS)</option>
                    <option value="CHECKOUT_ABANDONED_SESSION">2. Checkout Abandonment (CHECKOUT_ABANDONED)</option>
                    <option value="RECURRING_MANDATE_DECLINED">3. Failed Subscription (MANDATE_DECLINED)</option>
                    <option value="OVERDUE_INVOICE_30D">4. Overdue Receivable (INVOICE_30D_OVERDUE)</option>
                    <option value="PAYMENT_DEGRADATION_WARNING">5. Payment Degradation (DEGRADATION_WARNING)</option>
                    <option value="BANK_SERVER_DOWN">6. Mandate Retry (BANK_SERVER_DOWN)</option>
                    <option value="PROMISE_TO_PAY_PENDING">7. Promise-to-Pay Tracking (PTP_ACTIVE)</option>
                    <option value="EXPIRED_CARD">EXPIRED_CARD (Authorization Issue)</option>
                    <option value="STOLEN_CARD">STOLEN_CARD (Unrecoverable Hard Stop)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loadingSim}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center space-x-2"
                >
                  {loadingSim ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>Run Pipeline (Ingest → Risk → AI Diagnosis)</span>
                </button>
              </form>
            </div>

            {/* Time-Travel Speed Control Harness */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <FastForward className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Time-Travel Fast-Forward</h3>
                    <p className="text-xs text-slate-500 font-medium">Instantly trigger scheduled background retries for evaluation</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  In live recovery systems, retries are scheduled 4 to 24 hours out. Use these simulation controls to warp time forward and instantly resolve pending scheduled retry jobs.
                </p>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={() => handleWarp(60)}
                    disabled={loadingWarp}
                    className="py-3 px-3 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold transition-all text-center space-y-1"
                  >
                    <div>+1 Hour</div>
                    <div className="text-[10px] text-slate-400 font-normal">Fast Retry</div>
                  </button>

                  <button
                    onClick={() => handleWarp(360)}
                    disabled={loadingWarp}
                    className="py-3 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-bold transition-all text-center space-y-1 shadow-xs"
                  >
                    <div>+6 Hours ⏩</div>
                    <div className="text-[10px] text-blue-600 font-semibold">Standard Retry</div>
                  </button>

                  <button
                    onClick={() => handleWarp(1440)}
                    disabled={loadingWarp}
                    className="py-3 px-3 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold transition-all text-center space-y-1"
                  >
                    <div>+24 Hours</div>
                    <div className="text-[10px] text-slate-400 font-normal">Full Cycle</div>
                  </button>
                </div>
              </div>

              {/* Pending Jobs Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pending Scheduled Jobs Queue</span>
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {pendingJobs.length} Jobs
                  </span>
                </div>

                {pendingJobs.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No scheduled jobs currently pending in queue.</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {pendingJobs.map((j) => (
                      <div key={j.jobId} className="text-[11px] font-mono bg-white p-2 rounded border border-slate-200 flex justify-between">
                        <span>Case: {j.caseId}</span>
                        <span className="text-blue-600 font-bold">In {j.delayMinutes}m</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
