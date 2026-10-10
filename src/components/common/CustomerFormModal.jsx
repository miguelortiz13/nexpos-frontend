import { useState, useEffect } from 'react';
import { FaUserPlus, FaUserEdit, FaTimes, FaSave, FaCreditCard, FaCoins } from 'react-icons/fa';
import { toast } from 'react-toastify';
import customerService from '../../api/customerService';
import './CustomerFormModal.css';

const DEFAULT_CUSTOMER = {
    docType: 'CC',
    docNumber: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Cali',
    department: 'Valle del Cauca',
    notes: '',
    creditAllowed: false,
    creditLimit: '0'
};

const formatCOP = (val) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(val || 0);
};

const CustomerFormModal = ({ isOpen, onClose, onCustomerSaved, initialDocNumber = '', customerToEdit = null }) => {
    const [formData, setFormData] = useState(DEFAULT_CUSTOMER);
    const [saving, setSaving] = useState(false);

    const isEditing = Boolean(customerToEdit && customerToEdit.id);

    useEffect(() => {
        if (isOpen) {
            if (customerToEdit) {
                setFormData({
                    docType: customerToEdit.docType || 'CC',
                    docNumber: customerToEdit.docNumber || '',
                    name: customerToEdit.name || '',
                    email: customerToEdit.email || '',
                    phone: customerToEdit.phone || '',
                    address: customerToEdit.address || '',
                    city: customerToEdit.city || 'Cali',
                    department: customerToEdit.department || 'Valle del Cauca',
                    notes: customerToEdit.notes || '',
                    creditAllowed: Boolean(customerToEdit.creditAllowed),
                    creditLimit: (customerToEdit.creditLimit != null ? customerToEdit.creditLimit : 0).toString(),
                    currentDebt: customerToEdit.currentDebt || 0
                });
            } else {
                setFormData({
                    ...DEFAULT_CUSTOMER,
                    docNumber: initialDocNumber || ''
                });
            }
        }
    }, [isOpen, initialDocNumber, customerToEdit]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.docNumber.trim() || !formData.name.trim()) {
            toast.error('Número de documento y nombre son obligatorios');
            return;
        }

        const payload = {
            ...formData,
            creditLimit: Number(formData.creditLimit) || 0
        };

        setSaving(true);
        try {
            let saved;
            if (isEditing) {
                saved = await customerService.update(customerToEdit.id, payload);
                toast.success(`Cliente ${saved.name} actualizado con éxito`);
            } else {
                saved = await customerService.create(payload);
                toast.success(`Cliente ${saved.name} registrado con éxito`);
            }

            if (onCustomerSaved) {
                onCustomerSaved(saved);
            }
            onClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Error al guardar cliente';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="customer-modal-overlay" onClick={onClose}>
            <div className="customer-modal-card" onClick={e => e.stopPropagation()}>
                <div className="customer-modal-header">
                    <div className="customer-header-title">
                        <div className="customer-icon-pill">
                            {isEditing ? <FaUserEdit /> : <FaUserPlus />}
                        </div>
                        <div>
                            <h3>{isEditing ? 'Editar Cliente' : 'Registrar Cliente'}</h3>
                            <p>Facturación electrónica DIAN y cupo de crédito / fiado POS</p>
                        </div>
                    </div>
                    <button className="btn-close-customer" onClick={onClose} title="Cerrar">
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="customer-modal-body">
                        <div className="customer-grid-form">
                            <div className="cust-form-group">
                                <label>Tipo de Documento *</label>
                                <select
                                    value={formData.docType}
                                    onChange={e => handleInputChange('docType', e.target.value)}
                                >
                                    <option value="CC">CC - Cédula de Ciudadanía</option>
                                    <option value="NIT">NIT - Número Tributario</option>
                                    <option value="CE">CE - Cédula de Extranjería</option>
                                    <option value="PP">Pasaporte</option>
                                    <option value="TI">TI - Tarjeta de Identidad</option>
                                </select>
                            </div>

                            <div className="cust-form-group">
                                <label>Número de Documento / Cédula *</label>
                                <input
                                    type="text"
                                    value={formData.docNumber}
                                    onChange={e => handleInputChange('docNumber', e.target.value)}
                                    placeholder="Ej: 1144123456"
                                    required
                                    autoFocus={!isEditing}
                                />
                            </div>

                            <div className="cust-form-group full-width">
                                <label>Nombre Completo o Razón Social *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => handleInputChange('name', e.target.value)}
                                    placeholder="Ej: María Camila Restrepo"
                                    required
                                />
                            </div>

                            <div className="cust-form-group full-width">
                                <label>Correo Electrónico (Para Factura DIAN)</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => handleInputChange('email', e.target.value)}
                                    placeholder="ejemplo@correo.com"
                                />
                                <span className="cust-field-hint">A este correo se remitirá el archivo XML y PDF oficial DIAN</span>
                            </div>

                            <div className="cust-form-group">
                                <label>Teléfono / Móvil</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => handleInputChange('phone', e.target.value)}
                                    placeholder="Ej: 315 123 4567"
                                />
                            </div>

                            <div className="cust-form-group">
                                <label>Ciudad</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={e => handleInputChange('city', e.target.value)}
                                    placeholder="Ej: Cali"
                                />
                            </div>

                            <div className="cust-form-group full-width">
                                <label>Dirección</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => handleInputChange('address', e.target.value)}
                                    placeholder="Ej: Calle 5 # 38-25"
                                />
                            </div>

                            {/* Sección de Crédito / Fiado y Cartera */}
                            <div className="cust-credit-section full-width">
                                <div className="credit-toggle-row">
                                    <label className="credit-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.creditAllowed}
                                            onChange={e => handleInputChange('creditAllowed', e.target.checked)}
                                        />
                                        <span className="credit-checkbox-text">
                                            <FaCreditCard className="credit-icon" />
                                            <strong>Habilitar Crédito / Fiado para este cliente</strong>
                                        </span>
                                    </label>
                                </div>

                                {formData.creditAllowed && (
                                    <div className="credit-params-card">
                                        <div className="cust-form-group">
                                            <label>Cupo / Límite de Crédito Aprobado ($ COP)</label>
                                            <div className="credit-input-wrapper">
                                                <span className="currency-prefix">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="5000"
                                                    value={formData.creditLimit}
                                                    onChange={e => handleInputChange('creditLimit', e.target.value)}
                                                    placeholder="Ej: 500000"
                                                    required={formData.creditAllowed}
                                                />
                                            </div>
                                            <span className="cust-field-hint">
                                                Monto máximo que el cliente puede financiar simultáneamente en el POS.
                                            </span>
                                        </div>

                                        {isEditing && (
                                            <div className="credit-balance-pill">
                                                <div className="balance-item">
                                                    <span className="balance-lbl">Deuda Actual:</span>
                                                    <span className="balance-val debt">{formatCOP(formData.currentDebt || 0)}</span>
                                                </div>
                                                <div className="balance-item">
                                                    <span className="balance-lbl">Cupo Disponible:</span>
                                                    <span className="balance-val available">
                                                        {formatCOP(Math.max(0, (Number(formData.creditLimit) || 0) - (formData.currentDebt || 0)))}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="customer-modal-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-cust-cancel"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-cust-submit"
                            disabled={saving}
                        >
                            <FaSave /> {saving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Registrar Cliente')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerFormModal;
