// Shared number formatter for kg and count values shown across the
// dashboard (BACKLOG #53/#54 et al.):
// - Thousands grouped with a narrow no-break space (U+202F), e.g. "25 798" --
//   the user reads German, and a comma-grouped "25,798" read as 25.798 kg.
// - At most one decimal place, and a trailing ".0" is dropped.
// - Never locale-dependent -- toLocaleString() follows whatever locale the
//   browser/OS happens to be set to, which is not guaranteed to be de-DE.
const THOUSANDS_SEPARATOR = ' '

export function formatNumber(value: number, decimals: 0 | 1 = 0): string {
  const factor = decimals === 1 ? 10 : 1
  const rounded = Math.round(value * factor) / factor
  const [intPart, fracPart] = Math.abs(rounded).toFixed(decimals).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR)
  const sign = rounded < 0 ? '-' : ''
  const decimalPart = fracPart && fracPart !== '0' ? `.${fracPart}` : ''
  return `${sign}${grouped}${decimalPart}`
}
