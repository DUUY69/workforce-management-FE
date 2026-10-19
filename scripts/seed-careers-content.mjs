/**
 * Seed brands + contact footer with UTF-8 Vietnamese into BE CMS.
 * Usage: node scripts/seed-careers-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-careers-content.json"), "utf8"));
const API = process.env.API_BASE || "http://localhost:5001/api";

async function main() {
  const login = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "Admin@123" }),
  }).then((r) => r.json());
  const token = login?.data?.accessToken;
  if (!token) throw new Error("Login failed: " + JSON.stringify(login));

  for (const section of data) {
    const body = {
      title: section.title,
      subtitle: section.subtitle ?? null,
      content: section.content ?? null,
      imageUrl: section.imageUrl ?? null,
      extraJson: JSON.stringify(section.extra),
      sortOrder: section.sortOrder ?? 0,
      isActive: section.isActive !== false,
    };
    const res = await fetch(`${API}/recruitment/admin/page-sections/${section.key}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    console.log(section.key, res.status, json.success ? "OK" : json.message);
  }

  // Sample blog if empty
  const blogs = await fetch(`${API}/recruitment/admin/blog`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  if (!(blogs.data || []).length) {
    const posts = [
      {
        title: "Chào đón bạn đến Passion Cafe Careers",
        summary: "Cơ hội nghề nghiệp trong hệ sinh thái Passio, Betea và Deer Coffee.",
        content: "<p>Chúng tôi đang mở rộng đội ngũ tại nhiều cửa hàng. Ứng tuyển ngay trên trang Careers.</p>",
        coverImageUrl: "/images/brands/passio-store.png",
        isPublished: true,
      },
      {
        title: "Môi trường làm việc tại cửa hàng",
        summary: "Mỗi ngày phục vụ khách hàng cũng là ngày học hỏi và phát triển kỹ năng.",
        content: "<p>Từ barista đến shift leader — lộ trình rõ ràng và đào tạo nội bộ liên tục.</p>",
        coverImageUrl: "/images/brands/betea-store.png",
        isPublished: true,
      },
    ];
    for (const p of posts) {
      const r = await fetch(`${API}/recruitment/admin/blog`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(p),
      });
      console.log("blog", p.title, r.status);
    }
  } else {
    console.log("blog already has", blogs.data.length, "posts");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
