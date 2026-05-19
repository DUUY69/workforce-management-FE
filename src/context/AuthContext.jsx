import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("wf_access_token");
    if (token) {
      api.get("/auth/me")
        .then((res) => setCurrentUser(res.data.data))
        .catch(() => {
          localStorage.removeItem("wf_access_token");
          localStorage.removeItem("wf_refresh_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    const { accessToken, refreshToken, user } = res.data.data;
    localStorage.setItem("wf_access_token", accessToken);
    localStorage.setItem("wf_refresh_token", refreshToken);
    setCurrentUser(user);
    return user;
  };

  const refreshUser = async () => {
    const res = await api.get("/auth/me");
    setCurrentUser(res.data.data);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("wf_refresh_token");
    try { await api.post("/auth/logout", { refreshToken }); } catch {}
    localStorage.removeItem("wf_access_token");
    localStorage.removeItem("wf_refresh_token");
    setCurrentUser(null);
  };

  const isAdmin = currentUser?.role === "Admin";
  const isManager = currentUser?.role === "Manager";
  const isEmployee = currentUser?.role === "Employee";

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout, refreshUser, isAdmin, isManager, isEmployee }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
