import { useEffect, useState } from "react";
import { DashboardApi, extractError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

function Stat({ label, value, warn }) {
  return (
    <div className={`stat-card ${warn ? "warn" : ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    DashboardApi.get()
      .then(setData)
      .catch((e) => toast.error(extractError(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard…</div>;
  if (!data) return <div className="empty">Could not load dashboard.</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-grid">
        <Stat label="Total Products" value={data.total_products} />
        <Stat label="Total Customers" value={data.total_customers} />
        <Stat label="Total Orders" value={data.total_orders} />
        <Stat label="Low Stock Items" value={data.low_stock_count} warn={data.low_stock_count > 0} />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>
          Low Stock Products{" "}
          <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 400 }}>
            (≤ {data.low_stock_threshold} in stock)
          </span>
        </h2>
        {data.low_stock_products.length === 0 ? (
          <p className="muted">All products are well stocked. 🎉</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>In Stock</th>
                </tr>
              </thead>
              <tbody>
                {data.low_stock_products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.sku}</td>
                    <td>${Number(p.price).toFixed(2)}</td>
                    <td>
                      <span className="badge badge-low">{p.quantity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
