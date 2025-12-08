export type InterviewStatus = 'scheduled' | 'in-progress' | 'completed'

export type InterviewItem = {
  id: string
  title: string
  company: string
  role: string
  date: string
  status: InterviewStatus
}

const KEY = 'demo_interviews_v1'

export function readInterviews(): InterviewItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as InterviewItem[]) : []
  } catch {
    return []
  }
}

export function writeInterviews(items: InterviewItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export function addInterview(item: Omit<InterviewItem, 'id' | 'status'> & { id?: string; status?: InterviewStatus }) {
  const list = readInterviews()
  const id = item.id ?? crypto.randomUUID()
  const status = item.status ?? 'scheduled'
  const next: InterviewItem = { id, status, ...item }
  writeInterviews([next, ...list])
  return next
}

export function updateInterview(id: string, patch: Partial<InterviewItem>) {
  const list = readInterviews()
  const next = list.map((it) => (it.id === id ? { ...it, ...patch } : it))
  writeInterviews(next)
}

export function getInterview(id: string) {
  return readInterviews().find((it) => it.id === id) || null
}
