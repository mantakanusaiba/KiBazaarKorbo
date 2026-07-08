import { NavLink } from "react-router-dom";

function IconFacebook() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.2 8.2V6.9c0-.7.3-1.1 1.2-1.1h1.5V3.2c-.7-.1-1.4-.2-2.1-.2-2.3 0-3.9 1.4-3.9 4v1.2H8.4V11h2.5v10h3.3V11h2.4l.4-2.8h-2.8z" />
        </svg>
    );
}

function IconInstagram() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm0 2.8a3 3 0 0 0-3 3v8.4a3 3 0 0 0 3 3h8.4a3 3 0 0 0 3-3V7.8a3 3 0 0 0-3-3H7.8zm4.2 3A4.2 4.2 0 1 1 12 16.2 4.2 4.2 0 0 1 12 7.8zm0 2.7a1.5 1.5 0 1 0 1.5 1.5 1.5 1.5 0 0 0-1.5-1.5zm4.5-3.1a1 1 0 1 1-1 1 1 1 0 0 1 1-1z" />
        </svg>
    );
}

function IconWhatsApp() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12.04 2a9.86 9.86 0 0 0-8.48 14.88L2.3 21.5l4.74-1.24A9.86 9.86 0 1 0 12.04 2zm0 17.9a8 8 0 0 1-4.08-1.12l-.29-.17-2.81.74.75-2.74-.19-.3A8.02 8.02 0 1 1 12.04 19.9zm4.4-5.98c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.31-.74-1.8-.2-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.15-.06-.1-.22-.16-.46-.28z" />
        </svg>
    );
}

function IconWebsite() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 8.7h-3.2a15.5 15.5 0 0 0-1.1-5.1 8 8 0 0 1 4.3 5.1zM12 4.1c.7 1 1.5 3.1 1.7 6.6h-3.4c.2-3.5 1-5.6 1.7-6.6zm-2.6 1.5a15.5 15.5 0 0 0-1.1 5.1H5.1a8 8 0 0 1 4.3-5.1zM4.7 12.7h3.5a16.6 16.6 0 0 0 1.2 5.7 8 8 0 0 1-4.7-5.7zM12 19.9c-.8-1.1-1.6-3.4-1.8-7.2h3.6c-.2 3.8-1 6.1-1.8 7.2zm2.6-1.5a16.6 16.6 0 0 0 1.2-5.7h3.5a8 8 0 0 1-4.7 5.7z" />
        </svg>
    );
}

function SocialLink({ href, label, children }) {
    return (
        <a
            className="footer-social-link"
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            title={label}
        >
            {children}
        </a>
    );
}

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="site-footer">
            <div className="footer-inner">
                <div className="footer-top-simple">
                    <div className="footer-brand-block">
                        <h2>কি বাজার করবো?</h2>

                        <p>
                            বাংলাদেশের বাজার দাম, ফোরকাস্ট, বাজার তুলনা এবং স্মার্ট কেনাকাটার সহকারী।
                        </p>

                        <div className="footer-socials">
                            <SocialLink href="#" label="Facebook">
                                <IconFacebook />
                            </SocialLink>

                            <SocialLink href="#" label="Instagram">
                                <IconInstagram />
                            </SocialLink>

                            <SocialLink
                                href="https://wa.me/8801XXXXXXXXX"
                                label="WhatsApp"
                            >
                                <IconWhatsApp />
                            </SocialLink>

                            <SocialLink
                                href="https://ki-bazaar-korbo-3exbpi4xb-mantaka-nusaibas-projects.vercel.app/"
                                label="Website"
                            >
                                <IconWebsite />
                            </SocialLink>
                        </div>
                    </div>

                    <nav className="footer-simple-links">
                        <NavLink to="/">ড্যাশবোর্ড</NavLink>
                        <NavLink to="/search">পণ্য খুঁজুন</NavLink>
                        <NavLink to="/forecast">দাম ফোরকাস্ট</NavLink>
                        <NavLink to="/markets">বাজার তুলনা</NavLink>
                        <NavLink to="/basket">বাজার লিস্ট</NavLink>
                        <NavLink to="/fair-price">ঠিক দাম?</NavLink>
                        <NavLink to="/assistant">AI সহকারী</NavLink>
                    </nav>
                </div>

                <div className="footer-bottom">
                    <span>© {year} কি বাজার করবো?</span>
                </div>
            </div>
        </footer>
    );
}