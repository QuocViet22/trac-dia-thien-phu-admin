export const PICKER_LIMIT = 20

export interface Candidate {
  id: string
  name: string
}

export function pickCandidates(
  candidates: Candidate[],
  query: string,
): { visible: Candidate[]; matchedCount: number } {
  const keyword = query.trim().toLowerCase()
  const matched =
    keyword === '' ? candidates : candidates.filter((c) => c.name.toLowerCase().includes(keyword))
  return { visible: matched.slice(0, PICKER_LIMIT), matchedCount: matched.length }
}
