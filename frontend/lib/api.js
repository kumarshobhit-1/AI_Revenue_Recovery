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
      throw new Error(data.error?.message || `HTTP ${res.status} Error`);
    }
    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

export const api = {
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
};
