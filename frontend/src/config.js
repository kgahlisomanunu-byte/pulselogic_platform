// Auto-detect backend port
export const getBackendUrl = () => {
    // Try to read from localStorage first (set by backend)
    const savedPort = localStorage.getItem('backendPort');
    if (savedPort) {
        return `http://localhost:${savedPort}`;
    }
    
    // Default to 5000
    return 'http://localhost:5000';
};

export const BACKEND_URL = getBackendUrl();
export const API_URL = (process.env.REACT_APP_API_URL || `${BACKEND_URL}/api`).replace(/\/$/, '');