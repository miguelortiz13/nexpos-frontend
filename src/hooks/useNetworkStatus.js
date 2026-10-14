import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../api/client';
import {
    getPendingOfflineSales,
    removeOfflineSale,
    getPendingCount,
    cacheProducts
} from '../services/offlineStorage';

export default function useNetworkStatus(onSyncSuccess = null) {
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // Actualizar conteo de ventas pendientes
    const refreshPendingCount = useCallback(async () => {
        try {
            const count = await getPendingCount();
            setPendingCount(count);
        } catch (err) {
            console.error('Error obteniendo conteo de ventas pendientes:', err);
        }
    }, []);

    // Sincronizar cola de ventas offline con el backend
    const syncPendingSales = useCallback(async () => {
        if (!navigator.onLine || isSyncing) return;

        setIsSyncing(true);
        try {
            const pending = await getPendingOfflineSales();
            if (pending.length === 0) {
                setPendingCount(0);
                setIsSyncing(false);
                return;
            }

            toast.info(`Sincronizando ${pending.length} venta(s) guardadas en modo offline...`, { autoClose: 2000 });

            const requests = pending.map(p => p.request);
            const res = await api.post('/api/sales/sync-offline', requests);

            if (res.status === 200) {
                // Eliminar de IndexedDB las ventas confirmadas
                for (const item of pending) {
                    await removeOfflineSale(item.offlineReference);
                }

                // Refrescar catálogo local para tener existencias reales del servidor
                try {
                    const prodRes = await api.get('/api/productos');
                    if (prodRes.data) {
                        await cacheProducts(prodRes.data);
                    }
                } catch {
                    // Ignorar si falla la recarga del catálogo
                }

                setPendingCount(0);
                toast.success(`¡${pending.length} venta(s) de contingencia sincronizadas con éxito!`, { autoClose: 4000 });

                if (onSyncSuccess) {
                    onSyncSuccess();
                }
            }
        } catch (error) {
            console.error('Error durante la sincronización offline:', error);
            toast.error('No se pudieron sincronizar las ventas pendientes. Se reintentará al recuperar conexión estable.');
        } finally {
            setIsSyncing(false);
            await refreshPendingCount();
        }
    }, [isSyncing, onSyncSuccess, refreshPendingCount]);

    useEffect(() => {
        refreshPendingCount();

        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Conexión a internet restablecida. Iniciando sincronización...');
            syncPendingSales();
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast.warn('⚠️ Sin conexión a internet. NexPOS ha activado el MODO CONTINGENCIA OFFLINE.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Intervalo de chequeo periódico cada 30 segundos
        const intervalId = setInterval(() => {
            refreshPendingCount();
            if (navigator.onLine && pendingCount > 0 && !isSyncing) {
                syncPendingSales();
            }
        }, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(intervalId);
        };
    }, [syncPendingSales, refreshPendingCount, pendingCount, isSyncing]);

    return {
        isOnline,
        pendingCount,
        isSyncing,
        syncPendingSales,
        refreshPendingCount
    };
}
