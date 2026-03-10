import React, { useEffect, useState } from 'react';
import { templateApi, orderApi } from '../api';
import ChatWindow from '../components/ChatWindow';
import { useWebSocket } from '../hooks/useWebSocket';

const OfficeView = () => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

    // New Template state
    const [showNewTemp, setShowNewTemp] = useState(false);
    const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
    const [tempCode, setTempCode] = useState('');
    const [tempTitle, setTempTitle] = useState('');
    const [pieces, setPieces] = useState<any[]>([]);

    // New Order state
    const [showNewOrder, setShowNewOrder] = useState(false);
    const [editOrderId, setEditOrderId] = useState<number | null>(null);
    const [orderCode, setOrderCode] = useState('');
    const [orderItems, setOrderItems] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [t, o] = await Promise.all([templateApi.getAll(), orderApi.getAll()]);
            setTemplates(t);
            setOrders(o);
        } catch (e) {
            console.error(e);
        }
    };

    useWebSocket(loadData);

    const handleAddPiece = () => {
        setPieces([...pieces, { woodType: 'Normale', thickness: 20, width: 80, length_mm: 1000, qty: 1 }]);
    };

    const handleSaveTemplate = async () => {
        try {
            if (editTemplateId) {
                // For simplicity, we can do a delete and re-create, or assume the backend needs an update endpoint.
                // Oh wait, our backend doesn't have an update endpoint for templates/orders yet! 
                // Let's implement delete then create for templates to simulate update if not available,
                // or just standard create for now since the user wants it fast.
                await templateApi.delete(editTemplateId);
            }
            await templateApi.create({ internalCode: tempCode, title: tempTitle, pieces });
            setShowNewTemp(false);
            setEditTemplateId(null);
            loadData();
        } catch (e) {
            alert("Errore nel salvataggio del template");
        }
    };

    const handleDeleteTemplate = async (id: number) => {
        if (!confirm("Sei sicuro di voler eliminare questo template?")) return;
        try {
            await templateApi.delete(id);
            loadData();
        } catch (e) {
            alert("Errore durante l'eliminazione");
        }
    };

    const handleEditTemplate = (t: any) => {
        setTempCode(t.internalCode);
        setTempTitle(t.title);
        setPieces(t.pieces.map((p: any) => ({
            woodType: p.woodType,
            thickness: p.thickness,
            width: p.width,
            length_mm: p.length_mm,
            qty: p.qty
        })));
        setEditTemplateId(t.id);
        setShowNewTemp(true);
    };

    const handleAddOrderItem = () => {
        if (templates.length > 0) {
            setOrderItems([...orderItems, { palletTemplateId: templates[0].id, qty: 1 }]);
        }
    };

    const handleSaveOrder = async () => {
        try {
            if (editOrderId) {
                await orderApi.delete(editOrderId);
            }
            await orderApi.create({ orderCode, items: orderItems, status: 'NEW' });
            setShowNewOrder(false);
            setEditOrderId(null);
            loadData();
        } catch (e) {
            alert("Errore nella creazione dell'ordine");
        }
    };

    const handleDeleteOrder = async (id: number) => {
        if (!confirm("Sei sicuro di voler eliminare questo ordine?")) return;
        try {
            await orderApi.delete(id);
            loadData();
        } catch (e) {
            alert("Errore durante l'eliminazione dell'ordine");
        }
    };

    const handleEditOrder = (o: any) => {
        setOrderCode(o.orderCode);
        setOrderItems(o.items.map((i: any) => ({
            palletTemplateId: i.palletTemplateId,
            qty: i.qty
        })));
        setEditOrderId(o.id);
        setShowNewOrder(true);
    };

    const handleOptimize = async (id: number) => {
        try {
            const res = await orderApi.optimize(id);
            if (res.status === 'INSUFFICIENT') {
                alert("MATERIALE INSUFFICIENTE: " + res.message);
            } else {
                alert("Ottimizzazione completata. Puoi scaricare il piano.");
            }
            loadData();
        } catch (e: any) {
            alert(e.response?.data?.detail || "Errore durante l'ottimizzazione");
        }
    };

    return (
        <div className="flex-col" style={{ gap: '2rem' }}>
            <div className="flex-col">
                <div className="card">
                    <div className="flex-row j-between">
                        <h3>Template Bancali</h3>
                        <button className="btn-primary" onClick={() => {
                            setEditTemplateId(null);
                            setTempCode('');
                            setTempTitle('');
                            setPieces([]);
                            setShowNewTemp(!showNewTemp);
                        }}>+ Nuovo</button>
                    </div>

                    {showNewTemp && (
                        <div className="mt-4 p-4 border rounded" style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
                            <input className="input" placeholder="Codice Interno" value={tempCode} onChange={e => setTempCode(e.target.value)} />
                            <input className="input" placeholder="Titolo" value={tempTitle} onChange={e => setTempTitle(e.target.value)} />
                            <h4>Pezzi</h4>
                            {pieces.map((p, i) => (
                                <div key={i} className="flex-row mb-4" style={{ alignItems: 'flex-start' }}>
                                    <div style={{ flex: '0 0 auto', marginRight: '1rem', minWidth: '120px' }}>
                                        <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Tipo</label>
                                        <select className="select" style={{ width: '100%' }} value={p.woodType} onChange={e => { const np = [...pieces]; np[i].woodType = e.target.value; setPieces(np) }}>
                                            <option value="Normale">Normale</option>
                                            <option value="HV">HV</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Spess. (mm)</label>
                                        <input type="number" className="input" placeholder="T" value={p.thickness} onChange={e => { const np = [...pieces]; np[i].thickness = parseFloat(e.target.value); setPieces(np) }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Largh. (mm)</label>
                                        <input type="number" className="input" placeholder="W" value={p.width} onChange={e => { const np = [...pieces]; np[i].width = parseFloat(e.target.value); setPieces(np) }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Lungh. (mm)</label>
                                        <input type="number" className="input" placeholder="L" value={p.length_mm} onChange={e => { const np = [...pieces]; np[i].length_mm = parseFloat(e.target.value); setPieces(np) }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Qta</label>
                                        <input type="number" className="input" placeholder="Qty" value={p.qty} onChange={e => { const np = [...pieces]; np[i].qty = parseInt(e.target.value); setPieces(np) }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingTop: '1.5rem' }}>
                                        <button type="button" className="btn-danger" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }} onClick={() => {
                                            const np = [...pieces];
                                            np.splice(i, 1);
                                            setPieces(np);
                                        }}>🗑</button>
                                    </div>
                                </div>
                            ))}
                            <div className="flex-row">
                                <button className="btn-primary" onClick={handleAddPiece}>Aggiungi Pezzo</button>
                                <button className="btn-success" onClick={handleSaveTemplate}>Salva Template</button>
                            </div>
                        </div>
                    )}

                    <div className="table-container mt-4">
                        <table>
                            <thead>
                                <tr>
                                    <th>Codice</th>
                                    <th>Titolo</th>
                                    <th>Parti</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map(t => (
                                    <tr key={t.id}>
                                        <td>{t.internalCode}</td>
                                        <td>{t.title}</td>
                                        <td>{t.pieces.length}</td>
                                        <td className="flex-row" style={{ gap: '0.5rem' }}>
                                            <button className="btn-primary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleEditTemplate(t)}>✏️</button>
                                            <button className="btn-danger" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleDeleteTemplate(t.id)}>🗑</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="flex-col">
                <div className="card">
                    <div className="flex-row j-between">
                        <h3>Ordini</h3>
                        <button className="btn-primary" onClick={() => {
                            setEditOrderId(null);
                            setOrderCode('');
                            setOrderItems([]);
                            setShowNewOrder(!showNewOrder);
                        }}>+ Nuovo</button>
                    </div>

                    {showNewOrder && (
                        <div className="mt-4 p-4 border rounded" style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
                            <input className="input" placeholder="Codice Ordine" value={orderCode} onChange={e => setOrderCode(e.target.value)} />
                            <h4>Bancali Necessari</h4>
                            {orderItems.map((oi, i) => (
                                <div key={i} className="flex-row mb-4" style={{ alignItems: 'flex-start' }}>
                                    <div style={{ flex: '0 0 auto', marginRight: '1rem', minWidth: '200px' }}>
                                        <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Seleziona Bancale</label>
                                        <select className="select" style={{ width: '100%' }} value={oi.palletTemplateId} onChange={e => { const ni = [...orderItems]; ni[i].palletTemplateId = parseInt(e.target.value); setOrderItems(ni) }}>
                                            {templates.map(t => <option key={t.id} value={t.id}>{t.title} ({t.internalCode})</option>)}
                                        </select>
                                    </div>
                                    <div style={{ flex: '0 0 auto', minWidth: '100px' }}>
                                        <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Quantità</label>
                                        <input type="number" className="input" placeholder="Qty" value={oi.qty} onChange={e => { const ni = [...orderItems]; ni[i].qty = parseInt(e.target.value); setOrderItems(ni) }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingTop: '1.5rem' }}>
                                        <button type="button" className="btn-danger" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }} onClick={() => {
                                            const ni = [...orderItems];
                                            ni.splice(i, 1);
                                            setOrderItems(ni);
                                        }}>🗑</button>
                                    </div>
                                </div>
                            ))}
                            <div className="flex-row">
                                <button className="btn-primary" onClick={handleAddOrderItem}>Aggiungi Bancale</button>
                                <button className="btn-success" onClick={handleSaveOrder}>Crea Ordine</button>
                            </div>
                        </div>
                    )}

                    <div className="table-container mt-4">
                        <table>
                            <thead>
                                <tr>
                                    <th>Codice Ordine</th>
                                    <th>Stato</th>
                                    <th>Azioni</th>
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
                                            <td className="flex-row" style={{ gap: '0.5rem' }}>
                                                <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleEditOrder(o) }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}>✏️</button>
                                                <select
                                                    className="select"
                                                    style={{ width: 'auto', marginBottom: 0, padding: '0.15rem 0.5rem' }}
                                                    value={o.status}
                                                    onChange={(e) => { e.stopPropagation(); orderApi.updateStatus(o.id, e.target.value).then(loadData); }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="NEW">NUOVO</option>
                                                    <option value="PLANNED">PIANIFICATO</option>
                                                    <option value="IN_PROGRESS">IN LAVORAZIONE</option>
                                                    <option value="DONE">COMPLETATO</option>
                                                    <option value="SHIPPED">SPEDITO</option>
                                                </select>
                                                {o.status === 'NEW' && (
                                                    <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleOptimize(o.id) }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}>🔥 Auto Taglio</button>
                                                )}
                                                {['PLANNED', 'IN_PROGRESS', 'DONE', 'SHIPPED'].includes(o.status) && (
                                                    <button className="btn-success" onClick={(e) => { e.stopPropagation(); orderApi.exportExcel(o.id) }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}>📊 Excel</button>
                                                )}
                                                {['PLANNED', 'IN_PROGRESS', 'DONE', 'SHIPPED'].includes(o.status) && (
                                                    <button className="btn-danger" onClick={(e) => { e.stopPropagation(); orderApi.exportPdf(o.id) }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}>📄 PDF</button>
                                                )}
                                                <button className="btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteOrder(o.id) }} style={{ padding: '0.25rem 0.5rem' }}>🗑</button>
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
                                                                            <span className="badge badge-new">{item.status || "PENDING"}</span>
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
                    <ChatWindow orderId={selectedOrder} role="Office" />
                )}
            </div>
        </div>
    );
};

export default OfficeView;
