import api from './client';

export const inventoryService = {
  // Registrar movimiento manual en Kardex (ENTRADA, SALIDA, AJUSTE)
  registerMovement: async (productId, movementData) => {
    const res = await api.post(`/api/productos/${productId}/movimientos`, movementData);
    return res.data;
  },

  // Obtener historial de Kardex de un producto específico
  getProductMovements: async (productId) => {
    const res = await api.get(`/api/productos/${productId}/movimientos`);
    return res.data;
  },

  // Obtener movimientos recientes globales de inventario
  getRecentMovements: async () => {
    const res = await api.get('/api/productos/movimientos');
    return res.data;
  },

  // Obtener productos con stock crítico (bajo stock o agotados)
  getLowStockProducts: async () => {
    const res = await api.get('/api/productos/bajo-stock');
    return res.data;
  }
};

export default inventoryService;
