const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/** Trang ứng tuyển riêng (ungtuyen) — tách khỏi app chấm công */
export const UNGTUYEN_URL =
  (import.meta.env.VITE_UNGTUYEN_URL || import.meta.env.VITE_TUYENDUNG_URL || "").trim() ||
  (import.meta.env.DEV ? "http://localhost:5175" : "https://ungtuyen.unigroups.vn");

/** @deprecated dùng UNGTUYEN_URL */
export const TUYENDUNG_URL = UNGTUYEN_URL;

/** Packed with FE deploy — no need to re-upload on every environment. */
export const FE_IMAGES = {
  passioStore: "/images/brands/passio-store.png",
  passioLogo: "/images/brands/passio-logo.png",
  beteaStore: "/images/brands/betea-store.png",
  beteaLogo: "/images/brands/betea-logo.png",
  deerStore: "/images/brands/deer-store.png",
  deerLogo: "/images/brands/deer-logo.png",
  aboutCoffee: "/images/careers/about-coffee.png",
  vnFlag: "/images/vn-flag.svg",
};

export function looksLikeBrokenUtf8(text) {
  if (!text) return false;
  return /Ã.|áº|á»|Ä‘|Æ°|â€™|â€œ|â€|nháº|chĂºng|tuyá»|PhĂºc|\/@fs\/|nh\?p Passion|Co h\?i|Ph\?c l\?i|Thuong hieu|Lien he|Noi bo|VI\?C|nh\?p|ch\?ng t\?i|V\? sao|Ph\?c l\?i/i.test(text);
}

function pickText(apiVal, feVal) {
  if (apiVal == null) return feVal;
  const s = String(apiVal).trim();
  if (!s) return feVal;
  if (looksLikeBrokenUtf8(s)) return feVal;
  return apiVal;
}

/** Admin override only when using uploaded/external asset — keep packaged /images for deploy. */
export function pickImage(apiVal, feVal) {
  if (apiVal == null || String(apiVal).trim() === "") return feVal;
  const s = String(apiVal).trim();
  if (looksLikeBrokenUtf8(s) || s.includes("/@fs/")) return feVal;
  if (s.startsWith("/uploads/") || s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) {
    return s;
  }
  // /images/... paths from CMS are valid packaged assets
  if (s.startsWith("/images/")) return s;
  return feVal || s;
}

