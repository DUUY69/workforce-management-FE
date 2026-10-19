import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { MapPinIcon, BriefcaseIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Reveal } from "./useScrollReveal";
import { TUYENDUNG_URL } from "./careers-utils";
import "./careers.css";

const api = axios.create({ baseURL: "/api" });

export default function JobDetail() {
  const { slug } = useParams();
  const [job, setJob] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get(`/recruitment/jobs/${slug}`)
      .then((r) => setJob(r.data.data))
      .catch(() => setErr("Không tải được tin tuyển dụng."));
  }, [slug]);

  if (!job && !err) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-[#2aafa0] rounded-full animate-spin" />
      </div>
    );
  }
  if (!job) return <div className="py-20 text-center text-red-500">{err}</div>;

  return (
    <div className="careers-page bg-slate-50 min-h-screen">
      <div className="bg-[#0f1f3d] text-white py-16 pt-24">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/careers" className="inline-flex items-center gap-2 text-white/60 text-sm hover:text-white transition-colors mb-6">
            <ArrowLeftIcon className="w-4 h-4" /> Quay lại Careers
          </Link>
          <h1 className="careers-serif text-3xl md:text-4xl font-bold mb-4">{job.title}</h1>
          <div className="flex flex-wrap gap-5 text-sm text-white/70 mb-8">
            {job.department && (
              <span className="flex items-center gap-1.5">
                <BriefcaseIcon className="w-4 h-4 text-[#2aafa0]" />
                {job.department}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="w-4 h-4 text-[#2aafa0]" />
              {job.location || job.storeName || "TP.HCM"}
            </span>
          </div>
          <a
            href={TUYENDUNG_URL}
            className="inline-flex careers-btn-primary text-white font-semibold px-8 py-3 rounded-sm text-sm tracking-wide"
          >
            ỨNG TUYỂN NGAY
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <Reveal>
          {job.description && (
            <div className="bg-white rounded-sm shadow-sm border border-slate-100 p-6">
              <h3 className="careers-serif text-lg font-semibold text-[#0f1f3d] mb-3">Mô tả công việc</h3>
              <div className="prose prose-sm text-slate-600 max-w-none" dangerouslySetInnerHTML={{ __html: job.description }} />
            </div>
          )}
          {job.requirements && (
            <div className="bg-white rounded-sm shadow-sm border border-slate-100 p-6 mt-6">
              <h3 className="careers-serif text-lg font-semibold text-[#0f1f3d] mb-3">Yêu cầu</h3>
              <div className="prose prose-sm text-slate-600 max-w-none" dangerouslySetInnerHTML={{ __html: job.requirements }} />
            </div>
          )}
          {job.benefits && (
            <div className="bg-white rounded-sm shadow-sm border border-slate-100 p-6 mt-6">
              <h3 className="careers-serif text-lg font-semibold text-[#0f1f3d] mb-3">Phúc lợi</h3>
              <div className="prose prose-sm text-slate-600 max-w-none" dangerouslySetInnerHTML={{ __html: job.benefits }} />
            </div>
          )}
        </Reveal>
        <div className="text-center py-4">
          <a
            href={TUYENDUNG_URL}
            className="inline-flex careers-btn-primary text-white font-semibold px-10 py-3 rounded-sm text-sm"
          >
            Điền form ứng tuyển
          </a>
        </div>
      </div>
    </div>
  );
}
