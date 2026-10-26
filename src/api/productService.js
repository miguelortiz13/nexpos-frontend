import api from './client';

export const productService = {
  /**
   * Obtener catálogo completo de productos
   */
  getAll: async () => {
    const res = await api.get('/api/productos');
    return res.data || [];
  },

  /**
   * Obtener un producto por su ID
   */
  getById: async (id) => {
    const res = await api.get(`/api/productos/${id}`);
    return res.data;
  },

  /**
   * Búsqueda server-side indexada por nombre, marca, código de barras o categoría
   */
  search: async (query) => {
    const res = await api.get('/api/productos/buscar', {
      params: { q: query || '' }
    });
    return res.data || [];
  },

  /**
   * Buscar producto por código de barras exacto (para POS / pistola de escaneo)
   */
  getByBarcode: async (barcode) => {
    const res = await api.get(`/api/productos/codigo/${encodeURIComponent(barcode)}`);
    return res.data;
  },

  /**
   * Obtener productos con stock crítico (bajo stock o agotados)
   */
  getLowStock: async () => {
    const res = await api.get('/api/productos/bajo-stock');
    return res.data || [];
  },

  /**
   * Crear nuevo producto (solo ADMIN)
   */
  create: async (productData) => {
    const res = await api.post('/api/productos', productData);
    return res.data;
  },

  /**
   * Actualizar producto existente (solo ADMIN)
   */
  update: async (id, productData) => {
    const res = await api.put(`/api/productos/${id}`, productData);
    return res.data;
  },

  /**
   * Eliminar producto (solo ADMIN)
   */
  delete: async (id) => {
    await api.delete(`/api/productos/${id}`);
  }
};

export default productService;