export const DEFAULT_BRAND_ITEMS = [
  {
    name: "PASSION COFFEE",
    short: "Cà phê hiện đại, trải nghiệm từ trái tim.",
    description: "<p>PASSION được sinh ra từ tình yêu chân thành dành cho cà phê Việt. Chúng tôi tin rằng hạt cà phê không chỉ là nông sản, mà là trái tim và đam mê của những con người sống hết mình với nghề.</p><p>Tên gọi PASSION — Đam mê — được chọn bởi đó là tinh thần dẫn lời trong mọi việc chúng tôi làm. Niềm đam mê này kết nối từ người trồng, người rang, đến người pha và cuối cùng là người thưởng thức.</p><p>Mỗi tách cà phê PASSION là một câu chuyện được kể bằng hương vị — đậm đà, tinh tế và chân thật.</p>",
    imageUrl: FE_IMAGES.passioStore,
    logoUrl: FE_IMAGES.passioLogo,
    linkUrl: TUYENDUNG_URL,
  },
  {
    name: "BETEA TEA & MORE",
    short: "Trà thanh mát, năng lượng tích cực.",
    description: "<p>BETEA là thương hiệu trà hiện đại hướng đến trải nghiệm cao cấp với mức giá dễ tiếp cận. Chúng tôi tập trung phát triển những thức uống thanh mát, cân bằng vị trà, dễ ngấm và hương thơm, phù hợp với nhịp sống năng động của khách hàng trẻ.</p><p>Tại cốt lõi, BETEA thể hiện tinh thần tích cực, tươi mới và gần gũi. Mỗi sản phẩm được tạo nên từ sự kết hợp giữa nguyên liệu chọn lọc, công thức được nghiên cứu kỹ lưỡng và phong cách phục vụ hiện đại.</p><p>Không chỉ dừng lại ở trà sữa, BETEA còn xây dựng hệ sản phẩm đa dạng từ trà trái cây, trà sữa, trà nguyên bản đến các dòng thức uống sáng tạo theo mùa.</p>",
    imageUrl: FE_IMAGES.beteaStore,
    logoUrl: FE_IMAGES.beteaLogo,
    linkUrl: TUYENDUNG_URL,
  },
  {
    name: "Deer Coffee",
    short: "Good coffee daily, mọi lúc, mọi nơi.",
    description: "<p>Deer Coffee là thương hiệu cà phê theo đuổi tinh thần Daily Coffee — gần gũi, tiện lợi và phù hợp với nhịp sống mỗi ngày. Chúng tôi hướng đến việc mang lại những ly cà phê chất lượng ổn định, dễ thưởng thức và dễ nạp năng lượng để đồng hành cùng khách hàng trong mọi khoảnh khắc.</p><p>Với hình ảnh trẻ trung, vui vẻ và năng động, Deer Coffee tạo nên không gian thân thiện, hiện đại và dễ kết nối. Mỗi sản phẩm được phát triển dựa trên sự cân bằng giữa hương vị, chất lượng nguyên liệu và tính tiện dụng.</p><p>Không chỉ tập trung vào cà phê, Deer Coffee còn xây dựng hệ thức uống đa dạng từ latte, cà phê sáng tạo đến các dòng thức uống theo mùa. Mỗi ly Deer Coffee mang tinh thần tích cực, tươi mới và gần gũi — ngon ổn định, dễ tiếp cận và sẵn sàng đồng hành cùng bạn mỗi ngày.</p>",
    imageUrl: FE_IMAGES.deerStore,
    logoUrl: FE_IMAGES.deerLogo,
    linkUrl: TUYENDUNG_URL,
  },
];

export const DEFAULT_FOOTER = {
  siteName: "UNI GROUP",
  siteBadge: "UG",
  siteTagline: "DREAM. INNOVATE. LEAD.",
  siteLogoUrl: "",
  internalLabel: "Nội bộ",
  address: "74 Trường Sa, Phường 2, Quận Bình Thạnh, TP.HCM",
  phone: "(+84) 0900 000 000",
  email: "recruitment@unigroups.vn",
  mapLinkUrl: "https://maps.app.goo.gl/t7pri75TukG47G6b6",
  mapEmbedUrl: "https://www.google.com/maps?q=Deer+Coffee+-+Nhà+Văn+Hóa+Sinh+Viên,+Lưu+Hữu+Phước,+Đông+Hòa,+Thủ+Đức,+Hồ+Chí+Minh&hl=vi&z=17&output=embed",
  copyrightText: "UNI GROUP — Careers. All rights reserved.",
  internalUrl: "/auth/login",
  headerNav: [
    { label: "VỀ CHÚNG TÔI", href: "/careers#about" },
    { label: "THƯƠNG HIỆU", href: "/careers#brands" },
    { label: "ỨNG TUYỂN", href: TUYENDUNG_URL },
    { label: "VÌ SAO GIA NHẬP", href: "/careers#why-join" },
    { label: "TIN TỨC", href: "/careers#blog" },
    { label: "LIÊN HỆ", href: "/careers#contact" },
  ],
  quickLinks: [
    { label: "Về chúng tôi", href: "/careers#about" },
    { label: "Thương hiệu", href: "/careers#brands" },
    { label: "Ứng tuyển", href: TUYENDUNG_URL },
    { label: "Tin tức", href: "/careers#blog" },
  ],
  socials: [
    { label: "Facebook", href: "https://facebook.com", icon: "fb" },
    { label: "Instagram", href: "https://instagram.com", icon: "ig" },
    { label: "LinkedIn", href: "https://linkedin.com", icon: "in" },
  ],
};

