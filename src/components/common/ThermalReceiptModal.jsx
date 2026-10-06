import { useState, useEffect, useRef, useMemo } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import {
    FaPrint,
    FaTimes,
    FaCog,
    FaCashRegister,
    FaQrcode,
    FaShieldAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { playBarcodeBeep } from '../../utils/audio';
import companyConfigService from '../../api/companyConfigService';
import './ThermalReceiptModal.css';

const DEFAULT_CONFIG = {
    businessName: 'NexPOS - Retail & Punto de Venta',
    nit: 'NIT: 900.785.412-8 • Régimen Común',
    address: 'Av. Roosevelt # 34-50, Cali - Colombia',
    phone: 'Tel: (602) 889-1234 • WhatsApp: 315 000 0000',
    footerMessage: '¡Gracias por su compra!\nConserve este tiquete para garantías y cambios.\nSoftware POS: NexPOS Cloud v2.0',
    autoDrawer: true,
    dianResolutionNumber: '18764000001',
    dianPrefix: 'POS',
    dianRangeFrom: 1000,
    dianRangeTo: 50000,
    dianStartDate: '2024-01-01',
    dianEndDate: '2026-01-01',
    facturacionActiva: true
};

const formatCOP = (val) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(val) || 0);
};

const formatDateTime = (dtStr) => {
    if (!dtStr) return new Date().toLocaleString('es-CO');
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

const ThermalReceiptModal = ({ sale, isOpen, onClose, autoPrint = false }) => {
    const barcodeRef = useRef(null);

    // Configuración guardada en localStorage
    const [paperWidth, setPaperWidth] = useState(() => localStorage.getItem('nexpos_paper_width') || '80mm');
    const [showConfig, setShowConfig] = useState(false);
    const [config, setConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('nexpos_thermal_config');
            return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
        } catch {
            return DEFAULT_CONFIG;
        }
    });

    const [drawerKicked, setDrawerKicked] = useState(false);

    // Cargar configuración fiscal oficial de la empresa desde el backend
    useEffect(() => {
        if (isOpen) {
            companyConfigService.getConfig()
                .then(companyData => {
                    if (companyData) {
                        setConfig(prev => ({
                            ...prev,
                            businessName: companyData.tradeName || companyData.businessName || prev.businessName,
                            nit: `NIT: ${companyData.nit} • ${companyData.taxRegime || 'Régimen Común'}`,
                            address: `${companyData.address || ''}, ${companyData.city || 'Cali'} - ${companyData.department || 'Valle'}`,
                            phone: `Tel: ${companyData.phone || ''}${companyData.email ? ` • ${companyData.email}` : ''}`,
                            dianResolutionNumber: companyData.dianResolutionNumber || prev.dianResolutionNumber,
                            dianPrefix: companyData.dianPrefix || prev.dianPrefix,
                            dianRangeFrom: companyData.dianRangeFrom || prev.dianRangeFrom,
                            dianRangeTo: companyData.dianRangeTo || prev.dianRangeTo,
                            dianStartDate: companyData.dianStartDate ? String(companyData.dianStartDate).split('T')[0] : prev.dianStartDate,
                            dianEndDate: companyData.dianEndDate ? String(companyData.dianEndDate).split('T')[0] : prev.dianEndDate,
                            facturacionActiva: companyData.facturacionActiva ?? prev.facturacionActiva
                        }));
                    }
                })
                .catch(() => {
                    // Fallback a localStorage / DEFAULT_CONFIG
                });
        }
    }, [isOpen]);

    // Guardar cambios de ancho de papel
    const handleSetPaperWidth = (width) => {
        setPaperWidth(width);
        localStorage.setItem('nexpos_paper_width', width);
    };

    // Guardar configuración del comercio
    const handleUpdateConfigField = (field, value) => {
        const updated = { ...config, [field]: value };
        setConfig(updated);
        localStorage.setItem('nexpos_thermal_config', JSON.stringify(updated));
    };

    // Datos calculados del tiquete y factura electrónica
    const invoice = sale?.invoice || null;
    const invoiceNum = invoice?.invoiceNumber || sale?.invoiceNumber || `POS-${String(sale?.id || 1).padStart(6, '0')}`;
    const items = sale?.items || [];
    const totalAmount = Number(sale?.totalAmount) || 0;
    const paidAmount = Number(sale?.amountPaid) || totalAmount;
    const changeAmount = Number(sale?.changeAmount) || 0;
    const qrData = invoice?.qrData;
    const cude = invoice?.cude;

    // Desglose de impuestos (IVA 19%, IVA 5%, Exento 0%)
    const taxBreakdown = useMemo(() => {
        let base19 = 0;
        let iva19 = 0;
        let base5 = 0;
        let iva5 = 0;
        let base0 = 0;

        (sale?.items || []).forEach(it => {
            const rate = it.ivaRate != null ? Number(it.ivaRate) : 0.19;
            const itemTotal = Number(it.subTotal || (it.quantity * it.unitPrice)) || 0;
            const base = it.baseAmount != null ? Number(it.baseAmount) : (rate > 0 ? itemTotal / (1 + rate) : itemTotal);
            const iva = it.ivaAmount != null ? Number(it.ivaAmount) : (itemTotal - base);

            if (rate >= 0.18) {
                base19 += base;
                iva19 += iva;
            } else if (rate > 0.01 && rate <= 0.06) {
                base5 += base;
                iva5 += iva;
            } else {
                base0 += base;
            }
        });

        const totalIva = iva19 + iva5;
        const totalBase = base19 + base5 + base0;

        return {
            base19,
            iva19,
            base5,
            iva5,
            base0,
            totalIva,
            totalBase: totalBase > 0 ? totalBase : (totalAmount - totalIva)
        };
    }, [sale?.items, totalAmount]);

    // Renderizar código de barras del ticket con JsBarcode
    useEffect(() => {
        if (isOpen && sale && barcodeRef.current) {
            try {
                const code = invoiceNum;
                JsBarcode(barcodeRef.current, code, {
                    format: "CODE128",
                    lineColor: "#000000",
                    width: paperWidth === '80mm' ? 1.6 : 1.2,
                    height: paperWidth === '80mm' ? 36 : 28,
                    displayValue: true,
                    fontSize: 9,
                    margin: 4,
                    background: "#ffffff"
                });
            } catch (err) {
                console.error("Error al renderizar código de barras en ticket:", err);
            }
        }
    }, [isOpen, sale, invoiceNum, paperWidth]);

    // Auto-impresión si viene habilitada
    useEffect(() => {
        if (isOpen && autoPrint && sale) {
            const timer = setTimeout(() => {
                handlePrint();
            }, 350);
            return () => clearTimeout(timer);
        }
    }, [isOpen, autoPrint, sale]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen || !sale) return null;

    // Disparador de apertura de gaveta monedero
    const handleKickDrawer = () => {
        setDrawerKicked(true);
        try {
            playBarcodeBeep('success');
        } catch {
            // Audio context feedback not available
        }
        toast.info('⚡ Señal enviada a la gaveta monedero (RJ11/RJ12)');
        setTimeout(() => setDrawerKicked(false), 2000);
    };

    // Impresión térmica directa
    const handlePrint = () => {
        if (config.autoDrawer && sale.paymentMethod === 'EFECTIVO') {
            handleKickDrawer();
        }
        window.print();
    };

    return (
        <div className="thermal-modal-overlay" onClick={onClose}>
            <div className="thermal-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="thermal-modal-header">
                    <h3>
                        <FaPrint className="thermal-header-icon" /> Tiquete POS & Documento Electrónico DIAN
                    </h3>
                    <button className="btn-close-thermal" onClick={onClose} title="Cerrar ventana">
                        <FaTimes />
                    </button>
                </div>

                {/* Toolbar de Controles */}
                <div className="thermal-controls-toolbar">
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

                    <button
                        className="btn-config-toggle"
                        onClick={() => setShowConfig(!showConfig)}
                    >
                        <FaCog /> {showConfig ? 'Ocultar Datos' : 'Personalizar Comercio'}
                    </button>
                </div>

                {/* Body / Preview */}
                <div className="thermal-modal-body">
                    {/* Panel de Configuración de Datos del Negocio */}
                    {showConfig && (
                        <div className="thermal-settings-panel">
                            <div className="settings-grid">
                                <div className="settings-field">
                                    <label>Nombre del Comercio</label>
                                    <input
                                        type="text"
                                        value={config.businessName}
                                        onChange={(e) => handleUpdateConfigField('businessName', e.target.value)}
                                    />
                                </div>
                                <div className="settings-field">
                                    <label>NIT / Régimen</label>
                                    <input
                                        type="text"
                                        value={config.nit}
                                        onChange={(e) => handleUpdateConfigField('nit', e.target.value)}
                                    />
                                </div>
                                <div className="settings-field">
                                    <label>Dirección</label>
                                    <input
                                        type="text"
                                        value={config.address}
                                        onChange={(e) => handleUpdateConfigField('address', e.target.value)}
                                    />
                                </div>
                                <div className="settings-field">
                                    <label>Teléfono / Contacto</label>
                                    <input
                                        type="text"
                                        value={config.phone}
                                        onChange={(e) => handleUpdateConfigField('phone', e.target.value)}
                                    />
                                </div>
                                <div className="settings-field" style={{ gridColumn: 'span 2' }}>
                                    <label>Mensaje de Pie de Tiquete</label>
                                    <textarea
                                        rows="2"
                                        value={config.footerMessage}
                                        onChange={(e) => handleUpdateConfigField('footerMessage', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HOJA DEL TIQUETE TÉRMICO (Elemento Imprimible) */}
                    <div
                        id="thermal-receipt-printable"
                        className={`thermal-paper-sheet width-${paperWidth}`}
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

                        {/* Bloque Autorización DIAN (Resolución 000165 de 2023) */}
                        <div className="ticket-resolution-info">
                            <div>Resolución DIAN No. {config.dianResolutionNumber}</div>
                            <div>Vigencia: {config.dianStartDate} al {config.dianEndDate}</div>
                            <div>Prefijo {config.dianPrefix} del {config.dianRangeFrom} al {config.dianRangeTo}</div>
                            <div className="doc-type-badge">DOCUMENTO EQUIVALENTE ELECTRÓNICO POS</div>
                        </div>

                        <div className="ticket-divider-line"></div>

                        {/* Metadatos de la Venta */}
                        <div className="ticket-meta-info">
                            <div className="t-row bold">
                                <span>No. COMPROBANTE:</span>
                                <span>{invoiceNum}</span>
                            </div>
                            <div className="t-row">
                                <span>Fecha y Hora:</span>
                                <span>{formatDateTime(sale.saleDate)}</span>
                            </div>
                            <div className="t-row">
                                <span>Cajero:</span>
                                <span>{sale.cashierUsername || 'Cajero POS'}</span>
                            </div>
                            <div className="t-row">
                                <span>Adquiriente:</span>
                                <span>{sale.customerName || 'Consumidor Final'}</span>
                            </div>
                            <div className="t-row">
                                <span>Doc / NIT:</span>
                                <span>{sale.customerDoc || '222222222222'}</span>
                            </div>
                        </div>

                        <div className="ticket-double-line"></div>

                        {/* Tabla de Artículos */}
                        <div className="ticket-items-table">
                            <div className="t-row bold" style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>
                                <span>Cant • Descripción</span>
                                <span>Total</span>
                            </div>

                            {items.length === 0 ? (
                                <div className="t-row">
                                    <span>Venta General</span>
                                    <span>{formatCOP(totalAmount)}</span>
                                </div>
                            ) : (
                                items.map((it, idx) => {
                                    const rate = it.ivaRate != null ? Number(it.ivaRate) : 0.19;
                                    const rateLabel = rate === 0 ? '0%' : `${Math.round(rate * 100)}%`;
                                    return (
                                        <div key={idx} className="ticket-item-row">
                                            <div className="item-name-line">
                                                {it.productName} <span style={{ fontSize: '10px', opacity: 0.75 }}>({rateLabel})</span>
                                            </div>
                                            <div className="item-calc-line">
                                                <span>{it.quantity} x {formatCOP(it.unitPrice)}</span>
                                                <strong>{formatCOP(it.subTotal || (it.quantity * it.unitPrice))}</strong>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="ticket-divider-line"></div>

                        {/* Totales y Desglose Tributario DIAN */}
                        <div className="ticket-totals-box">
                            <div className="t-row">
                                <span>Subtotal Gravable:</span>
                                <span>{formatCOP(taxBreakdown.totalBase)}</span>
                            </div>

                            {taxBreakdown.base19 > 0 && (
                                <div className="t-row sub-tax">
                                    <span>• Base 19% (${formatCOP(taxBreakdown.base19)}):</span>
                                    <span>{formatCOP(taxBreakdown.iva19)}</span>
                                </div>
                            )}

                            {taxBreakdown.base5 > 0 && (
                                <div className="t-row sub-tax">
                                    <span>• Base 5% (${formatCOP(taxBreakdown.base5)}):</span>
                                    <span>{formatCOP(taxBreakdown.iva5)}</span>
                                </div>
                            )}

                            {taxBreakdown.base0 > 0 && (
                                <div className="t-row sub-tax">
                                    <span>• Exento / Excluido:</span>
                                    <span>{formatCOP(taxBreakdown.base0)}</span>
                                </div>
                            )}

                            <div className="t-row">
                                <span>Total Impuesto (IVA):</span>
                                <span>{formatCOP(taxBreakdown.totalIva)}</span>
                            </div>

                            <div className="t-row total-hero">
                                <span>TOTAL A PAGAR:</span>
                                <span>{formatCOP(totalAmount)}</span>
                            </div>

                            <div className="t-row">
                                <span>Medio de Pago:</span>
                                <strong>{sale.paymentMethod || 'EFECTIVO'}</strong>
                            </div>

                            {sale.paymentMethod === 'EFECTIVO' && (
                                <>
                                    <div className="t-row">
                                        <span>Recibido:</span>
                                        <span>{formatCOP(paidAmount)}</span>
                                    </div>
                                    <div className="t-row bold">
                                        <span>CAMBIO / VUELTO:</span>
                                        <span>{formatCOP(changeAmount)}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Código QR Oficial DIAN */}
                        {qrData ? (
                            <div className="ticket-qr-container">
                                <QRCodeSVG
                                    value={qrData}
                                    size={paperWidth === '80mm' ? 116 : 92}
                                    level="M"
                                    includeMargin={false}
                                />
                                <div className="ticket-qr-caption">
                                    Consulte su documento electrónico escaneando el código QR en el catálogo DIAN
                                </div>
                            </div>
                        ) : null}

                        {/* CUDE Oficial DIAN */}
                        {cude ? (
                            <div className="ticket-cude-container">
                                <div className="ticket-cude-label">CUDE (Código Único de Documento Electrónico):</div>
                                <div className="ticket-cude-value">{cude}</div>
                            </div>
                        ) : null}

                        {/* Código de Barras del Tiquete */}
                        <div className="ticket-barcode-box">
                            <svg ref={barcodeRef} className="ticket-barcode-svg"></svg>
                        </div>

                        {/* Pie de Tiquete */}
                        <div className="ticket-footer-text">
                            {config.footerMessage}
                        </div>
                    </div>
                </div>

                {/* Footer Modal Actions */}
                <div className="thermal-modal-footer">
                    <div className="drawer-status-pill">
                        <span>Formato: <strong>{paperWidth}</strong></span>
                        {invoice?.factusStatus && (
                            <span style={{ marginLeft: '8px', color: '#059669', fontWeight: 600 }}>
                                • DIAN: {invoice.factusStatus}
                            </span>
                        )}
                    </div>

                    <div className="footer-action-buttons">
                        <button
                            type="button"
                            className="btn-open-drawer"
                            onClick={handleKickDrawer}
                            title="Enviar pulso de apertura al cajón monedero RJ11"
                        >
                            <FaCashRegister /> {drawerKicked ? '¡Gaveta Abierta!' : 'Abrir Gaveta'}
                        </button>

                        <button
                            type="button"
                            className="btn-print-thermal-direct"
                            onClick={handlePrint}
                        >
                            <FaPrint /> Imprimir Tiquete ({paperWidth})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThermalReceiptModal;
