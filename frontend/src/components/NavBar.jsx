import { useState } from "react";
import { NavLink } from "react-router-dom";

const LINKS = [
    { to: "/", label: "হোম" },
    { to: "/search", label: "পণ্য খুঁজুন" },
    { to: "/forecast", label: "দাম ফোরকাস্ট" },
    { to: "/fair-price", label: "ঠিক দাম?" },
    { to: "/markets", label: "বাজার তুলনা" },
    { to: "/basket", label: "বাজার লিস্ট" },
    { to: "/assistant", label: "AI সহকারী" },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <header style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(245, 250, 239, 0.86)",
            backdropFilter: "blur(22px)",
            borderBottom: "1px solid var(--lemon-border)",
            boxShadow: "0 10px 30px rgba(47, 93, 40, 0.08)",
        }}>
            <div style={{
                maxWidth: 1220,
                margin: "0 auto",
                padding: "0 20px",
                display: "flex",
                alignItems: "center",
                minHeight: 72,
                gap: 14,
            }}>
                <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 4 }}>
                    <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: 16,
                        display: "grid",
                        placeItems: "center",
                        background: "linear-gradient(135deg, var(--hero-heading), var(--hero-primary))",
                        color: "white",
                        fontSize: 21,
                        boxShadow: "0 14px 30px rgba(109, 182, 76, 0.28)",
                    }}>
                        🧺
                    </div>
                    <div style={{ lineHeight: 1 }}>
                        <div style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 950,
                            color: "var(--hero-heading)",
                            letterSpacing: "-0.6px",
                            fontSize: 20,
                        }}>
                            কি বাজার করবো?
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--gray-500)", fontWeight: 900, letterSpacing: "0.8px", textTransform: "uppercase" }}>
                            AI বাজার সহকারী
                        </div>
                    </div>
                </NavLink>

                <nav className="desktop-nav" style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 5,
                    flex: 1,
                }}>
                    {LINKS.map((l) => (
                        <NavLink
                            key={l.to}
                            to={l.to}
                            end={l.to === "/"}
                            style={({ isActive }) => ({
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                color: isActive ? "white" : "var(--gray-600)",
                                background: isActive ? "linear-gradient(135deg, var(--hero-heading), var(--hero-primary))" : "transparent",
                                boxShadow: isActive ? "0 12px 24px rgba(109, 182, 76, 0.20)" : "none",
                                fontWeight: 850,
                                fontSize: 15,
                                padding: "9px 11px",
                                borderRadius: 999,
                                transition: "all 0.16s ease",
                                whiteSpace: "nowrap",
                            })}
                        >
                            <span>{l.icon}</span>
                            {l.label}
                        </NavLink>
                    ))}
                </nav>

                <button
                    className="hamburger"
                    onClick={() => setOpen((o) => !o)}
                    aria-label="মেনু খুলুন"
                    style={{
                        marginLeft: "auto",
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        border: "1px solid var(--lemon-border)",
                        background: "white",
                        color: "var(--hero-heading)",
                        fontSize: 20,
                        display: "none",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {open ? "✕" : "☰"}
                </button>
            </div>

            {open && (
                <div style={{ maxWidth: 1220, margin: "0 auto", padding: "0 20px 18px" }}>
                    <div className="glass-card" style={{ padding: 8, display: "grid", gap: 4 }}>
                        {LINKS.map((l) => (
                            <NavLink
                                key={l.to}
                                to={l.to}
                                end={l.to === "/"}
                                onClick={() => setOpen(false)}
                                style={({ isActive }) => ({
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "12px 13px",
                                    borderRadius: 14,
                                    color: isActive ? "white" : "var(--gray-700)",
                                    background: isActive ? "linear-gradient(135deg, var(--hero-heading), var(--hero-primary))" : "transparent",
                                    fontWeight: 850,
                                })}
                            >
                                <span>{l.icon}</span>{l.label}
                            </NavLink>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                @media (max-width: 920px) {
                    .desktop-nav { display: none !important; }
                    .hamburger { display: flex !important; }
                }
            `}</style>
        </header>
    );
}