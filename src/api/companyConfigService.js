import api from './client';

export const companyConfigService = {
  getConfig: async () => {
    const response = await api.get('/api/company-config');
    return response.data;
  },

  updateConfig: async (configData) => {
    const response = await api.put('/api/company-config', configData);
    return response.data;
  },

  testConnection: async () => {
    const response = await api.post('/api/company-config/test-connection');
    return response.data;
  }
};

export default companyConfigService;
