/**
 * NexPOS Offline Storage Service
 * Utiliza IndexedDB nativo del navegador para resiliencia total sin conexión a internet.
 */

const DB_NAME = 'NexPosOfflineDB';
const DB_VERSION = 1;

let dbPromise = null;

export const initOfflineDB = () => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            console.warn('Este navegador no soporta IndexedDB; el modo offline estará deshabilitado');
            resolve(null);
            return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Catálogo local de productos
            if (!db.objectStoreNames.contains('products')) {
                const productStore = db.createObjectStore('products', { keyPath: 'id' });
                productStore.createIndex('codigoBarras', 'codigoBarras', { unique: false });
                productStore.createIndex('nombre', 'nombre', { unique: false });
            }

            // Cola de ventas offline pendientes de sincronización
            if (!db.objectStoreNames.contains('offline_sales')) {
                const salesStore = db.createObjectStore('offline_sales', { keyPath: 'offlineReference' });
                salesStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // Metadatos (última sincronización, estado)
            if (!db.objectStoreNames.contains('meta')) {
                db.createObjectStore('meta', { keyPath: 'key' });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Error abriendo IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });

    return dbPromise;
};

/**
 * Guarda o actualiza el catálogo completo de productos en IndexedDB
 */
export const cacheProducts = async (products = []) => {
    const db = await initOfflineDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
        const tx = db.transaction(['products', 'meta'], 'readwrite');
        const store = tx.objectStore('products');
        const metaStore = tx.objectStore('meta');

        // Limpiar catálogo anterior e insertar actualizado
        store.clear();
        products.forEach(p => store.put(p));

        metaStore.put({
            key: 'lastCatalogSync',
            timestamp: new Date().toISOString(),
            count: products.length
        });

        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
    });
};

/**
 * Obtiene todos los productos guardados en caché local
 */
export const getCachedProducts = async () => {
    const db = await initOfflineDB();
    if (!db) return [];

    return new Promise((resolve, reject) => {
        const tx = db.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
};

/**
 * Encola una venta realizada en modo offline / contingencia
 */
export const queueOfflineSale = async (saleRequest, fullCart = []) => {
    const db = await initOfflineDB();
    if (!db) throw new Error('IndexedDB no disponible');

    const offlineReference = `CONT-OFF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const offlineCreatedAt = new Date().toISOString();

    const offlineRecord = {
        offlineReference,
        offlineCreatedAt,
        status: 'PENDING_SYNC',
        request: {
            ...saleRequest,
            offlineReference,
            offlineCreatedAt
        },
        cart: fullCart,
        totalAmount: saleRequest.amountPaid || fullCart.reduce((acc, i) => acc + (i.precio * i.quantity), 0),
        createdAt: offlineCreatedAt
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(['offline_sales', 'products'], 'readwrite');
        const salesStore = tx.objectStore('offline_sales');
        const productStore = tx.objectStore('products');

        salesStore.put(offlineRecord);

        // Descontar existencias provisionales en caché local
        fullCart.forEach(item => {
            const getReq = productStore.get(item.id);
            getReq.onsuccess = () => {
                const prod = getReq.result;
                if (prod) {
                    prod.cantidad = Math.max(0, (prod.cantidad || 0) - item.quantity);
                    productStore.put(prod);
                }
            };
        });

        tx.oncomplete = () => {
            // Estructura compatible para impresión de recibo térmico de contingencia
            const completedOfflineSale = {
                id: offlineReference,
                isOfflineContingency: true,
                offlineReference,
                saleDate: offlineCreatedAt,
                customerName: saleRequest.customerName || 'Consumidor Final',
                customerDoc: saleRequest.customerDoc || '222222222222',
                paymentMethod: saleRequest.paymentMethod,
                totalAmount: offlineRecord.totalAmount,
                amountPaid: saleRequest.amountPaid,
                changeAmount: Math.max(0, (saleRequest.amountPaid || 0) - offlineRecord.totalAmount),
                items: fullCart.map(item => ({
                    id: item.id,
                    productId: item.id,
                    product: item,
                    quantity: item.quantity,
                    unitPrice: item.precio,
                    subTotal: item.precio * item.quantity
                })),
                invoice: {
                    invoiceNumber: `CONTINGENCIA-${offlineReference.slice(-6)}`,
                    isOffline: true
                }
            };
            resolve(completedOfflineSale);
        };

        tx.onerror = (e) => reject(e.target.error);
    });
};

/**
 * Obtiene la lista de ventas offline pendientes de sincronizar
 */
export const getPendingOfflineSales = async () => {
    const db = await initOfflineDB();
    if (!db) return [];

    return new Promise((resolve, reject) => {
        const tx = db.transaction('offline_sales', 'readonly');
        const store = tx.objectStore('offline_sales');
        const request = store.getAll();

        request.onsuccess = () => {
            const all = request.result || [];
            resolve(all.filter(s => s.status === 'PENDING_SYNC'));
        };
        request.onerror = (e) => reject(e.target.error);
    });
};

/**
 * Retorna la cantidad de ventas pendientes en cola
 */
export const getPendingCount = async () => {
    const list = await getPendingOfflineSales();
    return list.length;
};

/**
 * Elimina una venta offline tras sincronizarse exitosamente con el backend
 */
export const removeOfflineSale = async (offlineReference) => {
    const db = await initOfflineDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
        const tx = db.transaction('offline_sales', 'readwrite');
        const store = tx.objectStore('offline_sales');
        store.delete(offlineReference);

        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
    });
};
