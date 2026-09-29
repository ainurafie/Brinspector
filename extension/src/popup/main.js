import { createApp } from 'vue';
import PopupSummary from './PopupSummary.vue';

// Reuses the panel's design tokens (F-006-style convention): no hardcoded hex in components.
import '../panel/panel.css';

createApp(PopupSummary).mount('#app');
