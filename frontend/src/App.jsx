import React, { useState, useEffect } from 'react'

const API_BASE = '/api'

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const PRIORITY_BADGE = {
  high: {
    label: 'High',
    classes: 'bg-red-100 text-red-700 border border-red-200',
    dot: 'bg-red-500',
  },
  medium: {
    label: 'Medium',
    classes: 'bg-orange-100 text-orange-700 border border-orange-200',
    dot: 'bg-orange-400',
  },
  low: {
    label: 'Low',
    classes: 'bg-gray-100 text-gray-500 border border-gray-200',
    dot: 'bg-gray-400',
  },
}

// ── PriorityBadge ─────────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.medium
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── PrioritySelect ────────────────────────────────────────────────────────────

function PrioritySelect({ value, onChange, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white ${className}`}
    >
      <option value="high">High priority</option>
      <option value="medium">Medium priority</option>
      <option value="low">Low priority</option>
    </select>
  )
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ task, onToggle, onEdit, onDelete }) {
  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-md p-4 flex items-start gap-4 ${
        task.completed ? 'border-gray-100 opacity-60' : 'border-gray-200'
      }`}
    >
      {/* Circular checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors duration-200 ${
          task.completed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-blue-400'
        }`}
        title={task.completed ? 'Mark as pending' : 'Mark as done'}
      >
        {task.completed && <span className="text-xs leading-none">✓</span>}
      </button>

      {/* Task content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <h3
            className={`font-medium ${
              task.completed ? 'line-through text-gray-400' : 'text-gray-800'
            }`}
          >
            {task.title}
          </h3>
          <PriorityBadge priority={task.priority} />
        </div>
        {task.description && (
          <p className="text-sm text-gray-500 mt-0.5 break-words">{task.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {new Date(task.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit({ ...task })}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
          title="Edit task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          title="Delete task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [healthStatus, setHealthStatus] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [filterPriority, setFilterPriority] = useState(null) // null = All
  const [sortByPriority, setSortByPriority] = useState(false)

  useEffect(() => {
    fetchTasks()
    fetchHealth()
  }, [])

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`)
      setHealthStatus(await res.json())
    } catch (err) {
      console.error('Health check failed:', err)
    }
  }

  const fetchTasks = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/tasks`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      setTasks(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createTask = async (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      })
      if (!res.ok) throw new Error('Failed to create task')
      setNewTask({ title: '', description: '', priority: 'medium' })
      await fetchTasks()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/toggle`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed to toggle task')
      await fetchTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editingTask.title.trim()) return
    try {
      const res = await fetch(`${API_BASE}/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTask.title,
          description: editingTask.description,
          priority: editingTask.priority,
        }),
      })
      if (!res.ok) throw new Error('Failed to update task')
      setEditingTask(null)
      await fetchTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete task')
      setDeleteConfirm(null)
      await fetchTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  // Apply filter + sort, then split into pending / done
  const processedTasks = tasks
    .filter((t) => filterPriority === null || t.priority === filterPriority)
    .sort((a, b) => {
      // Always keep completed at the bottom
      if (a.completed !== b.completed) return a.completed - b.completed
      // Within same completion group, optionally sort by priority
      if (sortByPriority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      return 0
    })

  const pendingTasks = processedTasks.filter((t) => !t.completed)
  const doneTasks = processedTasks.filter((t) => t.completed)

  const filterButtons = [
    { label: 'All', value: null },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Task Manager</h1>
            <p className="text-blue-200 text-sm">v1.1.0</p>
          </div>
          {healthStatus && (
            <div className="text-right text-sm">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  healthStatus.database_status === 'connected'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                DB {healthStatus.database_status}
              </span>
              <p className="text-blue-200 mt-1 capitalize">{healthStatus.environment}</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Error banner ── */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Create task form ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-700 mb-4">New Task</h2>
          <form onSubmit={createTask} className="space-y-3">
            <input
              type="text"
              placeholder="Task title *"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
              rows={2}
            />
            <div className="flex items-center gap-3">
              <PrioritySelect
                value={newTask.priority}
                onChange={(val) => setNewTask({ ...newTask, priority: val })}
              />
              <button
                type="submit"
                disabled={submitting || !newTask.title.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Task
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Filter & sort bar ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Priority filter buttons */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {filterButtons.map(({ label, value }) => {
              const active = filterPriority === value
              let activeClass = 'bg-blue-600 text-white shadow-sm'
              if (value === 'high') activeClass = 'bg-red-500 text-white shadow-sm'
              if (value === 'medium') activeClass = 'bg-orange-400 text-white shadow-sm'
              if (value === 'low') activeClass = 'bg-gray-400 text-white shadow-sm'

              return (
                <button
                  key={label}
                  onClick={() => setFilterPriority(value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                    active ? activeClass : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Sort by priority toggle */}
          <button
            onClick={() => setSortByPriority((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
              sortByPriority
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
            </svg>
            Sort by priority
          </button>

          {/* Stats */}
          <div className="ml-auto flex gap-2">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {pendingTasks.length} pending
            </span>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {doneTasks.length} done
            </span>
          </div>
        </div>

        {/* ── Task list ── */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="animate-spin w-8 h-8 mx-auto mb-3 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p className="text-sm">Loading tasks...</p>
          </div>
        ) : processedTasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-medium text-gray-500">
              {filterPriority ? `No ${filterPriority} priority tasks` : 'No tasks yet'}
            </p>
            <p className="text-sm mt-1">
              {filterPriority ? 'Try a different filter.' : 'Create your first task above!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} onEdit={setEditingTask} onDelete={setDeleteConfirm} />
            ))}

            {pendingTasks.length > 0 && doneTasks.length > 0 && (
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Completed</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
            )}

            {doneTasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} onEdit={setEditingTask} onDelete={setDeleteConfirm} />
            ))}
          </div>
        )}
      </main>

      {/* ── Edit modal ── */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Task</h3>
            <form onSubmit={saveEdit} className="space-y-3">
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
                autoFocus
              />
              <textarea
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                placeholder="Description (optional)"
                rows={3}
              />
              <PrioritySelect
                value={editingTask.priority}
                onChange={(val) => setEditingTask({ ...editingTask, priority: val })}
                className="w-full"
              />
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Task?</h3>
            <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteTask(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
