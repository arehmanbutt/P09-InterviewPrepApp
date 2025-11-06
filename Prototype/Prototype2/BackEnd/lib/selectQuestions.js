import Question from '../models/Question.js'

/**
 * Select up to `n` question_ids relevant to jobTitle/description.
 * Strategy:
 *  - extract keywords (simple split) from jobTitle and description, search by tag or title regex
 *  - if insufficient results, append top-ranked global questions
 */
export async function selectQuestions(jobTitle = '', jobDescription = '', n = 10) {
    const keywords = (jobTitle + ' ' + jobDescription)
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 8) // up to 8 keywords

    console.log("Extracted keywords:", keywords);

    let results = []
    if (keywords.length) {
        const tagQuery = { $or: [] }
        const tagClauses = keywords.map(k => ({ question_tags: k }))
        const titleClauses = keywords.map(k => ({ question_title: { $regex: k, $options: 'i' } }))
        tagQuery.$or = [...tagClauses, ...titleClauses]

        results = await Question.find(tagQuery).limit(n).lean()
    }

    if (!results || results.length < n) {
        const need = n - (results ? results.length : 0)
        const excludeIds = (results || []).map(r => r.question_id)
        const fallback = await Question.find({ question_id: { $nin: excludeIds } })
        .sort({ 'rank_key.0': -1 })
        .limit(need)
        .lean()
        results = (results || []).concat(fallback)
    }

    // return only question_id list (ensure length <= n)
    const ids = results.slice(0, n).map(r => r.question_id)
    return ids
}
