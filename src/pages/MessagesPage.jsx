// src/pages/MessagesPage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Edit, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { getUserChats, getUserByUid, getActiveNotes, getFollowing } from '../firebase/firestoreService';
import Avatar from '../components/common/Avatar';

export default function MessagesPage() {
  const { uid, userProfile } = useAuth();
  const [chats, setChats] = useState([]);
  const [chatUsers, setChatUsers] = useState({});
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState([]);
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

  // Load notes for following
  useEffect(() => {
    if (!uid) return;
    const loadNotes = async () => {
      const followingIds = await getFollowing(uid, 30);
      const active = await getActiveNotes([uid, ...followingIds]);
      const enriched = await Promise.all(active.map(async n => ({ ...n, author: await getUserByUid(n.authorId) })));
      setNotes(enriched);
    };
    loadNotes();
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
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Messages</h2>
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

      {/* Notes bar — Instagram story-circle style at top of messages */}
      {notes.length > 0 && (
        <div style={{ padding: '10px 16px 6px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
            {notes.map(note => (
              <div key={note.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, cursor: 'pointer', paddingTop: 30 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: -26, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--surface-3)', border: '1px solid var(--border-default)',
                    borderRadius: 9, padding: '2px 7px',
                    fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', maxWidth: 80,
                    overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none',
                  }}>
                    {note.text.slice(0, 18)}{note.text.length > 18 ? '\u2026' : ''}
                  </div>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', padding: 2 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--bg-primary)', padding: 2, overflow: 'hidden' }}>
                      <Avatar src={note.author?.profilePhoto} name={note.author?.displayName} size={48} />
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {note.author?.displayName?.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
          online={!isGroup && otherUser?.onlineStatus}
          verified={!isGroup && otherUser?.verified}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontSize: 15, fontWeight: unread > 0 ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name || 'Unknown'}
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
