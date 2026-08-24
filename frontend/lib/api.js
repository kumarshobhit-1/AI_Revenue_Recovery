const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Generic API request wrapper.
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error?.message || `HTTP ${res.status} Error`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

export const api = {
  // Payment Attempt Integration (Phase 2D)
  async attemptPayment(payload) {
    try {
      const data = await fetchAPI('/payments/attempt', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return {
        success: true,
        statusCode: 201,
        message: data.message,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.status || 500,
        error: error.data?.error || {
          code: 'NETWORK_ERROR',
          message: error.message || 'Failed to connect to RecoverAI Payment Gateway',
        },
      };
    }
  },

  // Financial Metrics
  async getMetrics(merchantId = 'mer_default') {
    return fetchAPI(`/events/metrics?merchantId=${merchantId}`);
  },

  // Recovery Cases
  async getCases(state = '', page = 1, limit = 50) {
    const query = new URLSearchParams();
    if (state) query.append('state', state);
    query.append('page', page);
    query.append('limit', limit);
    return fetchAPI(`/events/cases?${query.toString()}`);
  },

  async getCaseDetails(caseId) {
    return fetchAPI(`/events/cases/${caseId}`);
  },

  // Simulation & Event Triggers
  async simulateFailure(payload = {}) {
    return fetchAPI('/events/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async fastForward(targetMinutes = 360, caseId = null) {
    const payload = { targetMinutes };
    if (caseId) payload.caseId = caseId;
    return fetchAPI('/events/simulator/fast-forward', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resolveOutcome(caseId, outcome = 'SUCCESS', notes = '') {
    return fetchAPI(`/events/cases/${caseId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ outcome, notes }),
    });
  },

  async getPendingJobs() {
    return fetchAPI('/events/simulator/jobs');
  },

  async runBenchmark(batchSize = 25) {
    return fetchAPI('/events/simulator/benchmark', {
      method: 'POST',
      body: JSON.stringify({ batchSize }),
    });
  },
};
