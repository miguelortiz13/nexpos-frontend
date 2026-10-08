import { useState } from 'react';
import {
    FaTimes,
    FaBan,
    FaExclamationTriangle,
    FaBoxes,
    FaMoneyBillWave,
    FaFileInvoiceDollar,
    FaShieldAlt
} from 'react-icons/fa';
import api from '../../api/client';
import './CreditNoteModal.css';

const formatCOP = (val) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(val) || 0);
};

const CreditNoteModal = ({ sale, isOpen, onClose, onSuccess }) => {
    const [reason, setReason] = useState('');
    const [conceptCode, setConceptCode] = useState('2'); // 2: Anulación total
    const [refundCash, setRefundCash] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !sale) return null;

    const invoiceNum = sale.invoice?.invoiceNumber || `POS-${sale.id}`;
    const cashPortion = Number(sale.cashAmount || (sale.paymentMethod === 'EFECTIVO' ? sale.totalAmount : 0));
    const hasCash = cashPortion > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            setError('Debe ingresar un motivo o justificación para la anulación.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await api.post(`/api/sales/${sale.id}/annul`, {
                reason: reason.trim(),
                conceptCode,
                refundCash: hasCash ? refundCash : false
            });

            const creditNote = res.data;
            if (onSuccess) {
                onSuccess(creditNote);
            }
            onClose();
        } catch (err) {
            console.error('Error al anular venta:', err);
            const msg = err.response?.data?.message || err.message || 'Error al procesar la anulación de la venta.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="credit-note-modal-overlay">
            <div className="credit-note-modal-container">
                {/* Header */}
                <div className="credit-note-modal-header">
                    <div className="header-title-box">
                        <div className="header-icon-danger">
                            <FaBan />
                        </div>
                        <div>
                            <h2>Anulación de Factura & Nota Crédito DIAN</h2>
                            <span className="header-subtitle">
                                Comprobante Afectado: <strong>{invoiceNum}</strong> (Venta #{sale.id})
                            </span>
                        </div>
                    </div>
                    <button className="btn-modal-close" onClick={onClose} disabled={loading}>
                        <FaTimes />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="credit-note-modal-body">
                    {error && (
                        <div className="credit-note-alert-error">
                            <FaExclamationTriangle />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Operational Warning */}
                    <div className="credit-note-warning-card">
                        <FaShieldAlt className="warning-card-icon" />
                        <div>
                            <strong>Efectos contables y tributarios inmediatos:</strong>
                            <ul>
                                <li>El stock de los productos vendidos se reingresará automáticamente al Kardex.</li>
                                <li>Se emitirá una <strong>Nota Crédito Electrónica oficial</strong> referenciando el CUDE de la factura ante la DIAN.</li>
                                {hasCash && refundCash && (
                                    <li>Se registrará una <strong>salida de efectivo por {formatCOP(cashPortion)}</strong> en el turno de caja activo.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Sale Items Summary */}
                    <div className="sale-summary-section">
                        <h4>
                            <FaBoxes /> Ítems a Devolver al Inventario ({sale.items?.length || 0})
                        </h4>
                        <div className="items-table-wrapper">
                            <table className="summary-items-table">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th className="text-center">Cantidad</th>
                                        <th className="text-right">Precio</th>
                                        <th className="text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sale.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.productName}</td>
                                            <td className="text-center">+{item.quantity} un.</td>
                                            <td className="text-right">{formatCOP(item.unitPrice)}</td>
                                            <td className="text-right font-bold">{formatCOP(item.subTotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="refund-summary-grid">
                        <div className="refund-kpi-card">
                            <span className="refund-kpi-label">Total a Revertir</span>
                            <span className="refund-kpi-val total-revert">{formatCOP(sale.totalAmount)}</span>
                        </div>
                        <div className="refund-kpi-card">
                            <span className="refund-kpi-label">Medio Original</span>
                            <span className="refund-kpi-val">{sale.paymentMethod || 'EFECTIVO'}</span>
                        </div>
                        {hasCash && (
                            <div className="refund-kpi-card">
                                <span className="refund-kpi-label">Porción Efectivo (Caja)</span>
                                <span className="refund-kpi-val cash-revert">{formatCOP(cashPortion)}</span>
                            </div>
                        )}
                    </div>

                    {/* Cash Refund Checkbox (if applicable) */}
                    {hasCash && (
                        <div className="cash-refund-toggle-box">
                            <label className="toggle-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={refundCash}
                                    onChange={(e) => setRefundCash(e.target.checked)}
                                    disabled={loading}
                                />
                                <FaMoneyBillWave className="cash-toggle-icon" />
                                <div>
                                    <span className="toggle-title">Reembolsar efectivo de la gaveta de caja activa ({formatCOP(cashPortion)})</span>
                                    <span className="toggle-desc">Descuenta el dinero del arqueo en curso y emite comprobante de egreso.</span>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* DIAN Concept Selector */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="conceptCode">
                            Concepto de Corrección DIAN (Anexo 1.9)
                        </label>
                        <select
                            id="conceptCode"
                            className="form-select"
                            value={conceptCode}
                            onChange={(e) => setConceptCode(e.target.value)}
                            disabled={loading}
                        >
                            <option value="2">2 - Anulación total de la factura electrónica</option>
                            <option value="1">1 - Devolución de parte de los bienes</option>
                            <option value="3">3 - Rebaja o descuento total aplicado</option>
                        </select>
                    </div>

                    {/* Reason Textarea */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="annulReason">
                            Motivo o Justificación Obligatoria <span className="text-danger">*</span>
                        </label>
                        <textarea
                            id="annulReason"
                            className="form-textarea"
                            placeholder="Describa el motivo detallado de la devolución (ej. Cliente solicitó anulación por mercancía averiada, error de digitación en caja...)"
                            rows="3"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>

                    {/* Actions */}
                    <div className="credit-note-modal-actions">
                        <button
                            type="button"
                            className="btn-modal-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-modal-confirm-annul"
                            disabled={loading || !reason.trim()}
                        >
                            {loading ? (
                                <>
                                    <span className="modal-spinner"></span>
                                    <span>Emitiendo Nota Crédito DIAN...</span>
                                </>
                            ) : (
                                <>
                                    <FaFileInvoiceDollar />
                                    <span>Confirmar Anulación y Emitir NC</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreditNoteModal;
