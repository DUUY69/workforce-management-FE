import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, Typography, Input, Button } from "@material-tailwind/react";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.removeItem("wf_access_token");
    localStorage.removeItem("wf_refresh_token");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      navigate("/dashboard/home");
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (!err?.response) {
        setError("Không kết nối được server. Kiểm tra BE đang chạy (port 5001) và mở http://localhost:5174/auth/login");
      } else {
        setError(msg || "Đăng nhập thất bại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-900 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardBody className="p-8">
          <div className="text-center mb-8">
            <Typography variant="h4" color="blue-gray" className="font-bold">Workforce Management</Typography>
            <Typography color="gray" className="mt-1 text-sm">Đăng nhập để tiếp tục</Typography>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Tên đăng nhập"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
            />
            <Input
              type="password"
              label="Mật khẩu"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}
            <Button type="submit" fullWidth disabled={loading} className="mt-2">
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
            <Typography color="gray" className="text-xs text-center mt-2">
              Local: <strong>admin</strong> / <strong>Admin@123</strong>
            </Typography>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
