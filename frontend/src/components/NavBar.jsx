import { useState } from "react";
import { NavLink } from "react-router-dom";
import logo from "../logo2.jpg";

const LINKS = [
    { to: "/", label: "হোম" },
    { to: "/search", label: "পণ্য খুঁজুন" },
    { to: "/forecast", label: "ফোরকাস্ট" },
    { to: "/fair-price", label: "ঠিক দাম?" },
    { to: "/markets", label: "বাজার তুলনা" },
    { to: "/basket", label: "বাজার লিস্ট" },
    { to: "/assistant", label: "AI সহকারী" },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <header className="app-header">
            <div className="nav-inner">
                <NavLink to="/" className="brand-link" onClick={() => setOpen(false)}>
                    <div className="brand-logo">
                        <img src={logo} alt="কি বাজার করবো?" />
                    </div>

                    <div className="brand-title">কি বাজার করবো?</div>
                </NavLink>

                <nav className="desktop-nav">
                    {LINKS.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === "/"}
                            className={({ isActive }) =>
                                `nav-link ${isActive ? "active" : ""}`
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <button
                    className="hamburger"
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    aria-label="মেনু"
                >
                    {open ? "✕" : "☰"}
                </button>
            </div>

            {open && (
                <div className="mobile-nav-wrap">
                    <nav className="mobile-nav-card">
                        {LINKS.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.to === "/"}
                                onClick={() => setOpen(false)}
                                className={({ isActive }) =>
                                    `mobile-nav-link ${isActive ? "active" : ""}`
                                }
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}