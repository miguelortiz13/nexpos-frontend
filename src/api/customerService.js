import api from './client';

export const customerService = {
  getAll: async () => {
    const response = await api.get('/api/customers');
    return response.data;
  },

  search: async (query) => {
    const response = await api.get(`/api/customers/search?query=${encodeURIComponent(query || '')}`);
    return response.data;
  },

  getByDoc: async (docNumber) => {
    const response = await api.get(`/api/customers/doc/${encodeURIComponent(docNumber)}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/customers/${id}`);
    return response.data;
  },

  create: async (customerData) => {
    const response = await api.post('/api/customers', customerData);
    return response.data;
  },

  update: async (id, customerData) => {
    const response = await api.put(`/api/customers/${id}`, customerData);
    return response.data;
  },

  getCreditSummary: async (id) => {
    const response = await api.get(`/api/customers/${id}/credit`);
    return response.data;
  },

  getCreditMovements: async (id) => {
    const response = await api.get(`/api/customers/${id}/credit/movements`);
    return response.data;
  },

  getAllCreditSummaries: async () => {
    const response = await api.get('/api/customers/credit/summary');
    return response.data;
  },

  registerCreditPayment: async (id, paymentData, cashierUsername) => {
    const config = cashierUsername ? { headers: { 'X-Cashier-Username': cashierUsername } } : {};
    const response = await api.post(`/api/customers/${id}/credit/payment`, paymentData, config);
    return response.data;
  },

  downloadReceiptPdf: async (movementId, receiptNumber) => {
    const response = await api.get(`/api/customers/credit/movements/${movementId}/receipt-pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `recibo_caja_${receiptNumber || movementId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default customerService;
