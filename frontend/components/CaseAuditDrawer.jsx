'use client';

import { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  BrainCircuit,
  Scale,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  CreditCard,
  Building2,
  Check,
  Receipt,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api';

export default function CaseAuditDrawer({ caseId, onClose, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'summary' | 'ai' | 'policy'
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    fetchCaseDetails();
  }, [caseId]);

  const fetchCaseDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCaseDetails(caseId);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch case details');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (outcome) => {
    setResolving(true);
    try {
      await api.resolveOutcome(caseId, outcome, `Manually resolved via Audit Drawer to ${outcome}`);
      await fetchCaseDetails();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to resolve outcome');
    } finally {
      setResolving(false);
    }
  };

  if (!caseId) return null;

  const recoveryCase = data?.recoveryCase;
  const payment = data?.payment;
  const aiDecision = data?.aiDecision;
  const policyResult = data?.policyResult;
  const auditLogs = data?.auditLogs || [];

  const getStateBadge = (state) => {
    switch (state) {
      case 'RECOVERED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">RECOVERED</span>;
      case 'ACTION_SCHEDULED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">ACTION SCHEDULED</span>;
      case 'ESCALATED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">ESCALATED</span>;
      case 'STOPPED':
      case 'FAILED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">{state}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">{state}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 select-none">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{caseId}</h3>
              {recoveryCase && getStateBadge(recoveryCase.state)}
            </div>
            {recoveryCase && (
              <p className="text-xs text-slate-500 font-medium mt-1">
                Payment ID: <span className="font-mono text-slate-700">{recoveryCase.paymentId}</span> • Customer: <span className="font-bold text-slate-900">{recoveryCase.customerName || recoveryCase.customerId}</span> {recoveryCase.customerEmail && <span className="text-slate-400 font-normal">({recoveryCase.customerEmail})</span>}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8 text-slate-500 font-medium text-sm">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Fetching case audit trail...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 p-6 text-rose-600 text-sm font-medium">
            Error loading audit trail: {error}
          </div>
        ) : recoveryCase && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 bg-white px-6">
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                  activeTab === 'audit'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Timeline ({auditLogs.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                  activeTab === 'summary'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payment & Risk</span>
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                  activeTab === 'ai'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>AI Diagnosis</span>
              </button>
            </div>

            {/* Tab 1: Audit Timeline */}
            {activeTab === 'audit' && (
              <div className="p-6 space-y-6 flex-1">
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                  {auditLogs.map((log, idx) => {
                    const isAi = log.actor === 'AI_AGENT';
                    const isPolicy = log.actor === 'POLICY_ENGINE';

                    return (
                      <div key={log.auditId || idx} className="relative pl-6">
                        <div
                          className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                            isAi
                              ? 'border-purple-600 bg-purple-50'
                              : isPolicy
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-slate-400 bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAi ? 'bg-purple-600' : isPolicy ? 'bg-blue-600' : 'bg-slate-500'
                            }`}
                          ></div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isAi
                                  ? 'bg-purple-100 text-purple-800'
                                  : isPolicy
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {log.actor}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {new Date(log.createdAt || log.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-800">{log.summary}</p>

                          {log.previousState && log.newState && (
                            <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1.5">
                              <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">{log.previousState}</span>
                              <span>→</span>
                              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">{log.newState}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Context & Payment Details */}
            {activeTab === 'summary' && (
              <div className="p-6 space-y-6 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-xs font-medium text-slate-500">Transaction Base Amount</p>
                    <p className="text-xl font-bold text-slate-900">₹{recoveryCase.amount.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-1">
                    <p className="text-xs font-semibold text-blue-700">Revenue at Risk (LTV Weighted)</p>
                    <p className="text-xl font-bold text-blue-900">₹{recoveryCase.revenueAtRisk.toLocaleString()}</p>
                  </div>
                </div>

                {/* Real Payment Document Data */}
                {payment && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 font-mono text-xs text-slate-800">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider font-sans border-b border-slate-100 pb-2">
                      Gateway Response Metadata
                    </h4>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment ID:</span>
                      <span className="font-bold">{payment.paymentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Method:</span>
                      <span className="font-semibold text-blue-700">{payment.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Error Code:</span>
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {payment.errorCode || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Failure Reason:</span>
                      <span className="font-medium text-slate-700">{payment.failureReason || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gateway Txn ID:</span>
                      <span className="font-semibold text-slate-700">
                        {payment.gatewayResponse?.rawPayload?.gatewayTxnId || payment.gatewayResponse?.gatewayTxnId || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gateway Latency:</span>
                      <span>
                        {payment.gatewayResponse?.rawPayload?.latencyMs || payment.gatewayResponse?.latencyMs || 0}ms
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: AI Diagnosis Details */}
            {activeTab === 'ai' && (
              <div className="p-6 space-y-6 flex-1">
                {aiDecision ? (
                  <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                      <div className="flex items-center space-x-2">
                        <BrainCircuit className="w-5 h-5 text-purple-600" />
                        <h4 className="font-bold text-purple-950 text-sm">AI Agent Diagnostic Analysis</h4>
                      </div>
                      <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full text-xs font-bold border border-purple-300">
                        {Math.round((aiDecision.confidenceScore || 0) * 100)}% Confidence
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-purple-900">
                      <p><span className="font-bold">Failure Classification:</span> <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-purple-200">{aiDecision.classification}</span></p>
                      <p><span className="font-bold">Recommended Action:</span> <span className="font-bold text-purple-700">{aiDecision.recommendedAction}</span></p>
                    </div>

                    {aiDecision.rationale && Array.isArray(aiDecision.rationale) && (
                      <div className="bg-white rounded-lg p-4 border border-purple-200 space-y-2 text-xs">
                        <p className="font-bold text-slate-800">Diagnostic Rationale & Evidence:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                          {aiDecision.rationale.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    No AI decision record created yet for this case.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Outcome Resolution Footer Actions */}
        {recoveryCase && recoveryCase.state !== 'RECOVERED' && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">Outcome Control:</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleResolve('FAILURE')}
                disabled={resolving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors"
              >
                Mark as Failed
              </button>
              <button
                onClick={() => handleResolve('SUCCESS')}
                disabled={resolving}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                Resolve as Recovered (₹{recoveryCase.amount.toLocaleString()})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
