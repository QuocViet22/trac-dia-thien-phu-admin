export const BRANDS: string[] = [
  'TALKPOD',
  'CEM',
  'PRECISE',
  'JBL',
  'WILAD',
  'YAMAYO',
  'ESURVEY',
  'CHC',
  'Satlab - Thụy Điển',
  'Hi-Target',
  'CHCNAV',
  'Meridian',
  'GPI- Taiwan',
  'Nikon-Trimble',
  'Topcon-Sokkia',
  'SINCON',
  'SNDWAY',
  'LAISAI',
  'FUKUDA',
  'Garmin',
  'Montana',
  'Pentax',
  'NIKON',
  'LEICA',
  'TCL',
  'TOPCON',
  'SOKKIA',
]

export function normalizeBrand(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function matchesBrand(brand: string, query: string): boolean {
  const q = normalizeBrand(query.trim())
  if (!q) return true
  return normalizeBrand(brand).includes(q)
}
