import api from './client';

export const wasteAuditService = {
  // ================= MERMAS =================
  getWastes: async (params = {}) => {
    const res = await api.get('/api/inventory/wastes', { params });
    return res.data || [];
  },

  getWasteSummary: async () => {
    const res = await api.get('/api/inventory/wastes/summary');
    return res.data;
  },

  registerWaste: async (wasteData) => {
    const res = await api.post('/api/inventory/wastes', wasteData);
    return res.data;
  },

  // ================= CADUCIDADES (FEFO) =================
  getAllBatches: async () => {
    const res = await api.get('/api/inventory/batches');
    return res.data || [];
  },

  getExpiringBatches: async (daysAhead = 15) => {
    const res = await api.get('/api/inventory/batches/expiring', {
      params: { daysAhead }
    });
    return res.data || [];
  },

  getBatchesByProduct: async (productId) => {
    const res = await api.get(`/api/inventory/batches/product/${productId}`);
    return res.data || [];
  },

  createBatch: async (batchData) => {
    const res = await api.post('/api/inventory/batches', batchData);
    return res.data;
  },

  dischargeBatch: async (batchId, reason) => {
    const res = await api.post(`/api/inventory/batches/${batchId}/discharge-waste`, null, {
      params: { reason }
    });
    return res.data;
  },

  // ================= CONTEO FÍSICO / AUDITORÍAS =================
  listAuditSessions: async () => {
    const res = await api.get('/api/inventory/audits');
    return res.data || [];
  },

  getAuditSession: async (id) => {
    const res = await api.get(`/api/inventory/audits/${id}`);
    return res.data;
  },

  startAuditSession: async (notes = '') => {
    const res = await api.post('/api/inventory/audits', { notes });
    return res.data;
  },

  recordAuditCount: async (sessionId, countData) => {
    const res = await api.post(`/api/inventory/audits/${sessionId}/count`, countData);
    return res.data;
  },

  reconcileAudit: async (sessionId) => {
    const res = await api.post(`/api/inventory/audits/${sessionId}/reconcile`);
    return res.data;
  },

  cancelAudit: async (sessionId) => {
    const res = await api.post(`/api/inventory/audits/${sessionId}/cancel`);
    return res.data;
  }
};

export default wasteAuditService;
