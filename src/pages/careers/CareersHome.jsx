import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  HeartIcon, StarIcon, ShieldCheckIcon, LightBulbIcon,
  GiftIcon, CurrencyDollarIcon, AcademicCapIcon, SparklesIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { mediaUrl, parseExtraJson, sectionMap, blogMap, DEFAULT_SECTIONS, FE_IMAGES, DEFAULT_TESTIMONIALS, TUYENDUNG_URL } from "./careers-utils";
import { Reveal, useHeroScrollFade } from "./useScrollReveal";
import "./careers.css";

const api = axios.create({ baseURL: "/api" });

const VALUE_IMAGES = [
  FE_IMAGES.passioStore,
  FE_IMAGES.beteaStore,
  FE_IMAGES.deerStore,
  FE_IMAGES.passioStore,
];

const ABOUT_IMAGE = FE_IMAGES.aboutCoffee;

const HERO_FALLBACK = [
  FE_IMAGES.passioStore,
  FE_IMAGES.beteaStore,
  FE_IMAGES.deerStore,
];

const BRAND_LOGOS = [
  FE_IMAGES.passioLogo,
  FE_IMAGES.beteaLogo,
  FE_IMAGES.deerLogo,
];

const ICON_MAP = {
  heart: HeartIcon, star: StarIcon, shield: ShieldCheckIcon, light: LightBulbIcon,
  discount: GiftIcon, money: CurrencyDollarIcon, learn: AcademicCapIcon, book: AcademicCapIcon,
  party: SparklesIcon,
};

const DEFAULT_TESTIMONIALS_FALLBACK = DEFAULT_TESTIMONIALS;

function HtmlBlock({ html, className = "" }) {
  if (!html) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function SafeImg({ src, alt = "", className = "", fallback = FE_IMAGES.passioStore }) {
  const resolved = mediaUrl(src) || fallback;
  const [url, setUrl] = useState(resolved);
  useEffect(() => { setUrl(mediaUrl(src) || fallback); }, [src, fallback]);
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => { if (url !== fallback) setUrl(fallback); }}
    />
  );
}

function SectionTitle({ children, light = false }) {
  return (
    <h2 className={`careers-serif text-3xl md:text-4xl font-semibold text-center mb-3 ${light ? "text-white" : "text-[#0f1f3d]"}`}>
      {children}
    </h2>
  );
}

function SectionDivider({ light = false }) {
  return (
    <div className={`w-16 h-0.5 mx-auto mb-10 ${light ? "bg-white/60" : "bg-[#2aafa0]"}`} />
  );
}

