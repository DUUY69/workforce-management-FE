import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, Typography, Button, Input, Switch, Chip } from "@material-tailwind/react";
import { DocumentTextIcon, PencilSquareIcon } from "@heroicons/react/24/solid";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import {
  mediaUrl,
  parseExtraJson,
  DEFAULT_SECTIONS,
  DEFAULT_TESTIMONIALS,
  htmlToPlain,
  plainToHtml,
  parseVisionMission,
  buildVisionHtml,
} from "@/pages/careers/careers-utils";

const TABS = [
  { id: "applications", label: "Hồ sơ", icon: DocumentTextIcon },
  { id: "apply-form", label: "Form công khai", icon: PencilSquareIcon, adminOnly: true },
];

const JOB_STATUSES = ["Draft", "Open", "Closed"];
const APP_STATUSES = ["New", "Screening", "Interview", "Offer", "Hired", "Rejected"];

const APP_STATUS_META = {
  New: { label: "Mới", bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-300" },
  Screening: { label: "Sàng lọc", bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-300" },
  Interview: { label: "Phỏng vấn", bg: "bg-violet-50", text: "text-violet-900", border: "border-violet-300" },
  Offer: { label: "Đề nghị", bg: "bg-cyan-50", text: "text-cyan-900", border: "border-cyan-300" },
  Hired: { label: "Đã tuyển", bg: "bg-green-50", text: "text-green-900", border: "border-green-300" },
  Rejected: { label: "Từ chối", bg: "bg-red-50", text: "text-red-900", border: "border-red-300" },
};

function CellTruncate({ value, className = "" }) {
  if (!value) return <span className="text-blue-gray-300">—</span>;
  const s = String(value);
  return (
    <span title={s} className={`block truncate max-w-full cursor-help ${className}`}>
      {s}
    </span>
  );
}

/** Quy trình: Admin nhận → xem xét → chuyển QL CH → QL gửi PV → Đề nghị/Tuyển → tạo NV */
function appWorkflowStep(app) {
  if (app.employeeId || app.status === "Hired") return 5;
  if (app.status === "Offer") return 4;
  if (app.status === "Interview" || parseInterviewNote(app.notes)) return 3;
  if (app.assignedStoreId) return 2;
  return 1;
}

function canSendInterview(app) {
  return Boolean(app?.email && app?.assignedStoreId);
}

function canCreateEmployee(app) {
  if (!app || app.employeeId || app.status === "Hired") return false;
  if (!app.assignedStoreId) return false;
  return app.status === "Interview" || app.status === "Offer";
}

function StatusSelect({ value, onChange }) {
  const meta = APP_STATUS_META[value] || APP_STATUS_META.New;
  return (
    <select
      className={`border rounded-lg text-xs px-2 py-1.5 font-semibold min-w-[108px] ${meta.bg} ${meta.text} ${meta.border}`}
      value={value}
      onChange={onChange}
    >
      {APP_STATUSES.map((s) => (
        <option key={s} value={s}>{APP_STATUS_META[s]?.label || s}</option>
      ))}
    </select>
  );
}

const SECTION_LABELS = {
  hero: "Hero (banner)",
  about: "Về chúng tôi",
  vision: "Tầm nhìn & Sứ mệnh",
  brands: "Thương hiệu",
  why_join: "Vì sao gia nhập",
  benefits: "Phúc lợi",
  apply: "Form ứng tuyển",
  news: "Tin tức (chỉ tiêu đề)",
  contact: "Liên hệ / Header / Footer",
};

function parseJsonSafe(json, fallback) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function emptyJob() {
  return { title: "", slug: "", department: "", location: "", storeId: "", description: "", requirements: "", benefits: "", status: "Draft" };
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-blue-gray-400">{label}</p>
      <p className="text-sm text-blue-gray-800 whitespace-pre-wrap break-words">{value || "—"}</p>
    </div>
  );
}

function parseInterviewNote(notes) {
  const text = String(notes || "").trim();
  if (!text) return null;
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).reverse();
  const raw = lines.find((line) => line.startsWith("[Phỏng vấn]"));
  if (!raw) return null;
  const match = raw.match(/^\[Phỏng vấn\]\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})\s+—\s+(.+)$/);
  if (!match) return { raw, whenLabel: raw.replace("[Phỏng vấn]", "").trim(), location: "" };
  const [, dd, mm, yyyy, hh, mi, location] = match;
  const when = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi));
  return {
    raw,
    when,
    whenLabel: `${dd}/${mm}/${yyyy} ${hh}:${mi}`,
    location: location?.trim() || "",
  };
}

function describeInterviewTiming(when) {
  if (!(when instanceof Date) || Number.isNaN(when.getTime())) return "";
  const diffMs = when.getTime() - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 0) return "Đã qua";
  if (diffHours < 24) return `Trong ${diffHours} giờ`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Ngày mai";
  return `Còn ${diffDays} ngày`;
}

function emptyBlog() {
  return { title: "", slug: "", summary: "", content: "", contentPlain: "", coverImageUrl: "", isPublished: false };
}

const CONTENT_SECTIONS_WITHOUT_HTML = ["news", "apply", "why_join", "benefits", "contact"];

function PlainContentField({ label = "Nội dung", hint, value, onChange, rows = 5 }) {
  return (
    <div>
      <Typography variant="small" color="blue-gray" className="mb-1 font-medium">{label}</Typography>
      {hint ? <p className="text-xs text-blue-gray-500 mb-2">{hint}</p> : null}
      <textarea
        rows={rows}
        className="w-full border border-blue-gray-200 rounded-lg p-3 text-sm bg-white"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Gõ nội dung bình thường — không cần thẻ HTML. Xuống dòng trống = đoạn mới."
      />
    </div>
  );
}

const ICON_OPTIONS = [
  { value: "heart", label: "Tận tâm (heart)" },
  { value: "star", label: "Xuất sắc (star)" },
  { value: "shield", label: "Tin cậy (shield)" },
  { value: "light", label: "Đổi mới (light)" },
  { value: "discount", label: "Giảm giá (discount)" },
  { value: "money", label: "Thu nhập (money)" },
  { value: "book", label: "Đào tạo (book)" },
  { value: "party", label: "Team (party)" },
];

function ImageUploadField({ label, value, onChange, uploading, onUpload }) {
  return (
    <div className="space-y-2 rounded-lg border border-blue-gray-100 bg-blue-gray-50/40 p-3">
      <Typography variant="small" className="font-semibold text-blue-gray-800">{label}</Typography>
      {value ? (
        <img src={mediaUrl(value)} alt="" className="h-24 w-full max-w-sm rounded-lg object-cover border border-white shadow-sm" />
      ) : (
        <div className="h-16 rounded-lg border border-dashed border-blue-gray-200 bg-white flex items-center justify-center text-xs text-blue-gray-400">
          Chưa có ảnh
        </div>
      )}
      <Input size="md" label="URL ảnh" value={value || ""} onChange={(e) => onChange(e.target.value)} />
      <div className="flex items-center gap-2 flex-wrap">
        <label className="inline-flex items-center gap-2 text-sm text-blue-gray-700 cursor-pointer bg-white border border-blue-gray-200 rounded-lg px-3 py-2 hover:bg-blue-gray-50">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await onUpload(file);
              if (url) onChange(url);
              e.target.value = "";
            }}
          />
          {uploading ? "Đang upload..." : "Chọn ảnh từ máy"}
        </label>
        {value ? (
          <Button size="sm" variant="text" color="red" onClick={() => onChange("")}>Xóa ảnh</Button>
        ) : null}
      </div>
    </div>
  );
}

function EditorBlock({ title, hint, children, defaultOpen = true, step }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-blue-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-gray-50 to-white hover:from-blue-50 text-left"
      >
        <div className="min-w-0">
          {step ? (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded mb-1">
              {step}
            </span>
          ) : null}
          <p className="font-semibold text-blue-gray-900">{title}</p>
          {hint ? <p className="text-xs text-blue-gray-500 mt-1 leading-relaxed">{hint}</p> : null}
        </div>
        <span className="text-blue-gray-400 text-xl leading-none shrink-0 mt-0.5">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="p-4 space-y-4 border-t border-blue-gray-100">{children}</div> : null}
    </div>
  );
}

