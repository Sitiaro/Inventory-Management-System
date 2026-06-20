import { useEffect, useState } from "react";
import Modal from "../components/Modal.jsx";
import { CustomersApi, extractError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

const EMPTY = { full_name: "", email: "", phone: "" };

function validate(form) {
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = "Full name is required";
  if (!form.email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email";
  if (!form.phone.trim()) errors.phone = "Phone number is required";
  return errors;
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    CustomersApi.list()
      .then(setCustomers)
      .catch((e) => toast.error(extractError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setForm(EMPTY);
    setErrors({});
    setShowModal(true);
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    try {
      await CustomersApi.create({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      toast.success("Customer created");
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete customer "${c.full_name}"?`)) return;
    try {
      await CustomersApi.remove(c.id);
      toast.success("Customer deleted");
      setCustomers((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn" onClick={openCreate}>
          + Add Customer
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading customers…</div>
      ) : customers.length === 0 ? (
        <div className="empty">No customers yet. Add your first customer.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.full_name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Add Customer" onClose={() => setShowModal(false)}>
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label>Full Name</label>
              <input name="full_name" value={form.full_name} onChange={onChange} placeholder="Jane Doe" />
              {errors.full_name && <span className="error-text">{errors.full_name}</span>}
            </div>
            <div className="field">
              <label>Email</label>
              <input name="email" value={form.email} onChange={onChange} placeholder="jane@example.com" />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            <div className="field">
              <label>Phone</label>
              <input name="phone" value={form.phone} onChange={onChange} placeholder="+1 555 123 4567" />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Saving…" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
