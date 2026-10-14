import { useState, useEffect, useCallback } from 'react';
import {
    FaHistory,
    FaTimes,
    FaMoneyBillWave,
    FaReceipt,
    FaArrowUp,
    FaArrowDown,
    FaExchangeAlt,
    FaPrint
} from 'react-icons/fa';
import customerService from '../../api/customerService';
import CreditPaymentReceiptModal from './CreditPaymentReceiptModal';
import './CustomerCreditHistoryModal.css';

const formatCOP = (val) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(val) || 0);
};

const formatDateTime = (dtStr) => {
    if (!dtStr) return 'N/A';
    const d = new Date(dtStr);
    return d.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const CustomerCreditHistoryModal = ({ isOpen, onClose, customer, onOpenPaymentModal }) => {
    const [movements, setMovements] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMovementForReceipt, setSelectedMovementForReceipt] = useState(null);

    const loadHistory = useCallback(async () => {
        if (!customer?.id) return;
        setLoading(true);
        try {
            const [movs, summ] = await Promise.all([
                customerService.getCreditMovements(customer.id),
                customerService.getCreditSummary(customer.id)
            ]);
            setMovements(movs || []);
            setSummary(summ || null);
        } catch (err) {
            console.error('Error al cargar historial de crédito:', err);
        } finally {
            setLoading(false);
        }
    }, [customer?.id]);

    useEffect(() => {
        if (isOpen && customer?.id) {
            loadHistory();
        }
    }, [isOpen, customer?.id, loadHistory]);

    if (!isOpen || !customer) return null;

    const debt = Number(summary?.currentDebt ?? customer?.currentDebt) || 0;
    const limit = Number(summary?.creditLimit ?? customer?.creditLimit) || 0;
    const available = Number(summary?.availableCredit ?? customer?.availableCredit) || Math.max(0, limit - debt);

    const renderMovementTypeBadge = (mov) => {
        if (mov.movementType === 'CARGO_VENTA') {
            return (
                <span className="mov-badge cargo">
                    <FaArrowUp /> Cargo Venta #{mov.saleId || ''}
                </span>
            );
        } else if (mov.movementType === 'ABONO_PAGO') {
            return (
                <span className="mov-badge abono">
                    <FaArrowDown /> Abono Recibo #{mov.receiptNumber || mov.id}
                </span>
            );
        } else if (mov.movementType === 'AJUSTE_NOTA_CREDITO') {
            return (
                <span className="mov-badge ajuste">
                    <FaExchangeAlt /> Nota Crédito #{mov.saleId ? `Venta #${mov.saleId}` : ''}
                </span>
            );
        }
        return <span className="mov-badge default">{mov.movementType}</span>;
    };

    return (
        <div className="history-modal-overlay" onClick={onClose}>
            <div className="history-modal-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="history-modal-header">
                    <div className="history-header-title">
                        <div className="history-icon-pill">
                            <FaHistory />
                        </div>
                        <div>
                            <h3>Estado de Cuenta & Historial de Cartera</h3>
                            <p>{customer.name} • {customer.docType} {customer.docNumber}</p>
                        </div>
                    </div>
                    <div className="history-header-actions">
                        {debt > 0 && onOpenPaymentModal && (
                            <button
                                className="btn-quick-pay"
                                onClick={() => {
                                    onClose();
                                    onOpenPaymentModal(customer);
                                }}
                            >
                                <FaMoneyBillWave /> Realizar Abono
                            </button>
                        )}
                        <button className="btn-close-history" onClick={onClose} title="Cerrar">
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Summary Strip */}
                <div className="history-summary-strip">
                    <div className="history-stat-box">
                        <span className="stat-k">Cupo Total Aprobado:</span>
                        <span className="stat-v limit">{formatCOP(limit)}</span>
                    </div>
                    <div className="history-stat-box">
                        <span className="stat-k">Deuda Pendiente Actual:</span>
                        <span className="stat-v debt">{formatCOP(debt)}</span>
                    </div>
                    <div className="history-stat-box">
                        <span className="stat-k">Cupo Disponible:</span>
                        <span className="stat-v available">{formatCOP(available)}</span>
                    </div>
                    <div className="history-stat-box">
                        <span className="stat-k">Total Movimientos:</span>
                        <span className="stat-v count">{movements.length}</span>
                    </div>
                </div>

                {/* Movements Table */}
                <div className="history-table-container">
                    <table className="history-data-table">
                        <thead>
                            <tr>
                                <th>Fecha y Hora</th>
                                <th>Tipo de Operación</th>
                                <th>Medio</th>
                                <th className="text-right">Monto</th>
                                <th className="text-right">Saldo Anterior</th>
                                <th className="text-right">Saldo Posterior</th>
                                <th>Registrado por</th>
                                <th className="text-center">Comprobante</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="empty-history-cell">
                                        Cargando movimientos de cartera...
                                    </td>
                                </tr>
                            ) : movements.length > 0 ? (
                                movements.map(mov => (
                                    <tr key={mov.id}>
                                        <td className="hist-date-cell">{formatDateTime(mov.createdAt)}</td>
                                        <td>{renderMovementTypeBadge(mov)}</td>
                                        <td>
                                            <span className="hist-method-tag">{mov.paymentMethod || 'N/A'}</span>
                                        </td>
                                        <td className="text-right hist-amount-cell">
                                            <strong className={mov.movementType === 'CARGO_VENTA' ? 'red-amt' : 'green-amt'}>
                                                {mov.movementType === 'CARGO_VENTA' ? '+' : '-'} {formatCOP(mov.amount)}
                                            </strong>
                                        </td>
                                        <td className="text-right">{formatCOP(mov.previousBalance)}</td>
                                        <td className="text-right hist-new-balance">
                                            <strong>{formatCOP(mov.newBalance)}</strong>
                                        </td>
                                        <td className="hist-user-cell">{mov.registeredBy || 'cajero_pos'}</td>
                                        <td className="text-center">
                                            {mov.movementType === 'ABONO_PAGO' ? (
                                                <button
                                                    className="btn-print-receipt-table"
                                                    onClick={() => setSelectedMovementForReceipt(mov)}
                                                    title="Ver tiquete térmico / PDF de este recibo"
                                                >
                                                    <FaReceipt /> Recibo
                                                </button>
                                            ) : (
                                                <span className="no-receipt-tag">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="empty-history-cell">
                                        No se registran movimientos de crédito o pagos para este cliente.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="history-modal-footer">
                    <button className="btn-close-hist-bottom" onClick={onClose}>
                        Cerrar Historial
                    </button>
                </div>
            </div>

            {/* Embedded Receipt Modal */}
            {selectedMovementForReceipt && (
                <CreditPaymentReceiptModal
                    isOpen={Boolean(selectedMovementForReceipt)}
                    onClose={() => setSelectedMovementForReceipt(null)}
                    movement={selectedMovementForReceipt}
                    customer={customer}
                />
            )}
        </div>
    );
};

export default CustomerCreditHistoryModal;
