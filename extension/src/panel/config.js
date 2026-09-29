import { DEFAULT_API_BASE_URL } from '../lib/apiClient.js';

// Read from extension/.env at build time (Vite). Kept out of src/lib so Jest never sees import.meta.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
