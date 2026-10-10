import { useState, useEffect } from 'react';
import {
    FaMoneyBillWave,
    FaTimes,
    FaCheckCircle,
    FaCreditCard,
    FaMobileAlt,
    FaCoins,
    FaExclamationTriangle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import customerService from '../../api/customerService';
import cashShiftService from '../../api/cashShiftService';
import './CustomerPaymentModal.css';

const formatCOP = (val) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(val || 0);
};

const CustomerPaymentModal = ({ isOpen, onClose, customer, onPaymentSuccess }) => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [activeShift, setActiveShift] = useState(null);

    const debt = Number(customer?.currentDebt) || 0;
    const limit = Number(customer?.creditLimit) || 0;
    const paymentAmount = Number(amount) || 0;
    const newDebt = Math.max(0, debt - paymentAmount);

    useEffect(() => {
        if (isOpen && customer) {
            setAmount(debt > 0 ? debt.toString() : '');
            setPaymentMethod('EFECTIVO');
            setNotes('');
            fetchShift();
        }
    }, [isOpen, customer, debt]);

    const fetchShift = async () => {
        try {
            const shift = await cashShiftService.getActiveShift();
            setActiveShift(shift);
        } catch {
            setActiveShift(null);
        }
    };

    const handleShortcut = (fraction) => {
        const calculated = Math.round(debt * fraction);
        setAmount(calculated.toString());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (paymentAmount <= 0) {
            toast.error('El valor a abonar debe ser superior a 0.');
            return;
        }

        if (paymentAmount > debt) {
            toast.error(`El monto a abonar (${formatCOP(paymentAmount)}) no puede ser mayor a la deuda actual (${formatCOP(debt)}).`);
            return;
        }

        setSaving(true);
        try {
            const userJson = localStorage.getItem('user');
            const userObj = userJson ? JSON.parse(userJson) : null;
            const cashierUsername = userObj?.username || 'cajero_pos';

            const payload = {
                amount: paymentAmount,
                paymentMethod,
                notes: notes.trim() || `Abono a cartera de ${customer.name}`
            };

            const movement = await customerService.registerCreditPayment(customer.id, payload, cashierUsername);
            toast.success(`Abono por ${formatCOP(paymentAmount)} registrado exitosamente. Recibo: ${movement.receiptNumber || 'OK'}`);

            if (onPaymentSuccess) {
                onPaymentSuccess(movement);
            }
            onClose();
        } catch (err) {
            console.error('Error al registrar abono:', err);
            const msg = err.response?.data?.message || err.message || 'Error al procesar el pago de cartera';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !customer) return null;

    return (
        <div className="payment-modal-overlay" onClick={onClose}>
            <div className="payment-modal-card" onClick={e => e.stopPropagation()}>
                <div className="payment-modal-header">
                    <div className="payment-header-title">
                        <div className="payment-icon-pill">
                            <FaMoneyBillWave />
                        </div>
                        <div>
                            <h3>Abono a Cartera / Recaudo</h3>
                            <p>Registro de pago de deuda y generación de recibo de caja</p>
                        </div>
                    </div>
                    <button className="btn-close-payment" onClick={onClose} title="Cerrar">
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="payment-modal-body">
                        {/* Customer Info Card */}
                        <div className="payment-customer-card">
                            <div className="cust-identity-col">
                                <span className="cust-name-title">{customer.name}</span>
                                <span className="cust-doc-tag">{customer.docType} {customer.docNumber}</span>
                            </div>
                            <div className="cust-debt-col">
                                <span className="debt-status-lbl">Deuda Pendiente Actual:</span>
                                <span className="debt-status-val">{formatCOP(debt)}</span>
                                <span className="limit-status-sub">Cupo Total: {formatCOP(limit)}</span>
                            </div>
                        </div>

                        {/* Amount Input & Shortcuts */}
                        <div className="payment-form-group">
                            <label>Valor a Abonar ($ COP) *</label>
                            <div className="amount-input-box">
                                <span className="amount-prefix">$</span>
                                <input
                                    type="number"
                                    min="100"
                                    max={debt}
                                    step="100"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0"
                                    required
                                    autoFocus
                                />
                            </div>

                            {/* Shortcut Buttons */}
                            <div className="payment-shortcuts">
                                <button type="button" onClick={() => handleShortcut(1)} className="btn-short full">
                                    Pago Total ({formatCOP(debt)})
                                </button>
                                <button type="button" onClick={() => handleShortcut(0.5)} className="btn-short">
                                    50% ({formatCOP(Math.round(debt * 0.5))})
                                </button>
                                <button type="button" onClick={() => handleShortcut(0.25)} className="btn-short">
                                    25% ({formatCOP(Math.round(debt * 0.25))})
                                </button>
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="payment-form-group">
                            <label>Medio de Recaudo</label>
                            <div className="payment-method-selector-grid">
                                <button
                                    type="button"
                                    className={`btn-method-item ${paymentMethod === 'EFECTIVO' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('EFECTIVO')}
                                >
                                    <FaCoins />
                                    <span>Efectivo (Caja)</span>
                                </button>
                                <button
                                    type="button"
                                    className={`btn-method-item ${paymentMethod === 'TRANSFERENCIA' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('TRANSFERENCIA')}
                                >
                                    <FaMobileAlt />
                                    <span>Transferencia</span>
                                </button>
                                <button
                                    type="button"
                                    className={`btn-method-item ${paymentMethod === 'TARJETA' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('TARJETA')}
                                >
                                    <FaCreditCard />
                                    <span>Tarjeta / POS</span>
                                </button>
                            </div>
                        </div>

                        {/* Cash Shift Notice */}
                        {paymentMethod === 'EFECTIVO' && (
                            <div className={`cash-shift-alert ${activeShift ? 'info' : 'warning'}`}>
                                {activeShift ? (
                                    <>
                                        <FaCheckCircle />
                                        <span>
                                            El recaudo ingresará en efectivo al <strong>Turno de Caja #{activeShift.id}</strong> ({activeShift.cashierUsername}).
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <FaExclamationTriangle />
                                        <span>
                                            No hay un turno de caja activo. El abono se registrará en cartera pero no afectará arqueo físico.
                                        </span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Notes / Concept */}
                        <div className="payment-form-group">
                            <label>Observaciones / Concepto del Abono</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Ej: Abono quincenal, pago acordado por factura #123..."
                            />
                        </div>

                        {/* Projection of new balance */}
                        <div className="payment-projection-card">
                            <div className="proj-row">
                                <span>Saldo Anterior:</span>
                                <strong>{formatCOP(debt)}</strong>
                            </div>
                            <div className="proj-row highlight">
                                <span>Monto a Abonar:</span>
                                <strong className="green-text">- {formatCOP(paymentAmount)}</strong>
                            </div>
                            <div className="proj-divider"></div>
                            <div className="proj-row total">
                                <span>Nuevo Saldo Pendiente:</span>
                                <strong className={newDebt === 0 ? 'zero-debt' : 'debt-rem'}>
                                    {formatCOP(newDebt)} {newDebt === 0 ? '✓ (Deuda Saldada)' : ''}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="payment-modal-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-pay-cancel"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-pay-submit"
                            disabled={saving || paymentAmount <= 0 || paymentAmount > debt}
                        >
                            <FaMoneyBillWave /> {saving ? 'Registrando Abono...' : `Recaudar ${formatCOP(paymentAmount)}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerPaymentModal;
