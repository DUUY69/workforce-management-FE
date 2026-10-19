import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import axios from "axios";
import {
  sectionMap,
  getFooterFromSections,
  DEFAULT_FOOTER,
  FE_IMAGES,
  mediaUrl,
  resolveMapDisplay,
} from "@/pages/careers/careers-utils";
import "@/pages/careers/careers.css";

const DEFAULT_NAV = DEFAULT_FOOTER.headerNav;

function SocialIcon({ icon, className = "w-4 h-4" }) {
  const key = String(icon || "").toLowerCase();
  if (key === "fb" || key === "facebook") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }
  if (key === "ig" || key === "instagram") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.805.249 2.227.415a4.902 4.902 0 011.725 1.123 4.902 4.902 0 011.123 1.725c.166.422.361 1.057.415 2.227.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.249 1.805-.415 2.227a4.902 4.902 0 01-1.123 1.725 4.902 4.902 0 01-1.725 1.123c-.422.166-1.057.361-2.227.415-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.805-.249-2.227-.415a4.902 4.902 0 01-1.725-1.123 4.902 4.902 0 01-1.123-1.725c-.166-.422-.361-1.057-.415-2.227C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.054-1.17.249-1.805.415-2.227a4.902 4.902 0 011.123-1.725A4.902 4.902 0 015.496 2.648c.422-.166 1.057-.361 2.227-.415C8.989 2.175 9.369 2.163 12 2.163zm0 1.622c-3.153 0-3.527.012-4.765.07-1.01.046-1.56.218-1.924.363a3.3 3.3 0 00-1.198.78 3.3 3.3 0 00-.78 1.198c-.145.364-.317.914-.363 1.924-.058 1.238-.07 1.612-.07 4.765s.012 3.527.07 4.765c.046 1.01.218 1.56.363 1.924.17.428.396.8.78 1.198a3.3 3.3 0 001.198.78c.364.145.914.317 1.924.363 1.238.058 1.612.07 4.765.07s3.527-.012 4.765-.07c1.01-.046 1.56-.218 1.924-.363a3.3 3.3 0 001.198-.78 3.3 3.3 0 00.78-1.198c.145-.364.317-.914.363-1.924.058-1.238.07-1.612.07-4.765s-.012-3.527-.07-4.765c-.046-1.01-.218-1.56-.363-1.924a3.3 3.3 0 00-.78-1.198 3.3 3.3 0 00-1.198-.78c-.364-.145-.914-.317-1.924-.363-1.238-.058-1.612-.07-4.765-.07zM12 7.378a4.622 4.622 0 100 9.244 4.622 4.622 0 000-9.244zm0 1.622a3 3 0 110 6 3 3 0 010-6zm5.884-3.43a1.08 1.08 0 100 2.16 1.08 1.08 0 000-2.16z" />
      </svg>
    );
  }
  if (key === "in" || key === "linkedin") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.126 0 2.062 2.062 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    );
  }
  return <span className="text-[10px] font-semibold uppercase">{key.slice(0, 2) || "?"}</span>;
}

