import { useState, useEffect, useMemo } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaBarcode,
  FaBox,
  FaArrowLeft,
  FaTimes,
  FaWarehouse,
  FaExclamationTriangle,
  FaDollarSign,
  FaCheckCircle,
  FaTimesCircle,
  FaTag,
  FaRandom,
  FaExchangeAlt,
  FaHistory
} from "react-icons/fa";
import Modal from 'react-modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BarcodeScanner from "../../components/common/BarcodeScanner";
import BarcodeLabelModal from "../../components/common/BarcodeLabelModal";
import StockAdjustModal from "../../components/common/StockAdjustModal";
import KardexModal from "../../components/common/KardexModal";
import api from "../../api/client";
import "./ProductoCRUD.css";

Modal.setAppElement('#root');

const formatCOP = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
};

const ProductosCRUD = () => {
  const [productos, setProductos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODAS");
  const [currentProducto, setCurrentProducto] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('barcode');
  const [tempBarcode, setTempBarcode] = useState('');
  const [modalType, setModalType] = useState(null);

  // Modales de Ajuste de Stock y Kardex
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProductForKardex, setSelectedProductForKardex] = useState(null);
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [stockFilterMode, setStockFilterMode] = useState('ALL'); // 'ALL' | 'CRITICAL'

  // Modal para imprimir etiquetas
  const [selectedProductForLabel, setSelectedProductForLabel] = useState(null);
  const [showLabelModal, setShowLabelModal] = useState(false);

  const [formData, setFormData] = useState({
    codigoBarras: "",
    nombre: "",
    marca: "",
    precio: 0,
    costPrice: 0,
    cantidad: 0,
    minStock: 5,
    categoria: "",
    descripcion: "",
    imagen: "",
    ivaRate: 0.19,
    unitMeasure: "94"
  });

  const fetchProductos = async () => {
    try {
      const response = await api.get("/api/productos");
      setProductos(response.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  // Generador de código interno para productos sin código comercial (ej: a granel / panadería)
  const generateInternalBarcode = () => {
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    return `770${randomDigits}`;
  };

  // Inventory KPI calculations
  const totalItems = productos.length;
  const totalValue = useMemo(() => {
    return productos.reduce((acc, p) => acc + (Number(p.precio) * (p.cantidad || 0)), 0);
  }, [productos]);
  const totalCostInvestment = useMemo(() => {
    return productos.reduce((acc, p) => acc + (Number(p.costPrice || 0) * (p.cantidad || 0)), 0);
  }, [productos]);
  const lowStockCount = useMemo(() => {
    return productos.filter(p => p.cantidad > 0 && p.cantidad <= (p.minStock != null ? p.minStock : 5)).length;
  }, [productos]);
  const outOfStockCount = useMemo(() => {
    return productos.filter(p => p.cantidad === 0).length;
  }, [productos]);
  const criticalCount = lowStockCount + outOfStockCount;

  const categories = useMemo(() => {
    const cats = new Set(productos.map(p => p.categoria).filter(Boolean));
    return ['TODAS', ...Array.from(cats)];
  }, [productos]);

  const filteredProductos = useMemo(() => {
    return productos.filter(producto => {
      if (stockFilterMode === 'CRITICAL') {
        const isCrit = producto.cantidad <= (producto.minStock != null ? producto.minStock : 5);
        if (!isCrit) return false;
      }
      const matchesCategory = selectedCategory === "TODAS" || producto.categoria === selectedCategory;
      const matchesSearch = !searchTerm ||
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (producto.marca && producto.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (producto.categoria && producto.categoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (producto.codigoBarras && producto.codigoBarras.includes(searchTerm));
      return matchesCategory && matchesSearch;
    });
  }, [productos, searchTerm, selectedCategory, stockFilterMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const isNum = ['precio', 'costPrice', 'cantidad', 'minStock', 'ivaRate'].includes(name);
    setFormData({
      ...formData,
      [name]: isNum ? (value === '' ? 0 : Number(value)) : value
    });
  };

  const calculatedMargin = useMemo(() => {
    const price = Number(formData.precio) || 0;
    const cost = Number(formData.costPrice) || 0;
    if (price <= 0) return null;
    const profit = price - cost;
    const marginPct = ((profit / price) * 100).toFixed(1);
    return { profit, marginPct };
  }, [formData.precio, formData.costPrice]);

  const handleBarcodeSubmit = async () => {
    if (!tempBarcode) {
      toast.error('Por favor ingrese un código de barras');
      return;
    }

    try {
      const response = await api.get(`/api/productos/codigo/${tempBarcode}`);
      const productoExistente = response.data;
      toast.warn(`El código ${tempBarcode} ya existe para: ${productoExistente.nombre}`);
      mostrarProducto(productoExistente);
      return;
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error al verificar código:", error);
      }
    }

    setFormData({
      codigoBarras: tempBarcode,
      nombre: "",
      marca: "",
      precio: 0,
      cantidad: 0,
      categoria: "",
      descripcion: "",
      imagen: "",
      ivaRate: 0.19,
      unitMeasure: "94"
    });
    setStep('form');
  };

  const openFormModal = (producto = null) => {
    setModalType('form');
    setCurrentProducto(producto);
    if (producto) {
      setStep('form');
      setFormData({
        codigoBarras: producto.codigoBarras || "",
        nombre: producto.nombre,
        marca: producto.marca || "",
        precio: producto.precio,
        costPrice: producto.costPrice != null ? Number(producto.costPrice) : 0,
        cantidad: producto.cantidad,
        minStock: producto.minStock != null ? Number(producto.minStock) : 5,
        categoria: producto.categoria || "",
        descripcion: producto.descripcion || "",
        imagen: producto.imagen || "",
        ivaRate: producto.ivaRate != null ? Number(producto.ivaRate) : 0.19,
        unitMeasure: producto.unitMeasure || "94"
      });
    } else {
      setStep('barcode');
      setTempBarcode('');
      setFormData({
        codigoBarras: "",
        nombre: "",
        marca: "",
        precio: 0,
        costPrice: 0,
        cantidad: 0,
        minStock: 5,
        categoria: "",
        descripcion: "",
        imagen: "",
        ivaRate: 0.19,
        unitMeasure: "94"
      });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setShowScanner(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const isUpdating = currentProducto && currentProducto.id;
      const url = isUpdating
        ? `/api/productos/${currentProducto.id}`
        : "/api/productos";

      const payload = {
        ...formData,
        precio: Number(formData.precio),
        costPrice: Number(formData.costPrice || 0),
        cantidad: Number(formData.cantidad),
        minStock: Number(formData.minStock || 5),
        ivaRate: Number(formData.ivaRate),
        unitMeasure: formData.unitMeasure || "94"
      };

      const response = isUpdating
        ? await api.put(url, payload)
        : await api.post(url, payload);

      const result = response.data;

      if (isUpdating) {
        setProductos(productos.map(p => p.id === currentProducto.id ? result : p));
      } else {
        setProductos([...productos, result]);
      }

      closeModal();
      toast.success(`Producto ${isUpdating ? "actualizado" : "creado"} correctamente`);
    } catch (err) {
      console.error("Error al guardar producto:", err);
      const msg = err.response?.data?.message || err.message || "Error en la operación";
      toast.error(`Error: ${msg}`);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el producto "${nombre}"?`)) return;

    try {
      await api.delete(`/api/productos/${id}`);
      setProductos(productos.filter(p => p.id !== id));
      toast.success("Producto eliminado del inventario");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Error al eliminar el producto";
      toast.error(msg);
    }
  };

  const handleBarcodeScanned = async (codigoBarras) => {
    setTempBarcode(codigoBarras);
    setShowScanner(false);

    try {
      const response = await api.get(`/api/productos/codigo/${codigoBarras}`);
      const producto = response.data;
      mostrarProducto(producto);
      toast.info(`Producto existente encontrado: ${producto.nombre}`);
    } catch (error) {
      if (error.response?.status === 404) {
        setFormData({
          codigoBarras: codigoBarras,
          nombre: "",
          marca: "",
          precio: 0,
          costPrice: 0,
          cantidad: 0,
          minStock: 5,
          categoria: "",
          descripcion: "",
          imagen: "",
          ivaRate: 0.19,
          unitMeasure: "94"
        });
        setStep('form');
        toast.success(`Nuevo código detectado: ${codigoBarras}`);
      } else {
        const msg = error.response?.data?.message || error.message;
        toast.error(`Error: ${msg}`);
      }
    }
  };

  const mostrarProducto = (producto) => {
    setCurrentProducto(producto);
    setFormData({
      codigoBarras: producto.codigoBarras,
      nombre: producto.nombre,
      marca: producto.marca,
      precio: producto.precio,
      costPrice: producto.costPrice != null ? Number(producto.costPrice) : 0,
      cantidad: producto.cantidad,
      minStock: producto.minStock != null ? Number(producto.minStock) : 5,
      categoria: producto.categoria,
      descripcion: producto.descripcion,
      imagen: producto.imagen,
      ivaRate: producto.ivaRate != null ? Number(producto.ivaRate) : 0.19,
      unitMeasure: producto.unitMeasure || "94"
    });
    setStep('form');
  };

  const renderModalContent = () => {
    if (step === 'barcode') {
      return (
        <div className="barcode-step-wrapper">
          <div className="modal-step-header">
            <h3><FaBarcode /> Registrar Producto</h3>
            <p>Escanea con lector/cámara, genera un código interno o ingrésalo manualmente</p>
          </div>

          <div className="form-group-modal">
            <label>Código de Barras *</label>
            <div className="input-scan-action">
              <input
                type="text"
                value={tempBarcode}
                onChange={(e) => setTempBarcode(e.target.value)}
                required
                autoFocus
                placeholder="Ej: 770123456789"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBarcodeSubmit();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setTempBarcode(generateInternalBarcode())}
                className="btn-modal-generate"
                title="Generar código interno para productos sin código comercial (granel, panadería)"
              >
                <FaRandom /> Generar
              </button>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="btn-modal-scan"
              >
                <FaBarcode /> Cámara
              </button>
            </div>
          </div>

          {showScanner && (
            <div className="scanner-inline-box">
              <BarcodeScanner
                onScan={handleBarcodeScanned}
                onClose={() => setShowScanner(false)}
              />
            </div>
          )}

          <div className="modal-form-actions">
            <button type="button" onClick={closeModal} className="btn-modal-back">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleBarcodeSubmit}
              className="btn-modal-primary"
              disabled={!tempBarcode}
            >
              Continuar a Datos
            </button>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="crud-product-form">
        <div className="modal-step-header">
          <h3>{currentProducto?.id ? "Editar Producto" : "Nuevo Producto"}</h3>
          <span className="barcode-badge-pill">
            <FaBarcode /> {formData.codigoBarras || "Sin código"}
          </span>
        </div>

        <div className="form-grid-modal">
          <div className="form-group-modal full-width">
            <label>Nombre del Producto *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              required
              minLength="2"
              placeholder="Ej: Arroz Diana Premium 1000g"
            />
          </div>

          <div className="form-group-modal">
            <label>Marca</label>
            <input
              type="text"
              name="marca"
              value={formData.marca}
              onChange={handleInputChange}
              placeholder="Ej: Diana"
            />
          </div>

          <div className="form-group-modal">
            <label>Categoría</label>
            <input
              type="text"
              name="categoria"
              value={formData.categoria}
              onChange={handleInputChange}
              placeholder="Ej: Granos / Abarrotes"
            />
          </div>

          <div className="form-group-modal">
            <label>Costo de Compra ($ COP)</label>
            <input
              type="number"
              name="costPrice"
              value={formData.costPrice}
              onChange={handleInputChange}
              min="0"
              step="50"
              placeholder="0"
            />
          </div>

          <div className="form-group-modal">
            <label>Precio de Venta ($ COP) *</label>
            <input
              type="number"
              name="precio"
              value={formData.precio}
              onChange={handleInputChange}
              min="1"
              step="50"
              required
            />
          </div>

          {calculatedMargin && (
            <div className="profit-margin-preview-box full-width">
              <span className="margin-tag">Margen de Ganancia Estimado:</span>
              <strong className={Number(calculatedMargin.marginPct) >= 0 ? "margin-val positive" : "margin-val negative"}>
                {calculatedMargin.marginPct}% ({formatCOP(calculatedMargin.profit)} ganancia / unidad)
              </strong>
            </div>
          )}

          <div className="form-group-modal">
            <label>Stock Disponible *</label>
            <input
              type="number"
              name="cantidad"
              value={formData.cantidad}
              onChange={handleInputChange}
              min="0"
              required
            />
          </div>

          <div className="form-group-modal">
            <label>Stock Mínimo (Alerta de Reorden) *</label>
            <input
              type="number"
              name="minStock"
              value={formData.minStock}
              onChange={handleInputChange}
              min="0"
              required
            />
          </div>

          <div className="form-group-modal">
            <label>Tarifa IVA (DIAN) *</label>
            <select
              name="ivaRate"
              value={formData.ivaRate}
              onChange={handleInputChange}
            >
              <option value={0.19}>19% - General (Gravado)</option>
              <option value={0.05}>5% - Reducido (Canasta)</option>
              <option value={0.00}>0% - Exento / Excluido</option>
            </select>
          </div>

          <div className="form-group-modal">
            <label>Unidad de Medida (DIAN) *</label>
            <select
              name="unitMeasure"
              value={formData.unitMeasure}
              onChange={handleInputChange}
            >
              <option value="94">94 - Unidad (und)</option>
              <option value="KGM">KGM - Kilogramo (kg)</option>
              <option value="LTR">LTR - Litro (l)</option>
              <option value="GRM">GRM - Gramo (g)</option>
              <option value="MTR">MTR - Metro (m)</option>
              <option value="NIU">NIU - Unidades comerciales</option>
            </select>
          </div>

          <div className="form-group-modal full-width">
            <label>Descripción / Presentación</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              rows="2"
              placeholder="Descripción del empaque, gramaje o notas de inventario..."
            />
          </div>
        </div>

        <div className="modal-form-actions">
          {!currentProducto?.id && (
            <button
              type="button"
              onClick={() => setStep('barcode')}
              className="btn-modal-back"
            >
              <FaArrowLeft /> Cambiar Código
            </button>
          )}
          <button type="button" onClick={closeModal} className="btn-modal-back">
            Cancelar
          </button>
          <button type="submit" className="btn-modal-primary" disabled={loading}>
            {loading ? "Guardando..." : "Guardar Producto"}
          </button>
        </div>
      </form>
    );
  };

  if (loading && productos.length === 0) {
    return (
      <div className="crud-loading-view">
        <div className="loading-spinner"></div>
        <p>Cargando inventario de NexPOS...</p>
      </div>
    );
  }

  return (
    <div className="crud-dashboard-container">
      <ToastContainer autoClose={2000} position="top-right" />

      {/* Header and Title */}
      <div className="crud-top-bar">
        <div>
          <h2><FaWarehouse /> Control de Inventario</h2>
          <p className="crud-subtitle">Catálogo centralizado, existencias y precios del supermercado</p>
        </div>
        <button onClick={() => openFormModal()} className="btn-create-product">
          <FaPlus /> Nuevo Producto
        </button>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="kpi-metrics-grid">
        <div className="kpi-stat-card">
          <div className="kpi-icon-pill primary">
            <FaBox />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Referencias</span>
            <span className="kpi-value">{totalItems}</span>
          </div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-icon-pill" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <FaDollarSign />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Inversión Costo</span>
            <span className="kpi-value">{formatCOP(totalCostInvestment)}</span>
          </div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-icon-pill success">
            <FaDollarSign />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Valor Venta Total</span>
            <span className="kpi-value">{formatCOP(totalValue)}</span>
          </div>
        </div>

        <div
          className={`kpi-stat-card ${stockFilterMode === 'CRITICAL' ? 'selected-critical' : ''}`}
          onClick={() => setStockFilterMode(stockFilterMode === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          style={{ cursor: 'pointer' }}
          title="Clic para filtrar productos con stock bajo o agotados"
        >
          <div className="kpi-icon-pill warning">
            <FaExclamationTriangle />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Stock Crítico ({criticalCount})</span>
            <span className="kpi-value warning-text">{criticalCount}</span>
          </div>
        </div>
      </div>

      {/* Stock Filter Tabs & Search Bar */}
      <div className="crud-filter-row">
        <div className="stock-view-tabs">
          <button
            type="button"
            className={`stock-tab-btn ${stockFilterMode === 'ALL' ? 'active' : ''}`}
            onClick={() => setStockFilterMode('ALL')}
          >
            Todos ({productos.length})
          </button>
          <button
            type="button"
            className={`stock-tab-btn critical ${stockFilterMode === 'CRITICAL' ? 'active' : ''}`}
            onClick={() => setStockFilterMode('CRITICAL')}
          >
            <FaExclamationTriangle /> Stock Crítico ({criticalCount})
          </button>
        </div>

        <div className="crud-search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, código de barras, marca o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-btn" onClick={() => setSearchTerm('')}>
              <FaTimes />
            </button>
          )}
        </div>

        <div className="crud-category-selector">
          <label>Categoría:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="crud-table-card">
        <div className="table-responsive">
          <table className="crud-data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre / Producto</th>
                <th>Marca</th>
                <th>Categoría</th>
                <th className="text-center">IVA / Medida</th>
                <th className="text-right">Precio / Costo</th>
                <th className="text-center">Stock</th>
                <th className="text-center">Estado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductos.length > 0 ? (
                filteredProductos.map((producto) => {
                  const minStk = producto.minStock != null ? producto.minStock : 5;
                  const isOutOfStock = producto.cantidad <= 0;
                  const isLowStock = producto.cantidad > 0 && producto.cantidad <= minStk;

                  return (
                    <tr key={producto.id}>
                      <td className="barcode-cell">
                        <FaBarcode className="barcode-icon" />
                        <span>{producto.codigoBarras || "N/A"}</span>
                      </td>
                      <td className="name-cell">
                        <strong>{producto.nombre}</strong>
                      </td>
                      <td className="brand-cell">{producto.marca || "Genérico"}</td>
                      <td>
                        <span className="category-chip">{producto.categoria || "General"}</span>
                      </td>
                      <td className="text-center">
                        <span className="category-chip" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {producto.ivaRate != null ? (Number(producto.ivaRate) === 0 ? 'Exento 0%' : `${Math.round(Number(producto.ivaRate) * 100)}%`) : '19%'}
                          <span style={{ opacity: 0.6, marginLeft: '4px' }}>({producto.unitMeasure || '94'})</span>
                        </span>
                      </td>
                      <td className="text-right price-cell">
                        <div className="price-stack">
                          <strong className="sale-price">{formatCOP(producto.precio)}</strong>
                          {Number(producto.costPrice) > 0 && (
                            <span className="cost-sub">Costo: {formatCOP(producto.costPrice)}</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center stock-number-cell">
                        <strong>{producto.cantidad}</strong>
                        <small className="min-stock-sub">mín: {minStk}</small>
                      </td>
                      <td className="text-center">
                        <span className={`status-pill ${isOutOfStock ? 'empty' : isLowStock ? 'low' : 'ok'}`}>
                          {isOutOfStock ? 'Agotado' : isLowStock ? `Bajo (${producto.cantidad}/${minStk})` : 'Disponible'}
                        </span>
                      </td>
                      <td className="text-center actions-cell">
                        <button
                          onClick={() => {
                            setSelectedProductForAdjust(producto);
                            setShowAdjustModal(true);
                          }}
                          className="btn-action-adjust"
                          title="Ajustar Stock / Entrada / Salida rápida en Kardex"
                        >
                          <FaExchangeAlt />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProductForKardex(producto);
                            setShowKardexModal(true);
                          }}
                          className="btn-action-kardex"
                          title="Ver Historial Kardex y Trazabilidad"
                        >
                          <FaHistory />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProductForLabel(producto);
                            setShowLabelModal(true);
                          }}
                          className="btn-action-label"
                          title="Generar e Imprimir Etiqueta de Precio y Código"
                        >
                          <FaTag />
                        </button>
                        <button
                          onClick={() => openFormModal(producto)}
                          className="btn-action-edit"
                          title="Editar Producto"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(producto.id, producto.nombre)}
                          className="btn-action-delete"
                          title="Eliminar Producto"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="empty-table-cell">
                    <FaBox size={32} />
                    <p>No se encontraron productos que coincidan con la búsqueda.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog para Producto */}
      <Modal
        isOpen={modalType !== null}
        onRequestClose={closeModal}
        className="crud-modal-card"
        overlayClassName="crud-modal-backdrop"
      >
        <button className="btn-close-crud-modal" onClick={closeModal}>
          <FaTimes />
        </button>
        {renderModalContent()}
      </Modal>

      {/* Modal de Ajuste Rápido de Stock / Movimiento Kardex */}
      <StockAdjustModal
        product={selectedProductForAdjust}
        isOpen={showAdjustModal}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedProductForAdjust(null);
        }}
        onSuccess={fetchProductos}
      />

      {/* Modal de Historial Kardex */}
      <KardexModal
        product={selectedProductForKardex}
        isOpen={showKardexModal}
        onClose={() => {
          setShowKardexModal(false);
          setSelectedProductForKardex(null);
        }}
      />

      {/* Modal para Imprimir Etiquetas de Góndola y Stickers */}
      <BarcodeLabelModal
        product={selectedProductForLabel}
        isOpen={showLabelModal}
        onClose={() => {
          setShowLabelModal(false);
          setSelectedProductForLabel(null);
        }}
      />
    </div>
  );
};

export default ProductosCRUD;