export default function CareersHome() {
  const [sections, setSections] = useState(() => sectionMap([]));
  const [blog, setBlog] = useState(() => blogMap([]));
  const [loading, setLoading] = useState(true);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const heroScroll = useHeroScrollFade();

  useEffect(() => {
    (async () => {
      try {
        const [sec, b] = await Promise.all([
          api.get("/recruitment/page-sections"),
          api.get("/recruitment/blog"),
        ]);
        setSections(sectionMap(sec.data?.data || []));
        setBlog(blogMap(b.data?.data || []));
      } catch (e) {
        console.warn("Careers: using FE defaults", e?.message || e);
        setSections(sectionMap([]));
        setBlog(blogMap([]));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const testimonialCount = useMemo(() => {
    const why = sections.why_join || DEFAULT_SECTIONS.why_join;
    const extra = parseExtraJson(why.extraJson) || {};
    return extra.testimonials?.length || DEFAULT_TESTIMONIALS_FALLBACK.length;
  }, [sections]);

  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx((i) => (i + 1) % testimonialCount), 6000);
    return () => clearInterval(t);
  }, [testimonialCount]);

  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash.includes("apply")) {
      // Form cũ đã bỏ — chuyển thẳng sang trang tuyển dụng mới
      window.location.href = TUYENDUNG_URL;
    }
  }, []);

  if (loading && !Object.keys(sections).length) {
    return (
      <div className="careers-hero flex items-center justify-center min-h-screen">
        <div className="text-white/70 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-white/30 border-t-[#2aafa0] rounded-full animate-spin" />
          <span className="text-sm tracking-widest uppercase">Đang tải...</span>
        </div>
      </div>
    );
  }

  const hero = sections.hero || DEFAULT_SECTIONS.hero;
  const about = sections.about || DEFAULT_SECTIONS.about;
  const vision = sections.vision || DEFAULT_SECTIONS.vision;
  const brands = sections.brands || DEFAULT_SECTIONS.brands;
  const whyJoin = sections.why_join || DEFAULT_SECTIONS.why_join;
  const benefits = sections.benefits || DEFAULT_SECTIONS.benefits;
  const applySection = sections.apply || DEFAULT_SECTIONS.apply;
  const newsSection = sections.news || DEFAULT_SECTIONS.news;

  const heroExtra = parseExtraJson(hero.extraJson) || {};
  const whyExtra = parseExtraJson(whyJoin.extraJson) || {};
  const applyExtra = parseExtraJson(applySection.extraJson) || {};

  const valueItems = whyExtra.items || parseExtraJson(whyJoin.extraJson)?.items || [];
  const benefitItems = parseExtraJson(benefits.extraJson)?.items || [];
  const applyHref = applyExtra.applyUrl || TUYENDUNG_URL;
  const brandItems = parseExtraJson(brands.extraJson)?.items || [];
  const testimonials = (whyExtra.testimonials?.length ? whyExtra.testimonials : DEFAULT_TESTIMONIALS_FALLBACK);

  const heroGallery = [0, 1, 2].map((i) => {
    const fromGallery = heroExtra.gallery?.[i];
    if (fromGallery) return mediaUrl(fromGallery);
    if (i === 0 && hero.imageUrl) return mediaUrl(hero.imageUrl);
    return HERO_FALLBACK[i];
  });

  return (
    <div>
      {/* ── HERO ── */}
      <section className="careers-hero flex items-center">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 w-full pt-[88px] md:pt-24 pb-16 grid lg:grid-cols-2 gap-10 items-center">
          <div
            className="text-white z-10 careers-hero-parallax"
            style={{ transform: `translate3d(0, ${heroScroll * 0.15}px, 0)` }}
          >
            <p className="text-[#2aafa0] text-sm font-medium tracking-[0.2em] uppercase mb-4 careers-hero-sub">
              {heroExtra.eyebrow || "CAREERS AT UNI GROUP"}
            </p>
            <h1 className="careers-serif careers-hero-title text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {hero.title || "Bring Your Passion to Life"}
            </h1>
            <p className="text-lg text-white/75 mb-4 max-w-lg careers-hero-sub leading-relaxed">
              {hero.subtitle || "Khám phá cơ hội nghề nghiệp trong ngành F&B — nơi bạn được trân trọng và phát triển."}
            </p>
            <HtmlBlock html={hero.content} className="text-white/60 text-sm mb-8 max-w-lg" />
            <div className="flex flex-wrap gap-4 careers-hero-sub">
              <a href={applyHref} className="careers-btn-primary text-white font-semibold px-8 py-3 rounded-sm text-sm tracking-wide">
                {heroExtra.ctaPrimary || "ỨNG TUYỂN NGAY"}
              </a>
              <a href="#about" className="border border-white/40 text-white font-medium px-8 py-3 rounded-sm text-sm hover:bg-white/10 transition-all">
                {heroExtra.ctaSecondary || "TÌM HIỂU THÊM"}
              </a>
            </div>
          </div>

          <div
            className="careers-hero-grid grid grid-cols-2 gap-3 relative careers-hero-parallax"
            style={{ transform: `translate3d(0, ${-heroScroll * 0.22}px, 0)` }}
          >
            {heroGallery.map((src, i) => (
              <div
                key={i}
                className={`careers-hero-float overflow-hidden rounded-sm shadow-2xl ${i === 0 ? "col-span-2 h-52" : "h-36"}`}
              >
                <SafeImg src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-[#2aafa0]/20 rounded-full blur-2xl" />
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
          </div>
        </div>
      </section>

      {/* ── ABOUT (white) ── */}
      <section id="about" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Reveal>
            <SectionTitle>{about.title || "Về chúng tôi"}</SectionTitle>
            <SectionDivider />
          </Reveal>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal delay={1} variant="right" parallax parallaxAmount={32}>
              <div className="relative group">
                <SafeImg
                  src={ABOUT_IMAGE}
                  alt=""
                  className="w-full rounded-sm shadow-xl object-cover aspect-[4/3] careers-card"
                />
                <div className="absolute inset-0 bg-[#0f1f3d]/0 group-hover:bg-[#0f1f3d]/10 transition-colors duration-500 rounded-sm" />
              </div>
            </Reveal>
            <Reveal delay={2} variant="left">
              <p className="text-[#2aafa0] text-sm font-semibold tracking-widest uppercase mb-3">
                {about.subtitle || "UNI GROUP"}
              </p>
              <HtmlBlock
                html={about.content || "<p>Chúng tôi là chuỗi cà phê với nhiều thương hiệu trên khắp TP.HCM, luôn đặt con người là trung tâm của mọi thành công.</p>"}
                className="text-slate-600 leading-relaxed space-y-4 text-[15px]"
              />
              {vision.content && (
                <div className="mt-6 p-5 bg-slate-50 border-l-4 border-[#2aafa0] rounded-r-sm">
                  <p className="text-xs font-semibold text-[#0f1f3d] uppercase tracking-wider mb-2">{vision.title}</p>
                  <HtmlBlock html={vision.content} className="text-sm text-slate-600" />
                </div>
              )}
              <a href={applyHref} className="inline-flex items-center gap-2 mt-8 careers-btn-outline text-[#0f1f3d] font-medium px-6 py-2.5 rounded-sm text-sm">
                Ứng tuyển ngay <ChevronRightIcon className="w-4 h-4" />
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── BRANDS (soft gray block) ── */}
      <section id="brands" className="careers-section-soft py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Reveal>
            <SectionTitle>{brands.title || "Thương hiệu của chúng tôi"}</SectionTitle>
            <SectionDivider />
            {brands.content ? (
              <HtmlBlock html={brands.content} className="text-center text-slate-500 text-sm mb-10 max-w-2xl mx-auto" />
            ) : null}
          </Reveal>
          <Reveal delay={1} variant="zoom">
            <div className="grid md:grid-cols-3 gap-6 mt-4">
              {(brandItems.length ? brandItems : []).map((brand, i) => (
                <a
                  key={brand.name || i}
                  href={brand.linkUrl || applyHref}
                  className="group careers-card bg-white border border-white shadow-sm rounded-sm overflow-hidden block"
                >
                  <div className="h-44 overflow-hidden relative">
                    <SafeImg
                      src={brand.imageUrl || FE_IMAGES.passioStore}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <div className="mb-3">
                      <SafeImg
                        src={brand.logoUrl || BRAND_LOGOS[i]}
                        alt={brand.name || ""}
                        className="h-10 w-auto max-w-[160px] object-contain careers-brand-logo"
                        fallback={BRAND_LOGOS[i] || FE_IMAGES.passioLogo}
                      />
                      {brand.short ? <p className="text-xs text-slate-400 mt-2">{brand.short}</p> : null}
                    </div>
                    <HtmlBlock html={brand.description} className="text-sm text-slate-600 leading-relaxed space-y-3" />
                  </div>
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── WHY JOIN (teal) ── */}
      <section id="why-join" className="careers-teal-section py-20 md:py-28 text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Reveal>
            <SectionTitle light>{whyJoin.title || "Vì sao gia nhập"}</SectionTitle>
            <SectionDivider light />
            {whyJoin.subtitle ? (
              <p className="text-center text-white/70 text-sm mb-4 max-w-xl mx-auto">{whyJoin.subtitle}</p>
            ) : null}
            <p className="text-center text-[#2aafa0] text-xs font-semibold tracking-[0.25em] uppercase mb-12 max-w-xl mx-auto">
              {whyExtra.valuesLabel || "GIÁ TRỊ CỐT LÕI"}
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
            {(valueItems.length ? valueItems : [
              { title: "Tận tâm", text: "Care", icon: "heart" },
              { title: "Xuất sắc", text: "Excellence", icon: "star" },
              { title: "Tin cậy", text: "Trust", icon: "shield" },
              { title: "Đổi mới", text: "Innovation", icon: "light" },
            ]).map((it, i) => {
              const Icon = ICON_MAP[it.icon] || StarIcon;
              return (
                <Reveal key={i} delay={(i % 4) + 1} variant="zoom">
                  <div className="careers-value-card careers-card cursor-default">
                    <SafeImg src={VALUE_IMAGES[i % VALUE_IMAGES.length]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="relative z-10 p-6 h-full flex flex-col justify-end min-h-[280px]">
                      <Icon className="w-8 h-8 text-white/80 mb-3" />
                      <h4 className="careers-serif text-xl font-semibold">{it.title}</h4>
                      <p className="text-white/70 text-sm mt-1">{it.text}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Benefits icons */}
          <Reveal>
            <h3 className="careers-serif text-2xl text-center mb-2">{benefits.title || "Phúc lợi"}</h3>
            <p className="text-center text-white/60 text-xs tracking-widest uppercase mb-10">{whyExtra.benefitsLabel || "Our Benefits"}</p>
          </Reveal>
          <div className="flex flex-wrap justify-center gap-8 md:gap-14 mb-20">
            {(benefitItems.length ? benefitItems : [
              { title: "Giảm giá sản phẩm", icon: "discount", text: "Ưu đãi dành cho nhân viên." },
              { title: "Thu nhập cạnh tranh", icon: "money", text: "Lương thưởng theo hiệu suất." },
              { title: "Đào tạo", icon: "learn", text: "Chương trình phát triển nghề nghiệp." },
              { title: "Team building", icon: "party", text: "Gắn kết đồng nghiệp thường xuyên." },
            ]).map((it, i) => {
              const Icon = ICON_MAP[it.icon] || GiftIcon;
              return (
                <Reveal key={i} delay={(i % 4) + 1} variant="zoom">
                  <div className="text-center group max-w-[140px]">
                    <div className="w-16 h-16 mx-auto rounded-full border-2 border-white/30 flex items-center justify-center mb-3 group-hover:border-white group-hover:bg-white/10 transition-all duration-300">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-sm font-medium text-white/90">{it.title}</p>
                    {it.text ? <p className="text-xs text-white/60 mt-1 leading-snug">{it.text}</p> : null}
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Testimonial */}
          <Reveal>
            <p className="text-center text-xs tracking-[0.2em] uppercase text-white/50 mb-6">{whyExtra.testimonialsLabel || "Employee Testimonial"}</p>
            <div className="max-w-3xl mx-auto text-center min-h-[180px] relative">
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className={`careers-testimonial transition-all duration-500 px-4 ${
                    i === testimonialIdx
                      ? "opacity-100 translate-y-0 relative"
                      : "opacity-0 translate-y-4 absolute inset-0 pointer-events-none"
                  }`}
                >
                  <p className="careers-serif text-lg md:text-xl italic text-white/90 leading-relaxed mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-white/60 text-xs mt-1">{t.role}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTestimonialIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === testimonialIdx ? "bg-white w-6" : "bg-white/40"}`}
                />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── BLOG (soft gray) ── */}
      <section id="blog" className="careers-section-soft py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Reveal>
            <SectionTitle>{newsSection.title || "Tin tức"}</SectionTitle>
            <SectionDivider />
          </Reveal>
          {blog.length === 0 ? (
            <p className="text-center text-slate-400 py-12">Chưa có bài viết.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {blog.slice(0, 4).map((p, i) => (
                <Reveal key={p.id} delay={(i % 2) + 1} variant={i % 2 === 0 ? "left" : "right"} parallax parallaxAmount={18}>
                  <Link to={`/careers/blog/${p.slug}`} className="careers-blog-card careers-card flex gap-5 group bg-white p-3 rounded-sm shadow-sm border border-white">
                    <div className="w-36 h-28 shrink-0 overflow-hidden rounded-sm bg-slate-100">
                      <SafeImg
                        src={p.coverImageUrl || FE_IMAGES.beteaStore}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <h3 className="font-semibold text-[#0f1f3d] group-hover:text-[#2aafa0] transition-colors line-clamp-2 leading-snug">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-2">{p.publishedAt}</p>
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{p.summary}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── APPLY CTA → trang form mới ── */}
      <section id="apply" className="careers-teal-section py-16 md:py-20 scroll-mt-24">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 text-center text-white">
          <Reveal>
            <p className="text-white/60 text-xs tracking-[0.2em] uppercase mb-2">{applyExtra.eyebrow || "ỨNG TUYỂN NGAY"}</p>
            <h2 className="careers-serif text-2xl md:text-3xl font-semibold mb-3">{applySection.title || "Đăng ký phỏng vấn"}</h2>
            <p className="text-white/70 text-sm mb-8">{applySection.subtitle || "Chuyển sang form đăng ký đầy đủ để gửi hồ sơ ứng tuyển."}</p>
          </Reveal>
          <Reveal delay={1}>
            <a
              href={applyHref}
              className="inline-flex items-center justify-center bg-white text-[#1f8f82] font-semibold px-12 py-3.5 rounded-full text-sm hover:bg-white/90 transition-all hover:shadow-lg"
            >
              {applyExtra.ctaLabel || "Điền form ứng tuyển"}
            </a>
            <p className="text-white/50 text-xs mt-4">Thông tin của bạn sẽ được bảo mật tuyệt đối.</p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
