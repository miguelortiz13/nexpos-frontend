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
  }
};

export default customerService;
