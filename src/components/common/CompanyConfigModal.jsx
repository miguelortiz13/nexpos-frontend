import { useState, useEffect } from 'react';
import {
    FaTimes,
    FaBuilding,
    FaFileInvoiceDollar,
    FaCloudUploadAlt,
    FaCheckCircle,
    FaExclamationCircle,
    FaSave,
    FaPlug,
    FaInfoCircle,
    FaShieldAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import companyConfigService from '../../api/companyConfigService';
import './CompanyConfigModal.css';

const DEFAULT_FORM = {
    nit: '900.785.412-8',
    businessName: 'NexPOS Retail S.A.S.',
    tradeName: 'Supermercado NexPOS Cali',
    address: 'Av. Roosevelt # 34-50',
    city: 'Cali',
    department: 'Valle del Cauca',
    phone: '(602) 889-1234',
    email: 'facturacion@nexpos.com.co',
    taxRegime: 'Responsable de IVA (Régimen Común)',
    dianResolutionNumber: '18764000001',
    dianPrefix: 'POS',
    dianRangeFrom: 1000,
    dianRangeTo: 50000,
    dianCurrentNumber: 1000,
    dianTechnicalKey: '',
    dianStartDate: '2024-01-01',
    dianEndDate: '2026-01-01',
    factusApiUrl: 'https://api-sandbox.factus.com.co',
    factusClientId: 'nexpos_pos_client',
    factusClientSecret: '',
    factusApiToken: '',
    facturacionActiva: true,
    environment: 'HABILITACION'
};

const CompanyConfigModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('empresa'); // 'empresa' | 'dian' | 'factus'
    const [formData, setFormData] = useState(DEFAULT_FORM);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
            setTestResult(null);
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const data = await companyConfigService.getConfig();
            if (data) {
                setFormData({
                    ...DEFAULT_FORM,
                    ...data,
                    // Format dates to YYYY-MM-DD for date inputs
                    dianStartDate: data.dianStartDate ? String(data.dianStartDate).split('T')[0] : DEFAULT_FORM.dianStartDate,
                    dianEndDate: data.dianEndDate ? String(data.dianEndDate).split('T')[0] : DEFAULT_FORM.dianEndDate,
                });
            }
        } catch (err) {
            console.error('Error al cargar configuración de la empresa:', err);
            toast.error('No se pudo cargar la configuración fiscal');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...formData,
                dianRangeFrom: Number(formData.dianRangeFrom) || 1,
                dianRangeTo: Number(formData.dianRangeTo) || 100000,
                dianCurrentNumber: Number(formData.dianCurrentNumber) || 1000
            };
            await companyConfigService.updateConfig(payload);
            toast.success('Configuración fiscal y DIAN actualizada exitosamente');
            onClose();
        } catch (err) {
            console.error('Error al guardar configuración fiscal:', err);
            const msg = err.response?.data?.message || err.message || 'Error al guardar cambios';
            toast.error(`Error: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await companyConfigService.testConnection();
            setTestResult(res);
            if (res.status === 'SUCCESS') {
                toast.success('¡Conexión exitosa con Factus / DIAN!');
            } else {
                toast.warn(res.message || 'Respuesta inesperada de Factus');
            }
        } catch (err) {
            console.error('Error al probar conexión con Factus:', err);
            setTestResult({
                status: 'ERROR',
                message: err.response?.data?.message || err.message || 'Fallo de conexión'
            });
            toast.error('Error de comunicación con el servicio Factus');
        } finally {
            setTesting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="company-config-overlay" onClick={onClose}>
            <div className="company-config-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="company-config-header">
                    <div className="company-config-title">
                        <div className="company-config-icon-badge">
                            <FaFileInvoiceDollar />
                        </div>
                        <div>
                            <h2>Facturación Electrónica DIAN & Empresa</h2>
                            <p>Resolución 000165 de 2023 • Documento Equivalente POS & Factus API</p>
                        </div>
                    </div>
                    <button className="btn-close-config" onClick={onClose} title="Cerrar">
                        <FaTimes />
                    </button>
                </div>

                {/* Tabs */}
                <div className="company-config-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'empresa' ? 'active' : ''}`}
                        onClick={() => setActiveTab('empresa')}
                        type="button"
                    >
                        <FaBuilding /> Perfil Fiscal
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'dian' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dian')}
                        type="button"
                    >
                        <FaShieldAlt /> Resolución DIAN
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'factus' ? 'active' : ''}`}
                        onClick={() => setActiveTab('factus')}
                        type="button"
                    >
                        <FaPlug /> Factus API
                    </button>
                </div>

                {/* Body */}
                <div className="company-config-body">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
                            <p>Cargando configuración fiscal...</p>
                        </div>
                    ) : (
                        <form id="company-config-form" onSubmit={handleSave}>
                            {/* TAB 1: PERFIL FISCAL */}
                            {activeTab === 'empresa' && (
                                <div className="fiscal-section-card">
                                    <div className="section-intro-banner">
                                        <FaInfoCircle className="banner-icon" />
                                        <span>
                                            Datos del emisor impresos en el encabezado del tiquete POS, representación gráfica PDF y transmitidos a la DIAN.
                                        </span>
                                    </div>

                                    <div className="fiscal-fields-grid">
                                        <div className="fiscal-field">
                                            <label>NIT / Identificación Fiscal *</label>
                                            <input
                                                type="text"
                                                value={formData.nit}
                                                onChange={e => handleInputChange('nit', e.target.value)}
                                                required
                                                placeholder="Ej: 900.785.412-8"
                                            />
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Régimen Tributario *</label>
                                            <select
                                                value={formData.taxRegime}
                                                onChange={e => handleInputChange('taxRegime', e.target.value)}
                                                required
                                            >
                                                <option value="Responsable de IVA (Régimen Común)">Responsable de IVA (Régimen Común)</option>
                                                <option value="No Responsable de IVA (Régimen Simplificado)">No Responsable de IVA (Régimen Simplificado)</option>
                                                <option value="Régimen Simple de Tributación (RST)">Régimen Simple de Tributación (RST)</option>
                                                <option value="Gran Contribuyente">Gran Contribuyente</option>
                                            </select>
                                        </div>

                                        <div className="fiscal-field full-span">
                                            <label>Razón Social (Legal) *</label>
                                            <input
                                                type="text"
                                                value={formData.businessName}
                                                onChange={e => handleInputChange('businessName', e.target.value)}
                                                required
                                                placeholder="Ej: NexPOS Retail S.A.S."
                                            />
                                        </div>

                                        <div className="fiscal-field full-span">
                                            <label>Nombre Comercial (Establecimiento)</label>
                                            <input
                                                type="text"
                                                value={formData.tradeName}
                                                onChange={e => handleInputChange('tradeName', e.target.value)}
                                                placeholder="Ej: Supermercado NexPOS Cali"
                                            />
                                        </div>

                                        <div className="fiscal-field full-span">
                                            <label>Dirección del Establecimiento *</label>
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={e => handleInputChange('address', e.target.value)}
                                                required
                                                placeholder="Ej: Av. Roosevelt # 34-50"
                                            />
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Ciudad *</label>
                                            <input
                                                type="text"
                                                value={formData.city}
                                                onChange={e => handleInputChange('city', e.target.value)}
                                                required
                                                placeholder="Ej: Cali"
                                            />
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Departamento *</label>
                                            <input
                                                type="text"
                                                value={formData.department}
                                                onChange={e => handleInputChange('department', e.target.value)}
                                                required
                                                placeholder="Ej: Valle del Cauca"
                                            />
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Teléfono de Contacto</label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={e => handleInputChange('phone', e.target.value)}
                                                placeholder="Ej: (602) 889-1234"
                                            />
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Correo Electrónico de Facturación</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => handleInputChange('email', e.target.value)}
                                                placeholder="Ej: facturacion@nexpos.com.co"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: RESOLUCIÓN DIAN */}
                            {activeTab === 'dian' && (
                                <div className="fiscal-section-card">
                                    <div className="section-intro-banner">
                                        <FaShieldAlt className="banner-icon" />
                                        <span>
                                            Autorización de numeración para el Documento Equivalente Electrónico POS expedida por la DIAN (Formulario 1876).
                                        </span>
                                    </div>

                                    <div className="fiscal-fields-grid three-col">
                                        <div className="fiscal-field">
                                            <label>Número de Resolución DIAN *</label>
                                            <input
                                                type="text"
                                                value={formData.dianResolutionNumber}
                                                onChange={e => handleInputChange('dianResolutionNumber', e.target.value)}
                                                required
                                                placeholder="Ej: 18764000001"
                                            />
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Prefijo Autorizado *</label>
                                            <input
                                                type="text"
                                                value={formData.dianPrefix}
                                                onChange={e => handleInputChange('dianPrefix', e.target.value)}
                                                required
                                                placeholder="Ej: POS"
                                            />
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Consecutivo Actual *</label>
                                            <input
                                                type="number"
                                                value={formData.dianCurrentNumber}
                                                onChange={e => handleInputChange('dianCurrentNumber', e.target.value)}
                                                required
                                                min="1"
                                            />
                                            <span className="field-hint">Próxima factura generada</span>
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Rango Desde *</label>
                                            <input
                                                type="number"
                                                value={formData.dianRangeFrom}
                                                onChange={e => handleInputChange('dianRangeFrom', e.target.value)}
                                                required
                                                min="1"
                                            />
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Rango Hasta *</label>
                                            <input
                                                type="number"
                                                value={formData.dianRangeTo}
                                                onChange={e => handleInputChange('dianRangeTo', e.target.value)}
                                                required
                                                min="1"
                                            />
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Vigencia Hasta *</label>
                                            <input
                                                type="date"
                                                value={formData.dianEndDate}
                                                onChange={e => handleInputChange('dianEndDate', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="fiscal-field full-span">
                                            <label>Clave Técnica DIAN *</label>
                                            <input
                                                type="password"
                                                value={formData.dianTechnicalKey}
                                                onChange={e => handleInputChange('dianTechnicalKey', e.target.value)}
                                                required
                                                placeholder="Cadena alfanumérica asignada por la DIAN para el CUDE"
                                            />
                                            <span className="field-hint">Utilizada para el algoritmo criptográfico SHA-384 del CUDE</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: FACTUS API INTEGRATION */}
                            {activeTab === 'factus' && (
                                <div className="fiscal-section-card">
                                    <div className="switch-control-card">
                                        <div className="switch-label-group">
                                            <h4>Habilitar Facturación Electrónica DIAN</h4>
                                            <p>Genera CUDE y transmite en tiempo real cada venta completada</p>
                                        </div>
                                        <label className="toggle-switch-wrapper">
                                            <input
                                                type="checkbox"
                                                checked={formData.facturacionActiva}
                                                onChange={e => handleInputChange('facturacionActiva', e.target.checked)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="fiscal-fields-grid">
                                        <div className="fiscal-field">
                                            <label>Entorno de Operación</label>
                                            <select
                                                value={formData.environment}
                                                onChange={e => handleInputChange('environment', e.target.value)}
                                            >
                                                <option value="HABILITACION">Habilitación / Pruebas (Sandbox)</option>
                                                <option value="PRODUCCION">Producción Oficial DIAN</option>
                                            </select>
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Factus API Endpoint</label>
                                            <input
                                                type="text"
                                                value={formData.factusApiUrl}
                                                onChange={e => handleInputChange('factusApiUrl', e.target.value)}
                                                placeholder="https://api-sandbox.factus.com.co"
                                            />
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Client ID</label>
                                            <input
                                                type="text"
                                                value={formData.factusClientId}
                                                onChange={e => handleInputChange('factusClientId', e.target.value)}
                                                placeholder="Identificador del cliente en Factus"
                                            />
                                        </div>

                                        <div className="fiscal-field">
                                            <label>Client Secret</label>
                                            <input
                                                type="password"
                                                value={formData.factusClientSecret}
                                                onChange={e => handleInputChange('factusClientSecret', e.target.value)}
                                                placeholder="Clave secreta"
                                            />
                                        </div>

                                        <div className="fiscal-field full-span">
                                            <label>Token de Acceso API / Bearer</label>
                                            <input
                                                type="password"
                                                value={formData.factusApiToken}
                                                onChange={e => handleInputChange('factusApiToken', e.target.value)}
                                                placeholder="Token JWT de autenticación permanente"
                                            />
                                        </div>
                                    </div>

                                    {/* Test Connection Card */}
                                    <div className="connection-test-card">
                                        <div className="connection-test-info">
                                            <h4>Diagnóstico de Conectividad DIAN / Factus</h4>
                                            <p>Verifica latencia y estado de los servidores del proveedor tecnológico</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleTestConnection}
                                            disabled={testing}
                                            className="btn-test-connection"
                                        >
                                            <FaCloudUploadAlt /> {testing ? 'Comprobando...' : 'Probar Conexión'}
                                        </button>

                                        {testResult && (
                                            <div className={`test-result-box ${testResult.status === 'SUCCESS' ? 'success' : 'error'}`}>
                                                {testResult.status === 'SUCCESS' ? (
                                                    <FaCheckCircle size={18} />
                                                ) : (
                                                    <FaExclamationCircle size={18} />
                                                )}
                                                <div>
                                                    <strong>{testResult.message || (testResult.status === 'SUCCESS' ? 'Conexión verificada con éxito' : 'Fallo en la comunicación')}</strong>
                                                    {testResult.provider && (
                                                        <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                                                            Proveedor: {testResult.provider} • Entorno: {testResult.environment} • Latencia: {testResult.latencyMs}ms
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="company-config-footer">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-cancel-config"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="company-config-form"
                        className="btn-save-config"
                        disabled={saving || loading}
                    >
                        <FaSave /> {saving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompanyConfigModal;
