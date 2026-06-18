import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Send, Bookmark,
  MoreHorizontal, ChevronLeft, ChevronRight, Play, Eye, Share2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import {
  likePost, unlikePost, isPostLiked,
  savePost, unsavePost, isPostSaved,
  getUserByUid, sharePost, incrementPostViews
} from '../../firebase/firestoreService';
import Avatar from '../common/Avatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import PostMenu from './PostMenu';
import CommentSheet from './CommentSheet';
import styles from './PostCard.module.css';

export default function PostCard({ post }) {
  const { uid } = useAuth();
  const navigate = useNavigate();
  const [author, setAuthor] = useState(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [savesCount, setSavesCount] = useState(post.savesCount || 0);
  const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
  const [viewsCount, setViewsCount] = useState(post.viewsCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [heartAnim, setHeartAnim] = useState(false);
  const lastTapRef = useRef(0);
  const viewedRef = useRef(false);

  const mediaUrls = post.mediaUrls || (post.mediaUrl ? [post.mediaUrl] : []);
  const hasMultiple = mediaUrls.length > 1;

  useEffect(() => {
    getUserByUid(post.authorId).then(setAuthor);
    if (uid) {
      isPostLiked(uid, post.id).then(setLiked);
      isPostSaved(uid, post.id).then(setSaved);
      // Count view once per mount
      if (!viewedRef.current) {
        viewedRef.current = true;
        incrementPostViews(uid, post.id).then(() => {
          setViewsCount(c => c + 1);
        }).catch(() => {});
      }
    }
  }, [post.id, uid]);

  const handleLike = async () => {
    if (!uid) { navigate('/auth'); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount(c => wasLiked ? c - 1 : c + 1);
    
    if (wasLiked) await unlikePost(uid, post.id);
    else {
      await likePost(uid, post.id, post.authorId);
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 1000);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) handleLike();
    }
    lastTapRef.current = now;
  };

  const handleSave = async () => {
    if (!uid) { navigate('/auth'); return; }
    const wasSaved = saved;
    setSaved(s => !s);
    setSavesCount(c => wasSaved ? c - 1 : c + 1);
    if (wasSaved) await unsavePost(uid, post.id);
    else await savePost(uid, post.id);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'UChat post', url: window.location.origin + `/post/${post.id}` });
      } else {
        await navigator.clipboard?.writeText(window.location.origin + `/post/${post.id}`);
      }
      await sharePost(post.id);
      setSharesCount(c => c + 1);
    } catch {}
  };

  const timestamp = post.createdAt?.toDate
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true })
    : 'just now';

  return (
    <article className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <Link to={`/profile/${author?.username}`} className={styles.authorLink}>
          <Avatar
            src={author?.profilePhoto}
            name={author?.displayName}
            size={36}
            verified={author?.verified}
            online={author?.onlineStatus}
          />
          <div className={styles.authorInfo}>
            <span className={styles.displayName}>
              {author?.displayName}
              {author?.verified && <VerifiedBadge size={16} style={{ marginLeft: 2 }} />}
            </span>
            <span className={styles.meta}>
              @{author?.username}
              {post.location && <> · 📍 {post.location}</>}
            </span>
          </div>
        </Link>
        <div className={styles.headerRight}>
          <span className={styles.timestamp}>{timestamp}</span>
          <button
            className={styles.menuBtn}
            onClick={() => setShowMenu(true)}
            aria-label="More options"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Media */}
      {mediaUrls.length > 0 && (
        <div className={styles.media} onDoubleClick={handleDoubleTap} onClick={handleDoubleTap}>
          <div className={styles.mediaSlider} style={{ transform: `translateX(-${mediaIndex * 100}%)` }}>
            {mediaUrls.map((url, i) => (
              <div key={i} className={styles.mediaSlide}>
                {post.mediaType === 'video' || url.includes('.mp4') ? (
                  <video
                    src={url}
                    className={styles.mediaItem}
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={url}
                    alt={`Post media ${i + 1}`}
                    className={styles.mediaItem}
                    loading="lazy"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Carousel controls */}
          {hasMultiple && (
            <>
              {mediaIndex > 0 && (
                <button
                  className={`${styles.carouselBtn} ${styles.carouselPrev}`}
                  onClick={(e) => { e.stopPropagation(); setMediaIndex(i => i - 1); }}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {mediaIndex < mediaUrls.length - 1 && (
                <button
                  className={`${styles.carouselBtn} ${styles.carouselNext}`}
                  onClick={(e) => { e.stopPropagation(); setMediaIndex(i => i + 1); }}
                >
                  <ChevronRight size={20} />
                </button>
              )}
              <div className={styles.dots}>
                {mediaUrls.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.dot} ${i === mediaIndex ? styles.dotActive : ''}`}
                    onClick={() => setMediaIndex(i)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Double-tap heart */}
          <AnimatePresence>
            {heartAnim && (
              <motion.div
                className={styles.heartOverlay}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
              >
                ❤️
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles.actionsLeft}>
          <button
            className={`${styles.actionBtn} ${liked ? styles.liked : ''}`}
            onClick={handleLike}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <motion.div
              animate={liked ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Heart
                size={22}
                fill={liked ? 'var(--like-color)' : 'none'}
                color={liked ? 'var(--like-color)' : 'currentColor'}
                strokeWidth={liked ? 0 : 2}
              />
            </motion.div>
          </button>

          <button
            className={styles.actionBtn}
            onClick={() => setShowComments(true)}
            aria-label="Comment"
          >
            <MessageCircle size={22} />
          </button>

          <button className={styles.actionBtn} aria-label="Share" onClick={handleShare}>
            <Send size={22} />
          </button>
        </div>

        <button
          className={`${styles.actionBtn} ${saved ? styles.saved : ''}`}
          onClick={handleSave}
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <Bookmark
            size={22}
            fill={saved ? 'var(--text-primary)' : 'none'}
            strokeWidth={saved ? 0 : 2}
          />
        </button>
      </div>

      {/* Likes count */}
      {likesCount > 0 && (
        <div className={styles.likes}>
          <Heart size={14} fill="var(--like-color)" color="var(--like-color)" />
          <span>{likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}</span>
        </div>
      )}

      {/* Stats row: comments · saves · shares · views */}
      {(commentsCount > 0 || savesCount > 0 || sharesCount > 0 || viewsCount > 0) && (
        <div style={{ display:'flex', gap:14, padding:'2px 12px 4px', fontSize:12, color:'var(--text-tertiary)' }}>
          {commentsCount > 0 && <span>💬 {commentsCount.toLocaleString()}</span>}
          {savesCount > 0 && <span>🔖 {savesCount.toLocaleString()}</span>}
          {sharesCount > 0 && <span>↗ {sharesCount.toLocaleString()}</span>}
          {viewsCount > 0 && <span>👁 {viewsCount.toLocaleString()}</span>}
        </div>
      )}

      {/* Caption */}
      {post.caption && (
        <div className={styles.caption}>
          <Link to={`/profile/${author?.username}`} className={styles.captionUsername}>
            {author?.displayName}
          </Link>
          <Caption text={post.caption} />
        </div>
      )}

      {/* Hashtags */}
      {post.hashtags?.length > 0 && (
        <div className={styles.hashtags}>
          {post.hashtags.map(tag => (
            <span key={tag} className={styles.hashtag}>#{tag}</span>
          ))}
        </div>
      )}

      {/* View comments */}
      {post.commentsCount > 0 && (
        <button
          className={styles.viewComments}
          onClick={() => setShowComments(true)}
        >
          View all {post.commentsCount} comments
        </button>
      )}

      {/* Timestamp */}
      <time className={styles.time}>{timestamp}</time>

      {/* Modals */}
      <AnimatePresence>
        {showComments && (
          <CommentSheet post={post} onClose={() => setShowComments(false)} />
        )}
        {showMenu && (
          <PostMenu
            post={post}
            author={author}
            onClose={() => setShowMenu(false)}
          />
        )}
      </AnimatePresence>
    </article>
  );
}

const Caption = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 150;
  if (text.length <= LIMIT || expanded) return <span> {text}</span>;
  return (
    <span>
      {' '}{text.slice(0, LIMIT)}...{' '}
      <button
        className={styles.moreBtn}
        onClick={() => setExpanded(true)}
      >
        more
      </button>
    </span>
  );
};
