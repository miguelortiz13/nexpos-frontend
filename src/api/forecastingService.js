import api from './client';

/**
 * Servicio API para el Asistente Inteligente de Reabastecimiento & Pronóstico de Stock (Pilar E)
 */
export const getForecastAnalysis = async (days = 14, targetDays = 15) => {
    const res = await api.get(`/api/forecasting/analysis?days=${days}&targetDays=${targetDays}`);
    return res.data;
};

export const getSupplierOrderSuggestion = async (supplierId, days = 14, targetDays = 15) => {
    const res = await api.get(`/api/forecasting/supplier-order/${supplierId}?days=${days}&targetDays=${targetDays}`);
    return res.data;
};

export default {
    getForecastAnalysis,
    getSupplierOrderSuggestion
};
