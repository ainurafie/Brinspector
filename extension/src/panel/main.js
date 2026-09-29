import { createApp } from 'vue';
import App from './App.vue';

// Fonts from the Figma design, bundled locally (no CDN calls from the extension).
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import './panel.css';

createApp(App).mount('#app');
