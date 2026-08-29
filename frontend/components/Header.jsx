'use client';

import { useState } from 'react';
import { Play, FastForward, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

export default function Header({ title, subtitle, onRefresh }) {
  const [loadingSimulate, setLoadingSimulate] = useState(false);
  const [loadingWarp, setLoadingWarp] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleSimulate = async () => {
    setLoadingSimulate(true);
    setStatusMsg(null);
    try {
      const res = await api.simulateFailure({});
      setStatusMsg({ type: 'success', text: `Simulated failure ingested for ${res.data.customerName || 'Customer'} (Case ID: ${res.data.caseId})` });
      if (onRefresh) onRefresh();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Simulation failed' });
    } finally {
      setLoadingSimulate(false);
    }
  };

  const handleFastForward = async () => {
    setLoadingWarp(true);
    setStatusMsg(null);
    try {
      const res = await api.fastForward(360);
      setStatusMsg({
        type: 'success',
        text: `Warp complete! ${res.data.jobsExecutedCount} retry jobs executed, ₹${res.data.totalRecoveredInWarp.toLocaleString()} recovered.`,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Fast-forward failed' });
    } finally {
      setLoadingWarp(false);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 shrink-0 shadow-2xs">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 font-normal mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-3 flex-wrap">
        {statusMsg && (
          <div
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center space-x-1.5 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <button
          onClick={handleSimulate}
          disabled={loadingSimulate}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 disabled:opacity-50 transition-all shadow-xs"
        >
          {loadingSimulate ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
          ) : (
            <Play className="w-3.5 h-3.5 text-blue-600" />
          )}
          <span>+ Simulate Failure</span>
        </button>

        <button
          onClick={handleFastForward}
          disabled={loadingWarp}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-all shadow-xs"
        >
          {loadingWarp ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
          ) : (
            <FastForward className="w-3.5 h-3.5 text-white" />
          )}
          <span>Fast-Forward 6h ⏩</span>
        </button>
      </div>
    </header>
  );
}
