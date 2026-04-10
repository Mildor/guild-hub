import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const activeSharedProfile = window.localStorage.getItem('gh_active_shared_profile');
  if (activeSharedProfile) {
    config.headers = config.headers ?? {};
    config.headers['x-shared-profile'] = activeSharedProfile;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url;
    const isAuthMeRequest = typeof requestUrl === 'string' && requestUrl.includes('/auth/me');

    if (status === 401 && !isAuthMeRequest) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/login/success') {
          window.location.href = '/login?reason=session-expired';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
