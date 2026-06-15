// src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center',
      background: 'var(--bg-primary)'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
      >
        <div style={{
          fontSize: 80, fontWeight: 900, fontFamily: 'var(--font-display)',
          background: 'var(--brand-gradient)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          404
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Page not found</h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 320 }}>
          This page doesn't exist or was moved. Go back home and explore UChat.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            onClick={() => window.history.back()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)', fontSize: 14, fontWeight: 600
            }}
          >
            <ArrowLeft size={16} /> Go back
          </button>
          <Link
            to="/"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 'var(--radius-full)',
              background: 'var(--brand-gradient)', color: 'white',
              fontSize: 14, fontWeight: 700, textDecoration: 'none'
            }}
          >
            <Home size={16} /> Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
