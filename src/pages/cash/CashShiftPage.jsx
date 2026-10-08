import { useState, useEffect } from 'react';
import {
    FaCashRegister,
    FaMoneyBillWave,
    FaPlus,
    FaMinus,
    FaLock,
    FaChartLine,
    FaHistory,
    FaCheckCircle,
    FaTimesCircle,
    FaExclamationTriangle,
    FaPrint,
    FaReceipt,
    FaCalendarAlt,
    FaUser,
    FaCreditCard,
    FaMobileAlt,
    FaTimes,
    FaSync
} from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import cashShiftService from '../../api/cashShiftService';
import { useAuth } from '../../context/AuthContext';
import ShiftReceiptModal from '../../components/common/ShiftReceiptModal';
import 'react-toastify/dist/ReactToastify.css';
import './CashShiftPage.css';

const formatCOP = (val) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(val) || 0);
};

const formatDateTime = (dtStr) => {
    if (!dtStr) return 'En curso';
    const date = new Date(dtStr);
    return date.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const CashShiftPage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('current'); // 'current' | 'history'
    const [loading, setLoading] = useState(true);
    const [activeShift, setActiveShift] = useState(null);
    const [summary, setSummary] = useState(null);
    const [allShifts, setAllShifts] = useState([]);

    // Modals
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [openInitialAmount, setOpenInitialAmount] = useState('100000');
    const [openNotes, setOpenNotes] = useState('');

    const [showMovementModal, setShowMovementModal] = useState(false);
    const [movementType, setMovementType] = useState('ENTRY');
    const [movementAmount, setMovementAmount] = useState('');
    const [movementReason, setMovementReason] = useState('');

    const [showArqueoModal, setShowArqueoModal] = useState(false);

    const [showCloseModal, setShowCloseModal] = useState(false);
    const [countedCash, setCountedCash] = useState('');
    const [closeNotes, setCloseNotes] = useState('');

    const [selectedHistoricalShift, setSelectedHistoricalShift] = useState(null);

    // Modal de Tiquete Térmico de Cierre Z / Arqueo X
    const [showThermalReceipt, setShowThermalReceipt] = useState(false);
    const [thermalReceiptShift, setThermalReceiptShift] = useState(null);
    const [isReceiptZ, setIsReceiptZ] = useState(true);

    useEffect(() => {
        fetchShiftData();
    }, []);

    const fetchShiftData = async () => {
        setLoading(true);
        try {
            const shift = await cashShiftService.getActiveShift();
            setActiveShift(shift || null);
            if (shift && shift.id) {
                const summ = await cashShiftService.getShiftSummary(shift.id);
                setSummary(summ);
            } else {
                setSummary(null);
            }

            const history = await cashShiftService.getAllShifts();
            setAllShifts(history || []);
        } catch (error) {
            console.error('Error fetching shift data:', error);
            toast.error('Error al consultar el estado de la caja');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenShift = async (e) => {
        e.preventDefault();
        const amount = parseFloat(openInitialAmount);
        if (isNaN(amount) || amount < 0) {
            toast.warning('Por favor ingresa una base de efectivo válida.');
            return;
        }

        try {
            await cashShiftService.openShift({
                initialAmount: amount,
                notes: openNotes
            });
            toast.success('¡Turno de caja abierto correctamente!');
            setShowOpenModal(false);
            setOpenNotes('');
            fetchShiftData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al abrir el turno');
        }
    };

    const handleRegisterMovement = async (e) => {
        e.preventDefault();
        const amount = parseFloat(movementAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.warning('Ingresa un monto válido mayor a 0');
            return;
        }
        if (!movementReason.trim()) {
            toast.warning('Ingresa el motivo del movimiento');
            return;
        }

        try {
            await cashShiftService.registerMovement(activeShift.id, {
                type: movementType,
                amount: amount,
                reason: movementReason.trim()
            });
            toast.success(movementType === 'ENTRY' ? 'Ingreso extra registrado' : 'Retiro de efectivo registrado');
            setShowMovementModal(false);
            setMovementAmount('');
            setMovementReason('');
            fetchShiftData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al registrar movimiento');
        }
    };

    const handleCloseShift = async (e) => {
        e.preventDefault();
        const actual = parseFloat(countedCash);
        if (isNaN(actual) || actual < 0) {
            toast.warning('Ingresa el monto de efectivo físico contado.');
            return;
        }

        try {
            const closedSummary = await cashShiftService.closeShift(activeShift.id, {
                actualCashAmount: actual,
                closeNotes: closeNotes
            });
            toast.success('¡Turno de caja cerrado exitosamente!');
            setShowCloseModal(false);
            setCountedCash('');
            setCloseNotes('');

            // Abrir automáticamente el tiquete térmico oficial Z para impresión
            setThermalReceiptShift(closedSummary);
            setIsReceiptZ(true);
            setShowThermalReceipt(true);

            fetchShiftData();
            setActiveTab('history');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al cerrar el turno');
        }
    };

    const handleOpenArqueoX = () => {
        if (!summary) {
            toast.warn('No hay métricas disponibles para el arqueo.');
            return;
        }
        setThermalReceiptShift(summary);
        setIsReceiptZ(false);
        setShowThermalReceipt(true);
    };

    const handlePrintHistoricalZ = async (shift) => {
        try {
            const detailed = await cashShiftService.getShiftSummary(shift.id);
            setThermalReceiptShift(detailed);
        } catch {
            setThermalReceiptShift(shift);
        }
        setIsReceiptZ(true);
        setShowThermalReceipt(true);
    };

    const handleViewHistoricalShift = (shift) => {
        setSelectedHistoricalShift(shift);
    };

    // Cálculos de Arqueo de Cierre
    const expectedCash = summary ? Number(summary.expectedCashAmount) || 0 : 0;
    const diff = countedCash !== '' ? (parseFloat(countedCash) || 0) - expectedCash : 0;

    return (
        <div className="cash-page-container">
            <ToastContainer position="top-right" autoClose={3000} />

            {/* Header */}
            <div className="cash-header">
                <div className="cash-title-group">
                    <h1>
                        <FaCashRegister className="cash-title-icon" /> Control de Caja & Turnos
                    </h1>
                    <p className="cash-subtitle">
                        Gestión de base de apertura, movimientos de efectivo, arqueo X y cierre de turno Z.
                    </p>
                </div>

                <div className="cash-tabs-wrapper">
                    <button
                        className={`cash-tab-btn ${activeTab === 'current' ? 'active' : ''}`}
                        onClick={() => setActiveTab('current')}
                    >
                        <FaMoneyBillWave /> Turno Actual
                    </button>
                    <button
                        className={`cash-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <FaHistory /> Historial de Turnos
                    </button>
                    <button
                        className="cash-tab-btn"
                        onClick={fetchShiftData}
                        disabled={loading}
                        title="Actualizar datos"
                    >
                        <FaSync className={loading ? 'spin-icon' : ''} />
                    </button>
                </div>
            </div>

            {/* TAB 1: TURNO ACTUAL */}
            {activeTab === 'current' && (
                <div>
                    {!activeShift ? (
                        /* Estado: Caja Cerrada */
                        <div className="cash-closed-banner">
                            <FaLock className="closed-banner-icon" />
                            <h2>No hay un turno de caja abierto</h2>
                            <p>
                                Para registrar ventas en el punto de venta, controlar el flujo de efectivo y realizar arqueos de caja, debes iniciar un turno con la base inicial.
                            </p>
                            <button
                                className="btn-open-shift-hero"
                                onClick={() => setShowOpenModal(true)}
                            >
                                <FaPlus /> Abrir Turno de Caja
                            </button>
                        </div>
                    ) : (
                        /* Estado: Caja Abierta con Métricas y Acciones */
                        <div>
                            {/* Banner Superior de Estado */}
                            <div className="shift-status-card">
                                <div className="status-info-left">
                                    <span className="shift-badge-pill open">
                                        <span className="status-dot-pulse"></span> TURNO #{activeShift.id} ABIERTO
                                    </span>
                                    <div>
                                        <h2 className="shift-meta-title">Cajero: {activeShift.cashierUsername}</h2>
                                        <div className="shift-meta-details">
                                            Iniciado el {formatDateTime(activeShift.openedAt)}
                                            {activeShift.notes && ` • "${activeShift.notes}"`}
                                        </div>
                                    </div>
                                </div>

                                <div className="status-actions-right">
                                    <button
                                        className="btn-action-cash entry"
                                        onClick={() => {
                                            setMovementType('ENTRY');
                                            setShowMovementModal(true);
                                        }}
                                    >
                                        <FaPlus /> Entrada de Efectivo
                                    </button>
                                    <button
                                        className="btn-action-cash exit"
                                        onClick={() => {
                                            setMovementType('EXIT');
                                            setShowMovementModal(true);
                                        }}
                                    >
                                        <FaMinus /> Retiro / Gasto
                                    </button>
                                    <button
                                        className="btn-action-cash arqueo"
                                        onClick={handleOpenArqueoX}
                                    >
                                        <FaReceipt /> Arqueo (Reporte X)
                                    </button>
                                    <button
                                        className="btn-action-cash close"
                                        onClick={() => {
                                            setCountedCash('');
                                            setShowCloseModal(true);
                                        }}
                                    >
                                        <FaLock /> Cerrar Turno (Reporte Z)
                                    </button>
                                </div>
                            </div>

                            {/* Grid de Métricas Financieras */}
                            <div className="cash-metrics-grid">
                                <div className="cash-metric-card highlight">
                                    <div className="metric-header">
                                        <span>Efectivo Total Esperado en Caja</span>
                                        <FaMoneyBillWave className="metric-icon-small green" />
                                    </div>
                                    <div className="metric-value highlight-large">
                                        {formatCOP(summary?.expectedCashAmount || 0)}
                                    </div>
                                    <div className="metric-subtext">
                                        Base ({formatCOP(summary?.initialAmount || 0)}) + Ventas Efectivo ({formatCOP(summary?.totalSalesCash || 0)}) + Entradas ({formatCOP(summary?.totalEntriesAmount || 0)}) - Retiros ({formatCOP(summary?.totalExitsAmount || 0)})
                                    </div>
                                </div>

                                <div className="cash-metric-card">
                                    <div className="metric-header">
                                        <span>Base Inicial</span>
                                        <FaReceipt className="metric-icon-small blue" />
                                    </div>
                                    <div className="metric-value">{formatCOP(summary?.initialAmount || 0)}</div>
                                    <div className="metric-subtext">Fondo inicial de cambio</div>
                                </div>

                                <div className="cash-metric-card">
                                    <div className="metric-header">
                                        <span>Total Ventas Turno</span>
                                        <FaChartLine className="metric-icon-small green" />
                                    </div>
                                    <div className="metric-value">{formatCOP(summary?.totalSalesAmount || 0)}</div>
                                    <div className="metric-subtext">{summary?.totalSalesCount || 0} tickets emitidos</div>
                                </div>

                                <div className="cash-metric-card">
                                    <div className="metric-header">
                                        <span>Entradas Extra</span>
                                        <FaPlus className="metric-icon-small green" />
                                    </div>
                                    <div className="metric-value">{formatCOP(summary?.totalEntriesAmount || 0)}</div>
                                    <div className="metric-subtext">Cambio o aportes adicionales</div>
                                </div>

                                <div className="cash-metric-card">
                                    <div className="metric-header">
                                        <span>Retiros / Gastos</span>
                                        <FaMinus className="metric-icon-small red" />
                                    </div>
                                    <div className="metric-value">{formatCOP(summary?.totalExitsAmount || 0)}</div>
                                    <div className="metric-subtext">Pagos menores o retiros</div>
                                </div>
                            </div>

                            {/* Split: Movimientos Recientes & Métodos de Pago */}
                            <div className="shift-details-split">
                                {/* Tabla de Movimientos del Turno */}
                                <div className="cash-card-panel">
                                    <div className="panel-header">
                                        <h3>
                                            <FaMoneyBillWave /> Movimientos de Efectivo del Turno
                                        </h3>
                                        <span className="shift-badge-pill open">
                                            {summary?.movements?.length || 0} Registros
                                        </span>
                                    </div>

                                    {(!summary?.movements || summary.movements.length === 0) ? (
                                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem 0' }}>
                                            No se han registrado entradas ni retiros manuales en este turno.
                                        </p>
                                    ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="movements-table">
                                                <thead>
                                                    <tr>
                                                        <th>Hora</th>
                                                        <th>Tipo</th>
                                                        <th>Motivo</th>
                                                        <th>Usuario</th>
                                                        <th style={{ textAlign: 'right' }}>Monto</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {summary.movements.map((m) => (
                                                        <tr key={m.id}>
                                                            <td>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                            <td>
                                                                <span className={`movement-badge ${m.type === 'ENTRY' ? 'entry' : 'exit'}`}>
                                                                    {m.type === 'ENTRY' ? '+ Entrada' : '- Retiro'}
                                                                </span>
                                                            </td>
                                                            <td>{m.reason}</td>
                                                            <td>{m.registeredBy}</td>
                                                            <td style={{ textAlign: 'right' }} className={m.type === 'ENTRY' ? 'amount-entry' : 'amount-exit'}>
                                                                {m.type === 'ENTRY' ? '+' : '-'}{formatCOP(m.amount)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Desglose por Método de Pago */}
                                <div className="cash-card-panel">
                                    <div className="panel-header">
                                        <h3>
                                            <FaCreditCard /> Ventas por Medio de Pago
                                        </h3>
                                    </div>

                                    <div className="sales-breakdown-list">
                                        <div className="breakdown-row">
                                            <span>💵 Efectivo</span>
                                            <strong>{formatCOP(summary?.totalSalesCash || 0)}</strong>
                                        </div>
                                        <div className="breakdown-row">
                                            <span>💳 Tarjeta Débito / Crédito</span>
                                            <strong>{formatCOP(summary?.totalSalesCard || 0)}</strong>
                                        </div>
                                        <div className="breakdown-row">
                                            <span>📲 Transferencia (Nequi / DaviPlata)</span>
                                            <strong>{formatCOP(summary?.totalSalesTransfer || 0)}</strong>
                                        </div>
                                        {summary?.totalSalesOther > 0 && (
                                            <div className="breakdown-row">
                                                <span>🔄 Otros Medios</span>
                                                <strong>{formatCOP(summary?.totalSalesOther || 0)}</strong>
                                            </div>
                                        )}
                                        <div className="breakdown-row total-row">
                                            <span>Total Facturado</span>
                                            <span>{formatCOP(summary?.totalSalesAmount || 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: HISTORIAL DE TURNOS */}
            {activeTab === 'history' && (
                <div className="history-table-wrapper">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th># Turno</th>
                                <th>Cajero</th>
                                <th>Apertura</th>
                                <th>Cierre</th>
                                <th>Estado</th>
                                <th>Base</th>
                                <th>Ventas</th>
                                <th>Esperado</th>
                                <th>Contado</th>
                                <th>Diferencia</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allShifts.length === 0 ? (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No hay turnos registrados en el historial.
                                    </td>
                                </tr>
                            ) : (
                                allShifts.map((s) => (
                                    <tr key={s.id}>
                                        <td><strong>#{s.id}</strong></td>
                                        <td>{s.cashierUsername}</td>
                                        <td>{formatDateTime(s.openedAt)}</td>
                                        <td>{formatDateTime(s.closedAt)}</td>
                                        <td>
                                            <span className={`shift-badge-pill ${s.status === 'OPEN' ? 'open' : 'closed'}`}>
                                                {s.status === 'OPEN' ? 'ABIERTO' : 'CERRADO'}
                                            </span>
                                        </td>
                                        <td>{formatCOP(s.initialAmount)}</td>
                                        <td>{formatCOP(s.totalSalesAmount)}</td>
                                        <td>{formatCOP(s.expectedCashAmount)}</td>
                                        <td>{s.actualCashAmount != null ? formatCOP(s.actualCashAmount) : '-'}</td>
                                        <td>
                                            {s.differenceAmount != null ? (
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: s.differenceAmount === 0 ? '#059669' : (s.differenceAmount > 0 ? '#2563eb' : '#dc2626')
                                                }}>
                                                    {s.differenceAmount > 0 ? '+' : ''}{formatCOP(s.differenceAmount)}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    className="btn-print-shift-z"
                                                    onClick={() => handlePrintHistoricalZ(s)}
                                                    title="Imprimir Tiquete Térmico de Cierre (Reporte Z)"
                                                >
                                                    <FaPrint /> Tiquete Z
                                                </button>
                                                <button
                                                    className="btn-view-shift"
                                                    onClick={() => handleViewHistoricalShift(s)}
                                                    title="Ver detalle del turno"
                                                >
                                                    <FaReceipt /> Detalle
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL 1: ABRIR TURNO */}
            {showOpenModal && (
                <div className="modal-overlay-custom" onClick={() => setShowOpenModal(false)}>
                    <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-flex">
                            <h3><FaCashRegister /> Apertura de Turno de Caja</h3>
                            <button className="btn-close-modal" onClick={() => setShowOpenModal(false)}><FaTimes /></button>
                        </div>
                        <form onSubmit={handleOpenShift}>
                            <div className="form-group-cash">
                                <label>Cajero Responsable</label>
                                <input
                                    type="text"
                                    className="input-cash"
                                    value={user?.username || 'Cajero Actual'}
                                    disabled
                                />
                            </div>

                            <div className="form-group-cash">
                                <label>Base Inicial de Efectivo (COP) *</label>
                                <input
                                    type="number"
                                    step="1000"
                                    min="0"
                                    required
                                    className="input-cash currency"
                                    value={openInitialAmount}
                                    onChange={(e) => setOpenInitialAmount(e.target.value)}
                                    placeholder="Ej: 100000"
                                    autoFocus
                                />
                                <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                                    Efectivo inicial en monedas y billetes para dar cambio.
                                </small>
                            </div>

                            <div className="form-group-cash">
                                <label>Notas u Observaciones (Opcional)</label>
                                <textarea
                                    className="input-cash"
                                    rows="2"
                                    value={openNotes}
                                    onChange={(e) => setOpenNotes(e.target.value)}
                                    placeholder="Ej: Turno mañana, caja principal 1"
                                />
                            </div>

                            <div className="modal-footer-btns">
                                <button type="button" className="btn-modal-cancel" onClick={() => setShowOpenModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-modal-submit">
                                    <FaCheckCircle /> Iniciar Turno
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: REGISTRAR MOVIMIENTO (ENTRADA / SALIDA) */}
            {showMovementModal && (
                <div className="modal-overlay-custom" onClick={() => setShowMovementModal(false)}>
                    <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-flex">
                            <h3>
                                {movementType === 'ENTRY' ? (
                                    <><FaPlus style={{ color: '#059669' }} /> Registrar Entrada de Efectivo</>
                                ) : (
                                    <><FaMinus style={{ color: '#dc2626' }} /> Registrar Retiro de Efectivo</>
                                )}
                            </h3>
                            <button className="btn-close-modal" onClick={() => setShowMovementModal(false)}><FaTimes /></button>
                        </div>
                        <form onSubmit={handleRegisterMovement}>
                            <div className="form-group-cash">
                                <label>Monto en Efectivo (COP) *</label>
                                <input
                                    type="number"
                                    step="500"
                                    min="1"
                                    required
                                    className="input-cash currency"
                                    value={movementAmount}
                                    onChange={(e) => setMovementAmount(e.target.value)}
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>

                            <div className="form-group-cash">
                                <label>Motivo o Justificación *</label>
                                <input
                                    type="text"
                                    required
                                    className="input-cash"
                                    value={movementReason}
                                    onChange={(e) => setMovementReason(e.target.value)}
                                    placeholder={movementType === 'ENTRY' ? 'Ej: Cambio adicional traído de banco' : 'Ej: Pago de flete a distribuidor o compra de bolsas'}
                                />
                            </div>

                            <div className="modal-footer-btns">
                                <button type="button" className="btn-modal-cancel" onClick={() => setShowMovementModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className={`btn-modal-submit ${movementType === 'EXIT' ? 'danger' : ''}`}>
                                    Registrar {movementType === 'ENTRY' ? 'Entrada' : 'Retiro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: ARQUEO DE CAJA EN VIVO (REPORTE X) */}
            {showArqueoModal && summary && (
                <div className="modal-overlay-custom" onClick={() => setShowArqueoModal(false)}>
                    <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-flex">
                            <h3><FaReceipt /> Arqueo Parcial (Reporte X)</h3>
                            <button className="btn-close-modal" onClick={() => setShowArqueoModal(false)}><FaTimes /></button>
                        </div>

                        {/* Diseño de Tiquete Térmico */}
                        <div className="ticket-print-layout">
                            <div className="ticket-brand">
                                NEXPOS RETAIL<br />
                                <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>ARQUEO DE CAJA (REPORTE X)</span>
                            </div>
                            <div className="ticket-line">
                                <span>Turno:</span>
                                <strong>#{summary.shiftId}</strong>
                            </div>
                            <div className="ticket-line">
                                <span>Cajero:</span>
                                <span>{summary.cashierUsername}</span>
                            </div>
                            <div className="ticket-line">
                                <span>Apertura:</span>
                                <span>{formatDateTime(summary.openedAt)}</span>
                            </div>
                            <div className="ticket-line">
                                <span>Fecha Arqueo:</span>
                                <span>{new Date().toLocaleTimeString()}</span>
                            </div>
                            <div className="ticket-divider"></div>

                            <div className="ticket-line">
                                <span>Base Inicial:</span>
                                <span>{formatCOP(summary.initialAmount)}</span>
                            </div>
                            <div className="ticket-line">
                                <span>(+) Ventas Efectivo:</span>
                                <span>{formatCOP(summary.totalSalesCash)}</span>
                            </div>
                            <div className="ticket-line">
                                <span>(+) Entradas Extra:</span>
                                <span>{formatCOP(summary.totalEntriesAmount)}</span>
                            </div>
                            <div className="ticket-line">
                                <span>(-) Retiros / Salidas:</span>
                                <span>{formatCOP(summary.totalExitsAmount)}</span>
                            </div>
                            <div className="ticket-divider"></div>

                            <div className="ticket-line ticket-total">
                                <span>EFECTIVO EN CAJA:</span>
                                <span>{formatCOP(summary.expectedCashAmount)}</span>
                            </div>
                            <div className="ticket-divider"></div>

                            <div className="ticket-line">
                                <span>Ventas Tarjeta:</span>
                                <span>{formatCOP(summary.totalSalesCard)}</span>
                            </div>
                            <div className="ticket-line">
                                <span>Ventas Transf.:</span>
                                <span>{formatCOP(summary.totalSalesTransfer)}</span>
                            </div>
                            <div className="ticket-line">
                                <span>Total Ventas ({summary.totalSalesCount}):</span>
                                <strong>{formatCOP(summary.totalSalesAmount)}</strong>
                            </div>
                        </div>

                        <div className="modal-footer-btns">
                            <button type="button" className="btn-modal-cancel" onClick={() => setShowArqueoModal(false)}>
                                Cerrar
                            </button>
                            <button type="button" className="btn-modal-submit" onClick={() => window.print()}>
                                <FaPrint /> Imprimir Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: CIERRE DE CAJA (REPORTE Z) */}
            {showCloseModal && summary && (
                <div className="modal-overlay-custom" onClick={() => setShowCloseModal(false)}>
                    <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-flex">
                            <h3><FaLock style={{ color: '#dc2626' }} /> Cierre de Turno (Reporte Z)</h3>
                            <button className="btn-close-modal" onClick={() => setShowCloseModal(false)}><FaTimes /></button>
                        </div>

                        <form onSubmit={handleCloseShift}>
                            <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                                    <span>Efectivo Esperado en Sistema:</span>
                                    <strong style={{ color: 'var(--primary)' }}>{formatCOP(expectedCash)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <span>Total Facturado en Turno:</span>
                                    <span>{formatCOP(summary.totalSalesAmount)} ({summary.totalSalesCount} ventas)</span>
                                </div>
                            </div>

                            <div className="form-group-cash">
                                <label>Efectivo Físico Contado en Caja (COP) *</label>
                                <input
                                    type="number"
                                    step="500"
                                    min="0"
                                    required
                                    className="input-cash currency"
                                    value={countedCash}
                                    onChange={(e) => setCountedCash(e.target.value)}
                                    placeholder="Ingresa el dinero físico contado"
                                    autoFocus
                                />
                            </div>

                            {/* Alerta de Diferencia en Vivo */}
                            {countedCash !== '' && (
                                <div className={`diff-alert-box ${diff === 0 ? 'exact' : (diff < 0 ? 'missing' : 'surplus')}`}>
                                    <span>
                                        {diff === 0 && '✅ Caja Cuadrada Perfectamente'}
                                        {diff < 0 && '⚠️ Faltante de Efectivo:'}
                                        {diff > 0 && 'ℹ️ Sobrante de Efectivo:'}
                                    </span>
                                    <span>{diff > 0 ? '+' : ''}{formatCOP(diff)}</span>
                                </div>
                            )}

                            <div className="form-group-cash" style={{ marginTop: '1rem' }}>
                                <label>Observaciones de Cierre (Opcional)</label>
                                <textarea
                                    className="input-cash"
                                    rows="2"
                                    value={closeNotes}
                                    onChange={(e) => setCloseNotes(e.target.value)}
                                    placeholder="Explica cualquier descuadre o novedad del turno"
                                />
                            </div>

                            <div className="modal-footer-btns">
                                <button type="button" className="btn-modal-cancel" onClick={() => setShowCloseModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-modal-submit danger">
                                    <FaLock /> Confirmar Cierre de Turno
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 5: DETALLE DE TURNO HISTÓRICO */}
            {selectedHistoricalShift && (
                <div className="modal-overlay-custom" onClick={() => setSelectedHistoricalShift(null)}>
                    <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-flex">
                            <h3><FaReceipt /> Detalle Turno #{selectedHistoricalShift.id}</h3>
                            <button className="btn-close-modal" onClick={() => setSelectedHistoricalShift(null)}><FaTimes /></button>
                        </div>

                        <div className="ticket-print-layout">
                            <div className="ticket-brand">
                                NEXPOS RETAIL<br />
                                <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>COMPROBANTE DE CIERRE (REPORTE Z)</span>
                            </div>
                            <div className="ticket-line">
                                <span>Turno:</span>
                                <strong>#{selectedHistoricalShift.id} ({selectedHistoricalShift.status})</strong>
                            </div>
                            <div className="ticket-line">
                                <span>Cajero:</span>
                                <span>{selectedHistoricalShift.cashierUsername}</span>
                            </div>
                            <div className="ticket-line">
                                <span>Apertura:</span>
                                <span>{formatDateTime(selectedHistoricalShift.openedAt)}</span>
                            </div>
                            <div className="ticket-line">
                                <span>Cierre:</span>
                                <span>{formatDateTime(selectedHistoricalShift.closedAt)}</span>
                            </div>
                            <div className="ticket-divider"></div>

                            <div className="ticket-line">
                                <span>Base Inicial:</span>
                                <span>{formatCOP(selectedHistoricalShift.initialAmount)}</span>
                            </div>
                            <div className="ticket-line">
                                <span>Ventas Efectivo:</span>
                                <span>{formatCOP(selectedHistoricalShift.totalSalesCash)}</span>
                            </div>
                            <div className="ticket-line">
                                <span>Entradas Extra:</span>
                                <span>+{formatCOP(selectedHistoricalShift.totalEntriesAmount)}</span>
                            </div>
                            <div className="ticket-line">
                                <span>Retiros Efectivo:</span>
                                <span>-{formatCOP(selectedHistoricalShift.totalExitsAmount)}</span>
                            </div>
                            <div className="ticket-divider"></div>

                            <div className="ticket-line">
                                <span>Efectivo Esperado:</span>
                                <strong>{formatCOP(selectedHistoricalShift.expectedCashAmount)}</strong>
                            </div>
                            <div className="ticket-line">
                                <span>Efectivo Contado:</span>
                                <strong>{formatCOP(selectedHistoricalShift.actualCashAmount || 0)}</strong>
                            </div>
                            <div className="ticket-line ticket-total" style={{
                                color: selectedHistoricalShift.differenceAmount === 0 ? '#059669' : (selectedHistoricalShift.differenceAmount > 0 ? '#2563eb' : '#dc2626')
                            }}>
                                <span>DIFERENCIA:</span>
                                <span>{selectedHistoricalShift.differenceAmount > 0 ? '+' : ''}{formatCOP(selectedHistoricalShift.differenceAmount || 0)}</span>
                            </div>
                            <div className="ticket-divider"></div>

                            <div className="ticket-line">
                                <span>Total Ventas ({selectedHistoricalShift.totalSalesCount}):</span>
                                <strong>{formatCOP(selectedHistoricalShift.totalSalesAmount)}</strong>
                            </div>
                            {selectedHistoricalShift.closeNotes && (
                                <div style={{ marginTop: '0.5rem', fontStyle: 'italic', fontSize: '0.75rem' }}>
                                    Nota: "{selectedHistoricalShift.closeNotes}"
                                </div>
                            )}
                        </div>

                        <div className="modal-footer-btns">
                            <button type="button" className="btn-modal-cancel" onClick={() => setSelectedHistoricalShift(null)}>
                                Cerrar
                            </button>
                            <button
                                type="button"
                                className="btn-modal-submit"
                                onClick={() => handlePrintHistoricalZ(selectedHistoricalShift)}
                                title="Imprimir tiquete de cierre en impresora térmica (58mm/80mm)"
                            >
                                <FaPrint /> Tiquete Térmico
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Tiquete Térmico de Cierre Z y Arqueo X */}
            <ShiftReceiptModal
                shift={thermalReceiptShift}
                isOpen={showThermalReceipt}
                onClose={() => setShowThermalReceipt(false)}
                isReportZ={isReceiptZ}
            />
        </div>
    );
};

export default CashShiftPage;
