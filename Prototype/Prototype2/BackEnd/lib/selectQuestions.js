// server/lib/selectQuestions.js
import Question from '../models/Question.js'

/**
 * Improved selection:
 * - extract tech terms by scanning a curated list (reliable)
 * - extract frequent words after stopword removal
 * - build candidate set, compute a simple relevance score, sort and return top n ids
 */
export async function selectQuestions(jobTitle = '', jobDescription = '', n = 10) {
  const text = `${jobTitle} ${jobDescription}`.toLowerCase()

  // Curated technical / skill tokens to prioritize (expand as you like)
  const TECH_TERMS = [
    'react', 'react.js', 'reactjs', 'angular', 'vue', 'vuejs',
    'javascript', 'js', 'typescript', 'ts', 'html', 'css', 'sass', 'less',
    'webpack', 'vite', 'rollup', 'babel', 'node', 'express',
    'performance', 'optimization', 'accessibility', 'a11y', 'wcag',
    'testing', 'unit', 'integration', 'jest', 'mocha',
    'ssr', 'ssg', 'server-side', 'server side', 'static site', 'docker',
    'kubernetes', 'aws', 'azure', 'gcp', 'cloud', 'git', 'github',
    'rest', 'graphql', 'api', 'typescript', 'redux', 'zustand', 'mobx'
  ]

  // Small stopword list (extend as needed)
  const STOPWORDS = new Set([
    'the','and','for','with','that','this','from','have','will','are','you','your',
    'our','we','a','an','to','of','in','on','as','is','be','by','or','it','at',
    'role','job','description','responsible','responsibilities','experience',
    'required','preferred','skills','knowledge'
  ])

  // Normalize text -> tokens
  const tokens = text
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'") // normalize quotes
    .replace(/[^a-z0-9._\s-]/g, ' ') // keep dots/underscores for react.js etc.
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)

  // Find tech terms that appear verbatim in text (high-signal)
  const detectedTech = new Set()
  for (const term of TECH_TERMS) {
    // check as whole word or substring for compound terms (react.js, server-side)
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (re.test(text)) detectedTech.add(term.replace('.', '').toLowerCase())
  }

  // Build frequency map for remaining tokens (filter stopwords & small tokens)
  const freq = new Map()
  for (const t of tokens) {
    const token = t.toLowerCase()
    if (STOPWORDS.has(token)) continue
    if (token.length <= 2) continue // skip very short tokens
    if (/^\d+$/.test(token)) continue
    // skip tokens that are pure punctuation or single letter
    freq.set(token, (freq.get(token) || 0) + 1)
  }

  // Build final keyword list:
  //  - all detected tech terms first
  //  - then top-frequency tokens (excluding things like "frontend" and "engineer" if you want)
  const freqSorted = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tok]) => tok)

  // Optional: deprioritize generic words like 'frontend' 'engineer' because they appear often but are low-signal
  const GENERIC = new Set(['frontend','engineer','developer','application','applications','web','site','sites','build','maintain'])

  const extraKeywords = freqSorted.filter((k) => !GENERIC.has(k))

  // final keyword array (de-duplicated)
  const keywords = Array.from(new Set([
    ...Array.from(detectedTech),
    ...extraKeywords
  ])).slice(0, 12) // keep a reasonable cap

  // Logging for debugging
  console.log('selectQuestions() detectedTech:', Array.from(detectedTech))
  console.log('selectQuestions() extra keywords:', extraKeywords.slice(0, 8))
  console.log('selectQuestions() final keywords:', keywords)

  // Build candidate query:
  // - questions with tags in keywords OR title/text contains any keyword
  const orClauses = []
  if (keywords.length) {
    orClauses.push({ question_tags: { $in: keywords } })
    for (const k of keywords) {
      // search in title or question_text (case-insensitive)
      orClauses.push({ question_title: { $regex: `\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, $options: 'i' } })
      orClauses.push({ question_text: { $regex: `\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, $options: 'i' } })
    }
  }

  // If no keywords, just return top-ranked fallback
  if (orClauses.length === 0) {
    const fallback = await Question.find({}).sort({ 'rank_key.0': -1 }).limit(n).lean()
    return fallback.map((r) => r.question_id)
  }

  // Fetch candidates (limit to say 200 so scoring is manageable)
  const candidates = await Question.find({ $or: orClauses }).limit(200).lean()

  // Score candidates:
  // weight: tag match = 5, title matches = 3 per keyword, text matches = 1 per keyword
  const kwSet = new Set(keywords)
  const scored = candidates.map((doc) => {
    let score = 0
    // tag matches (high weight)
    if (Array.isArray(doc.question_tags)) {
      for (const t of doc.question_tags) {
        if (!t) continue
        if (kwSet.has(String(t).toLowerCase())) score += 5
      }
    }
    const title = String(doc.question_title || '').toLowerCase()
    const textField = String(doc.question_text || '').toLowerCase()
    for (const k of keywords) {
      if (title.includes(k)) score += 3
      if (textField.includes(k)) score += 1
    }
    // tie-breaker: keep original rank_key[0] (higher is better)
    const rankKey = (doc.rank_key && doc.rank_key[0]) ? Number(doc.rank_key[0]) : 0
    return { doc, score, rankKey }
  })

  // Sort by score desc, then rankKey desc
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (b.rankKey || 0) - (a.rankKey || 0)
  })

  // If not enough scored results, fetch fallback top-ranked questions excluding any already chosen
  let results = scored.map(s => s.doc)
  if (results.length < n) {
    const need = n - results.length
    const excludeIds = new Set(results.map(r => r.question_id))
    const fallback = await Question.find({ question_id: { $nin: Array.from(excludeIds) } })
      .sort({ 'rank_key.0': -1 })
      .limit(need)
      .lean()
    results = results.concat(fallback)
  }

  // Return question_id list limited to n
  const ids = results.slice(0, n).map(r => r.question_id)
  return ids
}