export const DEFAULT_BLOG_POSTS = [
  {
    id: "fe-1",
    slug: "chao-don-ban-den-uni-group-careers",
    title: "Chào đón bạn đến UNI GROUP Careers",
    summary: "Cơ hội nghề nghiệp trong hệ sinh thái PASSION, BETEA và Deer Coffee.",
    content: "<p>Chúng tôi đang mở rộng đội ngũ tại nhiều cửa hàng. Ứng tuyển ngay trên trang Careers.</p>",
    coverImageUrl: FE_IMAGES.passioStore,
    publishedAt: "2026-07-08",
    isPublished: true,
  },
  {
    id: "fe-2",
    slug: "moi-truong-lam-viec-tai-cua-hang",
    title: "Môi trường làm việc tại cửa hàng",
    summary: "Mỗi ngày phục vụ khách hàng cũng là ngày học hỏi và phát triển kỹ năng.",
    content: "<p>Từ barista đến shift leader — lộ trình rõ ràng và đào tạo nội bộ liên tục.</p>",
    coverImageUrl: FE_IMAGES.beteaStore,
    publishedAt: "2026-07-08",
    isPublished: true,
  },
];

export const DEFAULT_TESTIMONIALS = [
  { quote: "Môi trường cởi mở, được học hỏi và trao quyền mỗi ngày — đây là nơi phù hợp để phát triển bản thân.", name: "Nguyễn Thị Mai", role: "Barista — PASSION COFFEE" },
  { quote: "Tinh thần đồng đội mang đến năng lượng tích cực, giúp mình gắn bó lâu dài với công ty.", name: "Trần Văn Hùng", role: "Shift Leader — BETEA" },
  { quote: "Tuổi trẻ là trải nghiệm không ngừng — môi trường chuyên nghiệp và lành mạnh giúp mình trưởng thành mỗi ngày.", name: "Lê Thị Hương", role: "Thu ngân — Deer Coffee" },
];

