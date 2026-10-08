import { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import {
    FaPrint,
    FaTimes,
    FaFilePdf,
    FaExternalLinkAlt,
    FaUndoAlt,
    FaCheckCircle,
    FaBan
} from 'react-icons/fa';
import companyConfigService from '../../api/companyConfigService';
import api from '../../api/client';
import './CreditNoteReceiptModal.css';

const DEFAULT_CONFIG = {
    businessName: 'NexPOS - Retail & Punto de Venta',
    nit: 'NIT: 900.785.412-8 • Régimen Común',
    address: 'Av. Roosevelt # 34-50, Cali - Colombia',
    phone: 'Tel: (602) 889-1234 • WhatsApp: 315 000 0000',
    dianResolutionNumber: '18764000001'
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

const CreditNoteReceiptModal = ({ creditNote, sale, isOpen, onClose }) => {
    const barcodeRef = useRef(null);
    const [paperWidth, setPaperWidth] = useState(() => localStorage.getItem('nexpos_paper_width') || '80mm');
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [downloading, setDownloading] = useState(false);

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
                            dianResolutionNumber: res.dianResolutionNumber || DEFAULT_CONFIG.dianResolutionNumber
                        });
                    }
                })
                .catch(() => {});
        }
    }, [isOpen]);

    const ncNumber = creditNote?.creditNoteNumber || 'NC-001';

    useEffect(() => {
        if (isOpen && barcodeRef.current && ncNumber) {
            try {
                JsBarcode(barcodeRef.current, ncNumber, {
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
                console.error("Error al renderizar barcode de Nota Crédito:", err);
            }
        }
    }, [isOpen, ncNumber, paperWidth]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!sale?.id) return;
        setDownloading(true);
        try {
            const response = await api.get(`/api/sales/${sale.id}/credit-note/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `nota_credito_${ncNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error al descargar PDF de Nota Crédito:', err);
            alert('No se pudo descargar el PDF de la Nota Crédito');
        } finally {
            setDownloading(false);
        }
    };

    if (!isOpen || !creditNote) return null;

    const qrUrl = creditNote.qrData || (creditNote.cude ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${creditNote.cude}` : null);
    const invoiceNum = creditNote.invoiceNumber || (sale?.invoice?.invoiceNumber) || `POS-${sale?.id}`;

    return (
        <div className="credit-receipt-modal-overlay">
            <div className="credit-receipt-modal-wrapper">
                {/* Modal Action Bar (Hidden on print) */}
                <div className="credit-receipt-modal-topbar no-print">
                    <div className="topbar-info">
                        <FaBan className="nc-badge-icon" />
                        <div>
                            <h3>Nota Crédito DIAN: {ncNumber}</h3>
                            <span className="topbar-sub">Comprobante Oficial de Anulación & Devolución</span>
                        </div>
                    </div>
                    <div className="topbar-controls">
                        {/* Paper width selector */}
                        <div className="paper-width-switch">
                            <button
                                className={`btn-paper-switch ${paperWidth === '80mm' ? 'active' : ''}`}
                                onClick={() => {
                                    setPaperWidth('80mm');
                                    localStorage.setItem('nexpos_paper_width', '80mm');
                                }}
                            >
                                80mm
                            </button>
                            <button
                                className={`btn-paper-switch ${paperWidth === '58mm' ? 'active' : ''}`}
                                onClick={() => {
                                    setPaperWidth('58mm');
                                    localStorage.setItem('nexpos_paper_width', '58mm');
                                }}
                            >
                                58mm
                            </button>
                        </div>

                        {/* PDF Download */}
                        <button
                            className="btn-action-pdf"
                            onClick={handleDownloadPdf}
                            disabled={downloading}
                            title="Descargar PDF Oficial DIAN"
                        >
                            <FaFilePdf />
                            <span>{downloading ? 'Descargando...' : 'PDF Oficial'}</span>
                        </button>

                        {/* Print */}
                        <button className="btn-action-print" onClick={handlePrint}>
                            <FaPrint />
                            <span>Imprimir Tiquete</span>
                        </button>

                        {/* Close */}
                        <button className="btn-action-close" onClick={onClose} title="Cerrar vista previa">
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Printable Thermal Receipt Area */}
                <div className="credit-receipt-scroll-container">
                    <div className={`thermal-credit-sheet paper-${paperWidth}`} id="thermal-credit-print-target">
                        {/* Commerce Header */}
                        <div className="thermal-center-header">
                            <div className="commerce-name">{config.businessName}</div>
                            <div className="commerce-nit">{config.nit}</div>
                            <div className="commerce-address">{config.address}</div>
                            <div className="commerce-phone">{config.phone}</div>
                        </div>

                        <div className="receipt-separator-dashed"></div>

                        {/* Document Type Header */}
                        <div className="thermal-center-header">
                            <div className="nc-title">NOTA CRÉDITO ELECTRÓNICA</div>
                            <div className="nc-number-bold">{ncNumber}</div>
                            <div className="receipt-dian-notice">
                                Documento Equivalente Electrónico POS
                            </div>
                            <div className="receipt-dian-res">
                                Res. DIAN {config.dianResolutionNumber}
                            </div>
                        </div>

                        <div className="receipt-separator-dashed"></div>

                        {/* Details Grid */}
                        <div className="receipt-meta-grid">
                            <div className="meta-line">
                                <span className="meta-label">Factura Afectada:</span>
                                <span className="meta-val font-bold">{invoiceNum}</span>
                            </div>
                            <div className="meta-line">
                                <span className="meta-label">Fecha Emisión NC:</span>
                                <span className="meta-val">{formatDateTime(creditNote.createdAt)}</span>
                            </div>
                            <div className="meta-line">
                                <span className="meta-label">Cajero Emisor:</span>
                                <span className="meta-val">{creditNote.createdBy || 'Cajero POS'}</span>
                            </div>
                            <div className="meta-line">
                                <span className="meta-label">Cliente:</span>
                                <span className="meta-val">{sale?.customerName || 'Consumidor Final'}</span>
                            </div>
                            <div className="meta-line">
                                <span className="meta-label">C.C. / NIT:</span>
                                <span className="meta-val">{sale?.customerDoc || '222222222222'}</span>
                            </div>
                            <div className="meta-line">
                                <span className="meta-label">Concepto DIAN:</span>
                                <span className="meta-val">[{creditNote.conceptCode || '2'}] {creditNote.conceptDescription || 'Anulación de factura'}</span>
                            </div>
                            <div className="meta-line reason-line">
                                <span className="meta-label">Motivo:</span>
                                <span className="meta-val reason-val">{creditNote.reason}</span>
                            </div>
                        </div>

                        <div className="receipt-separator-dashed"></div>

                        {/* Items Section */}
                        <div className="receipt-section-title">ÍTEMS REINGRESADOS A KARDEX</div>
                        <table className="receipt-items-table">
                            <thead>
                                <tr>
                                    <th className="th-desc">DESCRIPCIÓN</th>
                                    <th className="th-cant">CANT</th>
                                    <th className="th-total">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale?.items?.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="td-desc">
                                            <div className="item-name-line">{item.productName}</div>
                                            <div className="item-unit-sub">{formatCOP(item.unitPrice)} c/u</div>
                                        </td>
                                        <td className="td-cant">+{item.quantity}</td>
                                        <td className="td-total">{formatCOP(item.subTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="receipt-separator-dashed"></div>

                        {/* Financial Totals */}
                        <div className="receipt-totals-block">
                            <div className="totals-row total-big">
                                <span>TOTAL ANULADO:</span>
                                <span>{formatCOP(creditNote.totalAmount)}</span>
                            </div>
                            {Number(creditNote.refundCash) > 0 && (
                                <div className="totals-row">
                                    <span>Reembolso Efectivo (Caja):</span>
                                    <span>{formatCOP(creditNote.refundCash)}</span>
                                </div>
                            )}
                            {Number(creditNote.refundOther) > 0 && (
                                <div className="totals-row">
                                    <span>Reembolso Otros Canales:</span>
                                    <span>{formatCOP(creditNote.refundOther)}</span>
                                </div>
                            )}
                        </div>

                        <div className="receipt-separator-dashed"></div>

                        {/* DIAN Certification Block */}
                        <div className="dian-compliance-box">
                            <div className="dian-status-tag">
                                <FaCheckCircle className="dian-ok-icon" />
                                <span>ESTADO DIAN: {creditNote.factusStatus || 'VALIDATED'}</span>
                            </div>

                            {creditNote.cude && (
                                <div className="cude-box">
                                    <span className="cude-title">CUDE NOTA CRÉDITO:</span>
                                    <span className="cude-string">{creditNote.cude}</span>
                                </div>
                            )}

                            {creditNote.originalCude && (
                                <div className="cude-box">
                                    <span className="cude-title">CUDE FACTURA ORIGINAL:</span>
                                    <span className="cude-string">{creditNote.originalCude}</span>
                                </div>
                            )}

                            {/* QR Code */}
                            {qrUrl && (
                                <div className="receipt-qr-center">
                                    <QRCodeSVG
                                        value={qrUrl}
                                        size={paperWidth === '80mm' ? 105 : 90}
                                        level="M"
                                    />
                                    <div className="qr-scan-hint">
                                        Escanee para verificar comprobante oficial ante catálogo de la DIAN
                                    </div>
                                    <a
                                        href={qrUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-verify-dian-link no-print"
                                    >
                                        <FaExternalLinkAlt /> Verificar en Catálogo DIAN
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="receipt-separator-dashed"></div>

                        {/* Barcode */}
                        <div className="receipt-barcode-box">
                            <svg ref={barcodeRef}></svg>
                        </div>

                        {/* Signatures */}
                        <div className="receipt-signatures-grid">
                            <div className="signature-col">
                                <div className="sig-line"></div>
                                <span>Firma del Cajero</span>
                            </div>
                            <div className="signature-col">
                                <div className="sig-line"></div>
                                <span>Firma del Cliente</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="receipt-footer-text">
                            *** COMPROBANTE OFICIAL DE ANULACIÓN ***<br />
                            NexPOS Retail Software v2.0
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditNoteReceiptModal;
