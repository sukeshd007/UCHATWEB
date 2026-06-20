// src/pages/MessagesPage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Edit, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { getUserChats, getUserByUid } from '../firebase/firestoreService';
import { isUserOnline } from '../firebase/authService';
import Avatar from '../components/common/Avatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import StoryBar from '../components/feed/StoryBar';

export default function MessagesPage() {
  const { uid } = useAuth();
  const [chats, setChats] = useState([]);
  const [chatUsers, setChatUsers] = useState({});
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!uid) return;
    const unsub = getUserChats(uid, async (rawChats) => {
      setChats(rawChats);
      // Fetch user info for each DM
      const userMap = {};
      for (const chat of rawChats) {
        if (chat.type === 'direct') {
          const otherId = chat.participants.find(p => p !== uid);
          if (otherId && !userMap[otherId]) {
            userMap[otherId] = await getUserByUid(otherId);
          }
        }
      }
      setChatUsers(prev => ({ ...prev, ...userMap }));
    });
    return unsub;
  }, [uid]);

  const filteredChats = chats.filter(chat => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (chat.type === 'group') return chat.groupName?.toLowerCase().includes(q);
    const other = chatUsers[chat.participants?.find(p => p !== uid)];
    return other?.displayName?.toLowerCase().includes(q) || other?.username?.toLowerCase().includes(q);
  });

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '14px 16px 12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Messages</h2>
            {/* Cloud sync dot */}
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} title="Connected to cloud — live updates" />
          </div>
          <button
            onClick={() => navigate('/search')}
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}
          >
            <Edit size={18} />
          </button>
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search messages"
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)', color: 'var(--text-primary)', fontSize: 14
            }}
          />
        </div>
      </div>

      {/* Notes — same shared component as Home, now with the "Your note" compose
          entry that this page's old read-only version was missing */}
      <div style={{ padding: '10px 4px 2px', borderBottom: '1px solid var(--border-subtle)' }}>
        <StoryBar />
      </div>
      {/* Chat list */}
      <div>
        {filteredChats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No messages yet</h3>
            <p style={{ fontSize: 14 }}>Search for people to start a conversation.</p>
          </div>
        ) : (
          filteredChats.map((chat, i) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              uid={uid}
              otherUser={chat.type === 'direct' ? chatUsers[chat.participants?.find(p => p !== uid)] : null}
            />
          ))
        )}
      </div>
    </div>
  );
}

const ChatRow = ({ chat, uid, otherUser }) => {
  const unread = chat[`unread_${uid}`] || 0;
  const isGroup = chat.type === 'group';
  const name = isGroup ? chat.groupName : otherUser?.displayName;
  const photo = isGroup ? chat.groupPhoto : otherUser?.profilePhoto;
  const ts = chat.lastMessageTime?.toDate
    ? formatDistanceToNow(chat.lastMessageTime.toDate(), { addSuffix: false })
    : '';

  return (
    <Link
      to={`/messages/${chat.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', textDecoration: 'none', color: 'inherit',
        transition: 'background var(--duration-fast)',
        borderBottom: '1px solid var(--border-subtle)'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-1)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ position: 'relative' }}>
        <Avatar
          src={photo}
          name={name}
          size={52}
          online={!isGroup && isUserOnline(otherUser)}
          verified={!isGroup && otherUser?.verified}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: unread > 0 ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name || 'Unknown'}
            </span>
            {!isGroup && otherUser?.verified && <VerifiedBadge size={14} style={{ flexShrink: 0 }} />}
          </span>
          <span style={{ fontSize: 12, color: unread > 0 ? 'var(--brand-primary)' : 'var(--text-tertiary)', flexShrink: 0, marginLeft: 8, fontWeight: unread > 0 ? 700 : 400 }}>
            {ts}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 13, color: unread > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontWeight: unread > 0 ? 600 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {chat.lastMessage || 'Start a conversation'}
          </span>
          {unread > 0 && (
            <span style={{
              minWidth: 20, height: 20, borderRadius: 10,
              background: 'var(--brand-primary)', color: 'white',
              fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px'
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
