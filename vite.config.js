import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Change 'ramtech-ticketit' to match your GitHub repo name exactly
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves Cinder from /Cinder/. Self-hosted builds set
  // VITE_BASE_PATH=/ so the same source can be served at its own hostname.
  base: process.env.VITE_BASE_PATH || '/Cinder/',
});