export default function CareersLayout() {
  const loc = useLocation();
  const isHome = loc.pathname === "/careers" || loc.pathname === "/careers/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [footer, setFooter] = useState(DEFAULT_FOOTER);
  const navItems = footer.headerNav?.length ? footer.headerNav : DEFAULT_NAV;
  const { mapLink, mapEmbed } = resolveMapDisplay(footer);

  useEffect(() => {
    const api = axios.create({ baseURL: "/api" });
    api.get("/recruitment/page-sections")
      .then((res) => {
        setFooter(getFooterFromSections(sectionMap(res.data?.data || [])));
      })
      .catch(() => {
        setFooter(DEFAULT_FOOTER);
      });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [loc.pathname]);

  return (
    <div className="careers-page min-h-screen bg-white text-slate-800">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />

      <header
        className={`careers-navbar fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "careers-header-scrolled py-2.5" : "py-3.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
          <Link to="/careers" className="flex items-center gap-3 group">
            {footer.siteLogoUrl ? (
              <img
                src={mediaUrl(footer.siteLogoUrl)}
                alt={footer.siteName || "Logo"}
                className="w-10 h-10 rounded-full object-cover shadow-lg group-hover:scale-105 transition-transform bg-white"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#e85d33] flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-105 transition-transform">
                {footer.siteBadge || "UG"}
              </div>
            )}
            <span className="text-white font-semibold tracking-wide hidden sm:block leading-tight">
              <span className="block">{footer.siteName || "UNI GROUP"}</span>
              {footer.siteTagline ? (
                <span className="block text-[10px] font-normal tracking-[0.18em] text-white/70 mt-0.5 uppercase">
                  {footer.siteTagline}
                </span>
              ) : null}
            </span>
          </Link>

          {isHome && (
            <>
              <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
                {navItems.map((n) => (
                  <a
                    key={n.href}
                    href={n.href}
                    className="careers-nav-link text-white/90 text-xs font-medium hover:text-white transition-colors"
                  >
                    {n.label}
                  </a>
                ))}
              </nav>
              <button
                type="button"
                className="lg:hidden text-white p-2"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </>
          )}

          <Link
            to={footer.internalUrl || "/auth/login"}
            title={footer.internalLabel || "Nội bộ"}
            aria-label={footer.internalLabel || "Nội bộ"}
            className="inline-flex items-center justify-center w-10 h-7 rounded-sm overflow-hidden border border-white/25 hover:border-white/70 hover:scale-105 transition-all shadow-sm bg-[#da251d]"
          >
            <img src={FE_IMAGES.vnFlag} alt="Việt Nam" className="w-full h-full object-cover" />
          </Link>
        </div>

        {menuOpen && isHome && (
          <nav className="lg:hidden bg-[#0b172e] border-t border-white/10 px-4 py-4 flex flex-col gap-3">
            {navItems.map((n) => (
              <a key={n.href} href={n.href} className="text-white/90 text-sm py-2 border-b border-white/5">
                {n.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* Home: no top pad so hero navy meets navbar (no white gap). Subpages pad themselves. */}
      <main className={isHome ? "pt-0" : "pt-[72px]"}>
        <Outlet />
      </main>

      <footer id="contact" className="bg-[#0f1f3d] text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-14 grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {footer.siteLogoUrl ? (
                <img
                  src={mediaUrl(footer.siteLogoUrl)}
                  alt={footer.siteName || "Logo"}
                  className="w-9 h-9 rounded-full object-cover bg-white"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#2aafa0] flex items-center justify-center text-white font-bold text-xs">
                  {footer.siteBadge || "PC"}
                </div>
              )}
              <h4 className="careers-serif text-lg font-semibold text-white">{footer.siteName || "UNI GROUP"}</h4>
            </div>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex gap-2">
                <span className="text-[#2aafa0] shrink-0">📍</span>
                {footer.address}
              </li>
              <li className="flex gap-2">
                <span className="text-[#2aafa0] shrink-0">📞</span>
                <a href={`tel:${(footer.phone || "").replace(/\s/g, "")}`} className="hover:text-white">{footer.phone}</a>
              </li>
              <li className="flex gap-2">
                <span className="text-[#2aafa0] shrink-0">✉️</span>
                <a href={`mailto:${footer.email}`} className="hover:text-white">{footer.email}</a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="careers-serif text-lg font-semibold mb-4 text-[#2aafa0]">Liên kết nhanh</h4>
            <ul className="space-y-2 text-sm text-white/70">
              {(footer.quickLinks || []).map((item, idx) => (
                <li key={`${item.href}-${idx}`}>
                  <a href={item.href} className="hover:text-white transition-colors">{item.label}</a>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-5">
              {(footer.socials || []).map((s, idx) => (
                <a
                  key={`${s.href}-${idx}`}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full border border-white/25 text-white/90 flex items-center justify-center hover:bg-[#2aafa0] hover:border-[#2aafa0] hover:text-white transition-colors"
                  title={s.label}
                  aria-label={s.label}
                >
                  <SocialIcon icon={s.icon || s.label} />
                </a>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <a
              href={mapLink}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg overflow-hidden h-48 md:h-full min-h-[180px] bg-[#1a3260] relative group"
              title="Mở Google Maps"
            >
              <iframe
                title="Bản đồ"
                className="w-full h-full border-0 pointer-events-none"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapEmbed}
              />
              <div className="absolute inset-0 bg-[#0f1f3d]/0 group-hover:bg-[#0f1f3d]/25 transition-colors flex items-end justify-center pb-3 pointer-events-none">
                <span className="text-xs text-white/0 group-hover:text-white/90 bg-black/0 group-hover:bg-black/40 px-3 py-1 rounded-full transition-all">
                  Mở Google Maps ↗
                </span>
              </div>
            </a>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">
          © {new Date().getFullYear()} {footer.copyrightText}
        </div>
      </footer>
    </div>
  );
}