export const DEFAULT_SECTIONS = {
  hero: {
    sectionKey: "hero",
    title: "Gia nhập Uni Group",
    subtitle: "CƠ HỘI NGHỀ NGHIỆP TRONG NGÀNH F&B",
    content: "<p>Khám phá môi trường làm việc chuyên nghiệp, năng động và luôn khuyến khích mỗi cá nhân chủ động học hỏi, phát huy thế mạnh và từng bước xây dựng lộ trình phát triển rõ ràng.</p><p>Với hệ sinh thái F&B đa dạng, UNI Group mang đến nhiều cơ hội trải nghiệm ở các lĩnh vực từ vận hành cửa hàng, dịch vụ khách hàng, sản phẩm, marketing đến quản lý và phát triển hệ thống. Đây là nơi bạn có thể tích lũy kinh nghiệm thực tế, mở rộng năng lực và đồng hành cùng một tập thể không ngừng đổi mới để tạo nên những trải nghiệm tốt hơn cho khách hàng.</p>",
    imageUrl: FE_IMAGES.deerStore,
    extraJson: JSON.stringify({
      eyebrow: "CAREERS AT UNI GROUP",
      ctaPrimary: "ỨNG TUYỂN NGAY",
      ctaSecondary: "TÌM HIỂU UNI GROUP",
      gallery: [FE_IMAGES.passioStore, FE_IMAGES.deerStore, FE_IMAGES.beteaStore],
    }),
  },
  about: {
    sectionKey: "about",
    title: "Về chúng tôi",
    subtitle: "UNI GROUP",
    content: "<p>UNI Group là hệ sinh thái F&B đa dạng, được xây dựng trên nền tảng nhiều năm kinh nghiệm trong vận hành, quản lý và mở rộng chuỗi cửa hàng. Với mạng lưới điểm bán trải dài tại nhiều khu vực, chúng tôi không ngừng hoàn thiện chất lượng sản phẩm, dịch vụ và trải nghiệm khách hàng.</p><p>Bên cạnh hoạt động kinh doanh tại cửa hàng, UNI Group còn đầu tư vào hệ thống vận hành, đào tạo nhân sự, phát triển sản phẩm, công nghệ quản lý và chuỗi cung ứng. Mỗi thương hiệu trong hệ sinh thái đều có định hướng riêng, nhưng cùng chia sẻ một mục tiêu chung: tạo ra những mô hình F&B hiệu quả, bền vững và gần gũi với khách hàng.</p><p>Chúng tôi tin rằng sự phát triển lâu dài được tạo nên từ con người, tư duy đổi mới và khả năng vận hành nhất quán. Vì vậy, UNI Group luôn xây dựng môi trường làm việc chuyên nghiệp, khuyến khích tinh thần chủ động, hợp tác và không ngừng học hỏi để mỗi cá nhân có thể phát huy năng lực và đồng hành cùng sự phát triển của toàn hệ sinh thái.</p>",
    imageUrl: FE_IMAGES.aboutCoffee,
  },
  vision: {
    sectionKey: "vision",
    title: "Tầm nhìn & Sứ mệnh",
    content: "<p><strong>Tầm nhìn:</strong> Trở thành thương hiệu F&B được yêu thích nhất tại Việt Nam.</p><p><strong>Sứ mệnh:</strong> Mang đến trải nghiệm cà phê tuyệt vời và môi trường làm việc tích cực.</p>",
  },
  brands: {
    sectionKey: "brands",
    title: "Thương hiệu của chúng tôi",
    content: "<p>Ba mô hình cửa hàng — mỗi thương hiệu có phong cách riêng, cùng một tiêu chuẩn phục vụ và cơ hội phát triển nghề nghiệp.</p>",
    imageUrl: FE_IMAGES.passioStore,
    extraJson: JSON.stringify({ items: DEFAULT_BRAND_ITEMS }),
  },
  why_join: {
    sectionKey: "why_join",
    title: "Vì sao gia nhập",
    subtitle: "Những giá trị và phúc lợi giúp bạn phát triển bền vững cùng UNI Group.",
    extraJson: JSON.stringify({
      valuesLabel: "GIÁ TRỊ CỐT LÕI",
      benefitsLabel: "PHÚC LỢI",
      testimonialsLabel: "Employee Testimonial",
      items: [
        { icon: "heart", title: "Tận tâm", text: "Chúng tôi trân trọng từng thành viên trong đội ngũ.", imageUrl: FE_IMAGES.passioStore },
        { icon: "star", title: "Xuất sắc", text: "Luôn hướng tới chất lượng cao nhất trong mọi việc làm.", imageUrl: FE_IMAGES.beteaStore },
        { icon: "shield", title: "Tin cậy", text: "Làm việc với sự trung thực và tinh thần đồng đội.", imageUrl: FE_IMAGES.deerStore },
        { icon: "light", title: "Đổi mới", text: "Không ngừng học hỏi và cải tiến mỗi ngày.", imageUrl: FE_IMAGES.passioStore },
      ],
      testimonials: DEFAULT_TESTIMONIALS,
    }),
  },
  benefits: {
    sectionKey: "benefits",
    title: "Phúc lợi",
    extraJson: JSON.stringify({
      items: [
        { icon: "discount", title: "Giảm giá sản phẩm", text: "Ưu đãi dành cho nhân viên." },
        { icon: "money", title: "Thu nhập cạnh tranh", text: "Lương thưởng theo hiệu suất." },
        { icon: "book", title: "Đào tạo", text: "Chương trình phát triển nghề nghiệp." },
        { icon: "party", title: "Hoạt động team", text: "Gắn kết đồng nghiệp thường xuyên." },
      ],
    }),
  },
  contact: {
    sectionKey: "contact",
    title: "Liên hệ tuyển dụng",
    content: "<p>Email: recruitment@unigroups.vn</p><p>Hotline: 0900 000 000</p>",
    extraJson: JSON.stringify({ footer: DEFAULT_FOOTER }),
  },
  apply: {
    sectionKey: "apply",
    title: "Đăng ký nhận tin tuyển dụng",
    subtitle: "Để dễ dàng là bước khởi đầu làm việc cùng bạn.",
    extraJson: JSON.stringify({
      eyebrow: "ỨNG TUYỂN NGAY",
      applyUrl: TUYENDUNG_URL,
      ctaLabel: "Điền form ứng tuyển",
    }),
  },
  news: {
    sectionKey: "news",
    title: "Tin tức",
  },
};

