import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal.jsx";
import {
  CustomersApi,
  OrdersApi,
  ProductsApi,
  extractError,
} from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([{ product_id: "", quantity: 1 }]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);
  const toast = useToast();

  const productMap = useMemo(
    () => Object.fromEntries(products.map((p) => [String(p.id), p])),
    [products]
  );
  const customerMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [String(c.id), c])),
    [customers]
  );

  const load = () => {
    setLoading(true);
    Promise.all([OrdersApi.list(), ProductsApi.list(), CustomersApi.list()])
      .then(([o, p, c]) => {
        setOrders(o);
        setProducts(p);
        setCustomers(c);
      })
      .catch((e) => toast.error(extractError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Live total preview, mirroring the backend calculation.
  const previewTotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const p = productMap[l.product_id];
      if (!p) return sum;
      return sum + Number(p.price) * Number(l.quantity || 0);
    }, 0);
  }, [lines, productMap]);

  const openCreate = () => {
    setCustomerId("");
    setLines([{ product_id: "", quantity: 1 }]);
    setFormError("");
    setShowCreate(true);
  };

  const updateLine = (i, field, value) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  };
  const addLine = () => setLines((prev) => [...prev, { product_id: "", quantity: 1 }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!customerId) return setFormError("Please select a customer.");
    const validLines = lines.filter((l) => l.product_id && Number(l.quantity) > 0);
    if (validLines.length === 0)
      return setFormError("Add at least one product with a quantity of 1 or more.");

    // Client-side stock check for instant feedback (backend re-validates).
    for (const l of validLines) {
      const p = productMap[l.product_id];
      if (p && Number(l.quantity) > p.quantity) {
        return setFormError(
          `Only ${p.quantity} of "${p.name}" in stock (you requested ${l.quantity}).`
        );
      }
    }

    const payload = {
      customer_id: Number(customerId),
      items: validLines.map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
      })),
    };

    setSaving(true);
    try {
      await OrdersApi.create(payload);
      toast.success("Order created");
      setShowCreate(false);
      load();
    } catch (err) {
      const msg = extractError(err);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (o) => {
    if (!window.confirm(`Delete order #${o.id}? Stock will be returned.`)) return;
    try {
      await OrdersApi.remove(o.id);
      toast.success("Order deleted and stock restored");
      load();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
        <button className="btn" onClick={openCreate}>
          + Create Order
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="empty">No orders yet. Create your first order.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{customerMap[String(o.customer_id)]?.full_name || `Customer ${o.customer_id}`}</td>
                  <td>{o.items.length}</td>
                  <td>${Number(o.total_amount).toFixed(2)}</td>
                  <td>
                    <span className="badge badge-ok">{o.status}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setDetail(o)}>
                        View
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(o)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create order modal */}
      {showCreate && (
        <Modal title="Create Order" onClose={() => setShowCreate(false)}>
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label>Customer</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Products</label>
              {lines.map((l, i) => (
                <div className="line-item" key={i} style={{ marginBottom: 8 }}>
                  <select
                    value={l.product_id}
                    onChange={(e) => updateLine(i, "product_id", e.target.value)}
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                        {p.name} — ${Number(p.price).toFixed(2)} ({p.quantity} in stock)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={l.quantity}
                    onChange={(e) => updateLine(i, "quantity", e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => removeLine(i)}
                    disabled={lines.length === 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="link-btn" onClick={addLine}>
                + Add another product
              </button>
            </div>

            <div className="order-total">Total: ${previewTotal.toFixed(2)}</div>

            {formError && <span className="error-text">{formError}</span>}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Placing…" : "Place Order"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Order detail modal */}
      {detail && (
        <Modal title={`Order #${detail.id}`} onClose={() => setDetail(null)}>
          <p className="muted" style={{ marginTop: 0 }}>
            Customer:{" "}
            <strong>
              {customerMap[String(detail.customer_id)]?.full_name ||
                `Customer ${detail.customer_id}`}
            </strong>
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it) => (
                  <tr key={it.id}>
                    <td>{productMap[String(it.product_id)]?.name || `Product ${it.product_id}`}</td>
                    <td>{it.quantity}</td>
                    <td>${Number(it.unit_price).toFixed(2)}</td>
                    <td>${Number(it.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="order-total">Total: ${Number(detail.total_amount).toFixed(2)}</div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
