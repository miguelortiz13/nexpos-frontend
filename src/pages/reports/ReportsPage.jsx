import { useState, useEffect, useMemo } from 'react';
import {
    FaFilePdf,
    FaSearch,
    FaCalendarAlt,
    FaChartLine,
    FaFileInvoiceDollar,
    FaMoneyBillWave,
    FaReceipt,
    FaTimes,
    FaCreditCard,
    FaMobileAlt,
    FaFileCsv,
    FaChartPie,
    FaChartBar,
    FaPrint,
    FaCheckCircle,
    FaExternalLinkAlt
} from 'react-icons/fa';
import ThermalReceiptModal from '../../components/common/ThermalReceiptModal';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid
} from 'recharts';
import api from '../../api/client';
import './ReportsPage.css';

const formatCOP = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
};

const PAYMENT_COLORS = {
    EFECTIVO: '#10b981',      // Esmeralda
    TARJETA: '#3b82f6',       // Azul
    TRANSFERENCIA: '#8b5cf6'  // Púrpura
};

const ReportsPage = () => {
    const [sales, setSales] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [timeRange, setTimeRange] = useState('ALL'); // 'TODAY', 'WEEK', 'MONTH', 'ALL'
    const [loading, setLoading] = useState(false);
    const [selectedSaleForTicket, setSelectedSaleForTicket] = useState(null);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/sales');
            const data = res.data;
            data.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
            setSales(data);
        } catch (error) {
            console.error('Error al cargar ventas:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter sales based on search term, date, and preset time range
    const filteredSales = useMemo(() => {
        const now = new Date();

        return sales.filter(sale => {
            const saleDate = new Date(sale.saleDate);

            // Preset Time Range filter
            if (timeRange === 'TODAY') {
                const isSameDay = saleDate.toDateString() === now.toDateString();
                if (!isSameDay) return false;
            } else if (timeRange === 'WEEK') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(now.getDate() - 7);
                if (saleDate < oneWeekAgo) return false;
            } else if (timeRange === 'MONTH') {
                const oneMonthAgo = new Date();
                oneMonthAgo.setDate(now.getDate() - 30);
                if (saleDate < oneMonthAgo) return false;
            }

            // Date picker filter
            const matchesDate = !dateFilter || (sale.saleDate && sale.saleDate.startsWith(dateFilter));
            if (!matchesDate) return false;

            // Search text filter
            const matchesSearch = !searchTerm ||
                sale.id.toString().includes(searchTerm) ||
                (sale.invoice?.invoiceNumber && sale.invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (sale.customerDoc && sale.customerDoc.includes(searchTerm)) ||
                (sale.invoice?.cude && sale.invoice.cude.toLowerCase().includes(searchTerm.toLowerCase()));

            return matchesSearch;
        });
    }, [sales, searchTerm, dateFilter, timeRange]);

    // Financial KPI Metrics
    const totalRevenue = useMemo(() => {
        return filteredSales.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);
    }, [filteredSales]);

    const totalTickets = filteredSales.length;

    const averageTicket = useMemo(() => {
        return totalTickets > 0 ? totalRevenue / totalTickets : 0;
    }, [totalRevenue, totalTickets]);

    // Analytics: Sales Trend by Date for AreaChart
    const salesTrendData = useMemo(() => {
        const map = {};
        // Process in chronological order
        [...filteredSales].reverse().forEach(sale => {
            const d = new Date(sale.saleDate);
            const key = d.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
            if (!map[key]) {
                map[key] = { fecha: key, total: 0, transacciones: 0 };
            }
            map[key].total += Number(sale.totalAmount || 0);
            map[key].transacciones += 1;
        });
        return Object.values(map);
    }, [filteredSales]);

    // Analytics: Payment Distribution for Donut PieChart
    const paymentDistributionData = useMemo(() => {
        const counts = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0 };
        filteredSales.forEach(s => {
            const method = s.paymentMethod || 'EFECTIVO';
            counts[method] = (counts[method] || 0) + Number(s.totalAmount || 0);
        });
        return Object.keys(counts)
            .filter(key => counts[key] > 0)
            .map(key => ({
                name: key === 'EFECTIVO' ? 'Efectivo' : key === 'TARJETA' ? 'Tarjeta' : 'Transferencia',
                rawKey: key,
                value: counts[key]
            }));
    }, [filteredSales]);

    // Analytics: Top Selling Products
    const topProductsData = useMemo(() => {
        const productMap = {};
        filteredSales.forEach(sale => {
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    const name = item.productName || 'Producto General';
                    if (!productMap[name]) {
                        productMap[name] = { name, cantidad: 0, recaudacion: 0 };
                    }
                    productMap[name].cantidad += Number(item.quantity || 1);
                    productMap[name].recaudacion += Number(item.subTotal || item.subtotal || (item.unitPrice * item.quantity) || 0);
                });
            }
        });
        return Object.values(productMap)
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 5);
    }, [filteredSales]);

    // Export Table to CSV
    const exportToCSV = () => {
        if (filteredSales.length === 0) {
            alert('No hay datos de ventas para exportar');
            return;
        }

        const headers = ['ID Venta', 'Factura DIAN', 'Estado DIAN', 'Fecha', 'Cliente', 'Documento', 'Medio de Pago', 'Total Facturado (COP)', 'CUDE'];
        const rows = filteredSales.map(s => [
            s.id,
            `"${s.invoice?.invoiceNumber || 'N/A'}"`,
            `"${s.invoice?.factusStatus || 'LOCAL_POS'}"`,
            `"${new Date(s.saleDate).toLocaleString('es-CO')}"`,
            `"${s.customerName || 'Cliente General'}"`,
            `"${s.customerDoc || 'N/A'}"`,
            s.paymentMethod || 'EFECTIVO',
            s.totalAmount,
            `"${s.invoice?.cude || ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' +
            [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `reporte_ventas_nexpos_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const downloadInvoice = async (saleId) => {
        try {
            const response = await api.get(`/api/sales/${saleId}/invoice`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `factura_nexpos_${saleId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al descargar factura:', error);
            alert('No se pudo descargar la factura');
        }
    };

    const renderPaymentBadge = (method) => {
        switch (method) {
            case 'TARJETA':
                return (
                    <span className="pay-badge card">
                        <FaCreditCard /> Tarjeta
                    </span>
                );
            case 'TRANSFERENCIA':
                return (
                    <span className="pay-badge transfer">
                        <FaMobileAlt /> Transferencia
                    </span>
                );
            default:
                return (
                    <span className="pay-badge cash">
                        <FaMoneyBillWave /> Efectivo
                    </span>
                );
        }
    };

    const renderDianBadge = (invoice) => {
        if (!invoice) {
            return <span className="dian-badge offline" title="Emisión interna local">Local POS</span>;
        }
        const status = invoice.factusStatus;
        if (status === 'VALIDATED') {
            return (
                <span className="dian-badge validated" title={invoice.cude ? `CUDE: ${invoice.cude}` : 'Validada ante DIAN'}>
                    <FaCheckCircle /> DIAN Válida
                </span>
            );
        } else if (status === 'REJECTED') {
            return (
                <span className="dian-badge rejected" title={invoice.dianResponseMessage || 'Rechazada por DIAN'}>
                    <FaTimes /> DIAN Rechazada
                </span>
            );
        } else if (status === 'PENDING') {
            return (
                <span className="dian-badge pending" title="En cola de transmisión DIAN">
                    En Trámite
                </span>
            );
        }
        return <span className="dian-badge offline">Local POS</span>;
    };

    return (
        <div className="reports-dashboard-container">
            {/* Header & Quick Action Buttons */}
            <div className="reports-top-bar">
                <div>
                    <h2><FaChartLine /> Panel de Analítica & Facturación</h2>
                    <p className="reports-subtitle">Métricas financieras, rendimiento de ventas y control de comprobantes</p>
                </div>
                <div className="reports-actions">
                    <button className="btn-export-csv" onClick={exportToCSV} title="Descargar reporte en formato Excel/CSV">
                        <FaFileCsv /> Exportar CSV
                    </button>
                </div>
            </div>

            {/* Quick Time Range Preset Filters */}
            <div className="reports-range-selector">
                <button
                    className={`range-tab ${timeRange === 'TODAY' ? 'active' : ''}`}
                    onClick={() => setTimeRange('TODAY')}
                >
                    Hoy
                </button>
                <button
                    className={`range-tab ${timeRange === 'WEEK' ? 'active' : ''}`}
                    onClick={() => setTimeRange('WEEK')}
                >
                    Últimos 7 días
                </button>
                <button
                    className={`range-tab ${timeRange === 'MONTH' ? 'active' : ''}`}
                    onClick={() => setTimeRange('MONTH')}
                >
                    Últimos 30 días
                </button>
                <button
                    className={`range-tab ${timeRange === 'ALL' ? 'active' : ''}`}
                    onClick={() => setTimeRange('ALL')}
                >
                    Historial Completo
                </button>
            </div>

            {/* Financial Summary Cards */}
            <div className="reports-kpi-grid">
                <div className="reports-stat-card">
                    <div className="stat-icon-wrapper revenue">
                        <FaMoneyBillWave />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Ingresos Totales</span>
                        <span className="stat-number revenue-value">{formatCOP(totalRevenue)}</span>
                    </div>
                </div>

                <div className="reports-stat-card">
                    <div className="stat-icon-wrapper invoices">
                        <FaFileInvoiceDollar />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Facturas Emitidas</span>
                        <span className="stat-number">{totalTickets}</span>
                    </div>
                </div>

                <div className="reports-stat-card">
                    <div className="stat-icon-wrapper ticket">
                        <FaReceipt />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Ticket Promedio</span>
                        <span className="stat-number">{formatCOP(averageTicket)}</span>
                    </div>
                </div>
            </div>

            {/* Interactive Charts Grid */}
            <div className="reports-charts-grid">
                {/* 1. Revenue Evolution AreaChart */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h3><FaChartLine /> Tendencia de Ventas (COP)</h3>
                        <span className="chart-tag">Evolución Cronológica</span>
                    </div>
                    <div className="chart-container">
                        {salesTrendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={salesTrendData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="fecha" stroke="#64748b" tick={{ fontSize: 12 }} />
                                    <YAxis
                                        stroke="#64748b"
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={val => `$${(val / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        formatter={(val) => [formatCOP(val), 'Recaudación']}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#059669"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">No hay datos suficientes para graficar el periodo.</div>
                        )}
                    </div>
                </div>

                {/* 2. Payment Method Distribution PieChart */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h3><FaChartPie /> Medios de Pago</h3>
                        <span className="chart-tag">Participación %</span>
                    </div>
                    <div className="chart-container">
                        {paymentDistributionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={paymentDistributionData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={4}
                                    >
                                        {paymentDistributionData.map(entry => (
                                            <Cell
                                                key={`cell-${entry.rawKey}`}
                                                fill={PAYMENT_COLORS[entry.rawKey] || '#64748b'}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val) => [formatCOP(val), 'Total']}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                    <Legend iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">Sin datos de métodos de pago.</div>
                        )}
                    </div>
                </div>

                {/* 3. Top Products BarChart */}
                {topProductsData.length > 0 && (
                    <div className="chart-card chart-full-width">
                        <div className="chart-card-header">
                            <h3><FaChartBar /> Productos Más Vendidos</h3>
                            <span className="chart-tag">Top 5 por Unidades</span>
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={topProductsData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#64748b"
                                        tick={{ fontSize: 11 }}
                                        interval={0}
                                        angle={-15}
                                        textAnchor="end"
                                    />
                                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        formatter={(val, name) => [
                                            name === 'cantidad' ? `${val} unidades` : formatCOP(val),
                                            name === 'cantidad' ? 'Cantidad Vendida' : 'Recaudación'
                                        ]}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                    <Bar dataKey="cantidad" fill="#059669" radius={[6, 6, 0, 0]} barSize={36} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            <div className="reports-filter-bar">
                <div className="reports-search-box">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar por No. Factura, nombre de cliente o C.C...."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="clear-search" onClick={() => setSearchTerm('')}>
                            <FaTimes />
                        </button>
                    )}
                </div>

                <div className="reports-date-box">
                    <FaCalendarAlt className="calendar-icon" />
                    <input
                        type="date"
                        className="date-input"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                    />
                    {dateFilter && (
                        <button className="clear-date" onClick={() => setDateFilter('')} title="Limpiar fecha">
                            <FaTimes />
                        </button>
                    )}
                </div>
            </div>

            {/* Sales Table Card */}
            <div className="reports-table-card">
                <div className="table-header-title">
                    <h3>Detalle de Facturas Registradas</h3>
                    <span className="results-count">{filteredSales.length} transacciones</span>
                </div>
                <div className="table-responsive">
                    {loading ? (
                        <div className="reports-loading">
                            <div className="loading-spinner"></div>
                            <p>Cargando transacciones...</p>
                        </div>
                    ) : (
                        <table className="reports-table">
                            <thead>
                                <tr>
                                    <th>No. Factura</th>
                                    <th>Fecha y Hora</th>
                                    <th>Cliente</th>
                                    <th>Documento</th>
                                    <th>Estado DIAN</th>
                                    <th>Medio de Pago</th>
                                    <th className="text-right">Total Facturado</th>
                                    <th className="text-center">Comprobante</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.map(sale => (
                                    <tr key={sale.id}>
                                        <td className="sale-id-cell">
                                            <strong>#{sale.id}</strong>
                                            {sale.invoice?.invoiceNumber && (
                                                <span className="invoice-number-sub">{sale.invoice.invoiceNumber}</span>
                                            )}
                                        </td>
                                        <td className="date-cell">
                                            {new Date(sale.saleDate).toLocaleString('es-CO', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="customer-name-cell">
                                            {sale.customerName || `Cliente #${sale.customerId || '1'}`}
                                        </td>
                                        <td className="customer-doc-cell">
                                            {sale.customerDoc || '222222222222'}
                                        </td>
                                        <td>
                                            {renderDianBadge(sale.invoice)}
                                        </td>
                                        <td>
                                            {renderPaymentBadge(sale.paymentMethod)}
                                        </td>
                                        <td className="text-right amount-cell">
                                            {formatCOP(sale.totalAmount)}
                                        </td>
                                        <td className="text-center">
                                            <div className="reports-actions-flex">
                                                {sale.invoice?.qrData && (
                                                    <a
                                                        href={sale.invoice.qrData}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn-verify-dian"
                                                        title="Verificar comprobante en catálogo oficial DIAN"
                                                    >
                                                        <FaExternalLinkAlt /> DIAN
                                                    </a>
                                                )}
                                                <button
                                                    className="btn-print-thermal-table"
                                                    onClick={() => setSelectedSaleForTicket(sale)}
                                                    title="Imprimir Tiquete Térmico POS (58mm/80mm)"
                                                >
                                                    <FaPrint /> Tiquete
                                                </button>
                                                <button
                                                    className="btn-download-invoice"
                                                    onClick={() => downloadInvoice(sale.id)}
                                                    title="Descargar Factura Oficial PDF"
                                                >
                                                    <FaFilePdf /> Factura
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSales.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="8" className="empty-reports-cell">
                                            <FaReceipt size={36} />
                                            <p>No se encontraron registros de ventas con los filtros especificados.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal de Tiquete Térmico POS (58mm / 80mm) */}
            <ThermalReceiptModal
                sale={selectedSaleForTicket}
                isOpen={!!selectedSaleForTicket}
                onClose={() => setSelectedSaleForTicket(null)}
            />
        </div>
    );
};

export default ReportsPage;
