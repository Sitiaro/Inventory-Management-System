import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Customers from "./pages/Customers.jsx";
import Orders from "./pages/Orders.jsx";

function NavItem({ to, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} end>
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">📦 Inventory & Orders</div>
        <nav className="nav-links">
          <NavItem to="/" label="Dashboard" />
          <NavItem to="/products" label="Products" />
          <NavItem to="/customers" label="Customers" />
          <NavItem to="/orders" label="Orders" />
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </main>
    </div>
  );
}
