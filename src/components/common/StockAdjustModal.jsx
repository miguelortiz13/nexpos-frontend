import { useState } from 'react';
import Modal from 'react-modal';
import {
  FaTimes,
  FaExchangeAlt,
  FaArrowDown,
  FaArrowUp,
  FaSlidersH,
  FaCheck,
  FaDollarSign,
  FaInfoCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import inventoryService from '../../api/inventoryService';
import './StockAdjustModal.css';

const QUICK_REASONS = {
  ENTRADA: ['Compra a proveedor', 'Recepción de pedido', 'Devolución de cliente', 'Bonificación'],
  SALIDA: ['Merma por daño o avería', 'Producto vencido', 'Uso interno del local', 'Pérdida / Faltante'],
  AJUSTE: ['Conteo físico periódico', 'Cuadre de inventario', 'Corrección de registro previo']
};

const StockAdjustModal = ({ isOpen, onClose, product, onSuccess }) => {
  const [movementType, setMovementType] = useState('ENTRADA');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState('');
  const [reason, setReason] = useState('Compra a proveedor');
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!product) return null;

  const currentStock = Number(product.cantidad) || 0;
  const numQuantity = Number(quantity) || 0;

  let projectedStock = currentStock;
  if (movementType === 'ENTRADA') {
    projectedStock = currentStock + numQuantity;
  } else if (movementType === 'SALIDA') {
    projectedStock = Math.max(0, currentStock - numQuantity);
  } else if (movementType === 'AJUSTE') {
    projectedStock = numQuantity;
  }

  const handleTypeChange = (type) => {
    setMovementType(type);
    if (QUICK_REASONS[type]?.length > 0) {
      setReason(QUICK_REASONS[type][0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numQuantity <= 0 && movementType !== 'AJUSTE') {
      toast.warning('La cantidad debe ser mayor a 0');
      return;
    }
    if (movementType === 'SALIDA' && numQuantity > currentStock) {
      toast.error(`Stock insuficiente (${currentStock}). No es posible dar salida a ${numQuantity} unidades.`);
      return;
    }
    if (!reason.trim()) {
      toast.warning('Debes ingresar un motivo o justificación del ajuste.');
      return;
    }

    setSubmitting(true);
    try {
      await inventoryService.registerMovement(product.id, {
        movementType,
        quantity: numQuantity,
        reason: reason.trim(),
        referenceId: referenceId.trim() || null,
        unitCost: unitCost ? Number(unitCost) : null
      });

      toast.success(`Inventario de '${product.nombre}' actualizado con éxito a ${projectedStock} unidades`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar movimiento en Kardex');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="stock-adjust-modal-content"
      overlayClassName="stock-adjust-modal-overlay"
      ariaHideApp={false}
    >
      <div className="stock-modal-header">
        <div className="stock-modal-title">
          <FaExchangeAlt className="header-icon" />
          <div>
            <h3>Ajustar Stock / Kardex</h3>
            <p className="product-subtitle">{product.nombre} · {product.codigoBarras || 'Sin código'}</p>
          </div>
        </div>
        <button className="btn-close-modal" onClick={onClose} title="Cerrar">
          <FaTimes />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="stock-adjust-form">
        {/* Action Type Selector */}
        <div className="movement-type-selector">
          <button
            type="button"
            className={`type-tab entrada ${movementType === 'ENTRADA' ? 'active' : ''}`}
            onClick={() => handleTypeChange('ENTRADA')}
          >
            <FaArrowDown />
            <div>
              <strong>+ Entrada</strong>
              <small>Compra / Recepción</small>
            </div>
          </button>

          <button
            type="button"
            className={`type-tab salida ${movementType === 'SALIDA' ? 'active' : ''}`}
            onClick={() => handleTypeChange('SALIDA')}
          >
            <FaArrowUp />
            <div>
              <strong>- Salida</strong>
              <small>Merma / Daño</small>
            </div>
          </button>

          <button
            type="button"
            className={`type-tab ajuste ${movementType === 'AJUSTE' ? 'active' : ''}`}
            onClick={() => handleTypeChange('AJUSTE')}
          >
            <FaSlidersH />
            <div>
              <strong>= Conteo Físico</strong>
              <small>Fijar cantidad exacta</small>
            </div>
          </button>
        </div>

        {/* Stock Projection Live Card */}
        <div className="stock-projection-card">
          <div className="projection-col">
            <span className="proj-label">Stock Actual</span>
            <span className="proj-value current">{currentStock}</span>
          </div>
          <div className="projection-arrow">
            {movementType === 'ENTRADA' && <span className="diff-tag entrada">+{numQuantity}</span>}
            {movementType === 'SALIDA' && <span className="diff-tag salida">-{numQuantity}</span>}
            {movementType === 'AJUSTE' && <span className="diff-tag ajuste">={numQuantity}</span>}
          </div>
          <div className="projection-col">
            <span className="proj-label">Nuevo Stock Resultante</span>
            <span className="proj-value target">{projectedStock}</span>
          </div>
        </div>

        {/* Inputs */}
        <div className="form-fields-grid">
          <div className="input-group">
            <label>
              {movementType === 'AJUSTE' ? 'Nuevo Conteo Real (Unidades):' : 'Cantidad de Unidades a Mover:'}
            </label>
            <input
              type="number"
              min={movementType === 'AJUSTE' ? 0 : 1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="qty-input"
              autoFocus
            />
          </div>

          {movementType === 'ENTRADA' && (
            <div className="input-group">
              <label>Costo de Compra Unitario (COP) <small>(Opcional)</small>:</label>
              <div className="input-with-icon">
                <FaDollarSign className="field-icon" />
                <input
                  type="number"
                  min="0"
                  placeholder={product.costPrice ? String(product.costPrice) : '0'}
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="input-group full-width">
            <label>Referencia o Documento de Soporte <small>(Opcional)</small>:</label>
            <input
              type="text"
              placeholder="Ej. Factura Proveedor #8492, Acta de Merma #12..."
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
            />
          </div>

          <div className="input-group full-width">
            <label>Motivo o Justificación del Movimiento:</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Escribe el motivo del cambio..."
              required
            />
            {/* Quick Reason Chips */}
            <div className="quick-reason-chips">
              {QUICK_REASONS[movementType]?.map((chip) => (
                <button
                  type="button"
                  key={chip}
                  className={`reason-chip ${reason === chip ? 'active' : ''}`}
                  onClick={() => setReason(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="btn-save-adjust" disabled={submitting}>
            <FaCheck /> {submitting ? 'Guardando en Kardex...' : 'Confirmar Ajuste'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StockAdjustModal;
