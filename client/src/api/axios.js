import axios from 'axios'

// Choose API base URL based on environment
// - Dev (Vite): proxy to local backend via '/api'
// - Prod: default to your Render backend unless VITE_API_BASE_URL is provided
const DEFAULT_PROD_API = 'https://symplora.onrender.com/api'
const baseURL = (import.meta.env.MODE === 'production')
  ? (import.meta.env.VITE_API_BASE_URL || DEFAULT_PROD_API)
  : (import.meta.env.VITE_API_BASE_URL || '/api')

const api = axios.create({
  baseURL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

