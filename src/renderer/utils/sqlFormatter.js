const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'INNER JOIN', 'LEFT JOIN',
  'RIGHT JOIN', 'FULL JOIN', 'JOIN', 'ON', 'UNION', 'UNION ALL', 'WITH', 'AS',
  'AND', 'OR', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DISTINCT', 'BY', 'IN',
  'IS', 'NULL', 'NOT', 'LIKE', 'BETWEEN', 'EXISTS', 'CREATE', 'ALTER', 'DROP'
]

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeWhitespace(sql = '') {
  return sql
    .replace(/\r\n/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ') ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim()
}

export function minifySql(sql = '') {
  return normalizeWhitespace(sql)
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function transformSqlKeywords(sql = '', mode = 'upper') {
  let nextSql = sql

  KEYWORDS
    .slice()
    .sort((a, b) => b.length - a.length)
    .forEach((keyword) => {
      const pattern = new RegExp(`\\b${escapeRegExp(keyword).replace(/\s+/g, '\\s+')}\\b`, 'gi')
      nextSql = nextSql.replace(pattern, mode === 'lower' ? keyword.toLowerCase() : keyword.toUpperCase())
    })

  return nextSql
}

export function formatSql(sql = '') {
  let nextSql = minifySql(transformSqlKeywords(sql, 'upper'))

  const breakBefore = [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
    'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'INNER JOIN', 'LEFT JOIN',
    'RIGHT JOIN', 'FULL JOIN', 'JOIN', 'ON', 'UNION ALL', 'UNION', 'WITH'
  ]

  breakBefore.forEach((keyword) => {
    const pattern = new RegExp(`\\s*\\b${escapeRegExp(keyword).replace(/\s+/g, '\\s+')}\\b`, 'g')
    nextSql = nextSql.replace(pattern, `\n${keyword}`)
  })

  nextSql = nextSql
    .replace(/\nSELECT\s+/g, '\nSELECT\n  ')
    .replace(/,\s+/g, ',\n  ')
    .replace(/\nFROM\s+/g, '\nFROM\n  ')
    .replace(/\nWHERE\s+/g, '\nWHERE\n  ')
    .replace(/\n(AND|OR)\s+/g, '\n  $1 ')
    .replace(/\n(LEFT JOIN|RIGHT JOIN|INNER JOIN|FULL JOIN|JOIN)\s+/g, '\n$1\n  ')
    .replace(/\nON\s+/g, '\n  ON ')
    .replace(/\nORDER BY\s+/g, '\nORDER BY\n  ')
    .replace(/\nGROUP BY\s+/g, '\nGROUP BY\n  ')
    .replace(/\nHAVING\s+/g, '\nHAVING\n  ')
    .replace(/\nLIMIT\s+/g, '\nLIMIT ')
    .replace(/\nOFFSET\s+/g, '\nOFFSET ')
    .replace(/\nSET\s+/g, '\nSET\n  ')
    .replace(/\nVALUES\s*/g, '\nVALUES\n  ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim()

  return nextSql
}
