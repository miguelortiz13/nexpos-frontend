import api from './client';

export const getPurchases = async (filters = {}) => {
  const params = {};
  if (filters.supplierId) params.supplierId = filters.supplierId;
  if (filters.status) params.status = filters.status;
  if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  const res = await api.get('/api/purchases', { params });
  return res.data;
};

export const getPurchaseById = async (id) => {
  const res = await api.get(`/api/purchases/${id}`);
  return res.data;
};

export const createPurchase = async (purchaseData) => {
  const res = await api.post('/api/purchases', purchaseData);
  return res.data;
};

export const cancelPurchase = async (id, reason = '') => {
  const res = await api.post(`/api/purchases/${id}/cancel`, { reason });
  return res.data;
};

export const getPayablesSummary = async () => {
  const res = await api.get('/api/purchases/payables-summary');
  return res.data;
};
