/**
 * Main entry point for the web app.
 * Loads the reader module which self-initializes on DOMContentLoaded.
 */
import './reader.js';
import { bindAuthUI } from './auth-ui.js';

document.addEventListener('DOMContentLoaded', () => {
  bindAuthUI();
});
