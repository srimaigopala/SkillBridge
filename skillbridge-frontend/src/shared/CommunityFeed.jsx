import { Heart, LoaderCircle, MessageCircle, MessagesSquare, Pencil, Send, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Avatar, Card, EmptyState, ErrorBanner, Spinner, primaryButton, secondaryButton } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import { timeAgo } from '../lib/format.js'
import StudentProfileModal from './StudentProfileModal.jsx'

const PAGE_SIZE = 10
const roleLabel = { STUDENT: 'Student', RECRUITER: 'Recruiter', ADMIN: 'Admin' }

// Community feed. Students post, like and comment; admins can moderate.
export default function CommunityFeed() {
  const role = localStorage.getItem('skillbridgeRole')
  const canParticipate = role === 'STUDENT'

  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(0)
  const [last, setLast] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [openUserId, setOpenUserId] = useState(null)

  const loadPage = useCallback(async (pageNumber) => {
    const data = await api(`/api/posts?page=${pageNumber}&size=${PAGE_SIZE}`)
    setPosts((previous) => (pageNumber === 0 ? data.content : [...previous, ...data.content]))
    setPage(data.page)
    setLast(data.last)
  }, [])

  const reload = useCallback(async () => {
    setError('')
    try {
      await loadPage(0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [loadPage])

  useEffect(() => {
    reload()
  }, [reload])

  async function loadMore() {
    setLoadingMore(true)
    try {
      await loadPage(page + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  async function createPost(event) {
    event.preventDefault()
    if (!draft.trim()) return
    setPosting(true)
    setError('')
    try {
      const post = await api('/api/posts', { method: 'POST', body: { content: draft } })
      setPosts((previous) => [post, ...previous])
      setDraft('')
    } catch (err) {
      setError(err.message)
    } finally {
      setPosting(false)
    }
  }

  function replacePost(updated) {
    setPosts((previous) => previous.map((post) => (post.id === updated.id ? { ...post, ...updated } : post)))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {canParticipate ? (
        <Card>
          <form onSubmit={createPost}>
            <label htmlFor="new-post" className="text-sm font-bold">
              Share something with the community
            </label>
            <textarea
              id="new-post"
              rows={3}
              maxLength={3000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="An internship win, a project you shipped, a question for peers..."
              className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">{draft.length}/3000</span>
              <button type="submit" disabled={posting || !draft.trim()} className={primaryButton}>
                {posting ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                Post
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {role === 'ADMIN'
            ? 'You are viewing the student community as an admin. You can remove posts and comments that break the rules.'
            : 'The community feed is where students share updates. You can read along.'}
        </p>
      )}

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <Card>
          <Spinner label="Loading the feed..." />
        </Card>
      ) : posts.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessagesSquare}
            title="No posts yet"
            text={canParticipate ? 'Be the first to share something with your peers.' : 'Posts from students will appear here.'}
          />
        </Card>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canParticipate={canParticipate}
              onChange={replacePost}
              onDeleted={() => setPosts((previous) => previous.filter((item) => item.id !== post.id))}
              onError={setError}
              onOpenAuthor={(author) => author.role === 'STUDENT' && setOpenUserId(author.id)}
            />
          ))}
          {!last && (
            <div className="text-center">
              <button type="button" onClick={loadMore} disabled={loadingMore} className={secondaryButton}>
                {loadingMore ? 'Loading...' : 'Load older posts'}
              </button>
            </div>
          )}
        </>
      )}

      {openUserId && <StudentProfileModal userId={openUserId} onClose={() => setOpenUserId(null)} />}
    </div>
  )
}

function PostCard({ post, canParticipate, onChange, onDeleted, onError, onOpenAuthor }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.content)
  const [busy, setBusy] = useState(false)
  const [showComments, setShowComments] = useState(false)

  const edited = post.updatedAt && post.createdAt && new Date(post.updatedAt) - new Date(post.createdAt) > 1000

  async function toggleLike() {
    // Optimistic update, corrected by the server's count
    const liked = !post.likedByMe
    onChange({ id: post.id, likedByMe: liked, likeCount: post.likeCount + (liked ? 1 : -1) })
    try {
      const result = await api(`/api/posts/${post.id}/like`, { method: liked ? 'POST' : 'DELETE' })
      onChange({ id: post.id, likedByMe: result.liked, likeCount: result.likeCount })
    } catch (err) {
      onChange({ id: post.id, likedByMe: post.likedByMe, likeCount: post.likeCount })
      onError(err.message)
    }
  }

  async function saveEdit() {
    if (!editText.trim()) return
    setBusy(true)
    try {
      onChange(await api(`/api/posts/${post.id}`, { method: 'PUT', body: { content: editText } }))
      setEditing(false)
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this post and its comments?')) return
    setBusy(true)
    try {
      await api(`/api/posts/${post.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (err) {
      onError(err.message)
      setBusy(false)
    }
  }

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <header className="flex items-start gap-3">
        <Avatar name={post.author.name} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpenAuthor(post.author)}
            className={`font-bold ${post.author.role === 'STUDENT' ? 'hover:text-blue-700 hover:underline' : 'cursor-default'}`}
          >
            {post.author.name}
          </button>
          <p className="text-xs text-slate-400">
            {roleLabel[post.author.role] || post.author.role} · {timeAgo(post.createdAt)}
            {edited && ' · edited'}
          </p>
        </div>
        <div className="flex gap-1">
          {post.canEdit && !editing && (
            <button
              type="button"
              aria-label="Edit post"
              onClick={() => {
                setEditText(post.content)
                setEditing(true)
              }}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <Pencil size={16} />
            </button>
          )}
          {post.canDelete && (
            <button
              type="button"
              aria-label="Delete post"
              disabled={busy}
              onClick={remove}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </header>

      {editing ? (
        <div className="mt-4">
          <textarea
            rows={4}
            maxLength={3000}
            value={editText}
            onChange={(event) => setEditText(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className={secondaryButton}>
              Cancel
            </button>
            <button type="button" onClick={saveEdit} disabled={busy || !editText.trim()} className={primaryButton}>
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{post.content}</p>
      )}

      <footer className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={toggleLike}
          disabled={!canParticipate}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-default ${
            post.likedByMe ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:bg-slate-100'
          } disabled:hover:bg-transparent`}
        >
          <Heart size={17} className={post.likedByMe ? 'fill-current' : ''} />
          {post.likeCount}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
        >
          <MessageCircle size={17} />
          {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </button>
      </footer>

      {showComments && (
        <Comments
          postId={post.id}
          canParticipate={canParticipate}
          onCountChange={(delta) => onChange({ id: post.id, commentCount: post.commentCount + delta })}
          onOpenAuthor={onOpenAuthor}
        />
      )}
    </article>
  )
}

function Comments({ postId, canParticipate, onCountChange, onOpenAuthor }) {
  const [comments, setComments] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/api/posts/${postId}/comments`)
      .then(setComments)
      .catch((err) => {
        setComments([])
        setError(err.message)
      })
  }, [postId])

  async function send(event) {
    event.preventDefault()
    if (!draft.trim()) return
    setSending(true)
    setError('')
    try {
      const comment = await api(`/api/posts/${postId}/comments`, { method: 'POST', body: { content: draft } })
      setComments((previous) => [...previous, comment])
      setDraft('')
      onCountChange(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function remove(commentId) {
    try {
      await api(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE' })
      setComments((previous) => previous.filter((comment) => comment.id !== commentId))
      onCountChange(-1)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-4">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {comments === null ? (
        <p className="text-xs text-slate-400">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-400">No comments yet.</p>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-2.5">
            <Avatar name={comment.author.name} size="sm" />
            <div className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuthor(comment.author)}
                  className="text-xs font-bold hover:underline"
                >
                  {comment.author.name}
                </button>
                <span className="flex items-center gap-2 text-[11px] text-slate-400">
                  {timeAgo(comment.createdAt)}
                  {comment.canDelete && (
                    <button type="button" aria-label="Delete comment" onClick={() => remove(comment.id)} className="hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  )}
                </span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700">{comment.content}</p>
            </div>
          </div>
        ))
      )}

      {canParticipate && (
        <form onSubmit={send} className="flex gap-2 pt-1">
          <input
            value={draft}
            maxLength={1000}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a comment..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button type="submit" disabled={sending || !draft.trim()} className="rounded-xl bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50" aria-label="Send comment">
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  )
}
