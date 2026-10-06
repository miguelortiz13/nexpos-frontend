import { useState, useEffect } from 'react';
import { FaUserPlus, FaTimes, FaSave } from 'react-icons/fa';
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
    notes: ''
};

const CustomerFormModal = ({ isOpen, onClose, onCustomerSaved, initialDocNumber = '' }) => {
    const [formData, setFormData] = useState(DEFAULT_CUSTOMER);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                ...DEFAULT_CUSTOMER,
                docNumber: initialDocNumber || ''
            });
        }
    }, [isOpen, initialDocNumber]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.docNumber.trim() || !formData.name.trim()) {
            toast.error('Número de documento y nombre son obligatorios');
            return;
        }

        setSaving(true);
        try {
            const saved = await customerService.create(formData);
            toast.success(`Cliente ${saved.name} registrado con éxito`);
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
                            <FaUserPlus />
                        </div>
                        <div>
                            <h3>Registrar Cliente</h3>
                            <p>Emisión nominal y envío de factura electrónica DIAN</p>
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
                                    autoFocus
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
                            <FaSave /> {saving ? 'Guardando...' : 'Registrar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerFormModal;
