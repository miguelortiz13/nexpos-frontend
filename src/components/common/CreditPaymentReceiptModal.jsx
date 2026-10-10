import { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import {
    FaPrint,
    FaTimes,
    FaFilePdf,
    FaMoneyBillWave,
    FaCheckCircle,
    FaUserCheck
} from 'react-icons/fa';
import companyConfigService from '../../api/companyConfigService';
import customerService from '../../api/customerService';
import './CreditPaymentReceiptModal.css';

const DEFAULT_CONFIG = {
    businessName: 'NexPOS - Retail & Punto de Venta',
    nit: 'NIT: 900.785.412-8 • Régimen Común',
    address: 'Av. Roosevelt # 34-50, Cali - Colombia',
    phone: 'Tel: (602) 889-1234'
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

const CreditPaymentReceiptModal = ({ movement, customer, isOpen, onClose }) => {
    const barcodeRef = useRef(null);
    const [paperWidth, setPaperWidth] = useState(() => localStorage.getItem('nexpos_paper_width') || '80mm');
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [downloading, setDownloading] = useState(false);

    const client = movement?.customer || customer;
    const receiptNumber = movement?.receiptNumber || `RC-${movement?.id || '001'}`;

    useEffect(() => {
        if (isOpen) {
            companyConfigService.getConfig()
                .then(res => {
                    if (res) {
                        setConfig({
                            businessName: res.tradeName || res.businessName || DEFAULT_CONFIG.businessName,
                            nit: `NIT: ${res.nit} • ${res.taxRegime || 'Régimen Común'}`,
                            address: `${res.address || ''}, ${res.city || 'Cali'} - ${res.department || 'Valle'}`,
                            phone: `Tel: ${res.phone || ''}${res.email ? ` • ${res.email}` : ''}`
                        });
                    }
                })
                .catch(() => {});
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && barcodeRef.current && receiptNumber) {
            try {
                JsBarcode(barcodeRef.current, receiptNumber, {
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
                console.error("Error al renderizar barcode de Recibo de Caja:", err);
            }
        }
    }, [isOpen, receiptNumber, paperWidth]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!movement?.id) return;
        setDownloading(true);
        try {
            await customerService.downloadReceiptPdf(movement.id, movement.receiptNumber);
        } catch (err) {
            console.error('Error al descargar PDF:', err);
            alert('Error al descargar comprobante PDF de recibo de caja.');
        } finally {
            setDownloading(false);
        }
    };

    const handleWidthChange = (width) => {
        setPaperWidth(width);
        localStorage.setItem('nexpos_paper_width', width);
    };

    if (!isOpen || !movement) return null;

    const qrData = `RECIBO_CAJA:${receiptNumber}|CLIENTE:${client?.docNumber || ''}|VALOR:${movement.amount}|FECHA:${movement.createdAt || ''}`;

    return (
        <div className="credit-receipt-modal-backdrop" onClick={onClose}>
            <div className="credit-receipt-modal-wrapper" onClick={e => e.stopPropagation()}>
                {/* Header Controls */}
                <div className="credit-receipt-controls no-print">
                    <div className="credit-receipt-title-box">
                        <div className="credit-receipt-icon-badge">
                            <FaMoneyBillWave />
                        </div>
                        <div>
                            <h4>Recibo de Caja / Comprobante de Abono</h4>
                            <span className="credit-receipt-id-tag">{receiptNumber}</span>
                        </div>
                    </div>

                    <div className="credit-receipt-btn-group">
                        <div className="paper-width-switch">
                            <button
                                type="button"
                                className={`btn-width-choice ${paperWidth === '80mm' ? 'active' : ''}`}
                                onClick={() => handleWidthChange('80mm')}
                                title="Ancho estándar punto de venta 80mm"
                            >
                                80mm
                            </button>
                            <button
                                type="button"
                                className={`btn-width-choice ${paperWidth === '58mm' ? 'active' : ''}`}
                                onClick={() => handleWidthChange('58mm')}
                                title="Ancho compacto 58mm"
                            >
                                58mm
                            </button>
                        </div>

                        <button
                            className="btn-print-action primary"
                            onClick={handlePrint}
                            title="Imprimir en impresora térmica USB/Red"
                        >
                            <FaPrint /> Imprimir Tiquete
                        </button>

                        <button
                            className="btn-download-pdf-action"
                            onClick={handleDownloadPdf}
                            disabled={downloading}
                            title="Descargar Comprobante Oficial PDF"
                        >
                            <FaFilePdf /> {downloading ? 'Descargando...' : 'Descargar PDF'}
                        </button>

                        <button className="btn-close-receipt-modal" onClick={onClose} title="Cerrar ventana">
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Printable Ticket ESC/POS View */}
                <div className="credit-receipt-scroll-area">
                    <div className={`thermal-paper-slip width-${paperWidth}`} id="printable-credit-payment-receipt">
                        {/* Company Header */}
                        <div className="slip-center-block">
                            <h2 className="slip-store-name">{config.businessName}</h2>
                            <p className="slip-small-meta">{config.nit}</p>
                            <p className="slip-small-meta">{config.address}</p>
                            <p className="slip-small-meta">{config.phone}</p>
                        </div>

                        <div className="slip-dotted-separator"></div>

                        {/* Title of Document */}
                        <div className="slip-center-block">
                            <h3 className="slip-doc-heading receipt-heading">RECIBO DE CAJA</h3>
                            <div className="slip-doc-number receipt-num">{receiptNumber}</div>
                            <span className="slip-receipt-type-pill">SOPORTE OFICIAL DE RECAUDO</span>
                        </div>

                        <div className="slip-dotted-separator"></div>

                        {/* Metadata Rows */}
                        <div className="slip-meta-grid">
                            <div className="meta-pair">
                                <span className="meta-k">Fecha/Hora:</span>
                                <span className="meta-v">{formatDateTime(movement.createdAt)}</span>
                            </div>
                            <div className="meta-pair">
                                <span className="meta-k">Medio Pago:</span>
                                <span className="meta-v"><strong>{movement.paymentMethod || 'EFECTIVO'}</strong></span>
                            </div>
                            <div className="meta-pair">
                                <span className="meta-k">Recibido por:</span>
                                <span className="meta-v">{movement.registeredBy || 'cajero_pos'}</span>
                            </div>
                        </div>

                        <div className="slip-dotted-separator"></div>

                        {/* Customer Information */}
                        <div className="slip-customer-block">
                            <div className="meta-pair">
                                <span className="meta-k">Cliente:</span>
                                <span className="meta-v highlight"><strong>{client?.name || 'Cliente'}</strong></span>
                            </div>
                            <div className="meta-pair">
                                <span className="meta-k">Documento:</span>
                                <span className="meta-v">{client?.docType || 'CC'} {client?.docNumber || 'N/A'}</span>
                            </div>
                            {client?.phone && (
                                <div className="meta-pair">
                                    <span className="meta-k">Teléfono:</span>
                                    <span className="meta-v">{client.phone}</span>
                                </div>
                            )}
                        </div>

                        <div className="slip-dotted-separator"></div>

                        {/* Financial Ledger Breakdown */}
                        <div className="slip-financial-summary-card">
                            <div className="slip-sum-line">
                                <span>Saldo Deuda Anterior:</span>
                                <span>{formatCOP(movement.previousBalance)}</span>
                            </div>

                            <div className="slip-sum-line payment-line">
                                <span>VALOR ABONADO:</span>
                                <span className="payment-bold green-text">{formatCOP(movement.amount)}</span>
                            </div>

                            <div className="slip-sum-line balance-line">
                                <span>Nuevo Saldo Pendiente:</span>
                                <span className="balance-bold">{formatCOP(movement.newBalance)}</span>
                            </div>

                            {client?.creditLimit && (
                                <div className="slip-sum-line sub">
                                    <span>Cupo Disponible Restante:</span>
                                    <span>{formatCOP(Math.max(0, Number(client.creditLimit) - Number(movement.newBalance)))}</span>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {movement.notes && (
                            <div className="slip-notes-block">
                                <span className="slip-notes-lbl">Concepto / Notas:</span>
                                <p className="slip-notes-txt">{movement.notes}</p>
                            </div>
                        )}

                        <div className="slip-dotted-separator"></div>

                        {/* Barcode & QR Block */}
                        <div className="slip-center-block barcode-zone">
                            <svg ref={barcodeRef} className="thermal-barcode-svg"></svg>
                            <div className="qr-container-box">
                                <QRCodeSVG value={qrData} size={paperWidth === '80mm' ? 84 : 70} level="M" />
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="slip-signatures-grid">
                            <div className="sig-line-col">
                                <div className="sig-dash"></div>
                                <span>Firma del Cliente</span>
                            </div>
                            <div className="sig-line-col">
                                <div className="sig-dash"></div>
                                <span>Cajero Receptor</span>
                            </div>
                        </div>

                        <div className="slip-dotted-separator"></div>

                        {/* Footer message */}
                        <div className="slip-center-block slip-footer-text">
                            <p>¡Gracias por su oportuno pago!</p>
                            <p>Conserve este tiquete como constancia válida de su abono.</p>
                            <p className="system-tag">NexPOS • Sistema Retail y Punto de Venta</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditPaymentReceiptModal;
