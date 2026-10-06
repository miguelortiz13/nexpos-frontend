import { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from 'react-modal';
import {
  FaTimes,
  FaHistory,
  FaFileCsv,
  FaArrowDown,
  FaArrowUp,
  FaSlidersH,
  FaShoppingCart,
  FaBoxOpen
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import inventoryService from '../../api/inventoryService';
import './KardexModal.css';

const KardexModal = ({ isOpen, onClose, product }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMovements = useCallback(async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      const data = await inventoryService.getProductMovements(product.id);
      setMovements(data);
    } catch (err) {
      console.error('Error al cargar historial de Kardex:', err);
      toast.error('Error al cargar historial de Kardex');
    } finally {
      setLoading(false);
    }
  }, [product?.id]);

  useEffect(() => {
    if (isOpen && product?.id) {
      loadMovements();
    }
  }, [isOpen, product?.id, loadMovements]);

  // Metrics summary
  const totalEntries = useMemo(() => {
    return movements
      .filter((m) => m.movementType === 'ENTRADA')
      .reduce((acc, m) => acc + (m.quantity || 0), 0);
  }, [movements]);

  const totalExits = useMemo(() => {
    return movements
      .filter((m) => m.movementType === 'SALIDA')
      .reduce((acc, m) => acc + (m.quantity || 0), 0);
  }, [movements]);

  const totalSales = useMemo(() => {
    return movements
      .filter((m) => m.movementType === 'VENTA')
      .reduce((acc, m) => acc + (m.quantity || 0), 0);
  }, [movements]);

  const exportKardexCSV = () => {
    if (movements.length === 0) {
      toast.info('No hay movimientos registrados para exportar');
      return;
    }

    const headers = ['ID Movimiento', 'Fecha', 'Tipo', 'Cantidad', 'Stock Anterior', 'Stock Resultante', 'Costo Unitario', 'Motivo', 'Referencia', 'Usuario'];
    const rows = movements.map((m) => [
      m.id,
      `"${new Date(m.createdAt).toLocaleString('es-CO')}"`,
      m.movementType,
      m.quantity,
      m.previousStock,
      m.newStock,
      m.unitCost || 0,
      `"${m.reason || ''}"`,
      `"${m.referenceId || ''}"`,
      `"${m.registeredBy || 'SISTEMA'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kardex_${product.nombre?.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const renderTypeBadge = (type) => {
    switch (type) {
      case 'ENTRADA':
        return (
          <span className="kardex-type-badge entrada">
            <FaArrowDown /> Entrada
          </span>
        );
      case 'SALIDA':
        return (
          <span className="kardex-type-badge salida">
            <FaArrowUp /> Salida
          </span>
        );
      case 'AJUSTE':
        return (
          <span className="kardex-type-badge ajuste">
            <FaSlidersH /> Ajuste
          </span>
        );
      case 'VENTA':
        return (
          <span className="kardex-type-badge venta">
            <FaShoppingCart /> Venta POS
          </span>
        );
      default:
        return <span className="kardex-type-badge">{type}</span>;
    }
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="kardex-modal-content"
      overlayClassName="kardex-modal-overlay"
      ariaHideApp={false}
    >
      <div className="kardex-modal-header">
        <div className="kardex-modal-title">
          <FaHistory className="header-icon" />
          <div>
            <h3>Kardex & Auditoría de Inventario</h3>
            <p className="kardex-product-meta">
              <strong>{product.nombre}</strong> · {product.marca || 'Genérico'} · Cód: {product.codigoBarras || 'N/A'}
            </p>
          </div>
        </div>
        <div className="kardex-header-actions">
          <button className="btn-export-kardex" onClick={exportKardexCSV} title="Exportar movimientos a Excel/CSV">
            <FaFileCsv /> CSV
          </button>
          <button className="btn-close-modal" onClick={onClose} title="Cerrar">
            <FaTimes />
          </button>
        </div>
      </div>

      <div className="kardex-modal-body">
        {/* KPI Summary Cards */}
        <div className="kardex-kpi-grid">
          <div className="kardex-kpi-card stock">
            <span className="kpi-label">Stock Actual</span>
            <span className="kpi-number">{product.cantidad}</span>
            <small className="kpi-sub">Mínimo sugerido: {product.minStock || 5}</small>
          </div>

          <div className="kardex-kpi-card entries">
            <span className="kpi-label">Entradas Registradas</span>
            <span className="kpi-number text-green">+{totalEntries}</span>
            <small className="kpi-sub">Compras y recepciones</small>
          </div>

          <div className="kardex-kpi-card sales">
            <span className="kpi-label">Ventas POS</span>
            <span className="kpi-number text-amber">-{totalSales}</span>
            <small className="kpi-sub">Despachadas en caja</small>
          </div>

          <div className="kardex-kpi-card exits">
            <span className="kpi-label">Mermas / Salidas</span>
            <span className="kpi-number text-red">-{totalExits}</span>
            <small className="kpi-sub">Averías o pérdidas</small>
          </div>
        </div>

        {/* Movements Timeline / Table */}
        <div className="kardex-table-wrapper">
          {loading ? (
            <div className="kardex-loading">
              <div className="loading-spinner"></div>
              <p>Cargando trazabilidad de movimientos...</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="kardex-empty">
              <FaBoxOpen size={42} />
              <h4>Sin movimientos registrados aún</h4>
              <p>Las ventas en el POS y los ajustes manuales se registrarán cronológicamente aquí.</p>
            </div>
          ) : (
            <table className="kardex-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Tipo</th>
                  <th className="text-center">Cantidad</th>
                  <th>Variación de Stock</th>
                  <th>Motivo / Justificación</th>
                  <th>Documento Ref.</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((mov) => {
                  const isPositive = mov.movementType === 'ENTRADA';
                  const isNegative = mov.movementType === 'SALIDA' || mov.movementType === 'VENTA';

                  return (
                    <tr key={mov.id}>
                      <td className="date-cell">
                        {new Date(mov.createdAt).toLocaleString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td>{renderTypeBadge(mov.movementType)}</td>
                      <td className="text-center qty-cell">
                        <strong className={isPositive ? 'text-green' : isNegative ? 'text-red' : 'text-blue'}>
                          {isPositive ? `+${mov.quantity}` : isNegative ? `-${mov.quantity}` : `=${mov.quantity}`}
                        </strong>
                      </td>
                      <td className="stock-variation-cell">
                        <span className="stock-flow">
                          <span className="prev-val">{mov.previousStock}</span>
                          <span className="arrow">→</span>
                          <span className="next-val">{mov.newStock}</span>
                        </span>
                      </td>
                      <td className="reason-cell">
                        <span>{mov.reason}</span>
                      </td>
                      <td className="ref-cell">
                        {mov.referenceId ? <span className="ref-badge">{mov.referenceId}</span> : <span className="text-muted">—</span>}
                      </td>
                      <td className="user-cell">
                        <span className="user-badge">{mov.registeredBy || 'SISTEMA'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default KardexModal;
