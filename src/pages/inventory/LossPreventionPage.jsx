import { useState, useEffect } from 'react';
import {
  FaBoxes,
  FaCalendarTimes,
  FaClipboardCheck,
  FaTrashAlt,
  FaPlus,
  FaSearch,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaFileInvoiceDollar,
  FaBarcode,
  FaHourglassHalf
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import wasteAuditService from '../../api/wasteAuditService';
import productService from '../../api/productService';
import './LossPreventionPage.css';

const WASTE_TYPES = [
  { value: 'VENCIMIENTO', label: 'Vencimiento / Caducidad' },
  { value: 'DANO_ROTURA', label: 'Daño Físico / Rotura' },
  { value: 'ROBO_HURTO', label: 'Robo Hormiga / Descuadre' },
  { value: 'DESCOMPOSICION', label: 'Descomposición (Perecederos)' },
  { value: 'CONSUMO_INTERNO', label: 'Consumo Interno Autorizado' },
  { value: 'OTRO', label: 'Otro' }
];

export default function LossPreventionPage() {
  const [activeTab, setActiveTab] = useState('wastes'); // 'wastes' | 'batches' | 'audits'
  const [loading, setLoading] = useState(false);

  // Data
  const [wastes, setWastes] = useState([]);
  const [wasteSummary, setWasteSummary] = useState(null);
  const [batches, setBatches] = useState([]);
  const [auditSessions, setAuditSessions] = useState([]);
  const [activeAudit, setActiveAudit] = useState(null);
  const [products, setProducts] = useState([]);

  // Modals
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Form states
  const [wasteForm, setWasteForm] = useState({
    productId: '',
    quantity: 1,
    wasteType: 'VENCIMIENTO',
    reason: ''
  });

  const [batchForm, setBatchForm] = useState({
    productId: '',
    batchNumber: '',
    expirationDate: '',
    initialQuantity: 10
  });

  // Active Audit Item Input
  const [auditItemInput, setAuditItemInput] = useState({
    productId: '',
    physicalStock: 0,
    notes: ''
  });

  // Selected product metadata for waste calculation
  const selectedWasteProduct = products.find(p => p.id === Number(wasteForm.productId));

  useEffect(() => {
    loadProducts();
    if (activeTab === 'wastes') {
      loadWastes();
    } else if (activeTab === 'batches') {
      loadBatches();
    } else if (activeTab === 'audits') {
      loadAudits();
    }
  }, [activeTab]);

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  const loadWastes = async () => {
    setLoading(true);
    try {
      const [list, summary] = await Promise.all([
        wasteAuditService.getWastes(),
        wasteAuditService.getWasteSummary()
      ]);
      setWastes(list);
      setWasteSummary(summary);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cargar historial de mermas');
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    setLoading(true);
    try {
      const list = await wasteAuditService.getExpiringBatches(60);
      setBatches(list);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cargar lotes y caducidades');
    } finally {
      setLoading(false);
    }
  };

  const loadAudits = async () => {
    setLoading(true);
    try {
      const list = await wasteAuditService.listAuditSessions();
      setAuditSessions(list);
      const ongoing = list.find(s => s.status === 'EN_CONTEO');
      if (ongoing) {
        const fullSession = await wasteAuditService.getAuditSession(ongoing.id);
        setActiveAudit(fullSession);
      } else {
        setActiveAudit(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cargar sesiones de auditoría');
    } finally {
      setLoading(false);
    }
  };

  // Handlers: Mermas
  const handleRegisterWaste = async (e) => {
    e.preventDefault();
    if (!wasteForm.productId || wasteForm.quantity < 1 || !wasteForm.reason) {
      toast.warning('Por favor completa todos los campos de la merma');
      return;
    }

    try {
      await wasteAuditService.registerWaste({
        productId: Number(wasteForm.productId),
        quantity: Number(wasteForm.quantity),
        wasteType: wasteForm.wasteType,
        reason: wasteForm.reason
      });
      toast.success('Baja de inventario por merma registrada exitosamente');
      setShowWasteModal(false);
      setWasteForm({ productId: '', quantity: 1, wasteType: 'VENCIMIENTO', reason: '' });
      loadWastes();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar la merma');
    }
  };

  // Handlers: Lotes & FEFO
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.productId || !batchForm.batchNumber || !batchForm.expirationDate || batchForm.initialQuantity < 1) {
      toast.warning('Completa todos los campos obligatorios del lote');
      return;
    }

    try {
      await wasteAuditService.createBatch({
        productId: Number(batchForm.productId),
        batchNumber: batchForm.batchNumber,
        expirationDate: batchForm.expirationDate,
        initialQuantity: Number(batchForm.initialQuantity)
      });
      toast.success('Lote registrado con éxito');
      setShowBatchModal(false);
      setBatchForm({ productId: '', batchNumber: '', expirationDate: '', initialQuantity: 10 });
      loadBatches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear el lote');
    }
  };

  const handleDischargeBatch = async (batchId, batchNumber) => {
    if (!window.confirm(`¿Confirmas dar de baja todas las existencias del lote ${batchNumber} por vencimiento?`)) {
      return;
    }
    try {
      await wasteAuditService.dischargeBatch(batchId, `Baja por vencimiento lote ${batchNumber}`);
      toast.success(`Lote ${batchNumber} dado de baja por vencimiento`);
      loadBatches();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al dar de baja el lote');
    }
  };

  // Handlers: Conteo Físico
  const handleStartAudit = async () => {
    try {
      const session = await wasteAuditService.startAuditSession('Auditoría física de inventario');
      toast.success(`Sesión ${session.sessionCode} iniciada`);
      loadAudits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar la sesión');
    }
  };

  const handleRecordCountItem = async (e) => {
    e.preventDefault();
    if (!activeAudit || !auditItemInput.productId) {
      toast.warning('Selecciona un producto e ingresa la cantidad contada');
      return;
    }

    try {
      await wasteAuditService.recordAuditCount(activeAudit.id, {
        productId: Number(auditItemInput.productId),
        physicalStock: Number(auditItemInput.physicalStock),
        notes: auditItemInput.notes
      });
      toast.success('Conteo registrado');
      setAuditItemInput({ productId: '', physicalStock: 0, notes: '' });
      const updated = await wasteAuditService.getAuditSession(activeAudit.id);
      setActiveAudit(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar el conteo');
    }
  };

  const handleReconcileAudit = async () => {
    if (!window.confirm(`¿Estás seguro de conciliar la auditoría ${activeAudit.sessionCode}? Esta acción ajustará el stock de los productos con diferencias en el Kardex de forma definitiva.`)) {
      return;
    }

    try {
      const res = await wasteAuditService.reconcileAudit(activeAudit.id);
      toast.success(`Auditoría ${res.sessionCode} conciliada exitosamente`);
      loadAudits();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al conciliar la auditoría');
    }
  };

  const handleCancelAudit = async () => {
    if (!window.confirm('¿Cancelar la sesión de auditoría actual? No se aplicará ningún ajuste a inventario.')) {
      return;
    }

    try {
      await wasteAuditService.cancelAudit(activeAudit.id);
      toast.info('Sesión cancelada');
      loadAudits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cancelar la sesión');
    }
  };

  return (
    <div className="loss-prevention-container">
      {/* Header */}
      <header className="lp-header">
        <h1>
          <FaBoxes className="lp-header-icon" /> Control de Mermas, Caducidades y Conteo Físico
        </h1>
        <p className="lp-subtitle">
          Auditoría de inventario físico, trazabilidad FEFO y valoración económica de pérdidas
        </p>
      </header>

      {/* Tabs */}
      <nav className="lp-tabs">
        <button
          className={`lp-tab-btn ${activeTab === 'wastes' ? 'active' : ''}`}
          onClick={() => setActiveTab('wastes')}
        >
          <FaTrashAlt /> Control de Mermas
        </button>
        <button
          className={`lp-tab-btn ${activeTab === 'batches' ? 'active' : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          <FaCalendarTimes /> Caducidades (FEFO)
        </button>
        <button
          className={`lp-tab-btn ${activeTab === 'audits' ? 'active' : ''}`}
          onClick={() => setActiveTab('audits')}
        >
          <FaClipboardCheck /> Conteo Físico & Auditoría
        </button>
      </nav>

      {/* Loading Indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '0.75rem', color: '#059669', fontWeight: 600 }}>
          Cargando datos de inventario...
        </div>
      )}

      {/* TAB 1: MERMAS */}
      {activeTab === 'wastes' && (
        <div>
          {/* KPI Cards */}
          <div className="lp-kpi-grid">
            <div className="lp-kpi-card">
              <div className="lp-kpi-icon danger">
                <FaFileInvoiceDollar />
              </div>
              <div className="lp-kpi-content">
                <span className="lp-kpi-title">Costo Total Perdido</span>
                <span className="lp-kpi-value">
                  ${Number(wasteSummary?.totalCostLost || 0).toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <div className="lp-kpi-card">
              <div className="lp-kpi-icon warning">
                <FaTrashAlt />
              </div>
              <div className="lp-kpi-content">
                <span className="lp-kpi-title">Unidades Descartadas</span>
                <span className="lp-kpi-value">{wasteSummary?.totalUnitsLost || 0} uds</span>
              </div>
            </div>

            <div className="lp-kpi-card">
              <div className="lp-kpi-icon info">
                <FaBoxes />
              </div>
              <div className="lp-kpi-content">
                <span className="lp-kpi-title">Bajas Registradas</span>
                <span className="lp-kpi-value">{wasteSummary?.totalRecords || 0} eventos</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="lp-actions-bar">
            <div className="lp-actions-left">
              <button
                className="lp-btn-primary"
                onClick={() => setShowWasteModal(true)}
              >
                <FaPlus /> Registrar Merma / Baja
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="lp-table-container">
            <table className="lp-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Tipo Merma</th>
                  <th>Cantidad</th>
                  <th>Costo Unitario</th>
                  <th>Total Pérdida</th>
                  <th>Motivo</th>
                  <th>Registrado Por</th>
                </tr>
              </thead>
              <tbody>
                {wastes.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="lp-empty-state">
                      <FaCheckCircle className="lp-empty-icon" />
                      <p>No hay mermas registradas.</p>
                    </td>
                  </tr>
                ) : (
                  wastes.map((w) => (
                    <tr key={w.id}>
                      <td>{w.createdAt ? new Date(w.createdAt).toLocaleString('es-CO') : '-'}</td>
                      <td><code>{w.productCode}</code></td>
                      <td><strong>{w.productName}</strong></td>
                      <td>{w.productCategory || '-'}</td>
                      <td>
                        <span className={`lp-badge ${
                          w.wasteType === 'VENCIMIENTO' ? 'danger' :
                          w.wasteType === 'DANO_ROTURA' ? 'warning' :
                          w.wasteType === 'ROBO_HURTO' ? 'danger' : 'info'
                        }`}>
                          {w.wasteType}
                        </span>
                      </td>
                      <td><strong>{w.quantity} uds</strong></td>
                      <td>${Number(w.unitCost || 0).toLocaleString('es-CO')}</td>
                      <td><strong style={{ color: '#dc2626' }}>${Number(w.totalCost || 0).toLocaleString('es-CO')}</strong></td>
                      <td>{w.reason}</td>
                      <td><small>{w.registeredBy}</small></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CADUCIDADES & FEFO */}
      {activeTab === 'batches' && (
        <div>
          {/* KPI Cards */}
          <div className="lp-kpi-grid">
            <div className="lp-kpi-card">
              <div className="lp-kpi-icon danger">
                <FaExclamationTriangle />
              </div>
              <div className="lp-kpi-content">
                <span className="lp-kpi-title">Lotes Vencidos / Críticos</span>
                <span className="lp-kpi-value">
                  {batches.filter(b => b.urgencyLevel === 'VENCIDO' || b.urgencyLevel === 'CRITICO').length}
                </span>
              </div>
            </div>

            <div className="lp-kpi-card">
              <div className="lp-kpi-icon warning">
                <FaHourglassHalf />
              </div>
              <div className="lp-kpi-content">
                <span className="lp-kpi-title">Por Vencer (&le; 15 días)</span>
                <span className="lp-kpi-value">
                  {batches.filter(b => b.urgencyLevel === 'ALERTA').length}
                </span>
              </div>
            </div>

            <div className="lp-kpi-card">
              <div className="lp-kpi-icon success">
                <FaCheckCircle />
              </div>
              <div className="lp-kpi-content">
                <span className="lp-kpi-title">Lotes Monitoreados</span>
                <span className="lp-kpi-value">{batches.length}</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="lp-actions-bar">
            <div className="lp-actions-left">
              <button
                className="lp-btn-primary"
                onClick={() => setShowBatchModal(true)}
              >
                <FaPlus /> Registrar Lote con Vencimiento
              </button>
            </div>
          </div>

          {/* Batches Table */}
          <div className="lp-table-container">
            <table className="lp-table">
              <thead>
                <tr>
                  <th>Lote #</th>
                  <th>Producto</th>
                  <th>Fecha Vencimiento</th>
                  <th>Días Restantes</th>
                  <th>Existencias (Actual / Inicial)</th>
                  <th>Estado FEFO</th>
                  <th>Proveedor</th>
                  <th>Acción Rápida</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="lp-empty-state">
                      <FaHourglassHalf className="lp-empty-icon" />
                      <p>No hay lotes con fecha de vencimiento próxima.</p>
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id}>
                      <td><code>{b.batchNumber}</code></td>
                      <td><strong>{b.productName}</strong></td>
                      <td>{b.expirationDate}</td>
                      <td>
                        <span className={`lp-badge ${
                          b.urgencyLevel === 'VENCIDO' ? 'danger' :
                          b.urgencyLevel === 'CRITICO' ? 'warning' :
                          b.urgencyLevel === 'ALERTA' ? 'warning' : 'success'
                        }`}>
                          {b.daysRemaining < 0 ? `Vencido hace ${Math.abs(b.daysRemaining)} días` :
                           b.daysRemaining === 0 ? 'Vence HOY' :
                           `${b.daysRemaining} días`}
                        </span>
                      </td>
                      <td><strong>{b.currentQuantity}</strong> / {b.initialQuantity} uds</td>
                      <td>
                        <span className={`lp-badge ${b.status === 'VENCIDO' ? 'danger' : 'info'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>{b.supplierName || 'General'}</td>
                      <td>
                        {b.currentQuantity > 0 && (
                          <button
                            className="lp-btn-danger"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                            onClick={() => handleDischargeBatch(b.id, b.batchNumber)}
                            title="Dar de baja todo el lote por vencimiento"
                          >
                            <FaTrashAlt /> Baja por Vencimiento
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONTEO FÍSICO & AUDITORÍA */}
      {activeTab === 'audits' && (
        <div>
          {/* Active Audit Session Panel */}
          {activeAudit ? (
            <div className="lp-audit-active-panel">
              <div className="lp-audit-header-banner">
                <div>
                  <div className="lp-audit-code">
                    <FaBarcode /> Sesión Activa: {activeAudit.sessionCode}
                  </div>
                  <small style={{ color: '#047857' }}>
                    Auditor: {activeAudit.auditorUsername} | Iniciada: {new Date(activeAudit.startedAt).toLocaleString('es-CO')}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="lp-btn-primary" onClick={handleReconcileAudit}>
                    <FaCheckCircle /> Conciliar Auditoría (Ajustar Kardex)
                  </button>
                  <button className="lp-btn-secondary" onClick={handleCancelAudit}>
                    <FaTimesCircle /> Cancelar Sesión
                  </button>
                </div>
              </div>

              {/* Scan / Count Input */}
              <form onSubmit={handleRecordCountItem} className="lp-audit-scan-box">
                <div>
                  <select
                    value={auditItemInput.productId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const prod = products.find(p => p.id === Number(pid));
                      setAuditItemInput({
                        ...auditItemInput,
                        productId: pid,
                        physicalStock: prod ? prod.cantidad : 0
                      });
                    }}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Seleccionar producto para conteo --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.codigoBarras}) - Stock Sistema: {p.cantidad}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    placeholder="Stock Físico Contado"
                    value={auditItemInput.physicalStock}
                    onChange={(e) => setAuditItemInput({ ...auditItemInput, physicalStock: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Observaciones (opcional)"
                    value={auditItemInput.notes}
                    onChange={(e) => setAuditItemInput({ ...auditItemInput, notes: e.target.value })}
                  />
                </div>
                <button type="submit" className="lp-btn-primary">
                  <FaPlus /> Guardar Conteo
                </button>
              </form>

              {/* Items Counted Table */}
              <div className="lp-table-container">
                <table className="lp-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Stock Teórico (Sistema)</th>
                      <th>Stock Físico (Contado)</th>
                      <th>Diferencia</th>
                      <th>Costo Unitario</th>
                      <th>Impacto Financiero</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!activeAudit.items || activeAudit.items.length === 0) ? (
                      <tr>
                        <td colSpan="8" className="lp-empty-state">
                          <p>Aún no se han escaneado productos en esta sesión de auditoría.</p>
                        </td>
                      </tr>
                    ) : (
                      activeAudit.items.map((item) => (
                        <tr key={item.id}>
                          <td><code>{item.productCode}</code></td>
                          <td><strong>{item.productName}</strong></td>
                          <td>{item.systemStock} uds</td>
                          <td><strong>{item.physicalStock} uds</strong></td>
                          <td>
                            <span className={`lp-badge ${
                              item.difference === 0 ? 'success' :
                              item.difference < 0 ? 'danger' : 'info'
                            }`}>
                              {item.difference > 0 ? `+${item.difference}` : item.difference} uds
                            </span>
                          </td>
                          <td>${Number(item.unitCost || 0).toLocaleString('es-CO')}</td>
                          <td>
                            <strong style={{
                              color: item.costDifference < 0 ? '#dc2626' : item.costDifference > 0 ? '#2563eb' : '#059669'
                            }}>
                              ${Number(item.costDifference || 0).toLocaleString('es-CO')}
                            </strong>
                          </td>
                          <td>{item.notes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              <div className="lp-actions-bar">
                <div className="lp-actions-left">
                  <button className="lp-btn-primary" onClick={handleStartAudit}>
                    <FaPlus /> Iniciar Nueva Auditoría Física
                  </button>
                </div>
              </div>

              {/* Sessions List */}
              <div className="lp-table-container">
                <table className="lp-table">
                  <thead>
                    <tr>
                      <th>Código Sesión</th>
                      <th>Auditor</th>
                      <th>Estado</th>
                      <th>Ítems Contados</th>
                      <th>Diferencia Neta</th>
                      <th>Impacto Financiero</th>
                      <th>Iniciada</th>
                      <th>Cerrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditSessions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="lp-empty-state">
                          <FaClipboardCheck className="lp-empty-icon" />
                          <p>No hay auditorías registradas.</p>
                        </td>
                      </tr>
                    ) : (
                      auditSessions.map((s) => (
                        <tr key={s.id}>
                          <td><strong>{s.sessionCode}</strong></td>
                          <td>{s.auditorUsername}</td>
                          <td>
                            <span className={`lp-badge ${
                              s.status === 'CONCILIADO' ? 'success' :
                              s.status === 'EN_CONTEO' ? 'warning' : 'neutral'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                          <td>{s.totalItemsCounted} productos</td>
                          <td>
                            <strong>
                              {s.totalDifferenceUnits > 0 ? `+${s.totalDifferenceUnits}` : s.totalDifferenceUnits} uds
                            </strong>
                          </td>
                          <td>
                            <strong style={{ color: Number(s.totalCostImpact) < 0 ? '#dc2626' : '#111827' }}>
                              ${Number(s.totalCostImpact || 0).toLocaleString('es-CO')}
                            </strong>
                          </td>
                          <td>{new Date(s.startedAt).toLocaleString('es-CO')}</td>
                          <td>{s.closedAt ? new Date(s.closedAt).toLocaleString('es-CO') : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: REGISTRAR MERMA */}
      {showWasteModal && (
        <div className="lp-modal-backdrop">
          <div className="lp-modal-card">
            <div className="lp-modal-header">
              <h3>Registrar Merma / Baja de Inventario</h3>
              <button className="lp-modal-close" onClick={() => setShowWasteModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleRegisterWaste}>
              <div className="lp-modal-body">
                <div className="lp-form-group">
                  <label>Producto *</label>
                  <select
                    value={wasteForm.productId}
                    onChange={(e) => setWasteForm({ ...wasteForm, productId: e.target.value })}
                    required
                  >
                    <option value="">-- Seleccionar Producto --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.codigoBarras}) - Stock: {p.cantidad}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedWasteProduct && (
                  <div style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <div><strong>Stock Disponible:</strong> {selectedWasteProduct.cantidad} uds</div>
                    <div><strong>Costo Unitario (PMP):</strong> ${Number(selectedWasteProduct.costPrice || selectedWasteProduct.precio).toLocaleString('es-CO')}</div>
                  </div>
                )}

                <div className="lp-form-group">
                  <label>Cantidad a dar de baja *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedWasteProduct ? selectedWasteProduct.cantidad : 9999}
                    value={wasteForm.quantity}
                    onChange={(e) => setWasteForm({ ...wasteForm, quantity: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="lp-form-group">
                  <label>Tipo de Merma *</label>
                  <select
                    value={wasteForm.wasteType}
                    onChange={(e) => setWasteForm({ ...wasteForm, wasteType: e.target.value })}
                    required
                  >
                    {WASTE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="lp-form-group">
                  <label>Motivo o Detalle de la Baja *</label>
                  <textarea
                    rows="3"
                    placeholder="Ej. Empaque roto en recepción, yogurt vencido en góndola..."
                    value={wasteForm.reason}
                    onChange={(e) => setWasteForm({ ...wasteForm, reason: e.target.value })}
                    required
                  />
                </div>

                {selectedWasteProduct && wasteForm.quantity > 0 && (
                  <div style={{ color: '#dc2626', fontWeight: 'bold', textAlign: 'right' }}>
                    Pérdida económica calculada: ${(
                      Number(selectedWasteProduct.costPrice || selectedWasteProduct.precio) * wasteForm.quantity
                    ).toLocaleString('es-CO')} COP
                  </div>
                )}
              </div>

              <div className="lp-modal-footer">
                <button type="button" className="lp-btn-secondary" onClick={() => setShowWasteModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="lp-btn-danger">
                  <FaTrashAlt /> Confirmar Baja en Kardex
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR LOTE */}
      {showBatchModal && (
        <div className="lp-modal-backdrop">
          <div className="lp-modal-card">
            <div className="lp-modal-header">
              <h3>Registrar Lote con Caducidad (FEFO)</h3>
              <button className="lp-modal-close" onClick={() => setShowBatchModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateBatch}>
              <div className="lp-modal-body">
                <div className="lp-form-group">
                  <label>Producto *</label>
                  <select
                    value={batchForm.productId}
                    onChange={(e) => setBatchForm({ ...batchForm, productId: e.target.value })}
                    required
                  >
                    <option value="">-- Seleccionar Producto --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.codigoBarras})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lp-form-group">
                  <label>Código o Número de Lote *</label>
                  <input
                    type="text"
                    placeholder="Ej. LOT-2026-X1"
                    value={batchForm.batchNumber}
                    onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="lp-form-group">
                  <label>Fecha de Vencimiento *</label>
                  <input
                    type="date"
                    value={batchForm.expirationDate}
                    onChange={(e) => setBatchForm({ ...batchForm, expirationDate: e.target.value })}
                    required
                  />
                </div>

                <div className="lp-form-group">
                  <label>Cantidad Inicial del Lote *</label>
                  <input
                    type="number"
                    min="1"
                    value={batchForm.initialQuantity}
                    onChange={(e) => setBatchForm({ ...batchForm, initialQuantity: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="lp-modal-footer">
                <button type="button" className="lp-btn-secondary" onClick={() => setShowBatchModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="lp-btn-primary">
                  <FaPlus /> Guardar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
