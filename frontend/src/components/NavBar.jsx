import { useState } from "react";
import { NavLink } from "react-router-dom";

const LINKS = [
    { to: "/", label: "Dashboard", icon: "📊" },
    { to: "/search", label: "Products", icon: "🔍" },
    { to: "/forecast", label: "Forecast", icon: "📈" },
    { to: "/fair-price", label: "Fair Price", icon: "⚖️" },
    { to: "/markets", label: "Markets", icon: "🏪" },
    { to: "/basket", label: "Basket", icon: "🛒" },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <header style={{
            background: "linear-gradient(135deg, #0f2c6b 0%, #1a56db 100%)",
            boxShadow: "0 2px 12px rgba(15,44,107,0.25)",
            position: "sticky",
            top: 0,
            zIndex: 100,
        }}>
            <div style={{
                maxWidth: 1100,
                margin: "0 auto",
                padding: "0 20px",
                display: "flex",
                alignItems: "center",
                height: 60,
                gap: 8,
            }}>
                {/* Logo */}
                <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
                    <div style={{
                        width: 32, height: 32,
                        background: "rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18,
                        backdropFilter: "blur(4px)",
                    }}>🧠</div>
                    <span style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 18,
                        color: "#fff",
                        letterSpacing: "-0.3px",
                        whiteSpace: "nowrap",
                    }}>
                        MarketMind <span style={{ opacity: 0.7, fontWeight: 500 }}>AI</span>
                    </span>
                </NavLink>

                {/* Desktop nav */}
                <nav style={{
                    display: "flex",
                    gap: 2,
                    flex: 1,
                    justifyContent: "flex-end",
                    alignItems: "center",
                }}
                    className="desktop-nav"
                >
                    {LINKS.map(l => (
                        <NavLink
                            key={l.to}
                            to={l.to}
                            end={l.to === "/"}
                            style={({ isActive }) => ({
                                color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                                fontWeight: isActive ? 600 : 400,
                                fontSize: 13.5,
                                padding: "6px 12px",
                                borderRadius: 6,
                                background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                                transition: "all 0.15s",
                                whiteSpace: "nowrap",
                            })}
                        >
                            {l.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setOpen(o => !o)}
                    aria-label="Toggle menu"
                    style={{
                        background: "rgba(255,255,255,0.15)",
                        border: "none",
                        borderRadius: 6,
                        width: 36, height: 36,
                        display: "none",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 20,
                        marginLeft: "auto",
                        cursor: "pointer",
                    }}
                    className="hamburger"
                >
                    {open ? "✕" : "☰"}
                </button>
            </div>

            {/* Mobile drawer */}
            {open && (
                <div style={{
                    background: "#0f2c6b",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    padding: "12px 20px 16px",
                }}>
                    {LINKS.map(l => (
                        <NavLink
                            key={l.to}
                            to={l.to}
                            end={l.to === "/"}
                            onClick={() => setOpen(false)}
                            style={({ isActive }) => ({
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                                fontWeight: isActive ? 600 : 400,
                                fontSize: 15,
                                padding: "10px 12px",
                                borderRadius: 8,
                                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                                marginBottom: 4,
                            })}
                        >
                            <span style={{ fontSize: 18 }}>{l.icon}</span>
                            {l.label}
                        </NavLink>
                    ))}
                </div>
            )}

            <style>{`
        @media (max-width: 720px) {
          .desktop-nav { display: none !important; }
          .hamburger   { display: flex !important; }
        }
      `}</style>
        </header>
    );
}