function mergeBrandItems(apiItems, feItems) {
  const api = Array.isArray(apiItems) ? apiItems : [];
  if (!api.length) return feItems;
  const looksLegacy = api.some((a) =>
    /Passio Coffee|Passion Cafe|Coffee to go|Community coffee|Tea & trendy drinks/i.test(`${a.name || ""} ${a.short || ""}`)
  );
  if (looksLegacy) return feItems;
  // Prefer FE list length as baseline; overlay admin fields
  const max = Math.max(feItems.length, api.length);
  const out = [];
  for (let i = 0; i < max; i++) {
    const fe = feItems[i] || {};
    const a = api[i] || {};
    if (looksLikeBrokenUtf8(a.name) || looksLikeBrokenUtf8(a.description)) {
      out.push({ ...fe });
      continue;
    }
    out.push({
      name: pickText(a.name, fe.name),
      short: pickText(a.short, fe.short),
      description: pickText(a.description, fe.description),
      imageUrl: pickImage(a.imageUrl, fe.imageUrl),
      logoUrl: pickImage(a.logoUrl, fe.logoUrl),
      linkUrl: (() => {
        const u = pickText(a.linkUrl, fe.linkUrl) || TUYENDUNG_URL;
        return u === "/careers#apply" || u?.endsWith("#apply") ? TUYENDUNG_URL : u;
      })(),
    });
  }
  return out.length ? out : feItems;
}

function mergeExtraJson(key, apiJson, feJson) {
  const fe = safeParse(feJson) || {};
  const api = safeParse(apiJson);
  if (!api) return feJson;

  if (key === "brands") {
    return JSON.stringify({
      items: mergeBrandItems(api.items, DEFAULT_BRAND_ITEMS),
    });
  }
  if (key === "why_join" || key === "benefits") {
    const feItems = fe.items || [];
    const apiItems = Array.isArray(api.items) ? api.items : [];
    if (!apiItems.length || apiItems.some((it) => looksLikeBrokenUtf8(it.title) || looksLikeBrokenUtf8(it.text))) {
      return feJson;
    }
    const merged = {
      ...fe,
      ...api,
      items: apiItems.map((it, i) => ({
        icon: pickText(it.icon, feItems[i]?.icon),
        title: pickText(it.title, feItems[i]?.title),
        text: pickText(it.text, feItems[i]?.text),
        imageUrl: key === "why_join"
          ? (feItems[i]?.imageUrl || pickImage(it.imageUrl, feItems[i]?.imageUrl))
          : pickImage(it.imageUrl, feItems[i]?.imageUrl),
      })),
    };
    if (key === "why_join" && Array.isArray(api.testimonials) && api.testimonials.length) {
      merged.testimonials = api.testimonials.map((t, i) => ({
        quote: pickText(t.quote, fe.testimonials?.[i]?.quote),
        name: pickText(t.name, fe.testimonials?.[i]?.name),
        role: pickText(t.role, fe.testimonials?.[i]?.role),
      }));
    }
    return JSON.stringify(merged);
  }
  if (key === "hero" || key === "apply") {
    const feGallery = Array.isArray(fe.gallery) ? fe.gallery : [];
    const apiGallery = Array.isArray(api.gallery) ? api.gallery : [];
    const gallery = [0, 1, 2, 3].map((i) => pickImage(apiGallery[i], feGallery[i]));
    const merged = { ...fe, ...api, gallery };
    if (key === "apply") {
      const url = merged.applyUrl || fe.applyUrl || TUYENDUNG_URL;
      merged.applyUrl = String(url).includes("#apply") ? TUYENDUNG_URL : url;
      merged.ctaLabel = merged.ctaLabel || fe.ctaLabel || "Điền form ứng tuyển";
    }
    return JSON.stringify(merged);
  }
  if (key === "contact") {
    const feFooter = fe.footer || DEFAULT_FOOTER;
    const apiFooter = api.footer || {};
    if (/Passion Cafe|passioncafe/i.test(apiFooter.siteName || "")) return feJson;
    const mergeNav = (apiArr, feArr) => {
      if (!Array.isArray(apiArr) || !apiArr.length) return feArr;
      if (apiArr.some((x) => looksLikeBrokenUtf8(x.label) || x.href?.includes("#jobs"))) return feArr;
      return apiArr;
    };
    const merged = {
      ...feFooter,
      ...Object.fromEntries(
        Object.entries(apiFooter).map(([k, v]) => {
          if (k === "headerNav") return [k, mergeNav(v, feFooter.headerNav)];
          if (k === "quickLinks") return [k, mergeNav(v, feFooter.quickLinks)];
          if (Array.isArray(v)) return [k, v.length ? v : feFooter[k]];
          if (k === "siteLogoUrl") return [k, pickImage(v, feFooter[k] || "") || ""];
          if (typeof v === "string") return [k, pickText(v, feFooter[k])];
          return [k, v ?? feFooter[k]];
        })
      ),
    };
    return JSON.stringify({ footer: merged });
  }
  return looksLikeBrokenUtf8(apiJson) ? feJson : (apiJson || feJson);
}

