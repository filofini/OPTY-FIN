import React, { useEffect, useState } from 'react';
import { stockApi, orderApi } from '../api';
import ChatWindow from '../components/ChatWindow';
import { useWebSocket } from '../hooks/useWebSocket';

const ProductionView = () => {
    const [stock, setStock] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

    const [showAddStock, setShowAddStock] = useState(false);
    const [editStockId, setEditStockId] = useState<number | null>(null);
    const [newStock, setNewStock] = useState({
        woodType: 'Normale', thickness: 20, width: 80, length_mm: 4000, qty: 1, source: 'PURCHASE', note: ''
    });

    // Scanner input state
    const [scannerInput, setScannerInput] = useState('');
    const [cuttingLots, setCuttingLots] = useState<number[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [s, o] = await Promise.all([stockApi.getAll(), orderApi.getAll()]);
            setStock(s);
            setOrders(o);
        } catch (e) {
            console.error("Failed to load data", e);
        }
    };

    useWebSocket(loadData);

    const handleCreateStock = async () => {
        try {
            let res;
            if (editStockId) {
                res = await stockApi.update(editStockId, newStock);
            } else {
                res = await stockApi.create(newStock);
            }
            setShowAddStock(false);
            setEditStockId(null);
            loadData();

            if (!editStockId && res && res.id) {
                alert(`Nuovo Lotto aggiunto con successo!\nCodice a Barre (da copiare): LOT-${res.id}\n\nIl PDF con l'etichetta verrà scaricato automaticamente.`);
                stockApi.exportPdf(res.id);
            }
        } catch (e) {
            alert("Errore nel salvataggio dello stock");
        }
    };

    const handleDeleteStock = async (id: number) => {
        if (!confirm("Sei sicuro di voler eliminare questo stock?")) return;
        try {
            await stockApi.delete(id);
            loadData();
        } catch (e) {
            alert("Errore nell'eliminazione dello stock");
        }
    };

    const handleEditStock = (s: any) => {
        setNewStock({
            woodType: s.woodType,
            thickness: s.thickness,
            width: s.width,
            length_mm: s.length_mm,
            qty: s.qty,
            source: s.source,
            note: s.note || ''
        });
        setEditStockId(s.id);
        setShowAddStock(true);
    };

    const updateOrderStatus = async (id: number, status: string) => {
        try {
            await orderApi.updateStatus(id, status);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleScannerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = scannerInput.trim();
        if (!code) return;

        try {
            if (code.startsWith("LOT-")) {
                const parts = code.split("-");
                if (parts.length === 2) {
                    const stockId = parseInt(parts[1]);
                    const item = stock.find(s => s.id === stockId);
                    if (item) {
                        handleEditStock(item);
                    } else {
                        alert("Lotto non trovato in magazzino.");
                    }
                }
            } else if (code.startsWith("ORDPLT-")) {
                const parts = code.split("-");
                if (parts.length === 3) {
                    const orderId = parseInt(parts[1]);
                    const itemId = parseInt(parts[2]);

                    // Highlight or fetch that specific order
                    setSelectedOrder(orderId);

                    // Ensure the order item moves to the next logical status, or just notify user
                    alert(`Ordine ${orderId} - Bancale ${itemId} trovato. Usa il menu a tendina per cambiare lo stato di questo lotto nel pannello ordine.`);
                }
            } else {
                alert("Codice a barre non riconosciuto.");
            }
        } catch (err: any) {
            alert(err.response?.data?.detail || "Errore durante la scansione");
        }
        setScannerInput('');
    };

    const handleCutStock = async (id: number) => {
        try {
            setCuttingLots(prev => [...prev, id]);
            setShowAddStock(false);
            setEditStockId(null);

            await stockApi.consume(id);
            loadData();

            setTimeout(async () => {
                try {
                    await stockApi.delete(id);
                    setCuttingLots(prev => prev.filter(x => x !== id));
                    loadData();
                } catch (err) {
                    console.error("Errore eliminazione lotto dopo il taglio:", err);
                }
            }, 20000);
        } catch (e) {
            alert("Errore durante il taglio");
        }
    };

    return (
        <div className="flex-col" style={{ gap: '2rem' }}>
            <div className="flex-col">
                <div className="card">
                    <div className="flex-row j-between" style={{ marginBottom: '1.5rem', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>Rimanenze di Magazzino</h3>

                        <form onSubmit={handleScannerSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '400px', marginLeft: '2rem' }}>
                            <input
                                autoFocus
                                className="input"
                                style={{ marginBottom: 0 }}
                                placeholder="🔫 Scansiona Codice a Barre..."
                                value={scannerInput}
                                onChange={e => setScannerInput(e.target.value)}
                            />
                            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Scannerizza</button>
                        </form>

                        <button className="btn-success" onClick={() => {
                            setEditStockId(null);
                            setNewStock({ woodType: 'A', thickness: 20, width: 80, length_mm: 4000, qty: 1, source: 'PURCHASE', note: '' });
                            setShowAddStock(!showAddStock);
                        }}>+ Aggiungi</button>
                    </div>

                    {showAddStock && (
                        <div className="mt-4 p-4 border rounded" style={{ border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '12px' }}>
                            <div className="flex-row mb-4" style={{ alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Tipo Legno</label>
                                    <select className="select" style={{ width: '100%' }} value={newStock.woodType} onChange={e => setNewStock({ ...newStock, woodType: e.target.value })}>
                                        <option value="Normale">Normale</option>
                                        <option value="HV">HV</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Spess. (mm)</label>
                                    <input type="number" className="input" placeholder="T" value={newStock.thickness} onChange={e => setNewStock({ ...newStock, thickness: parseFloat(e.target.value) })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Largh. (mm)</label>
                                    <input type="number" className="input" placeholder="W" value={newStock.width} onChange={e => setNewStock({ ...newStock, width: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div className="flex-row mb-4" style={{ alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Lunghezza (mm)</label>
                                    <input type="number" className="input" placeholder="L (mm)" value={newStock.length_mm} onChange={e => setNewStock({ ...newStock, length_mm: parseFloat(e.target.value) })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Qta (Pezzi)</label>
                                    <input type="number" className="input" placeholder="Qty" value={newStock.qty} onChange={e => setNewStock({ ...newStock, qty: parseInt(e.target.value) })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Fonte</label>
                                    <select className="select" value={newStock.source} onChange={e => setNewStock({ ...newStock, source: e.target.value })}>
                                        <option value="PURCHASE">PURCHASE</option>
                                        <option value="OFFCUT">OFFCUT</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex-row" style={{ gap: '1rem' }}>
                                <button className="btn-primary" onClick={handleCreateStock} style={{ flex: 1, padding: '0.75rem', fontSize: '1rem' }}>
                                    {editStockId ? 'Aggiorna Magazzino' : 'Salva in Magazzino'}
                                </button>
                                {editStockId && (
                                    <button
                                        type="button"
                                        className="btn-success"
                                        onClick={() => handleCutStock(editStockId)}
                                        style={{ flex: 1, padding: '0.75rem', fontSize: '1rem' }}>
                                        ✂️ Taglia Lotto
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="table-container mt-4" style={{ overflowX: 'auto', width: '100%', minWidth: '100%' }}>
                        <table style={{ minWidth: 'max-content' }}>
                            <thead>
                                <tr>
                                    <th>Sezione</th>
                                    <th>Lunghezza</th>
                                    <th>Qta</th>
                                    <th>Fonte</th>
                                    <th>Note</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stock.map(s => {
                                    const isCutting = cuttingLots.includes(s.id);
                                    return (
                                        <tr key={s.id} style={{ opacity: isCutting ? 0.6 : 1, transition: 'all 0.5s' }}>
                                            <td>
                                                <strong>LOT-{s.id}</strong><br />
                                                {s.woodType} {s.thickness}x{s.width}
                                            </td>
                                            <td>{s.length_mm} mm</td>
                                            <td>{isCutting ? 0 : s.qty}</td>
                                            <td>
                                                {isCutting ? (
                                                    <span className="badge badge-success" style={{ backgroundColor: '#10b981', color: 'white' }}>TAGLIATO</span>
                                                ) : (
                                                    <span className={`badge ${s.source === 'PURCHASE' ? 'badge-progress' : 'badge-new'}`}>{s.source}</span>
                                                )}
                                            </td>
                                            <td>{s.note}</td>
                                            <td className="flex-row" style={{ gap: '0.5rem' }}>
                                                <button className="btn-secondary" onClick={() => stockApi.exportPdf(s.id)} disabled={isCutting} style={{ padding: '0.25rem 0.5rem', backgroundColor: isCutting ? '#9ca3af' : '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>📄 Stampa PDF</button>
                                                <button className="btn-primary" onClick={() => handleEditStock(s)} disabled={isCutting} style={{ padding: '0.25rem 0.5rem', opacity: isCutting ? 0.5 : 1 }}>✏️</button>
                                                <button className="btn-danger" onClick={() => handleDeleteStock(s.id)} disabled={isCutting} style={{ padding: '0.25rem 0.5rem', opacity: isCutting ? 0.5 : 1 }}>🗑</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="flex-col">
                <div className="card">
                    <h3>Ordini di Produzione</h3>
                    <div className="table-container mt-4">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ordine</th>
                                    <th>Stato</th>
                                    <th>Azione</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(o => (
                                    <React.Fragment key={o.id}>
                                        <tr style={{ backgroundColor: selectedOrder === o.id ? 'var(--bg-card-hover)' : 'transparent' }} onClick={() => setSelectedOrder(o.id)}>
                                            <td style={{ cursor: 'pointer' }}>
                                                <strong>{o.orderCode}</strong>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    {o.items?.length || 0} Tipi di Bancali
                                                </div>
                                            </td>
                                            <td><span className={`badge badge-${o.status.toLowerCase()}`}>{o.status}</span></td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <select
                                                    className="select"
                                                    style={{ marginBottom: 0, padding: "0.25rem" }}
                                                    value={o.status}
                                                    onChange={(e) => { e.stopPropagation(); updateOrderStatus(o.id, e.target.value); }}
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <option value="NEW">NUOVO</option>
                                                    <option value="PLANNED">PIANIFICATO</option>
                                                    <option value="IN_PROGRESS">IN LAVORAZIONE</option>
                                                    <option value="DONE">COMPLETATO</option>
                                                    <option value="SHIPPED">SPEDITO</option>
                                                </select>
                                            </td>
                                        </tr>
                                        {selectedOrder === o.id && o.items && o.items.length > 0 && (
                                            <tr>
                                                <td colSpan={3} style={{ padding: 0, borderBottom: 'none' }}>
                                                    <div style={{ background: 'var(--bg-custom)', padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                                        <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>Stato Bancali</h5>
                                                        <table style={{ width: '100%', fontSize: '0.9rem' }}>
                                                            <tbody>
                                                                {o.items.map((item: any) => (
                                                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                                        <td style={{ padding: '0.5rem 0' }}>Template #{item.palletTemplateId}</td>
                                                                        <td style={{ padding: '0.5rem 0' }}>Qty: {item.qty}</td>
                                                                        <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>
                                                                            <select
                                                                                className="select"
                                                                                style={{ width: 'auto', marginBottom: 0, padding: '0.15rem 0.5rem' }}
                                                                                value={item.status || "PENDING"}
                                                                                onClick={e => e.stopPropagation()}
                                                                                onChange={async (e) => {
                                                                                    e.stopPropagation();
                                                                                    try {
                                                                                        await orderApi.updateItemStatus(o.id, item.id, e.target.value);
                                                                                        loadData();
                                                                                    } catch (err) { console.error(err); }
                                                                                }}
                                                                            >
                                                                                <option value="PENDING">IN ATTESA</option>
                                                                                <option value="CUTTING">IN TAGLIO</option>
                                                                                <option value="ASSEMBLING">IN ASSEMBLAGGIO</option>
                                                                                <option value="READY">PRONTO</option>
                                                                            </select>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {selectedOrder && (
                    <ChatWindow orderId={selectedOrder} role="Production" />
                )}
            </div>
        </div>
    );
};

export default ProductionView;
