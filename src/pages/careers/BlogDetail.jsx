import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { mediaUrl, DEFAULT_BLOG_POSTS } from "./careers-utils";
import { Reveal } from "./useScrollReveal";
import "./careers.css";

const api = axios.create({ baseURL: "/api" });

export default function BlogDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/recruitment/blog/${slug}`)
      .then((r) => {
        if (!cancelled) setPost(r.data.data || null);
      })
      .catch(() => {
        if (!cancelled) {
          setPost(DEFAULT_BLOG_POSTS.find((p) => p.slug === slug) || null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-[#2aafa0] rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Không tìm thấy bài viết.</p>
        <Link to="/careers#blog" className="text-[#2aafa0] hover:underline text-sm">
          ← Quay lại
        </Link>
      </div>
    );
  }

  return (
    <div className="careers-page bg-white min-h-screen">
      {post.coverImageUrl && (
        <div className="h-64 md:h-80 overflow-hidden relative">
          <img src={mediaUrl(post.coverImageUrl)} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1f3d]/80 to-transparent" />
        </div>
      )}
      <article className={`max-w-3xl mx-auto px-4 ${post.coverImageUrl ? "-mt-20 relative z-10" : "pt-24"} pb-16`}>
        <Reveal>
          <Link to="/careers#blog" className="inline-flex items-center gap-2 text-[#2aafa0] text-sm hover:underline mb-6">
            <ArrowLeftIcon className="w-4 h-4" /> Tin tức
          </Link>
          <div className={post.coverImageUrl ? "bg-white rounded-sm shadow-xl p-8 md:p-12" : ""}>
            <p className="text-xs text-slate-400 tracking-widest uppercase mb-3">{post.publishedAt}</p>
            <h1 className="careers-serif text-3xl md:text-4xl font-bold text-[#0f1f3d] mb-4 leading-tight">{post.title}</h1>
            {post.summary && <p className="text-lg text-slate-500 mb-8 border-l-4 border-[#2aafa0] pl-4">{post.summary}</p>}
            <div className="prose prose-slate max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: post.content || "" }} />
          </div>
        </Reveal>
      </article>
    </div>
  );
}