function safeParse(json) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

function mergeOne(apiSection, key) {
  const def = DEFAULT_SECTIONS[key] || {};
  if (!apiSection) return { ...def };

  // Admin đã lưu CMS — ưu tiên nội dung API (trừ bản Passion Cafe cũ)
  const passionLegacy = /Passion Cafe|Passio Coffee|Careers at Passion/i.test(
    `${apiSection.title || ""} ${apiSection.subtitle || ""} ${apiSection.content || ""} ${apiSection.extraJson || ""}`
  );
  if (apiSection.updatedAt && !passionLegacy) {
    return {
      ...def,
      ...apiSection,
      title: apiSection.title?.trim() || def.title,
      subtitle: apiSection.subtitle?.trim() || def.subtitle,
      content: apiSection.content?.trim() || def.content,
      imageUrl: def.imageUrl,
      extraJson: mergeExtraJson(key, apiSection.extraJson, def.extraJson),
      isActive: apiSection.isActive !== false,
    };
  }

  return {
    ...def,
    ...apiSection,
    title: pickText(apiSection.title, def.title),
    subtitle: pickText(apiSection.subtitle, def.subtitle),
    content: pickText(apiSection.content, def.content),
    imageUrl: def.imageUrl,
    extraJson: mergeExtraJson(key, apiSection.extraJson, def.extraJson),
    isActive: apiSection.isActive !== false,
    sortOrder: apiSection.sortOrder ?? def.sortOrder,
  };
}

/** API overlay on FE defaults — never blank after deploy even if CMS empty. */
export function sectionMap(sections) {
  const m = {};
  Object.keys(DEFAULT_SECTIONS).forEach((key) => {
    m[key] = { ...DEFAULT_SECTIONS[key] };
  });
  (sections || []).forEach((s) => {
    if (!s?.sectionKey) return;
    m[s.sectionKey] = mergeOne(s, s.sectionKey);
  });
  return m;
}

/** Blog: FE samples until Admin publishes real posts. */
export function blogMap(posts) {
  const list = (posts || []).filter((p) => p && (p.isPublished !== false));
  if (!list.length) return DEFAULT_BLOG_POSTS.map((p) => ({ ...p }));
  return list.map((p) => ({
    ...p,
    title: pickText(p.title, p.title),
    summary: pickText(p.summary, p.summary),
    coverImageUrl: pickImage(p.coverImageUrl, FE_IMAGES.passioStore),
  }));
}

