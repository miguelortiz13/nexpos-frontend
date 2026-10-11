import api from './client';

export const getSuppliers = async (query = '', activeOnly = false) => {
  const params = {};
  if (query) params.query = query;
  if (activeOnly) params.activeOnly = activeOnly;
  const res = await api.get('/api/suppliers', { params });
  return res.data;
};

export const getSupplierById = async (id) => {
  const res = await api.get(`/api/suppliers/${id}`);
  return res.data;
};

export const createSupplier = async (supplierData) => {
  const res = await api.post('/api/suppliers', supplierData);
  return res.data;
};

export const updateSupplier = async (id, supplierData) => {
  const res = await api.put(`/api/suppliers/${id}`, supplierData);
  return res.data;
};

export const toggleSupplierStatus = async (id) => {
  const res = await api.patch(`/api/suppliers/${id}/toggle-status`);
  return res.data;
};
