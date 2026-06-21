// src/components/settings/SettingsUI.jsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Check } from 'lucide-react';

// Sticky back-button header used at the top of every settings subpage
export const SubpageHeader = ({ title, subtitle, onBack }) => {
  const navigate = useNavigate();
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onBack || (() => navigate(-1))}
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
    </div>
  );
};

export const SettingsPageShell = ({ title, subtitle, onBack, children }) => (
  <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100dvh', paddingBottom: 60 }}>
    <SubpageHeader title={title} subtitle={subtitle} onBack={onBack} />
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {children}
    </div>
  </div>
);

export const Toggle = ({ value, onChange, disabled }) => (
  <div
    onClick={disabled ? undefined : onChange}
    style={{
      width: 48, height: 26, borderRadius: 13,
      background: value ? 'var(--brand-primary, #7C3AED)' : 'var(--border-default)',
      position: 'relative', cursor: disabled ? 'default' : 'pointer', transition: 'background 0.2s',
      flexShrink: 0, opacity: disabled ? 0.5 : 1,
    }}
  >
    <div style={{
      position: 'absolute', top: 3, left: value ? 25 : 3,
      width: 20, height: 20, borderRadius: '50%',
      background: 'white', transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
    }} />
  </div>
);

export const ToggleRow = ({ label, desc, value, onChange, last, disabled }) => (
  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
      {desc && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{desc}</div>}
    </div>
    <Toggle value={value} onChange={onChange} disabled={disabled} />
  </div>
);

// A card-style section container, mirrors the original SettingSection look
export const Card = ({ children, padded = false }) => (
  <div style={{ borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', overflow: 'hidden', padding: padded ? 16 : 0 }}>
    {children}
  </div>
);

export const CardLabel = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 4px 2px' }}>
    {children}
  </div>
);

// A single radio-style option row (e.g. Public/Private, visibility levels)
export const RadioRow = ({ label, desc, selected, onClick, last }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', padding: '14px 16px', background: 'none', border: 'none',
      borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left'
    }}
  >
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
      {desc && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{desc}</div>}
    </div>
    <div style={{
      width: 21, height: 21, borderRadius: '50%', flexShrink: 0,
      border: selected ? 'none' : '2px solid var(--border-default)',
      background: selected ? 'var(--brand-gradient, linear-gradient(135deg,#7C3AED,#2563EB))' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {selected && <Check size={13} color="white" strokeWidth={3} />}
    </div>
  </button>
);

// A simple navigable menu row (chevron-right, optional icon/value/badge)
export const MenuRow = ({ label, desc, icon, value, badge, onClick, last, danger }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', padding: '14px 16px', background: 'none', border: 'none',
      borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left'
    }}
  >
    {icon && <span style={{ color: danger ? '#EF4444' : 'var(--text-secondary)', flexShrink: 0, display: 'flex' }}>{icon}</span>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: danger ? '#EF4444' : 'var(--text-primary)' }}>{label}</div>
      {desc && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{desc}</div>}
    </div>
    {value && <span style={{ fontSize: 13, color: 'var(--text-tertiary)', flexShrink: 0 }}>{value}</span>}
    {badge && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', color: '#7C3AED', fontWeight: 600, flexShrink: 0 }}>{badge}</span>}
    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
  </button>
);

// Top-level menu item on the main Settings page (icon tile + title + chevron)
export const MenuTile = ({ icon, iconBg, title, subtitle, onClick, badge }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
      background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left'
    }}
  >
    <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
    </div>
    {badge && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', color: '#7C3AED', fontWeight: 700, flexShrink: 0 }}>{badge}</span>}
    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
  </button>
);

export const EmptyHint = ({ children }) => (
  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, lineHeight: 1.6 }}>
    {children}
  </div>
);