export function mediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  if (path.startsWith("/images/") || path.startsWith("/uploads/")) return path;
  return `${API_BASE}${path}`;
}

export function parseExtraJson(json) {
  const data = safeParse(json);
  if (!data) return null;
  return data;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML from CMS → plain text for admin textarea. */
export function htmlToPlain(html) {
  if (!html) return "";
  let t = String(html);
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n");
  t = t.replace(/<p[^>]*>/gi, "");
  t = t.replace(/<\/p>/gi, "\n");
  t = t.replace(/<\/div>/gi, "\n");
  t = t.replace(/<li[^>]*>/gi, "• ");
  t = t.replace(/<\/li>/gi, "\n");
  t = t.replace(/<strong>(.*?)<\/strong>/gi, "$1");
  t = t.replace(/<[^>]+>/g, "");
  t = t
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

/** Plain text from admin → safe HTML for public page. */
export function plainToHtml(text) {
  if (!text) return "";
  const t = String(text).trim();
  if (!t) return "";
  if (/<(p|div|ul|ol|h[1-6]|table)\b/i.test(t)) return t;
  return t
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => {
      const m = para.match(/^([^:\n]{1,50}):\s*([\s\S]+)$/);
      if (m) {
        const body = escapeHtml(m[2]).replace(/\n/g, "<br>");
        return `<p><strong>${escapeHtml(m[1])}:</strong> ${body}</p>`;
      }
      return `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

export function parseVisionMission(html) {
  const plain = htmlToPlain(html || "");
  const visionMatch = plain.match(/Tầm nhìn:\s*([\s\S]*?)(?=\n\s*Sứ mệnh:|$)/i);
  const missionMatch = plain.match(/Sứ mệnh:\s*([\s\S]*)/i);
  return {
    vision: visionMatch?.[1]?.trim() || "",
    mission: missionMatch?.[1]?.trim() || "",
  };
}

export function buildVisionHtml(vision, mission) {
  const parts = [];
  if (vision?.trim()) parts.push(`<p><strong>Tầm nhìn:</strong> ${escapeHtml(vision.trim())}</p>`);
  if (mission?.trim()) parts.push(`<p><strong>Sứ mệnh:</strong> ${escapeHtml(mission.trim())}</p>`);
  return parts.join("");
}

export function getFooterFromSections(sectionsMap) {
  const contact = sectionsMap?.contact || DEFAULT_SECTIONS.contact;
  const extra = parseExtraJson(contact.extraJson);
  const footer = { ...DEFAULT_FOOTER, ...(extra?.footer || {}) };
  const rewrite = (items) =>
    (items || []).map((n) => {
      const href = String(n?.href || "");
      if (href.includes("#apply") || href === "/careers#apply") {
        return { ...n, href: TUYENDUNG_URL };
      }
      return n;
    });
  return {
    ...footer,
    headerNav: rewrite(footer.headerNav),
    quickLinks: rewrite(footer.quickLinks),
  };
}

export function isGoogleMapsShortLink(url) {
  return !!url && /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(String(url));
}

/** Short goo.gl links cannot be embedded — use mapLinkUrl for click + mapEmbedUrl for iframe. */
export function resolveMapDisplay(footer) {
  const embedRaw = String(footer?.mapEmbedUrl || "").trim();
  const linkRaw = String(footer?.mapLinkUrl || "").trim();

  let mapLink = linkRaw || embedRaw || DEFAULT_FOOTER.mapLinkUrl;
  let mapEmbed = embedRaw || DEFAULT_FOOTER.mapEmbedUrl;

  if (isGoogleMapsShortLink(mapEmbed)) {
    if (!linkRaw) mapLink = mapEmbed;
    mapEmbed = DEFAULT_FOOTER.mapEmbedUrl;
  }

  if (!mapLink) mapLink = DEFAULT_FOOTER.mapLinkUrl;
  if (!mapEmbed || isGoogleMapsShortLink(mapEmbed)) mapEmbed = DEFAULT_FOOTER.mapEmbedUrl;

  return { mapLink, mapEmbed };
}
