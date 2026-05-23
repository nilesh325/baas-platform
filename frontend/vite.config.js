import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VERCEL ? '/' : '/static/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/register': 'http://localhost:8000',
      '/login': 'http://localhost:8000',
      '/logout': 'http://localhost:8000',
      '/google-login': 'http://localhost:8000',
      '/company': 'http://localhost:8000',
      '/updatename': 'http://localhost:8000',
      '/updateemail': 'http://localhost:8000',
      '/updatepassword': 'http://localhost:8000',
      '/deactivate': 'http://localhost:8000',
      '/link-google': 'http://localhost:8000',
      '/unlink-google': 'http://localhost:8000',
      '/delete-account': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/get-pdfs': 'http://localhost:8000',
      '/delete-pdf': 'http://localhost:8000',
      '/tickets': 'http://localhost:8000',
      '/delete_ticket': 'http://localhost:8000',
      '/update_ticket': 'http://localhost:8000',
      '/register_ticket': 'http://localhost:8000',
      '/raised': 'http://localhost:8000',
      '/companyname': 'http://localhost:8000',
      '/ask': 'http://localhost:8000',
      '/ai': 'http://localhost:8000',
    }
  }
})
