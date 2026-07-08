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

function IconGithub() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.9.6-3.5-1.2-3.5-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.7-1.3-2.3-.3-4.7-1.2-4.7-5.1 0-1.1.4-2 1.1-2.8-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1a9.7 9.7 0 0 1 5.3 0c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.8 0 4-2.4 4.8-4.7 5.1.4.3.8 1 .8 2v2.9c0 .3.2.6.8.5A10 10 0 0 0 12 2.2z" />
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

                            <SocialLink href="#" label="GitHub">
                                <IconGithub />
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