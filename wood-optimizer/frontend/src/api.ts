import axios from "axios";

const API_URL = "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const stockApi = {
  getAll: () => api.get("/stock").then(res => res.data),
  create: (data: any) => api.post("/stock", data).then(res => res.data),
  update: (id: number, data: any) => api.put(`/stock/${id}`, data).then(res => res.data),
  delete: (id: number) => api.delete(`/stock/${id}`).then(res => res.data),
  exportPdf: (id: number) => {
    return api.get(`/stock/${id}/pdf`, { responseType: 'blob' }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lotto_${id}_etichetta.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  },
  consume: (id: number) => api.post(`/stock/${id}/consume`).then(res => res.data),
};

export const templateApi = {
  getAll: () => api.get("/templates").then(res => res.data),
  create: (data: any) => api.post("/templates", data).then(res => res.data),
  delete: (id: number) => api.delete(`/templates/${id}`).then(res => res.data),
};

export const orderApi = {
  getAll: () => api.get("/orders").then(res => res.data),
  getOne: (id: number) => api.get(`/orders/${id}`).then(res => res.data),
  create: (data: any) => api.post("/orders", data).then(res => res.data),
  updateStatus: (id: number, status: string) => api.put(`/orders/${id}/status?status=${status}`).then(res => res.data),
  updateItemStatus: (orderId: number, itemId: number, status: string) => api.put(`/orders/${orderId}/items/${itemId}/status?status=${status}`).then(res => res.data),
  delete: (id: number) => api.delete(`/orders/${id}`).then(res => res.data),
  addMessage: (id: number, data: any) => api.post(`/orders/${id}/messages`, data).then(res => res.data),
  optimize: (id: number) => api.post(`/orders/${id}/optimize`).then(res => res.data),
  exportExcel: (id: number) => {
    return api.get(`/orders/${id}/export`, { responseType: 'blob' }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ordine_${id}_cutplan.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  },
  exportPdf: (id: number) => {
    return api.get(`/orders/${id}/pdf`, { responseType: 'blob' }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ordine_${id}_cutplan.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }
};
