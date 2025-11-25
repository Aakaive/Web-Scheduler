const PALETTE = [
  '#ec4899',
  '#3b82f6',
  '#22c55e',
  '#a855f7',
  '#f97316',
  '#0ea5e9',
  '#facc15',
  '#14b8a6',
  '#6366f1',
  '#ef4444',
]

export const getCategoryColor = (categoryId: number | null | undefined) => {
  if (categoryId === null || categoryId === undefined) {
    return '#94a3b8'
  }
  const index = Math.abs(Number(categoryId)) % PALETTE.length
  return PALETTE[index]
}

