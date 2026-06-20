import { useEffect, useState } from "react";
import Modal from "../components/Modal.jsx";
import { ProductsApi, extractError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

const EMPTY = { name: "", sku: "", price: "", quantity: "" };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.sku.trim()) errors.sku = "SKU is required";
  if (form.price === "" || Number(form.price) < 0) errors.price = "Price must be 0 or more";
  if (form.quantity === "" || !Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0)
    errors.quantity = "Quantity must be a whole number ≥ 0";
  return errors;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    ProductsApi.list()
      .then(setProducts)
      .catch((e) => toast.error(extractError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, price: p.price, quantity: p.quantity });
    setErrors({});
    setShowModal(true);
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
    };

    setSaving(true);
    try {
      if (editing) {
        await ProductsApi.update(editing.id, payload);
        toast.success("Product updated");
      } else {
        await ProductsApi.create(payload);
        toast.success("Product created");
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete product "${p.name}"?`)) return;
    try {
      await ProductsApi.remove(p.id);
      toast.success("Product deleted");
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <button className="btn" onClick={openCreate}>
          + Add Product
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="empty">No products yet. Add your first product.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>${Number(p.price).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${p.quantity <= 10 ? "badge-low" : "badge-ok"}`}>
                      {p.quantity}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>
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

      {showModal && (
        <Modal title={editing ? "Edit Product" : "Add Product"} onClose={() => setShowModal(false)}>
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label>Product Name</label>
              <input name="name" value={form.name} onChange={onChange} placeholder="e.g. Wireless Mouse" />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
            <div className="field">
              <label>SKU / Code</label>
              <input name="sku" value={form.sku} onChange={onChange} placeholder="e.g. WM-001" />
              {errors.sku && <span className="error-text">{errors.sku}</span>}
            </div>
            <div className="form-row">
              <div className="field">
                <label>Price</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={onChange}
                  placeholder="0.00"
                />
                {errors.price && <span className="error-text">{errors.price}</span>}
              </div>
              <div className="field">
                <label>Quantity in Stock</label>
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantity}
                  onChange={onChange}
                  placeholder="0"
                />
                {errors.quantity && <span className="error-text">{errors.quantity}</span>}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
