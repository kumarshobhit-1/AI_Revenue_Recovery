'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import CaseAuditDrawer from '../../components/CaseAuditDrawer';
import { api } from '../../lib/api';
import {
  FlaskConical,
  Play,
  FastForward,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function SimulatorPage() {
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingSimulate, setLoadingSimulate] = useState(false);
  const [loadingWarp, setLoadingWarp] = useState(false);
  const [loadingBench, setLoadingBench] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // Scenario Simulator Dropdown
  const [selectedScenario, setSelectedScenario] = useState('INSUFFICIENT_FUNDS');
  const [customAmount, setCustomAmount] = useState(4999);

  const failureScenarios = [
    { label: 'Card Decline — Insufficient Funds', value: 'INSUFFICIENT_FUNDS', amount: 4999 },
    { label: 'NetBanking — Bank Server Timeout / Technical Outage', value: 'BANK_SERVER_DOWN', amount: 12500 },
    { label: 'Card Decline — Expired Authorization', value: 'EXPIRED_CARD', amount: 2999 },
    { label: 'UPI Collect — PIN Timeout', value: 'UPI_PIN_TIMEOUT', amount: 1999 },
    { label: 'Checkout Abandonment — Session Incomplete', value: 'CHECKOUT_ABANDONED_SESSION', amount: 8999 },
    { label: 'Recurring Subscription — Mandate Auto-Debit Declined', value: 'RECURRING_MANDATE_DECLINED', amount: 14999 },
    { label: 'B2B Invoice — Overdue Receivable 30 Days', value: 'OVERDUE_INVOICE_30D', amount: 45000 },
    { label: 'UPI Collect — Promise-to-Pay Pending', value: 'PROMISE_TO_PAY_PENDING', amount: 6500 },
    { label: 'Gateway Degradation Warning', value: 'PAYMENT_DEGRADATION_WARNING', amount: 15000 },
  ];

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await api.getPendingJobs();
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleSimulateScenario = async () => {
    setLoadingSimulate(true);
    setResultMsg(null);
    try {
      const res = await api.simulateFailure({
        failureReason: selectedScenario,
        amount: Number(customAmount),
      });
      setResultMsg({
        type: 'success',
        text: `Simulated failure event ingested for ${res.data.customerName}! Case ID: ${res.data.caseId} in state ${res.data.state}`,
      });
      fetchJobs();
    } catch (err) {
      setResultMsg({ type: 'error', text: err.message || 'Simulation failed' });
    } finally {
      setLoadingSimulate(false);
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

  const handleRunBenchmark = async (batchSize = 25) => {
    setLoadingBench(true);
    setResultMsg(null);
    try {
      const res = await api.runBenchmark(batchSize);
      setBenchmarkResult(res.data);
      setResultMsg({
        type: 'success',
        text: `Batch Benchmark Evaluation Completed for ${batchSize} synthetic failure cases! Recovery Rate: ${res.data.recoveryRatePercentage}%`,
      });
      fetchJobs();
    } catch (err) {
      setResultMsg({ type: 'error', text: err.message || 'Benchmark evaluation failed' });
    } finally {
      setLoadingBench(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-y-auto overflow-x-hidden">
        <Header
          title="Synthetic Evaluation & Simulator Lab"
          subtitle="Test failure scenarios, trigger Time-Travel retries, and run batch benchmark suites"
          onRefresh={fetchJobs}
        />

        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto flex-1">
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

          {/* Section 1: Failure Scenario Trigger Lab */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <FlaskConical className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Synthetic Failure Trigger Sandbox</h3>
                <p className="text-xs text-slate-500 font-medium">Inject synthetic payment failures to test agent closed-loop recovery</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">Select Failure Scenario</label>
                <select
                  value={selectedScenario}
                  onChange={(e) => {
                    setSelectedScenario(e.target.value);
                    const matched = failureScenarios.find((s) => s.value === e.target.value);
                    if (matched) setCustomAmount(matched.amount);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 transition-colors"
                >
                  {failureScenarios.map((sc) => (
                    <option key={sc.value} value={sc.value}>
                      {sc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Amount (INR)</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleSimulateScenario}
              disabled={loadingSimulate}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-all shadow-2xs flex items-center space-x-2"
            >
              {loadingSimulate ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Play className="w-4 h-4 text-white" />
              )}
              <span>Ingest Synthetic Failure Scenario Event</span>
            </button>
          </div>

          {/* Section 2: Time-Travel Fast-Forward Engine */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FastForward className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Time-Travel Engine & Scheduled Job Queue</h3>
                  <p className="text-xs text-slate-500 font-medium">Fast-forward time to instantly execute scheduled recovery retries</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-200">
                {jobs.length} Pending Scheduled Jobs
              </span>
            </div>

            {/* Time Warp Fast Forward Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-600">Simulated Time Warp:</span>
              <button
                onClick={() => handleWarp(60)}
                disabled={loadingWarp}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 active:bg-purple-200 transition-colors shadow-2xs flex items-center space-x-1.5"
              >
                <span>+1 Hour ⏩</span>
              </button>
              <button
                onClick={() => handleWarp(360)}
                disabled={loadingWarp}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-2xs flex items-center space-x-1.5"
              >
                <span>+6 Hours ⏩</span>
              </button>
              <button
                onClick={() => handleWarp(1440)}
                disabled={loadingWarp}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 transition-colors shadow-2xs flex items-center space-x-1.5"
              >
                <span>+24 Hours ⏩</span>
              </button>
            </div>

            {/* Pending Scheduled Jobs List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Scheduled Queue Items</h4>
              {loadingJobs ? (
                <p className="text-xs text-slate-400 py-4 text-center">Loading queue items...</p>
              ) : jobs.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400 font-medium">
                  No scheduled retry jobs currently in queue. Ingest a synthetic failure above to create scheduled actions.
                </div>
              ) : (
                <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse table-auto">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-4 whitespace-nowrap">Job ID</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Case ID</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Action Type</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Scheduled Execution</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                      {jobs.map((j) => (
                        <tr key={j.jobId} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{j.jobId}</td>
                          <td className="py-2.5 px-4 font-mono text-purple-700 font-bold whitespace-nowrap">{j.caseId}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800 whitespace-nowrap">{j.actionType}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {new Date(j.scheduledAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              {j.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Phase 13 Synthetic Evaluation & Benchmarking Suite */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Synthetic Evaluation & Benchmarking Suite</h3>
                  <p className="text-xs text-slate-500 font-medium">Batch evaluation across N synthetic failure cases to measure pipeline recovery accuracy & latency</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRunBenchmark(9)}
                  disabled={loadingBench}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-colors shadow-2xs flex items-center space-x-1.5"
                >
                  {loadingBench ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>Run 9-Case Track 03 Benchmark</span>
                </button>
                <button
                  onClick={() => handleRunBenchmark(25)}
                  disabled={loadingBench}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 transition-colors shadow-2xs flex items-center space-x-1.5"
                >
                  {loadingBench ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <BarChart3 className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>Run 25-Case Batch Evaluation</span>
                </button>
              </div>
            </div>

            {/* Benchmark Metrics Display Cards */}
            {benchmarkResult ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-1">
                    <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Batch Size</span>
                    <p className="text-2xl font-black text-purple-950">{benchmarkResult.batchSize} Cases</p>
                    <p className="text-[10px] text-purple-700 font-medium">Total Duration: {benchmarkResult.durationMs}ms</p>
                  </div>

                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Revenue Recovered</span>
                    <p className="text-2xl font-black text-emerald-950">₹{benchmarkResult.totalRevenueRecovered.toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-700 font-semibold">Total Revenue At Risk: ₹{benchmarkResult.totalRevenueAtRisk.toLocaleString()}</p>
                  </div>

                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Recovery Rate</span>
                    <p className="text-2xl font-black text-emerald-950">{benchmarkResult.recoveryRatePercentage}%</p>
                    <p className="text-[10px] text-emerald-700 font-medium">Auto-Recovery Efficiency</p>
                  </div>

                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-1">
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Diagnostic Accuracy</span>
                    <p className="text-2xl font-black text-blue-950">{benchmarkResult.aiAccuracyPercentage}%</p>
                    <p className="text-[10px] text-blue-700 font-medium">Ground Truth Alignment Rate</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Pipeline Latency</span>
                    <p className="text-2xl font-black text-slate-900">{benchmarkResult.avgLatencyMs}ms / Case</p>
                    <p className="text-[10px] text-slate-500 font-medium">Real-time State Machine Latency</p>
                  </div>

                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-1">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Policy Guardrails</span>
                    <p className="text-2xl font-black text-amber-950">{benchmarkResult.policyInterventionCount} Interventions</p>
                    <p className="text-[10px] text-amber-700 font-medium">Zero-Trust Guardrail Overrides</p>
                  </div>
                </div>

                {/* Cases Sample Summary Table */}
                <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse table-auto">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4 whitespace-nowrap">Case ID</th>
                        <th className="py-3 px-4 whitespace-nowrap">Failure Scenario</th>
                        <th className="py-3 px-4 whitespace-nowrap">Base Amount</th>
                        <th className="py-3 px-4 whitespace-nowrap">Revenue At Risk</th>
                        <th className="py-3 px-4 whitespace-nowrap">AI Classification</th>
                        <th className="py-3 px-4 whitespace-nowrap">Confidence</th>
                        <th className="py-3 px-4 whitespace-nowrap">Recommended Action</th>
                        <th className="py-3 px-4 whitespace-nowrap">Policy Verdict</th>
                        <th className="py-3 px-4 whitespace-nowrap">Final State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                      {benchmarkResult.casesSummary?.slice(0, 15).map((c) => (
                        <tr key={c.caseId} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-bold font-mono text-slate-900 whitespace-nowrap">{c.caseId}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            <span className="max-w-[160px] truncate block" title={c.failureReason}>
                              {c.failureReason}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">₹{c.amount.toLocaleString()}</td>
                          <td className="py-3 px-4 font-bold text-blue-700 whitespace-nowrap">₹{c.revenueAtRisk.toLocaleString()}</td>
                          <td className="py-3 px-4 font-mono text-purple-700 font-semibold">
                            <span className="max-w-[160px] truncate block" title={c.aiClassification || 'N/A'}>
                              {c.aiClassification || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-purple-900 whitespace-nowrap">
                            {c.aiConfidence ? `${(c.aiConfidence * 100).toFixed(0)}%` : '85%'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">{c.recommendedAction || 'SCHEDULE_RETRY'}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              c.policyStatus === 'MODIFIED' || c.policyStatus === 'REJECTED'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                              {c.policyStatus || 'APPROVED'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">{c.state}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-500 space-y-2">
                <BarChart3 className="w-8 h-8 mx-auto text-slate-400" />
                <p className="font-semibold text-slate-700">No Benchmark Suite Executed Yet</p>
                <p>Click "Run 9-Case Track 03 Benchmark" or "Run 25-Case Batch Evaluation" to execute synthetic batch benchmarking.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedCaseId && (
        <CaseAuditDrawer
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onRefresh={fetchJobs}
        />
      )}
    </div>
  );
}
