import { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import {
    FaPrint,
    FaTimes,
    FaCashRegister,
    FaReceipt,
    FaCheckCircle,
    FaExclamationTriangle
} from 'react-icons/fa';
import companyConfigService from '../../api/companyConfigService';
import './ShiftReceiptModal.css';

const DEFAULT_CONFIG = {
    businessName: 'NexPOS - Retail & Punto de Venta',
    nit: 'NIT: 900.785.412-8 • Régimen Común',
    address: 'Av. Roosevelt # 34-50, Cali - Colombia',
    phone: 'Tel: (602) 889-1234 • WhatsApp: 315 000 0000',
    dianResolutionNumber: '18764000001',
    dianPrefix: 'POS'
};

const formatCOP = (val) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(val) || 0);
};

const formatDateTime = (dtStr) => {
    if (!dtStr) return 'En curso';
    const d = new Date(dtStr);
    return d.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

const calculateDuration = (startStr, endStr) => {
    if (!startStr) return '-';
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date();
    const diffMs = Math.max(0, end - start);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
};

const ShiftReceiptModal = ({ shift, isOpen, onClose, isReportZ = true }) => {
    const barcodeRef = useRef(null);
    const [paperWidth, setPaperWidth] = useState(() => localStorage.getItem('nexpos_paper_width') || '80mm');
    const [config, setConfig] = useState(DEFAULT_CONFIG);

    useEffect(() => {
        if (isOpen) {
            companyConfigService.getConfig()
                .then(res => {
                    if (res) {
                        setConfig({
                            businessName: res.tradeName || res.businessName || DEFAULT_CONFIG.businessName,
                            nit: `NIT: ${res.nit} • ${res.taxRegime || 'Régimen Común'}`,
                            address: `${res.address || ''}, ${res.city || 'Cali'} - ${res.department || 'Valle'}`,
                            phone: `Tel: ${res.phone || ''}${res.email ? ` • ${res.email}` : ''}`,
                            dianResolutionNumber: res.dianResolutionNumber || DEFAULT_CONFIG.dianResolutionNumber,
                            dianPrefix: res.dianPrefix || DEFAULT_CONFIG.dianPrefix
                        });
                    }
                })
                .catch(() => {});
        }
    }, [isOpen]);

    const shiftId = shift?.shiftId || shift?.id || '0';
    const isClosed = shift?.status === 'CLOSED' || isReportZ;

    // Render barcode for the shift receipt
    useEffect(() => {
        if (isOpen && shift && barcodeRef.current) {
            try {
                const code = `${isClosed ? 'Z' : 'X'}-TURNO-${shiftId}`;
                JsBarcode(barcodeRef.current, code, {
                    format: "CODE128",
                    lineColor: "#000000",
                    width: paperWidth === '80mm' ? 1.5 : 1.1,
                    height: paperWidth === '80mm' ? 32 : 26,
                    displayValue: true,
                    fontSize: 9,
                    margin: 4,
                    background: "#ffffff"
                });
            } catch (err) {
                console.error("Error al renderizar barcode de cierre:", err);
            }
        }
    }, [isOpen, shift, shiftId, isClosed, paperWidth]);

    if (!isOpen || !shift) return null;

    const handleSetPaperWidth = (width) => {
        setPaperWidth(width);
        localStorage.setItem('nexpos_paper_width', width);
    };

    const handlePrint = () => {
        window.print();
    };

    const initialAmount = Number(shift.initialAmount) || 0;
    const totalSalesCash = Number(shift.totalSalesCash) || 0;
    const totalEntries = Number(shift.totalEntriesAmount) || 0;
    const totalExits = Number(shift.totalExitsAmount) || 0;
    const expectedCash = Number(shift.expectedCashAmount) || 0;
    const actualCash = shift.actualCashAmount != null ? Number(shift.actualCashAmount) : null;
    const difference = shift.differenceAmount != null ? Number(shift.differenceAmount) : (actualCash != null ? actualCash - expectedCash : null);

    const totalSalesCard = Number(shift.totalSalesCard) || 0;
    const totalSalesTransfer = Number(shift.totalSalesTransfer) || 0;
    const totalSalesOther = Number(shift.totalSalesOther) || 0;
    const totalSalesAmount = Number(shift.totalSalesAmount) || 0;
    const totalSalesCount = Number(shift.totalSalesCount) || 0;

    const movements = shift.movements || [];

    return (
        <div className="shift-modal-overlay" onClick={onClose}>
            <div className="shift-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="shift-modal-header">
                    <h3>
                        <FaReceipt className="shift-header-icon" /> {isClosed ? 'Tiquete Cierre de Caja (Reporte Z)' : 'Arqueo de Caja (Reporte X)'}
                    </h3>
                    <button className="btn-close-shift-modal" onClick={onClose} title="Cerrar ventana">
                        <FaTimes />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="shift-controls-toolbar">
                    <div className="paper-width-selector">
                        <button
                            className={`btn-width-toggle ${paperWidth === '80mm' ? 'active' : ''}`}
                            onClick={() => handleSetPaperWidth('80mm')}
                        >
                            80mm (Estándar)
                        </button>
                        <button
                            className={`btn-width-toggle ${paperWidth === '58mm' ? 'active' : ''}`}
                            onClick={() => handleSetPaperWidth('58mm')}
                        >
                            58mm (Compacto)
                        </button>
                    </div>

                    <div className="shift-badge-indicator">
                        {isClosed ? (
                            <span className="badge-z-closed">
                                <FaCheckCircle /> Reporte Z Oficial
                            </span>
                        ) : (
                            <span className="badge-x-open">
                                <FaCashRegister /> Reporte X Parcial
                            </span>
                        )}
                    </div>
                </div>

                {/* Body / Printable Ticket */}
                <div className="shift-modal-body">
                    <div
                        id="shift-receipt-printable"
                        className={`shift-paper-sheet width-${paperWidth}`}
                    >
                        {/* Encabezado del Comercio */}
                        <div className="ticket-brand-header">
                            <span className="ticket-store-name">{config.businessName}</span>
                            <div className="ticket-meta-info">
                                <div>{config.nit}</div>
                                <div>{config.address}</div>
                                <div>{config.phone}</div>
                            </div>
                        </div>

                        {/* Título Oficial del Comprobante */}
                        <div className="shift-receipt-title-box">
                            <div className="shift-main-title">
                                {isClosed ? 'COMPROBANTE DE CIERRE DE CAJA' : 'ARQUEO PARCIAL DE CAJA'}
                            </div>
                            <div className="shift-sub-title">
                                {isClosed ? 'REPORTE Z - CIERRE FISCAL' : 'REPORTE X - CORTE TEMPORAL'}
                            </div>
                        </div>

                        <div className="shift-divider-line"></div>

                        {/* Metadatos del Turno */}
                        <div className="ticket-meta-info">
                            <div className="t-row bold">
                                <span>TURNO No.:</span>
                                <span>#{shiftId}</span>
                            </div>
                            <div className="t-row">
                                <span>Cajero(a):</span>
                                <strong>{shift.cashierUsername || 'Cajero POS'}</strong>
                            </div>
                            <div className="t-row">
                                <span>Apertura:</span>
                                <span>{formatDateTime(shift.openedAt)}</span>
                            </div>
                            <div className="t-row">
                                <span>Cierre:</span>
                                <span>{formatDateTime(shift.closedAt)}</span>
                            </div>
                            <div className="t-row">
                                <span>Duración:</span>
                                <span>{calculateDuration(shift.openedAt, shift.closedAt)}</span>
                            </div>
                            {(shift.firstInvoiceNumber || shift.lastInvoiceNumber) && (
                                <div className="t-row" style={{ marginTop: '2px', fontSize: '10px' }}>
                                    <span>Rango Facturas:</span>
                                    <span>{shift.firstInvoiceNumber || 'FAC-1'} al {shift.lastInvoiceNumber || 'FAC-N'}</span>
                                </div>
                            )}
                        </div>

                        <div className="shift-double-line"></div>

                        {/* Sección 1: Flujo y Arqueo de Efectivo */}
                        <div className="shift-section-title">RESUMEN FLUJO DE EFECTIVO</div>

                        <div className="ticket-totals-box">
                            <div className="t-row">
                                <span>Base Inicial (Fondo):</span>
                                <span>{formatCOP(initialAmount)}</span>
                            </div>
                            <div className="t-row">
                                <span>(+) Ventas Efectivo:</span>
                                <span>{formatCOP(totalSalesCash)}</span>
                            </div>
                            <div className="t-row">
                                <span>(+) Entradas Manuales:</span>
                                <span>+{formatCOP(totalEntries)}</span>
                            </div>
                            <div className="t-row">
                                <span>(-) Retiros / Salidas:</span>
                                <span>-{formatCOP(totalExits)}</span>
                            </div>

                            <div className="shift-divider-line"></div>

                            <div className="t-row total-hero">
                                <span>EFECTIVO ESPERADO:</span>
                                <span>{formatCOP(expectedCash)}</span>
                            </div>

                            {actualCash != null && (
                                <>
                                    <div className="t-row bold">
                                        <span>EFECTIVO CONTADO:</span>
                                        <span>{formatCOP(actualCash)}</span>
                                    </div>
                                    <div
                                        className="t-row bold"
                                        style={{
                                            fontSize: '11px',
                                            padding: '4px 0',
                                            color: difference === 0 ? '#000' : (difference > 0 ? '#1d4ed8' : '#b91c1c')
                                        }}
                                    >
                                        <span>
                                            {difference === 0 && 'DIFERENCIA (CUADRADA):'}
                                            {difference > 0 && 'SOBRANTE DE EFECTIVO:'}
                                            {difference < 0 && 'FALTANTE DE EFECTIVO:'}
                                        </span>
                                        <span>{difference > 0 ? '+' : ''}{formatCOP(difference)}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="shift-double-line"></div>

                        {/* Sección 2: Ventas por Medio de Pago */}
                        <div className="shift-section-title">VENTAS POR MEDIO DE PAGO</div>

                        <div className="ticket-totals-box">
                            <div className="t-row">
                                <span>• Ventas Efectivo:</span>
                                <span>{formatCOP(totalSalesCash)}</span>
                            </div>
                            <div className="t-row">
                                <span>• Tarjeta / Datáfono:</span>
                                <span>{formatCOP(totalSalesCard)}</span>
                            </div>
                            <div className="t-row">
                                <span>• Transferencia (Nequi/Davi):</span>
                                <span>{formatCOP(totalSalesTransfer)}</span>
                            </div>
                            {totalSalesOther > 0 && (
                                <div className="t-row">
                                    <span>• Otros Medios:</span>
                                    <span>{formatCOP(totalSalesOther)}</span>
                                </div>
                            )}

                            <div className="shift-divider-line"></div>

                            <div className="t-row total-hero">
                                <span>TOTAL FACTURADO:</span>
                                <span>{formatCOP(totalSalesAmount)}</span>
                            </div>
                            <div className="t-row" style={{ fontSize: '10px', color: '#555' }}>
                                <span>Total Comprobantes / Ventas:</span>
                                <strong>{totalSalesCount} transacciones</strong>
                            </div>
                        </div>

                        {/* Sección 3: Movimientos de Efectivo Detallados (si hubo) */}
                        {movements.length > 0 && (
                            <>
                                <div className="shift-double-line"></div>
                                <div className="shift-section-title">MOVIMIENTOS MANUALES ({movements.length})</div>
                                <div className="shift-movements-list">
                                    {movements.map((m, idx) => (
                                        <div key={idx} className="movement-ticket-row">
                                            <div className="mov-row-top">
                                                <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {m.type === 'ENTRY' ? '+ Entrada' : '- Retiro'}</span>
                                                <strong>{m.type === 'ENTRY' ? '+' : '-'}{formatCOP(m.amount)}</strong>
                                            </div>
                                            <div className="mov-row-desc">{m.reason} ({m.registeredBy})</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Observaciones de Apertura y Cierre */}
                        {(shift.notes || shift.closeNotes) && (
                            <>
                                <div className="shift-divider-line"></div>
                                <div className="shift-notes-box">
                                    {shift.notes && <div><strong>Obs. Apertura:</strong> {shift.notes}</div>}
                                    {shift.closeNotes && <div><strong>Obs. Cierre:</strong> {shift.closeNotes}</div>}
                                </div>
                            </>
                        )}

                        {/* Firmas de Responsabilidad */}
                        <div className="shift-signatures-block">
                            <div className="sig-line-wrapper">
                                <div className="sig-line"></div>
                                <span>Cajero(a): {shift.cashierUsername || 'Responsable'}</span>
                            </div>
                            <div className="sig-line-wrapper">
                                <div className="sig-line"></div>
                                <span>Supervisor / Administrador</span>
                            </div>
                        </div>

                        {/* Barcode del Cierre */}
                        <div className="ticket-barcode-box">
                            <svg ref={barcodeRef} className="ticket-barcode-svg"></svg>
                        </div>

                        {/* Pie de Tiquete */}
                        <div className="shift-footer-text">
                            NexPOS Retail Cloud v2.0 • Arqueo Oficial de Turno<br />
                            Impreso: {new Date().toLocaleString('es-CO')}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="shift-modal-footer">
                    <div className="drawer-status-pill">
                        <span>Formato: <strong>{paperWidth}</strong></span>
                        <span style={{ marginLeft: '8px', color: isClosed ? '#059669' : '#2563eb', fontWeight: 600 }}>
                            • {isClosed ? 'Turno Cerrado' : 'Turno en Curso'}
                        </span>
                    </div>

                    <div className="footer-action-buttons">
                        <button
                            type="button"
                            className="btn-close-secondary"
                            onClick={onClose}
                        >
                            Cerrar
                        </button>
                        <button
                            type="button"
                            className="btn-print-thermal-direct"
                            onClick={handlePrint}
                        >
                            <FaPrint /> Imprimir {isClosed ? 'Reporte Z' : 'Reporte X'} ({paperWidth})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShiftReceiptModal;
