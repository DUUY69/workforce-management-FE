/** Admin: tất cả CH; Manager/Employee: chỉ CH được gán.
 *  Mặc định chỉ CH đang hoạt động. Truyền includeInactive=true khi cần DS đầy đủ (trang Cửa hàng). */
export async function fetchStores(api, { isAdmin, includeInactive = false } = {}) {
  const path = isAdmin ? "/stores" : "/stores/assigned";
  const res = await api.get(path);
  const list = res.data?.data || [];
  if (includeInactive) return list;
  return list.filter((s) => s.isActive !== false && s.IsActive !== false);
}

/** Dropdown đăng ký ca — mọi CH đang hoạt động. */
export async function fetchStoreOptions(api) {
  const res = await api.get("/stores/options");
  return res.data?.data || [];
}
