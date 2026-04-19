import { API_BASE_URL } from '../utils/constants';

// Controller to handle business logic and API requests
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health/`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data.status === 'ok' ? 'Healthy' : 'Unhealthy';
  } catch (error) {
    console.error('Error checking backend health:', error);
    return 'Unreachable';
  }
};
