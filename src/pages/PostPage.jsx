// src/pages/PostPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getPost } from '../firebase/firestoreService';
import PostCard from '../components/posts/PostCard';

export default function PostPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPost(postId).then(p => { setPost(p); setLoading(false); });
  }, [postId]);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: 'var(--nav-bg)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>Post</h2>
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : post ? (
          <PostCard post={post} />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            <p>Post not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