function SubTabBar({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-blue-gray-100/80">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            active === t.id ? "bg-white text-blue-900 shadow-sm" : "text-blue-gray-600 hover:text-blue-gray-900"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ItemCard({ index, title, onRemove, children }) {
  return (
    <div className="rounded-xl border-2 border-blue-gray-100 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-gray-50 border-b border-blue-gray-100">
        <span className="text-sm font-semibold text-blue-gray-800">{title || `Mục #${index + 1}`}</span>
        {onRemove ? (
          <Button size="sm" variant="text" color="red" className="text-xs" onClick={onRemove}>Xóa</Button>
        ) : null}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function withSectionDefaults(section) {
  if (!section?.sectionKey) return { ...section };
  const def = DEFAULT_SECTIONS[section.sectionKey];
  if (!def?.extraJson) return { ...section };

  const extra = parseExtraJson(section.extraJson) || {};
  const defExtra = parseExtraJson(def.extraJson) || {};

  if (section.sectionKey === "why_join") {
    const merged = {
      ...defExtra,
      ...extra,
      valuesLabel: extra.valuesLabel || defExtra.valuesLabel,
      benefitsLabel: extra.benefitsLabel || defExtra.benefitsLabel,
      testimonialsLabel: extra.testimonialsLabel || defExtra.testimonialsLabel,
      items: extra.items?.length ? extra.items : defExtra.items,
      testimonials: extra.testimonials?.length ? extra.testimonials : defExtra.testimonials,
    };
    return { ...section, extraJson: JSON.stringify(merged) };
  }

  if (section.sectionKey === "hero") {
    const gallery = Array.isArray(extra.gallery) && extra.gallery.some(Boolean)
      ? extra.gallery
      : defExtra.gallery;
    return { ...section, extraJson: JSON.stringify({ ...defExtra, ...extra, gallery }) };
  }

  return { ...section };
}

function prepareContentForm(section) {
  const sec = withSectionDefaults({ ...section });
  if (!sec?.sectionKey) return { ...sec };

  if (sec.sectionKey === "vision") {
    const { vision, mission } = parseVisionMission(sec.content);
    return { ...sec, visionText: vision, missionText: mission };
  }

  if (!CONTENT_SECTIONS_WITHOUT_HTML.includes(sec.sectionKey)) {
    return { ...sec, contentPlain: htmlToPlain(sec.content || "") };
  }

  return { ...sec };
}

function buildSectionContent(active, form) {
  if (active === "vision") return buildVisionHtml(form.visionText, form.missionText);
  if (!CONTENT_SECTIONS_WITHOUT_HTML.includes(active)) {
    return plainToHtml(form.contentPlain ?? "");
  }
  return form.content;
}

// ── Page content editor ───────────────────────────────────────────────────────
function ContentTab() {
  const [sections, setSections] = useState([]);
  const [active, setActive] = useState("hero");
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [whySubTab, setWhySubTab] = useState("testimonial");
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogForm, setBlogForm] = useState(null);
  const [blogUploading, setBlogUploading] = useState(false);
  const [blogMsg, setBlogMsg] = useState("");

  const loadBlogPosts = useCallback(async () => {
    const r = await api.get("/recruitment/admin/blog");
    setBlogPosts(r.data.data || []);
  }, []);

  const load = useCallback(async () => {
    const r = await api.get("/recruitment/admin/page-sections");
    const list = r.data.data || [];
    const merged = Object.keys(SECTION_LABELS).map((key, i) =>
      list.find((s) => s.sectionKey === key) || { sectionKey: key, sortOrder: i + 1, isActive: true }
    );
    setSections(merged);
    if (active !== "blog") {
      const cur = prepareContentForm(merged.find((s) => s.sectionKey === active) || merged[0]);
      if (cur) setForm({ ...cur });
    }
  }, [active]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadBlogPosts(); }, [loadBlogPosts]);

  const pick = (key) => {
    if (key === "blog") {
      setActive("blog");
      setMsg("");
      setBlogMsg("");
      setBlogForm(null);
      return;
    }
    const s = sections.find((x) => x.sectionKey === key);
    if (s) {
      setActive(key);
      setForm(prepareContentForm({ ...s }));
      setMsg("");
      setBlogForm(null);
      if (key === "why_join") setWhySubTab("testimonial");
    }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) {
      setForm((f) => ({ ...f, imageUrl: url }));
      setMsg("Đã upload ảnh.");
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/recruitment/admin/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return r.data?.data?.url || null;
    } catch (err) {
      setMsg(err.response?.data?.message || "Upload thất bại.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const saveBlog = async () => {
    if (!blogForm) return;
    setBlogMsg("");
    const payload = {
      ...blogForm,
      content: plainToHtml(blogForm.contentPlain ?? blogForm.content ?? ""),
    };
    delete payload.contentPlain;
    try {
      if (blogForm.id) await api.put(`/recruitment/admin/blog/${blogForm.id}`, payload);
      else await api.post("/recruitment/admin/blog", payload);
      setBlogForm(null);
      setBlogMsg("Đã lưu bài viết.");
      await loadBlogPosts();
    } catch (err) {
      setBlogMsg(err.response?.data?.message || "Lỗi lưu bài viết.");
    }
  };

  const deleteBlog = async (id) => {
    if (!confirm("Xóa bài?")) return;
    await api.delete(`/recruitment/admin/blog/${id}`);
    setBlogForm(null);
    await loadBlogPosts();
  };

  const uploadBlogCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !blogForm) return;
    setBlogUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/recruitment/admin/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setBlogForm({ ...blogForm, coverImageUrl: r.data.data.url });
    } finally {
      setBlogUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await api.put(`/recruitment/admin/page-sections/${active}`, {
        title: form.title,
        subtitle: form.subtitle,
        content: buildSectionContent(active, form),
        imageUrl: form.imageUrl,
        extraJson: form.extraJson,
        sortOrder: form.sortOrder ?? 0,
        isActive: form.isActive !== false,
      });
      setMsg("Đã lưu.");
      await load();
    } catch (err) {
      setMsg(err.response?.data?.message || "Lỗi lưu.");
    } finally {
      setSaving(false);
    }
  };

  const extra = parseExtraJson(form.extraJson) || {};
  const items = extra?.items || [];
  const contactExtra = parseJsonSafe(form.extraJson, { footer: { quickLinks: [], socials: [] } });
  const footer = contactExtra.footer || { quickLinks: [], socials: [] };
  const brandItems = parseJsonSafe(form.extraJson, { items: [] }).items || [];
  const testimonials = extra?.testimonials || [];

  const setExtraField = (field, value) => {
    setForm((f) => ({ ...f, extraJson: JSON.stringify({ ...extra, [field]: value }) }));
  };

  const setTestimonial = (idx, field, value) => {
    const next = [...testimonials];
    next[idx] = { ...next[idx], [field]: value };
    setExtraField("testimonials", next);
  };

  const addTestimonial = () => {
    setExtraField("testimonials", [...testimonials, { quote: "", name: "", role: "" }]);
  };

  const removeTestimonial = (idx) => {
    setExtraField("testimonials", testimonials.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, val) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    setExtraField("items", next);
  };

  const addItem = () => {
    setExtraField("items", [...items, { icon: "heart", title: "", text: "", imageUrl: "" }]);
  };

  const removeItem = (idx) => {
    setExtraField("items", items.filter((_, i) => i !== idx));
  };

  const setFooterField = (field, value) => {
    const next = {
      ...contactExtra,
      footer: {
        ...(contactExtra.footer || {}),
        [field]: value,
      },
    };
    setForm((f) => ({ ...f, extraJson: JSON.stringify(next) }));
  };

  const setFooterArrField = (arrKey, idx, field, value) => {
    const arr = [...(footer[arrKey] || [])];
    arr[idx] = { ...arr[idx], [field]: value };
    setFooterField(arrKey, arr);
  };

  const addFooterArrField = (arrKey, seed) => {
    const arr = [...(footer[arrKey] || []), seed];
    setFooterField(arrKey, arr);
  };

  const removeFooterArrField = (arrKey, idx) => {
    const arr = (footer[arrKey] || []).filter((_, i) => i !== idx);
    setFooterField(arrKey, arr);
  };

  const setBrandItem = (idx, field, value) => {
    const next = [...brandItems];
    next[idx] = { ...next[idx], [field]: value };
    setForm((f) => ({ ...f, extraJson: JSON.stringify({ items: next }) }));
  };

  const addBrandItem = () => {
    setForm((f) => ({
      ...f,
      extraJson: JSON.stringify({
        items: [...brandItems, { name: "", short: "", description: "", imageUrl: "", logoUrl: "", linkUrl: "" }],
      }),
    }));
  };

  const removeBrandItem = (idx) => {
    const next = brandItems.filter((_, i) => i !== idx);
    setForm((f) => ({ ...f, extraJson: JSON.stringify({ items: next }) }));
  };

  const hideHtml = CONTENT_SECTIONS_WITHOUT_HTML.includes(active);
  const hideSectionImage = ["news", "why_join", "benefits", "contact", "apply", "hero"].includes(active);
  const hideSubtitle = ["news", "contact"].includes(active);

  const heroGallery = Array.isArray(extra.gallery) ? [...extra.gallery] : [];
  while (heroGallery.length < 4) heroGallery.push("");

  const setHeroGalleryImage = (idx, url) => {
    const next = [...heroGallery];
    next[idx] = url;
    setExtraField("gallery", next);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="xl:w-56 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-gray-400 mb-2 px-1">Section trang web</p>
        <div className="flex flex-col gap-1">
        {sections.map((s) => (
          <button
            key={s.sectionKey}
            type="button"
            onClick={() => pick(s.sectionKey)}
            className={`text-left px-3 py-2.5 rounded-lg text-sm transition ${active === s.sectionKey ? "bg-blue-800 text-white font-semibold shadow-sm" : "hover:bg-blue-gray-50 text-blue-gray-700"}`}
          >
            {SECTION_LABELS[s.sectionKey] || s.sectionKey}
          </button>
        ))}
        <div className="my-2 border-t border-blue-gray-100" />
        <button
          type="button"
          onClick={() => pick("blog")}
          className={`text-left px-3 py-2.5 rounded-lg text-sm transition ${active === "blog" ? "bg-blue-800 text-white font-semibold shadow-sm" : "hover:bg-blue-gray-50 text-blue-gray-700"}`}
        >
          Bài tin (Blog)
        </button>
        </div>
      </div>
      <div className="flex-1 min-w-0 max-w-3xl space-y-4">
        {active === "blog" ? (
          <>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="font-semibold text-blue-900">Bài tin (Blog)</p>
              <p className="text-xs text-blue-800/80 mt-1">
                Quản lý bài viết hiển thị ở section <strong>Tin tức</strong> trên{" "}
                <a href="/careers#blog" target="_blank" rel="noreferrer" className="underline">/careers</a>.
                Tiêu đề section Tin tức chỉnh ở mục <strong>Tin tức (chỉ tiêu đề)</strong> bên trái.
              </p>
            </div>
            <Button size="sm" onClick={() => { setBlogForm(emptyBlog()); setBlogMsg(""); }}>+ Bài mới</Button>
            {blogForm && (
              <Card className="border border-blue-gray-100">
                <CardBody className="gap-3 flex flex-col">
                  <Input label="Tiêu đề *" value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })} />
                  <Input label="Slug" value={blogForm.slug} onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })} />
                  <Input label="Tóm tắt" value={blogForm.summary} onChange={(e) => setBlogForm({ ...blogForm, summary: e.target.value })} />
                  <PlainContentField
                    label="Nội dung bài viết"
                    hint="Gõ nội dung bình thường — xuống dòng trống để tách đoạn. Không cần thẻ HTML."
                    rows={8}
                    value={blogForm.contentPlain ?? ""}
                    onChange={(v) => setBlogForm({ ...blogForm, contentPlain: v })}
                  />
                  <Typography variant="small" className="font-medium text-blue-gray-700">Ảnh bìa</Typography>
                  {blogForm.coverImageUrl && <img src={mediaUrl(blogForm.coverImageUrl)} alt="" className="h-24 rounded object-cover" />}
                  <input type="file" accept="image/*" onChange={uploadBlogCover} disabled={blogUploading} className="text-sm" />
                  <Switch label="Xuất bản" checked={!!blogForm.isPublished} onChange={(e) => setBlogForm({ ...blogForm, isPublished: e.target.checked })} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveBlog}>Lưu bài</Button>
                    <Button size="sm" variant="outlined" onClick={() => setBlogForm(null)}>Hủy</Button>
                  </div>
                </CardBody>
              </Card>
            )}
            {blogMsg && (
              <Typography variant="small" color={blogMsg.includes("Lỗi") ? "red" : "green"}>{blogMsg}</Typography>
            )}
            <div className="space-y-2">
              {blogPosts.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b py-2 text-sm">
                  <span>
                    {p.title}{" "}
                    {p.isPublished ? <Chip size="sm" value="Đã xuất bản" color="green" className="ml-2 inline" /> : null}
                  </span>
                  <div>
                    <Button size="sm" variant="text" onClick={() => setBlogForm({ ...p, contentPlain: htmlToPlain(p.content) })}>Sửa</Button>
                    <Button size="sm" variant="text" color="red" onClick={() => deleteBlog(p.id)}>Xóa</Button>
                  </div>
                </div>
              ))}
              {!blogPosts.length && (
                <p className="text-sm text-blue-gray-500 py-4">Chưa có bài nào — bấm &quot;+ Bài mới&quot; để thêm.</p>
              )}
            </div>
          </>
        ) : (
          <>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="font-semibold text-blue-900">{SECTION_LABELS[active] || active}</p>
          <p className="text-xs text-blue-800/80 mt-1">Sửa từng khối bên dưới → <strong>Lưu section</strong> → xem <a href="/careers" target="_blank" rel="noreferrer" className="underline">/careers</a></p>
        </div>

        <EditorBlock step="1" title="Thông tin chung" hint="Tiêu đề hiển thị trên section này">
          <Input label="Tiêu đề" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          {!hideSubtitle && (
            <Input label="Phụ đề" value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          )}
          {!hideHtml && active === "vision" && (
            <>
              <PlainContentField
                label="Tầm nhìn"
                hint="Mô tả tầm nhìn của công ty — chỉ cần gõ chữ, không cần thẻ HTML."
                value={form.visionText || ""}
                onChange={(v) => setForm({ ...form, visionText: v })}
              />
              <PlainContentField
                label="Sứ mệnh"
                hint="Mô tả sứ mệnh của công ty."
                value={form.missionText || ""}
                onChange={(v) => setForm({ ...form, missionText: v })}
              />
            </>
          )}
          {!hideHtml && active !== "vision" && (
            <PlainContentField
              hint="Gõ nội dung như Word — xuống dòng trống để tách đoạn. Không cần &lt;p&gt;, &lt;strong&gt;..."
              value={form.contentPlain || ""}
              onChange={(v) => setForm({ ...form, contentPlain: v })}
            />
          )}
        </EditorBlock>
        {!hideSectionImage && active === "about" && (
        <EditorBlock step="2" title="Ảnh section" hint="Về chúng tôi — 1 ảnh bên cạnh nội dung">
          {form.imageUrl && <img src={mediaUrl(form.imageUrl)} alt="" className="h-32 rounded-lg object-cover border" />}
          <Input label="URL ảnh" value={form.imageUrl || ""} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <label className="inline-flex items-center gap-2 text-sm text-blue-gray-700 cursor-pointer bg-white border border-blue-gray-200 rounded-lg px-3 py-2 hover:bg-blue-gray-50 w-fit">
            <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} />
            {uploading ? "Đang upload..." : "Chọn ảnh từ máy"}
          </label>
        </EditorBlock>
        )}
        {active === "news" && (
          <EditorBlock step="2" title="Lưu ý về Tin tức" hint="Bài viết + ảnh bìa quản lý ở mục Bài tin (Blog)">
            <p className="text-sm text-blue-gray-700">
              Trên web, phần <strong>Tin tức</strong> hiển thị các <strong>bài blog</strong> (ảnh + tiêu đề + mô tả).
              Ở đây chỉ đổi <strong>tiêu đề section</strong> phía trên. Chọn <strong>Bài tin (Blog)</strong> ở sidebar để thêm/sửa bài.
            </p>
          </EditorBlock>
        )}
        {active === "why_join" && (
          <>
            <SubTabBar
              active={whySubTab}
              onChange={setWhySubTab}
              tabs={[
                { id: "testimonial", label: "① Testimonial" },
                { id: "values", label: "② Our Values" },
                { id: "labels", label: "③ Nhãn hiển thị" },
              ]}
            />
            {whySubTab === "testimonial" && (
              <EditorBlock step="2" title="Employee Testimonial" hint="Câu trích dẫn nhân viên — tự chuyển trên web">
                <Input size="md" label="Nhãn section" value={extra.testimonialsLabel || ""} onChange={(e) => setExtraField("testimonialsLabel", e.target.value)} />
                <div className="space-y-3">
                  {testimonials.map((t, i) => (
                    <ItemCard key={i} index={i} title={t.name || `Testimonial #${i + 1}`} onRemove={() => removeTestimonial(i)}>
                      <textarea rows={3} className="w-full border border-blue-gray-200 rounded-lg p-3 text-sm bg-white" placeholder="Trích dẫn" value={t.quote || ""} onChange={(e) => setTestimonial(i, "quote", e.target.value)} />
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Input size="md" label="Tên nhân viên" value={t.name || ""} onChange={(e) => setTestimonial(i, "name", e.target.value)} />
                        <Input size="md" label="Vị trí" value={t.role || ""} onChange={(e) => setTestimonial(i, "role", e.target.value)} />
                      </div>
                    </ItemCard>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outlined" onClick={addTestimonial}>+ Thêm người</Button>
                  <Button size="sm" variant="outlined" color="blue" onClick={() => setExtraField("testimonials", DEFAULT_TESTIMONIALS.map((t) => ({ ...t })))}>
                    Tải mẫu 3 người
                  </Button>
                </div>
              </EditorBlock>
            )}
            {whySubTab === "values" && (
              <EditorBlock step="2" title="Our Values" hint="4 thẻ giá trị — mỗi thẻ 1 ảnh nền + icon + chữ">
                <div className="space-y-4">
                  {items.map((it, i) => (
                    <ItemCard key={i} index={i} title={it.title || `Thẻ #${i + 1}`} onRemove={() => removeItem(i)}>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <label className="text-xs text-blue-gray-600">
                          Icon
                          <select className="mt-1 w-full border border-blue-gray-200 rounded-lg p-2.5 text-sm bg-white" value={it.icon || "heart"} onChange={(e) => updateItem(i, "icon", e.target.value)}>
                            {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </label>
                        <Input size="md" label="Tiêu đề" value={it.title || ""} onChange={(e) => updateItem(i, "title", e.target.value)} />
                      </div>
                      <Input size="md" label="Mô tả" value={it.text || ""} onChange={(e) => updateItem(i, "text", e.target.value)} />
                      <ImageUploadField label="Ảnh nền thẻ" value={it.imageUrl || ""} onChange={(url) => updateItem(i, "imageUrl", url)} uploading={uploading} onUpload={uploadFile} />
                    </ItemCard>
                  ))}
                </div>
                <Button size="sm" variant="outlined" onClick={addItem}>+ Thêm thẻ Values</Button>
              </EditorBlock>
            )}
            {whySubTab === "labels" && (
              <EditorBlock step="2" title="Nhãn phụ trên web" hint="Dòng chữ nhỏ phía trên các khối con">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input size="md" label="Nhãn Our Values" value={extra.valuesLabel || ""} onChange={(e) => setExtraField("valuesLabel", e.target.value)} />
                  <Input size="md" label="Nhãn Our Benefits" value={extra.benefitsLabel || ""} onChange={(e) => setExtraField("benefitsLabel", e.target.value)} />
                </div>
              </EditorBlock>
            )}
          </>
        )}
        {active === "benefits" && (
          <EditorBlock step="2" title="Phúc lợi" hint="Icon tròn + tiêu đề (không cần ảnh nền)">
            <div className="space-y-3">
              {items.map((it, i) => (
                <ItemCard key={i} index={i} title={it.title || `Phúc lợi #${i + 1}`} onRemove={() => removeItem(i)}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="text-xs text-blue-gray-600">
                      Icon
                      <select className="mt-1 w-full border border-blue-gray-200 rounded-lg p-2.5 text-sm bg-white" value={it.icon || "discount"} onChange={(e) => updateItem(i, "icon", e.target.value)}>
                        {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </label>
                    <Input size="md" label="Tiêu đề" value={it.title || ""} onChange={(e) => updateItem(i, "title", e.target.value)} />
                  </div>
                  <Input size="md" label="Mô tả" value={it.text || ""} onChange={(e) => updateItem(i, "text", e.target.value)} />
                </ItemCard>
              ))}
            </div>
            <Button size="sm" variant="outlined" onClick={addItem}>+ Thêm phúc lợi</Button>
          </EditorBlock>
        )}
        {active === "hero" && (
          <>
            <EditorBlock step="2" title="Nút & dòng phụ" hint="Eyebrow + 2 nút CTA bên trái banner">
              <div className="grid sm:grid-cols-3 gap-3">
                <Input size="md" label="Dòng nhỏ trên tiêu đề" value={extra.eyebrow || ""} onChange={(e) => setExtraField("eyebrow", e.target.value)} />
                <Input size="md" label="Nút chính" value={extra.ctaPrimary || ""} onChange={(e) => setExtraField("ctaPrimary", e.target.value)} />
                <Input size="md" label="Nút phụ" value={extra.ctaSecondary || ""} onChange={(e) => setExtraField("ctaSecondary", e.target.value)} />
              </div>
            </EditorBlock>
            <EditorBlock step="3" title="Gallery 4 ảnh" hint="Ảnh 1 lớn trên · ảnh 2–4 nhỏ dưới (đúng layout web)">
              <div className="grid sm:grid-cols-2 gap-4">
                <ImageUploadField label="Ảnh 1 — lớn (full hàng trên)" value={heroGallery[0] || ""} onChange={(url) => setHeroGalleryImage(0, url)} uploading={uploading} onUpload={uploadFile} />
                <ImageUploadField label="Ảnh 2 — nhỏ trái" value={heroGallery[1] || ""} onChange={(url) => setHeroGalleryImage(1, url)} uploading={uploading} onUpload={uploadFile} />
                <ImageUploadField label="Ảnh 3 — nhỏ phải" value={heroGallery[2] || ""} onChange={(url) => setHeroGalleryImage(2, url)} uploading={uploading} onUpload={uploadFile} />
                <ImageUploadField label="Ảnh 4 — nhỏ dưới" value={heroGallery[3] || ""} onChange={(url) => setHeroGalleryImage(3, url)} uploading={uploading} onUpload={uploadFile} />
              </div>
            </EditorBlock>
          </>
        )}
        {active === "apply" && (
          <EditorBlock step="2" title="Form ứng tuyển" hint="Dòng chữ nhỏ phía trên tiêu đề form">
            <Input size="md" label="Dòng nhỏ (vd: Ứng tuyển ngay)" value={extra.eyebrow || ""} onChange={(e) => setExtraField("eyebrow", e.target.value)} />
          </EditorBlock>
        )}
        {active === "brands" && (
          <EditorBlock step="2" title="Danh sách thương hiệu" hint="Mỗi brand: ảnh cửa hàng + logo + mô tả">
            <div className="space-y-4">
            {brandItems.map((it, i) => (
              <ItemCard key={i} index={i} title={it.name || `Thương hiệu #${i + 1}`} onRemove={() => removeBrandItem(i)}>
                <Input size="md" label="Tên thương hiệu" value={it.name || ""} onChange={(e) => setBrandItem(i, "name", e.target.value)} />
                <Input size="md" label="Tagline ngắn" value={it.short || ""} onChange={(e) => setBrandItem(i, "short", e.target.value)} />
                <Input size="md" label="Mô tả" value={it.description || ""} onChange={(e) => setBrandItem(i, "description", e.target.value)} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <ImageUploadField label="Ảnh cửa hàng" value={it.imageUrl || ""} onChange={(url) => setBrandItem(i, "imageUrl", url)} uploading={uploading} onUpload={uploadFile} />
                  <ImageUploadField label="Logo" value={it.logoUrl || ""} onChange={(url) => setBrandItem(i, "logoUrl", url)} uploading={uploading} onUpload={uploadFile} />
                </div>
                <Input size="md" label="Link khi click" value={it.linkUrl || ""} onChange={(e) => setBrandItem(i, "linkUrl", e.target.value)} />
              </ItemCard>
            ))}
            </div>
            <Button size="sm" variant="outlined" onClick={addBrandItem}>+ Thêm thương hiệu</Button>
          </EditorBlock>
        )}
        {active === "contact" && (
          <>
            <EditorBlock step="2" title="Logo & tên header" hint="PC / Passion Cafe trên thanh menu">
              <Input size="md" label="Tên thương hiệu" value={footer.siteName || ""} onChange={(e) => setFooterField("siteName", e.target.value)} />
              <Input size="md" label="Chữ viết tắt (khi chưa có logo)" value={footer.siteBadge || ""} onChange={(e) => setFooterField("siteBadge", e.target.value)} />
              <ImageUploadField label="Logo header" value={footer.siteLogoUrl || ""} onChange={(url) => setFooterField("siteLogoUrl", url)} uploading={uploading} onUpload={uploadFile} />
            </EditorBlock>
            <EditorBlock step="3" title="Thông tin liên hệ footer" defaultOpen={false}>
              <Input size="md" label="Địa chỉ" value={footer.address || ""} onChange={(e) => setFooterField("address", e.target.value)} />
              <div className="grid sm:grid-cols-2 gap-3">
                <Input size="md" label="Điện thoại" value={footer.phone || ""} onChange={(e) => setFooterField("phone", e.target.value)} />
                <Input size="md" label="Email" value={footer.email || ""} onChange={(e) => setFooterField("email", e.target.value)} />
              </div>
              <Input size="md" label="Link Google Maps (chia sẻ)" value={footer.mapLinkUrl || ""} onChange={(e) => setFooterField("mapLinkUrl", e.target.value)} />
              <Input size="md" label="Embed bản đồ (iframe)" value={footer.mapEmbedUrl || ""} onChange={(e) => setFooterField("mapEmbedUrl", e.target.value)} />
              <p className="text-xs text-blue-gray-500 -mt-1">
                Link chia sẻ (vd. maps.app.goo.gl) dùng khi bấm vào bản đồ. Embed lấy từ Google Maps → Chia sẻ → Nhúng bản đồ (không dùng link goo.gl cho embed).
              </p>
              <Input size="md" label="Copyright" value={footer.copyrightText || ""} onChange={(e) => setFooterField("copyrightText", e.target.value)} />
              <Input size="md" label="Nhãn nút nội bộ" value={footer.internalLabel || ""} onChange={(e) => setFooterField("internalLabel", e.target.value)} />
              <Input size="md" label="Link nội bộ" value={footer.internalUrl || ""} onChange={(e) => setFooterField("internalUrl", e.target.value)} />
            </EditorBlock>
            <EditorBlock step="4" title="Menu header" defaultOpen={false} hint="VỀ CHÚNG TÔI, THƯƠNG HIỆU...">
              {(footer.headerNav || []).map((item, i) => (
                <ItemCard key={i} index={i} title={item.label || `Menu #${i + 1}`} onRemove={() => removeFooterArrField("headerNav", i)}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input size="md" label="Label" value={item.label || ""} onChange={(e) => setFooterArrField("headerNav", i, "label", e.target.value)} />
                    <Input size="md" label="Href" value={item.href || ""} onChange={(e) => setFooterArrField("headerNav", i, "href", e.target.value)} />
                  </div>
                </ItemCard>
              ))}
              <Button size="sm" variant="outlined" onClick={() => addFooterArrField("headerNav", { label: "", href: "" })}>+ Thêm menu</Button>
            </EditorBlock>
            <EditorBlock step="5" title="Quick links footer" defaultOpen={false}>
              {(footer.quickLinks || []).map((item, i) => (
                <ItemCard key={i} index={i} title={item.label || `Link #${i + 1}`} onRemove={() => removeFooterArrField("quickLinks", i)}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input size="md" label="Label" value={item.label || ""} onChange={(e) => setFooterArrField("quickLinks", i, "label", e.target.value)} />
                    <Input size="md" label="Href" value={item.href || ""} onChange={(e) => setFooterArrField("quickLinks", i, "href", e.target.value)} />
                  </div>
                </ItemCard>
              ))}
              <Button size="sm" variant="outlined" onClick={() => addFooterArrField("quickLinks", { label: "", href: "" })}>+ Thêm link</Button>
            </EditorBlock>
            <EditorBlock step="6" title="Social" defaultOpen={false}>
              {(footer.socials || []).map((item, i) => (
                <ItemCard key={i} index={i} title={item.label || `Social #${i + 1}`} onRemove={() => removeFooterArrField("socials", i)}>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Input size="md" label="Tên" value={item.label || ""} onChange={(e) => setFooterArrField("socials", i, "label", e.target.value)} />
                    <Input size="md" label="Icon (fb / ig / in)" value={item.icon || ""} onChange={(e) => setFooterArrField("socials", i, "icon", e.target.value)} />
                    <Input size="md" label="Href" value={item.href || ""} onChange={(e) => setFooterArrField("socials", i, "href", e.target.value)} />
                  </div>
                </ItemCard>
              ))}
              <Button size="sm" variant="outlined" onClick={() => addFooterArrField("socials", { label: "", icon: "", href: "" })}>+ Thêm social</Button>
            </EditorBlock>
          </>
        )}

        <div className="sticky bottom-0 z-10 rounded-xl border border-blue-gray-200 bg-white/95 backdrop-blur p-4 shadow-lg space-y-3">
          <Switch label="Hiển thị section trên web" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          {msg && <Typography variant="small" color={msg.includes("Lỗi") || msg.includes("thất bại") ? "red" : "green"}>{msg}</Typography>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving} className="min-w-[140px]">{saving ? "Đang lưu..." : "Lưu section"}</Button>
            <a href="/careers" target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-blue-600 hover:underline px-3 py-2">Xem trang ↗</a>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Jobs tab ──────────────────────────────────────────────────────────────────
function JobsTab() {
  const [jobs, setJobs] = useState([]);
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const [j, s] = await Promise.all([api.get("/recruitment/admin/jobs"), api.get("/stores")]);
    setJobs(j.data.data || []);
    setStores(s.data.data || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const payload = { ...form, storeId: form.storeId ? Number(form.storeId) : null };
    try {
      if (form.id) await api.put(`/recruitment/admin/jobs/${form.id}`, payload);
      else await api.post("/recruitment/admin/jobs", payload);
      setMsg("Đã lưu.");
      setForm(null);
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || "Lỗi.");
    }
  };

  const del = async (id) => {
    if (!confirm("Xóa tin này?")) return;
    await api.delete(`/recruitment/admin/jobs/${id}`);
    load();
  };

  return (
    <div className="flex flex-col gap-4">
      <Button size="sm" onClick={() => setForm(emptyJob())}>+ Tin mới</Button>
      {form && (
        <Card className="border border-blue-gray-100">
          <CardBody className="gap-3 flex flex-col max-w-xl">
            <Input label="Tiêu đề *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Slug (tự sinh nếu trống)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Input label="Phòng ban" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Input label="Địa điểm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <select className="border rounded-lg p-2 text-sm" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}>
              <option value="">-- Cửa hàng --</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <textarea rows={4} placeholder="Mô tả (HTML)" className="border rounded-lg p-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <textarea rows={3} placeholder="Yêu cầu" className="border rounded-lg p-2 text-sm" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
            <select className="border rounded-lg p-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}>Lưu</Button>
              <Button size="sm" variant="outlined" onClick={() => setForm(null)}>Hủy</Button>
            </div>
          </CardBody>
        </Card>
      )}
      {msg && <Typography variant="small" color="green">{msg}</Typography>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-blue-gray-500">
            <th className="py-2 pr-2">Tiêu đề</th><th>Status</th><th>HS</th><th></th>
          </tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-blue-gray-50">
                <td className="py-2 pr-2">{j.title}</td>
                <td><Chip size="sm" value={j.status} color={j.status === "Open" ? "green" : "blue-gray"} /></td>
                <td>{j.applicationCount}</td>
                <td className="space-x-1">
                  <Button size="sm" variant="text" onClick={() => setForm({ ...j, storeId: j.storeId || "" })}>Sửa</Button>
                  <Button size="sm" variant="text" color="red" onClick={() => del(j.id)}>Xóa</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Applications tab ────────────────────────────────────────────────────────────
function ApplicationsTab() {
  const { isAdmin, isManager } = useAuth();
  const [apps, setApps] = useState([]);
  const [stores, setStores] = useState([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [assignFilter, setAssignFilter] = useState(""); // "" | assigned | unassigned
  const [convert, setConvert] = useState(null);
  const [convForm, setConvForm] = useState({ username: "", password: "", startDate: "" });
  const [openId, setOpenId] = useState(null);
  const [inviteFor, setInviteFor] = useState(null);
  const [inviteForm, setInviteForm] = useState({ interviewAt: "", location: "", message: "" });
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [assignFor, setAssignFor] = useState(null);
  const [assignStoreId, setAssignStoreId] = useState("");
  const [assignMsg, setAssignMsg] = useState("");
  const [statusErr, setStatusErr] = useState("");
  const [detailApp, setDetailApp] = useState(null);

  const load = async () => {
    const q = filter ? `?status=${filter}` : "";
    const r = await api.get(`/recruitment/admin/applications${q}`);
    setApps(r.data.data || []);
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    api.get("/recruitment/stores").then((r) => setStores(r.data?.data || [])).catch(() => setStores([]));
  }, []);

  const setStatus = async (id, status) => {
    setStatusErr("");
    try {
      const r = await api.put(`/recruitment/admin/applications/${id}/status`, { status, autoCreateEmployee: true });
      const emp = r.data?.data?.employee;
      if (emp?.username) {
        setAssignMsg(`Đã tuyển — username: ${emp.username}${emp.temporaryPassword ? ` / MK tạm: ${emp.temporaryPassword}` : ""}`);
      }
      load();
    } catch (ex) {
      setStatusErr(ex.response?.data?.message || "Cập nhật trạng thái thất bại.");
      load();
    }
  };

  const doAssign = async () => {
    if (!assignFor || !assignStoreId) return;
    setAssignMsg("");
    try {
      const r = await api.post(`/recruitment/admin/applications/${assignFor.id}/assign`, {
        storeId: Number(assignStoreId),
      });
      setAssignMsg(r.data?.message || "Đã chuyển hồ sơ.");
      setAssignFor(null);
      setAssignStoreId("");
      load();
    } catch (ex) {
      setAssignMsg(ex.response?.data?.message || "Chuyển hồ sơ thất bại.");
    }
  };

  const doConvert = async () => {
    await api.post(`/recruitment/admin/applications/${convert.id}/convert-to-employee`, convForm);
    setConvert(null);
    load();
  };

  const openInvite = (app) => {
    setInviteFor(app);
    setInviteMsg("");
    setInviteErr("");
    const storeId = app.assignedStoreId || app.preferredStoreId;
    const storeAddr = stores.find((s) => s.id === storeId)?.address || "";
    setInviteForm({
      interviewAt: "",
      location: storeAddr || app.address || "",
      message: "",
    });
  };

  const sendInvite = async () => {
    if (!inviteFor) return;
    setSendingInvite(true);
    setInviteMsg("");
    setInviteErr("");
    try {
      const r = await api.post(`/recruitment/admin/applications/${inviteFor.id}/send-interview-invite`, inviteForm);
      setInviteMsg(r.data?.message || "Đã gửi email.");
      setInviteFor(null);
      load();
    } catch (ex) {
      setInviteErr(ex.response?.data?.message || "Gửi email thất bại.");
    } finally {
      setSendingInvite(false);
    }
  };

  const parseAnswers = (json) => {
    try {
      return json ? JSON.parse(json) : {};
    } catch {
      return {};
    }
  };

  const ANSWER_LABELS = {
    fullName: "Họ và tên",
    phone: "Điện thoại",
    dateOfBirth: "Ngày sinh",
    email: "Email",
    gender: "Giới tính",
    nationalId: "CCCD",
    province: "Tỉnh/TP",
    addressDetail: "Địa chỉ chi tiết",
    educationLevel: "Trình độ",
    currentJob: "Công việc hiện tại",
    desiredPosition: "Vị trí ứng tuyển",
    desiredArea: "Khu vực mong muốn",
    storeProvince: "Tỉnh/TP cửa hàng",
    preferredStoreId: "ID cửa hàng",
    workShifts: "Ca làm việc",
    daysPerWeek: "Số ngày/tuần",
    tetAvailability: "Làm Tết",
    startDate: "Ngày bắt đầu",
    recruitChannel: "Kênh tuyển dụng",
    recruitChannelOther: "Kênh khác",
    workedBefore: "Đã làm trước đây",
  };

  const formatAnswerValue = (val) => {
    if (val == null || val === "") return "—";
    if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const appsWithInterview = apps
    .map((app) => {
      const interview = parseInterviewNote(app.notes);
      return interview ? { ...app, interview } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const at = a.interview?.when?.getTime?.() ?? Number.MAX_SAFE_INTEGER;
      const bt = b.interview?.when?.getTime?.() ?? Number.MAX_SAFE_INTEGER;
      return at - bt;
    });

  const upcomingInterviews = appsWithInterview.filter((x) => x.interview?.when && x.interview.when.getTime() >= Date.now());
  const nearestInterview = upcomingInterviews[0] || null;

  const filteredApps = apps.filter((a) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = `${a.fullName || ""} ${a.phone || ""} ${a.email || ""} ${a.nationalId || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (storeFilter) {
      const sid = Number(storeFilter);
      if (a.assignedStoreId !== sid && a.preferredStoreId !== sid) return false;
    }
    if (assignFilter === "assigned" && !a.assignedStoreId) return false;
    if (assignFilter === "unassigned" && a.assignedStoreId) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-blue-gray-100 bg-white px-4 py-3 text-sm text-blue-gray-700">
        <p className="font-semibold text-blue-gray-900 mb-2">Quy trình tuyển dụng</p>
        <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm">
          <li><strong>Admin</strong> nhận hồ sơ từ form ứng tuyển → xem xét (Mới / Sàng lọc).</li>
          <li><strong>Admin</strong> bấm <strong>Chuyển QL cửa hàng</strong> — QL mới thấy hồ sơ.</li>
          <li><strong>Quản lý CH</strong> gửi <strong>lịch phỏng vấn</strong> cho ứng viên.</li>
          <li>Cập nhật <strong>Đề nghị</strong> → khi đạt, bấm <strong>Tạo tài khoản NV</strong>.</li>
        </ol>
        <p className="mt-2 text-xs text-blue-gray-500">
          {isManager && !isAdmin
            ? "Bạn chỉ thấy hồ sơ Admin đã chuyển tới cửa hàng mình."
            : "Form public: ungtuyen.unigroups.vn — Careers: tuyendung.unigroups.vn"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-blue-gray-500">Tìm kiếm</label>
          <input
            className="border rounded-lg p-2 text-sm w-56"
            placeholder="Họ tên / SĐT / email / CCCD"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-blue-gray-500">Trạng thái</label>
          <select className="border rounded-lg p-2 text-sm w-44" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {APP_STATUSES.map((s) => <option key={s} value={s}>{APP_STATUS_META[s]?.label || s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-blue-gray-500">Cửa hàng</label>
          <select className="border rounded-lg p-2 text-sm w-56" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
            <option value="">Tất cả cửa hàng</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.brand ? `${s.brand} — ${s.name}` : s.name}</option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-blue-gray-500">Chuyển QL</label>
            <select className="border rounded-lg p-2 text-sm w-44" value={assignFilter} onChange={(e) => setAssignFilter(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="unassigned">Chưa chuyển</option>
              <option value="assigned">Đã chuyển QL</option>
            </select>
          </div>
        )}
        {(search || storeFilter || assignFilter || filter) && (
          <Button
            size="sm"
            variant="outlined"
            className="mb-0.5"
            onClick={() => { setSearch(""); setStoreFilter(""); setAssignFilter(""); setFilter(""); }}
          >
            Xóa lọc
          </Button>
        )}
      </div>
      <Typography variant="small" className="text-blue-gray-500">
        Đang hiện <strong>{filteredApps.length}</strong> / {apps.length} hồ sơ
      </Typography>
      {statusErr && <Typography variant="small" color="red">{statusErr}</Typography>}
      {assignMsg && <Typography variant="small" color="green">{assignMsg}</Typography>}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-blue-gray-100 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-blue-gray-400">Tổng hồ sơ</p>
          <p className="mt-1 text-2xl font-semibold text-blue-gray-900">{filteredApps.length}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-violet-500">Lịch phỏng vấn sắp tới</p>
          <p className="mt-1 text-2xl font-semibold text-violet-900">{upcomingInterviews.length}</p>
          <p className="mt-1 text-xs text-violet-700">Nhìn nhanh hồ sơ nào sắp gặp ứng viên</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-amber-600">Lịch gần nhất</p>
          {nearestInterview ? (
            <>
              <p className="mt-1 text-sm font-semibold text-amber-900">{nearestInterview.fullName}</p>
              <p className="text-xs text-amber-800">{nearestInterview.interview.whenLabel}</p>
              <p className="text-xs text-amber-700">{nearestInterview.interview.location || "Chưa có địa điểm"}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-amber-800">Chưa có lịch phỏng vấn sắp tới</p>
          )}
        </div>
      </div>
      {nearestInterview ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          <strong>Sắp tới:</strong> {nearestInterview.fullName} gặp lúc {nearestInterview.interview.whenLabel}
          {nearestInterview.interview.location ? ` tại ${nearestInterview.interview.location}` : ""} ({describeInterviewTiming(nearestInterview.interview.when)}).
        </div>
      ) : null}
      {inviteMsg && <Typography variant="small" color="green">{inviteMsg}</Typography>}
      {detailApp && (
        <Card className="border border-blue-300 bg-white shadow-md">
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <Typography variant="h6" className="text-blue-gray-900">Chi tiết hồ sơ — {detailApp.fullName}</Typography>
                <p className="text-xs text-blue-gray-500 mt-1">
                  Gửi lúc {detailApp.submittedAt || "—"} · Trạng thái: {APP_STATUS_META[detailApp.status]?.label || detailApp.status}
                </p>
              </div>
              <Button size="sm" variant="outlined" onClick={() => setDetailApp(null)}>Đóng</Button>
            </div>
            <div className="rounded-lg border border-blue-gray-100 bg-blue-gray-50/50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-gray-500 mb-3">Thông tin liên hệ</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <DetailField label="Họ tên" value={detailApp.fullName} />
                <DetailField label="SĐT" value={detailApp.phone} />
                <DetailField label="Email" value={detailApp.email} />
                <DetailField label="Ngày sinh" value={detailApp.dateOfBirth} />
                <DetailField label="Giới tính" value={detailApp.gender} />
                <DetailField label="CCCD" value={detailApp.nationalId} />
                <DetailField label="Địa chỉ" value={detailApp.address} />
                <DetailField label="Trình độ" value={detailApp.educationLevel} />
                <DetailField label="CH mong muốn" value={detailApp.preferredStoreName} />
                <DetailField label="Đã chuyển QL" value={detailApp.assignedStoreName || "Chưa chuyển"} />
              </div>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-600 mb-3">Nội dung người dùng điền trên form</p>
              {(() => {
                const ans = parseAnswers(detailApp.answersJson);
                const legacyKeys = new Set(["why_join", "skills", "languages", "cv_file_name", "preferred_brand", "preferred_career", "preferred_store_name"]);
                const skipContactDup = new Set(["fullName", "phone", "email", "dateOfBirth", "gender", "nationalId", "educationLevel"]);
                const entries = Object.entries(ans).filter(([k, v]) => {
                  if (skipContactDup.has(k)) return false;
                  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return false;
                  return true;
                });
                const newEntries = entries.filter(([k]) => !legacyKeys.has(k));
                const oldEntries = entries.filter(([k]) => legacyKeys.has(k));
                const storeFromAns = ans.preferredStoreId
                  ? stores.find((s) => s.id === Number(ans.preferredStoreId))
                  : null;
                return (
                  <>
                    {storeFromAns && (
                      <div className="mb-3">
                        <DetailField label="Cửa hàng (từ form)" value={storeFromAns.brand ? `${storeFromAns.brand} — ${storeFromAns.name}` : storeFromAns.name} />
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {newEntries.map(([k, v]) => (
                        <DetailField key={k} label={ANSWER_LABELS[k] || k} value={formatAnswerValue(v)} />
                      ))}
                      {!newEntries.length && !oldEntries.length && (
                        <p className="text-sm text-blue-gray-400 sm:col-span-2">Chưa có câu trả lời form (hồ sơ cũ hoặc trống).</p>
                      )}
                    </div>
                    {oldEntries.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-violet-200">
                        <p className="text-[11px] font-semibold text-blue-gray-400 mb-2 uppercase">Form cũ (legacy)</p>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {oldEntries.map(([k, v]) => (
                            <DetailField
                              key={k}
                              label={{ why_join: "Vì sao gia nhập", skills: "Kỹ năng", languages: "Ngành nghề", cv_file_name: "File CV" }[k] || k}
                              value={formatAnswerValue(v)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            {detailApp.notes && (
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
                <DetailField label="Ghi chú nội bộ" value={detailApp.notes} />
              </div>
            )}
            {(() => {
              const step = appWorkflowStep(detailApp);
              const steps = ["Nhận hồ sơ", "Chuyển QL", "Gửi PV", "Đề nghị", "Tạo NV"];
              return (
                <div className="rounded-lg border border-blue-gray-100 bg-blue-gray-50/60 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase text-blue-gray-400 mb-2">Tiến độ</p>
                  <div className="flex flex-wrap gap-1.5">
                    {steps.map((label, i) => {
                      const n = i + 1;
                      const done = step > n || (step === 5 && n === 5);
                      const active = step === n;
                      return (
                        <span
                          key={label}
                          className={`text-[11px] px-2 py-1 rounded-full border ${
                            done || active
                              ? "bg-teal-50 text-teal-800 border-teal-200 font-semibold"
                              : "bg-white text-blue-gray-400 border-blue-gray-100"
                          }`}
                        >
                          {n}. {label}
                        </span>
                      );
                    })}
                  </div>
                  {!detailApp.assignedStoreId && isAdmin && (
                    <p className="mt-2 text-xs text-amber-700">Bước tiếp: chuyển hồ sơ cho quản lý cửa hàng.</p>
                  )}
                  {detailApp.assignedStoreId && !canSendInterview(detailApp) && (
                    <p className="mt-2 text-xs text-amber-700">Hồ sơ thiếu email — không gửi được lịch PV.</p>
                  )}
                  {detailApp.assignedStoreId && canSendInterview(detailApp) && step < 3 && (
                    <p className="mt-2 text-xs text-blue-700">QL cửa hàng: gửi lịch phỏng vấn cho ứng viên.</p>
                  )}
                  {step >= 3 && canCreateEmployee(detailApp) && (
                    <p className="mt-2 text-xs text-green-700">Đã PV — có thể đề nghị / tạo tài khoản nhân viên.</p>
                  )}
                </div>
              );
            })()}
            <div className="flex flex-wrap gap-2 items-center">
              {isAdmin && (
                <Button size="sm" color="amber" className="normal-case" onClick={() => { setAssignFor(detailApp); setAssignStoreId(String(detailApp.assignedStoreId || detailApp.preferredStoreId || "")); }}>
                  {detailApp.assignedStoreId ? "Đổi QL cửa hàng" : "Chuyển QL cửa hàng"}
                </Button>
              )}
              {canSendInterview(detailApp) && (
                <Button size="sm" color="blue" className="normal-case" onClick={() => { openInvite(detailApp); }}>
                  Gửi lịch phỏng vấn
                </Button>
              )}
              {canCreateEmployee(detailApp) && (
                <Button size="sm" color="green" className="normal-case" onClick={() => { setConvert(detailApp); setConvForm({ username: "", password: "", startDate: "" }); }}>
                  Tạo tài khoản NV
                </Button>
              )}
              {!detailApp.assignedStoreId && !isAdmin && (
                <p className="text-xs text-amber-700">Chờ Admin chuyển hồ sơ tới cửa hàng.</p>
              )}
              <Button size="sm" variant="text" className="normal-case" onClick={() => setDetailApp(null)}>Đóng</Button>
            </div>
          </CardBody>
        </Card>
      )}
      {assignFor && isAdmin && (
        <Card className="border border-amber-200 bg-amber-50">
          <CardBody className="gap-3 max-w-lg flex flex-col">
            <Typography variant="small" className="font-bold">
              Chuyển hồ sơ tới quản lý cửa hàng — {assignFor.fullName}
            </Typography>
            <select
              className="border rounded-lg p-2 text-sm"
              value={assignStoreId}
              onChange={(e) => setAssignStoreId(e.target.value)}
            >
              <option value="">-- Chọn cửa hàng --</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.brand ? `${s.brand} — ${s.name}` : s.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button size="sm" color="amber" onClick={doAssign} disabled={!assignStoreId}>Chuyển</Button>
              <Button size="sm" variant="outlined" onClick={() => setAssignFor(null)}>Hủy</Button>
            </div>
          </CardBody>
        </Card>
      )}
      {convert && (
        <Card className="border border-green-200 bg-green-50">
          <CardBody className="gap-2 max-w-sm flex flex-col">
            <Typography variant="small" className="font-bold">Tạo NV: {convert.fullName}</Typography>
            <Input label="Username" value={convForm.username} onChange={(e) => setConvForm({ ...convForm, username: e.target.value })} />
            <Input type="password" label="Mật khẩu" value={convForm.password} onChange={(e) => setConvForm({ ...convForm, password: e.target.value })} />
            <Input type="date" label="Ngày vào làm" value={convForm.startDate} onChange={(e) => setConvForm({ ...convForm, startDate: e.target.value })} />
            <div className="flex gap-2">
              <Button size="sm" color="green" onClick={doConvert}>Tạo nhân viên</Button>
              <Button size="sm" variant="outlined" onClick={() => setConvert(null)}>Hủy</Button>
            </div>
          </CardBody>
        </Card>
      )}
      {inviteFor && (
        <Card className="border border-blue-200 bg-blue-50">
          <CardBody className="gap-3 max-w-lg flex flex-col">
            <Typography variant="small" className="font-bold">
              Gửi lịch phỏng vấn → {inviteFor.fullName} ({inviteFor.email})
            </Typography>
            <Input
              type="datetime-local"
              label="Ngày giờ phỏng vấn"
              value={inviteForm.interviewAt}
              onChange={(e) => setInviteForm({ ...inviteForm, interviewAt: e.target.value })}
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-blue-gray-600">Chọn cửa hàng (tự điền địa chỉ)</label>
              <select
                className="border rounded-lg p-2 text-sm"
                value=""
                onChange={(e) => {
                  const s = stores.find((x) => String(x.id) === e.target.value);
                  if (s?.address) setInviteForm((f) => ({ ...f, location: s.address }));
                }}
              >
                <option value="">-- Chọn cửa hàng --</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Địa điểm phỏng vấn"
              value={inviteForm.location}
              onChange={(e) => setInviteForm({ ...inviteForm, location: e.target.value })}
            />
            <textarea
              rows={2}
              placeholder="Ghi chú thêm (tuỳ chọn)"
              className="border rounded-lg p-2 text-sm"
              value={inviteForm.message}
              onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
            />
            {inviteErr && <Typography variant="small" color="red">{inviteErr}</Typography>}
            <div className="flex gap-2">
              <Button size="sm" color="blue" onClick={sendInvite} disabled={sendingInvite}>
                {sendingInvite ? "Đang gửi..." : "Gửi email lịch PV"}
              </Button>
              <Button size="sm" variant="outlined" onClick={() => setInviteFor(null)}>Hủy</Button>
            </div>
          </CardBody>
        </Card>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1280px] table-fixed">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className="w-[14%]" />
            <col className="w-[9%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead>
            <tr className="border-b text-left text-blue-gray-500 text-xs">
              <th className="py-2 pr-3">Họ tên</th>
              <th className="py-2 pr-3">SĐT</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Vị trí</th>
              <th className="py-2 pr-3">CH mong muốn</th>
              <th className="py-2 pr-3">Đã chuyển QL</th>
              <th className="py-2 pr-3">Lịch phỏng vấn</th>
              <th className="py-2 pr-3">Thời gian gửi</th>
              <th className="py-2 pr-3">Trạng thái</th>
              <th className="py-2">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.map((a) => {
              const ans = parseAnswers(a.answersJson);
              const storeLabel = a.preferredStoreName || ans.preferred_store_name || stores.find((s) => s.id === a.preferredStoreId)?.name || "—";
              const assignedLabel = a.assignedStoreName || (a.assignedStoreId ? stores.find((s) => s.id === a.assignedStoreId)?.name : null) || "Chưa chuyển";
              const interview = parseInterviewNote(a.notes);
              const positionLabel = ans.desiredPosition || ans.skills || "—";
              const expanded = openId === a.id;
              return [
                <tr key={a.id} className="border-b border-blue-gray-50 align-top">
                  <td className="py-2 pr-3 overflow-hidden">
                    <button type="button" className="text-left font-medium text-blue-800 hover:underline truncate max-w-full block" onClick={() => setDetailApp(a)}>
                      {a.fullName}
                    </button>
                  </td>
                  <td className="py-2 pr-3 overflow-hidden whitespace-nowrap text-xs">{a.phone || "—"}</td>
                  <td className="py-2 pr-3 overflow-hidden"><CellTruncate value={a.email} /></td>
                  <td className="py-2 pr-3 overflow-hidden"><CellTruncate value={positionLabel} /></td>
                  <td className="py-2 pr-3 overflow-hidden"><CellTruncate value={storeLabel} /></td>
                  <td className="py-2 pr-3 overflow-hidden">
                    {a.assignedStoreId ? (
                      <span className="text-amber-800 font-medium"><CellTruncate value={assignedLabel} /></span>
                    ) : (
                      <span className="text-blue-gray-300">Chưa chuyển</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 overflow-hidden">
                    {interview ? (
                      <div className="text-xs leading-relaxed">
                        <div className="font-semibold text-violet-800 truncate" title={interview.whenLabel}>{interview.whenLabel}</div>
                        <div className="text-blue-gray-700 truncate" title={interview.location || ""}>{interview.location || "Chưa có địa điểm"}</div>
                        <div className="text-violet-600">{describeInterviewTiming(interview.when)}</div>
                      </div>
                    ) : (
                      <span className="text-blue-gray-300">Chưa hẹn</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap text-blue-gray-500 overflow-hidden">{a.submittedAt || "—"}</td>
                  <td className="py-2 pr-3 overflow-hidden">
                    <StatusSelect value={a.status} onChange={(e) => setStatus(a.id, e.target.value)} />
                  </td>
                  <td className="py-2 overflow-hidden">
                    <div className="flex flex-col items-start gap-0.5">
                      <Button size="sm" variant="text" color="blue" className="normal-case px-2 py-1" onClick={() => setDetailApp(a)}>
                        Xem chi tiết
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="text"
                          color="amber"
                          className="normal-case px-2 py-1"
                          onClick={() => { setAssignFor(a); setAssignStoreId(String(a.assignedStoreId || a.preferredStoreId || "")); }}
                        >
                          {a.assignedStoreId ? "Đổi QL CH" : "Chuyển QL CH"}
                        </Button>
                      )}
                      {canSendInterview(a) && (
                        <Button size="sm" variant="text" color="blue" className="normal-case px-2 py-1" onClick={() => openInvite(a)}>
                          Gửi lịch PV
                        </Button>
                      )}
                      {canCreateEmployee(a) && (
                        <Button size="sm" variant="text" color="green" className="normal-case px-2 py-1" onClick={() => { setConvert(a); setConvForm({ username: "", password: "", startDate: "" }); }}>
                          Tạo tài khoản NV
                        </Button>
                      )}
                      {a.employeeId && <Chip size="sm" value={`NV #${a.employeeId}`} color="green" />}
                    </div>
                  </td>
                </tr>,
                expanded ? (
                  <tr key={`${a.id}-detail`} className="bg-blue-gray-50/60">
                    <td colSpan={10} className="px-4 py-4">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailField label="Ngày sinh" value={a.dateOfBirth} />
                        <DetailField label="Giới tính" value={a.gender} />
                        <DetailField label="CCCD" value={a.nationalId} />
                        <DetailField label="Địa chỉ đầy đủ" value={a.address} />
                        <DetailField label="Bằng cấp" value={a.educationLevel} />
                        <DetailField label="Vị trí ứng tuyển" value={ans.desiredPosition} />
                        <DetailField label="Công việc hiện tại" value={ans.currentJob} />
                        <DetailField label="Khu vực mong muốn" value={ans.desiredArea} />
                        <DetailField label="Ca làm" value={Array.isArray(ans.workShifts) ? ans.workShifts.join(", ") : ans.workShifts} />
                        <DetailField label="Số ngày/tuần" value={ans.daysPerWeek} />
                        <DetailField label="Tết" value={ans.tetAvailability} />
                        <DetailField label="Ngày bắt đầu" value={ans.startDate} />
                        <DetailField label="Kênh tuyển dụng" value={ans.recruitChannelOther || ans.recruitChannel} />
                        <DetailField label="Đã làm trước đây" value={ans.workedBefore} />
                        <DetailField label="CH mong muốn" value={storeLabel !== "—" ? storeLabel : null} />
                        <DetailField label="Đã chuyển QL CH" value={a.assignedStoreId ? assignedLabel : "Chưa"} />
                        <DetailField label="Lịch phỏng vấn" value={interview?.whenLabel} />
                        <DetailField label="Địa điểm phỏng vấn" value={interview?.location} />
                        {a.notes && (
                          <div className="sm:col-span-2 lg:col-span-3">
                            <DetailField label="Ghi chú nội bộ" value={a.notes} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const FIELD_TYPES = [
  { value: "text", label: "Ô chữ" },
  { value: "tel", label: "SĐT" },
  { value: "email", label: "Email" },
  { value: "date", label: "Ngày" },
  { value: "radio", label: "Chọn 1 (radio)" },
  { value: "checkbox", label: "Chọn nhiều" },
  { value: "select", label: "Dropdown" },
  { value: "store", label: "Chọn cửa hàng" },
  { value: "textarea", label: "Đoạn văn" },
];

function emptyField() {
  return {
    key: `field_${Date.now().toString(36)}`,
    label: "Câu hỏi mới",
    type: "text",
    required: false,
    placeholder: "",
    options: [],
  };
}

function emptySection(idx = 1) {
  return {
    id: `section_${Date.now().toString(36)}`,
    title: `${idx}. Mục mới`,
    fields: [emptyField()],
  };
}

function ApplyFormCmsTab() {
  const [title, setTitle] = useState("Form đăng ký phỏng vấn");
  const [schema, setSchema] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");

  useEffect(() => {
    api.get("/recruitment/admin/apply-form").then((r) => {
      const d = r.data?.data;
      setTitle(d?.title || "Form đăng ký phỏng vấn");
      let parsed = {};
      try { parsed = JSON.parse(d?.extraJson || "{}"); } catch { parsed = {}; }
      if (!Array.isArray(parsed.sections)) parsed.sections = [];
      setSchema(parsed);
      setJsonText(JSON.stringify(parsed, null, 2));
    }).catch((ex) => setErr(ex.response?.data?.message || "Không tải form."));
  }, []);

  const syncJson = (next) => {
    setSchema(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const patchMeta = (key, value) => {
    syncJson({ ...schema, [key]: value });
  };

  const updateSection = (si, patch) => {
    const sections = schema.sections.map((s, i) => (i === si ? { ...s, ...patch } : s));
    syncJson({ ...schema, sections });
  };

  const updateField = (si, fi, patch) => {
    const sections = schema.sections.map((s, i) => {
      if (i !== si) return s;
      const fields = (s.fields || []).map((f, j) => (j === fi ? { ...f, ...patch } : f));
      return { ...s, fields };
    });
    syncJson({ ...schema, sections });
  };

  const addSection = () => {
    syncJson({
      ...schema,
      sections: [...(schema.sections || []), emptySection((schema.sections?.length || 0) + 1)],
    });
  };

  const removeSection = (si) => {
    if (!confirm("Xóa cả mục này và các câu hỏi bên trong?")) return;
    syncJson({ ...schema, sections: schema.sections.filter((_, i) => i !== si) });
  };

  const addField = (si) => {
    const sections = schema.sections.map((s, i) =>
      i === si ? { ...s, fields: [...(s.fields || []), emptyField()] } : s
    );
    syncJson({ ...schema, sections });
  };

  const removeField = (si, fi) => {
    const sections = schema.sections.map((s, i) =>
      i === si ? { ...s, fields: (s.fields || []).filter((_, j) => j !== fi) } : s
    );
    syncJson({ ...schema, sections });
  };

  const moveField = (si, fi, dir) => {
    const sections = schema.sections.map((s, i) => {
      if (i !== si) return s;
      const fields = [...(s.fields || [])];
      const nj = fi + dir;
      if (nj < 0 || nj >= fields.length) return s;
      [fields[fi], fields[nj]] = [fields[nj], fields[fi]];
      return { ...s, fields };
    });
    syncJson({ ...schema, sections });
  };

  const save = async () => {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      let payload = schema;
      if (showJson) {
        payload = JSON.parse(jsonText);
        setSchema(payload);
      }
      await api.put("/recruitment/admin/apply-form", {
        title,
        extraJson: JSON.stringify(payload),
        isActive: true,
      });
      setMsg("Đã lưu form. Trang tuyendung sẽ hiện nội dung mới ngay.");
      setJsonText(JSON.stringify(payload, null, 2));
    } catch (ex) {
      setErr(ex.response?.data?.message || (ex instanceof SyntaxError ? "JSON không hợp lệ." : "Lưu thất bại."));
    } finally {
      setSaving(false);
    }
  };

  if (!schema) {
    return <Typography variant="small" className="text-blue-gray-500">{err || "Đang tải form…"}</Typography>;
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <Typography variant="small" className="text-blue-gray-600">
        Sửa form bằng giao diện bên dưới (thêm/xóa câu hỏi, đổi nhãn, option). Bấm <strong>Lưu form</strong> → trang tuyendung cập nhật.
      </Typography>

      <div className="grid md:grid-cols-2 gap-3">
        <Input label="Tiêu đề CMS (nội bộ)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Tiêu đề trang (đỏ trên form)" value={schema.pageTitle || ""} onChange={(e) => patchMeta("pageTitle", e.target.value)} />
        <Input label="Dòng phụ (UNI GROUPS…)" value={schema.pageSubtitle || ""} onChange={(e) => patchMeta("pageSubtitle", e.target.value)} />
        <Input label="Nút gửi" value={schema.submitLabel || ""} onChange={(e) => patchMeta("submitLabel", e.target.value)} />
        <Input label="Link gắn Facebook / bài đăng" value={schema.shareUrl || "https://ungtuyen.unigroups.vn"} onChange={(e) => patchMeta("shareUrl", e.target.value)} className="md:col-span-2" />
        <Input label="Copyright" value={schema.copyright || ""} onChange={(e) => patchMeta("copyright", e.target.value)} className="md:col-span-2" />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Typography variant="small" className="font-bold text-amber-900">
            Phần giới thiệu (cùng trang ứng tuyển — gắn Facebook)
          </Typography>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={schema.intro?.enabled !== false}
              onChange={(e) =>
                syncJson({
                  ...schema,
                  intro: { ...(schema.intro || {}), enabled: e.target.checked },
                })
              }
            />
            Hiện khối giới thiệu
          </label>
        </div>
        <p className="text-xs text-amber-800">
          Link chia sẻ: <code>{schema.shareUrl || "https://ungtuyen.unigroups.vn"}</code>
          {" "}· Thẳng tới form: <code>{(schema.shareUrl || "https://ungtuyen.unigroups.vn").replace(/\/$/, "")}/#form</code>
        </p>
        <Input
          label="Tiêu đề vị trí đang tìm"
          value={schema.intro?.heading || ""}
          onChange={(e) => syncJson({ ...schema, intro: { ...(schema.intro || {}), heading: e.target.value } })}
        />
        <div>
          <label className="text-[11px] text-blue-gray-500">Nội dung giới thiệu (có thể dùng HTML đơn giản)</label>
          <textarea
            className="border rounded-lg p-2 text-sm w-full min-h-[100px]"
            value={schema.intro?.bodyHtml || ""}
            onChange={(e) => syncJson({ ...schema, intro: { ...(schema.intro || {}), bodyHtml: e.target.value } })}
          />
        </div>
        <Input
          label="Tiêu đề liên hệ"
          value={schema.intro?.contactHeading || ""}
          onChange={(e) => syncJson({ ...schema, intro: { ...(schema.intro || {}), contactHeading: e.target.value } })}
        />
        <div>
          <label className="text-[11px] text-blue-gray-500">Thông tin liên hệ (HTML)</label>
          <textarea
            className="border rounded-lg p-2 text-sm w-full min-h-[90px]"
            value={schema.intro?.contactHtml || ""}
            onChange={(e) => syncJson({ ...schema, intro: { ...(schema.intro || {}), contactHtml: e.target.value } })}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          <Input
            label="Nhãn nút CTA"
            value={schema.intro?.ctaLabel || ""}
            onChange={(e) => syncJson({ ...schema, intro: { ...(schema.intro || {}), ctaLabel: e.target.value } })}
          />
          <Input
            label="Link nút (mặc định #form)"
            value={schema.intro?.ctaHref || "#form"}
            onChange={(e) => syncJson({ ...schema, intro: { ...(schema.intro || {}), ctaHref: e.target.value } })}
          />
        </div>
      </div>

      {(schema.sections || []).map((section, si) => (
        <div key={section.id || si} className="rounded-xl border border-blue-gray-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-100">
            <Input
              label="Tên mục"
              value={section.title || ""}
              onChange={(e) => updateSection(si, { title: e.target.value })}
              className="!min-w-[220px]"
              containerProps={{ className: "min-w-[220px] flex-1" }}
            />
            <Button size="sm" variant="outlined" onClick={() => addField(si)}>+ Câu hỏi</Button>
            <Button size="sm" variant="text" color="red" onClick={() => removeSection(si)}>Xóa mục</Button>
          </div>
          <div className="p-3 space-y-3">
            {(section.fields || []).map((field, fi) => (
              <div key={field.key || fi} className="rounded-lg border border-blue-gray-100 p-3 bg-blue-gray-50/40 space-y-2">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[180px]">
                    <Input
                      label="Nhãn câu hỏi"
                      value={field.label || ""}
                      onChange={(e) => updateField(si, fi, { label: e.target.value })}
                    />
                  </div>
                  <div className="w-40">
                    <label className="text-[11px] text-blue-gray-500">Loại</label>
                    <select
                      className="border rounded-lg p-2 text-sm w-full"
                      value={field.type || "text"}
                      onChange={(e) => updateField(si, fi, { type: e.target.value })}
                    >
                      {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm px-2 py-2">
                    <input
                      type="checkbox"
                      checked={!!field.required}
                      onChange={(e) => updateField(si, fi, { required: e.target.checked })}
                    />
                    Bắt buộc
                  </label>
                  <Button size="sm" variant="text" onClick={() => moveField(si, fi, -1)}>↑</Button>
                  <Button size="sm" variant="text" onClick={() => moveField(si, fi, 1)}>↓</Button>
                  <Button size="sm" variant="text" color="red" onClick={() => removeField(si, fi)}>Xóa</Button>
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  <Input
                    label="Key (mã lưu DB)"
                    value={field.key || ""}
                    onChange={(e) => updateField(si, fi, { key: e.target.value.trim().replace(/\s+/g, "_") })}
                  />
                  <Input
                    label="Placeholder"
                    value={field.placeholder || ""}
                    onChange={(e) => updateField(si, fi, { placeholder: e.target.value })}
                  />
                </div>
                {(field.type === "radio" || field.type === "checkbox" || field.type === "select") && !field.optionsSource && (
                  <div>
                    <label className="text-[11px] text-blue-gray-500">Options (mỗi dòng 1 lựa chọn)</label>
                    <textarea
                      className="border rounded-lg p-2 text-sm w-full min-h-[72px]"
                      value={(field.options || []).join("\n")}
                      onChange={(e) =>
                        updateField(si, fi, {
                          options: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean),
                        })
                      }
                    />
                  </div>
                )}
                {field.optionsSource && (
                  <p className="text-xs text-blue-gray-500">Đang lấy danh sách từ: <code>{field.optionsSource}</code></p>
                )}
              </div>
            ))}
            {!(section.fields || []).length && (
              <p className="text-sm text-blue-gray-400 px-1">Chưa có câu hỏi — bấm + Câu hỏi.</p>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outlined" onClick={addSection}>+ Thêm mục</Button>
        <Button size="sm" variant="text" onClick={() => setShowJson((v) => !v)}>
          {showJson ? "Ẩn JSON nâng cao" : "JSON nâng cao"}
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Đang lưu…" : "Lưu form"}</Button>
      </div>

      {showJson && (
        <textarea
          className="border rounded-lg p-3 text-xs font-mono min-h-[280px] w-full"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
        />
      )}

      {msg && <Typography variant="small" color="green">{msg}</Typography>}
      {err && <Typography variant="small" color="red">{err}</Typography>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Recruitment() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState("applications");
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="p-4">
      <Typography variant="h5" color="blue-gray" className="mb-4">Tuyển dụng</Typography>
      <div className="flex flex-wrap gap-2 mb-6">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-blue-800 text-white" : "bg-blue-gray-50 text-blue-gray-700 hover:bg-blue-gray-100"}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      <Card className="border border-blue-gray-100">
        <CardBody className="p-4">
          {tab === "applications" && <ApplicationsTab />}
          {tab === "apply-form" && isAdmin && <ApplyFormCmsTab />}
        </CardBody>
      </Card>
    </div>
  );
}
