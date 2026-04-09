import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Star, HelpCircle, Send, User, ChevronDown, ChevronUp, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '../services/supabase'
import useStore from '../store/useStore'
import AuthModal from './auth/AuthModal'

const TABS = [
  { key: 'reviews',  label: 'Reviews',    icon: Star },
  { key: 'help',     label: 'Help',        icon: HelpCircle },
  { key: 'general',  label: 'Discussion',  icon: MessageSquare },
]

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function Avatar({ name, isYou }) {
  return (
    <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
      isYou ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'
    }`}>
      {isYou ? <User size={11} /> : name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function CommentThread({ post, currentUser, onAuthRequired }) {
  const [expanded, setExpanded]   = useState(false)
  const [comments, setComments]   = useState([])
  const [loadingCmts, setLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadComments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoading(false)
  }, [post.id])

  const toggleExpand = () => {
    if (!expanded) loadComments()
    setExpanded(v => !v)
  }

  const handleReply = async () => {
    if (!currentUser) { onAuthRequired(); return }
    if (!replyText.trim()) return
    setSubmitting(true)
    await supabase.from('community_comments').insert({
      post_id:     post.id,
      user_id:     currentUser.id,
      author_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Anonymous',
      body:        replyText.trim(),
    })
    setReplyText('')
    setShowReply(false)
    await loadComments()
    setExpanded(true)
    setSubmitting(false)
  }

  const handleDelete = async (commentId) => {
    await supabase.from('community_comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const commentCount = post.comment_count ?? 0

  return (
    <div className="mt-2.5 border-t border-slate-800/30 pt-2.5">
      <div className="flex items-center gap-3">
        {/* Toggle comments */}
        <button
          onClick={toggleExpand}
          className="flex items-center gap-1 text-[10.5px] text-slate-600 hover:text-slate-400 transition-colors"
        >
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {commentCount > 0 ? `${commentCount} reply${commentCount !== 1 ? 's' : ''}` : 'Replies'}
        </button>

        {/* Reply button */}
        <button
          onClick={() => {
            if (!currentUser) { onAuthRequired(); return }
            setShowReply(v => !v)
            if (!expanded) { loadComments(); setExpanded(true) }
          }}
          className="text-[10.5px] text-indigo-400/70 hover:text-indigo-300 transition-colors"
        >
          Reply
        </button>
      </div>

      {/* Reply compose */}
      {showReply && (
        <div className="mt-2.5 flex gap-2 items-start">
          <Avatar name={currentUser?.user_metadata?.full_name} isYou />
          <div className="flex-1">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="w-full bg-slate-950/60 border border-slate-800/40 rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 resize-none transition-colors"
            />
            <div className="flex justify-end gap-2 mt-1.5">
              <button
                onClick={() => { setShowReply(false); setReplyText('') }}
                className="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || submitting}
                className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-3 py-1 transition-all disabled:opacity-30"
              >
                {submitting ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                Reply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      {expanded && (
        <div className="mt-2 pl-3 border-l border-slate-800/40 space-y-2.5">
          {loadingCmts ? (
            <div className="flex justify-center py-2">
              <Loader2 size={13} className="animate-spin text-slate-600" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-[11px] text-slate-700 font-light py-1">No replies yet.</p>
          ) : (
            comments.map(c => {
              const isOwn = currentUser?.id === c.user_id
              return (
                <div key={c.id} className="group flex items-start gap-2">
                  <Avatar name={c.author_name} isYou={isOwn} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-300">{c.author_name}</span>
                      <span className="text-[10px] text-slate-700">{timeAgo(c.created_at)}</span>
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="ml-auto opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                    <p className="text-[12px] text-slate-400 font-light leading-relaxed mt-0.5">
                      {c.body}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function CommunityHub({ productId, productName }) {
  const { user, openAuthModal } = useStore()
  const [activeTab, setActiveTab]   = useState('reviews')
  const [posts, setPosts]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [newPost, setNewPost]       = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('community_posts')
      .select(`*, community_comments(count)`)
      .eq('product_id', productId)
      .eq('tab', activeTab)
      .order('created_at', { ascending: false })

    setPosts((data || []).map(p => ({
      ...p,
      comment_count: p.community_comments?.[0]?.count ?? 0,
    })))
    setLoading(false)
  }, [productId, activeTab])

  useEffect(() => { loadPosts() }, [loadPosts])

  const handlePost = async () => {
    if (!user) { setShowAuthModal(true); return }
    if (!newPost.trim()) return
    setSubmitting(true)
    await supabase.from('community_posts').insert({
      product_id:  productId,
      user_id:     user.id,
      author_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      tab:         activeTab,
      body:        newPost.trim(),
    })
    setNewPost('')
    setShowCompose(false)
    await loadPosts()
    setSubmitting(false)
  }

  const handleDeletePost = async (postId) => {
    await supabase.from('community_posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const handleAuthRequired = () => setShowAuthModal(true)

  return (
    <section>
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          hint="Sign in to join the conversation."
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <MessageSquare size={15} className="text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-tight">Community</h2>
        </div>
        <button
          onClick={() => user ? setShowCompose(v => !v) : setShowAuthModal(true)}
          className="text-[11px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-3 py-1.5 transition-all"
        >
          Create Post
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
              activeTab === key
                ? 'bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Compose */}
      {showCompose && (
        <div className="mb-4 bg-slate-900/40 border border-slate-800/30 rounded-xl p-4">
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder={`Share your thoughts on the ${productName}...`}
            rows={3}
            className="w-full bg-slate-950/60 border border-slate-800/40 rounded-lg px-3.5 py-2.5 text-[12.5px] text-slate-200 font-light placeholder-slate-600 focus:outline-none focus:border-indigo-500/30 resize-none transition-colors"
          />
          <div className="flex justify-end mt-2.5 gap-2">
            <button
              onClick={() => { setShowCompose(false); setNewPost('') }}
              className="text-[11px] text-slate-500 hover:text-slate-300 px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={!newPost.trim() || submitting}
              className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-3.5 py-1.5 transition-all disabled:opacity-30"
            >
              {submitting ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
              Post
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={16} className="animate-spin text-slate-600" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-[12px] text-slate-600 font-light">No posts yet.</p>
          <button
            onClick={() => user ? setShowCompose(true) : setShowAuthModal(true)}
            className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Be the first to post
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {posts.map(post => {
            const isOwn = user?.id === post.user_id
            return (
              <div
                key={post.id}
                className="bg-slate-900/30 border border-slate-800/20 rounded-xl px-4 py-3 hover:border-slate-700/30 transition-all"
              >
                <div className="flex items-start gap-2.5">
                  <Avatar name={post.author_name} isYou={isOwn} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-300">{post.author_name}</span>
                      <span className="text-[10px] text-slate-700">{timeAgo(post.created_at)}</span>
                      {isOwn && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="ml-auto text-slate-700 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    <p className="text-[12px] text-slate-400 font-light leading-relaxed mt-1">
                      {post.body}
                    </p>
                    <CommentThread
                      post={post}
                      currentUser={user}
                      onAuthRequired={handleAuthRequired}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
