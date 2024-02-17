const axios = require('axios')
const axiosRetry = require('axios-retry')
const { parse } = require('node-html-parser')

const base = 'https://w5.ab.ust.hk/wcq/cgi-bin'

const client = axios.create()
axiosRetry.default(client, {
  retries: 30,
  retryDelay: axiosRetry.exponentialDelay
})

/**
 * Parse term code to human-readable format.
 * @param {string} code Term code.
 * @returns {string} Human-readable term.
 */
function parseTerm (code) {
  const SEASON_MAP = {
    10: 'Fall',
    20: 'Winter',
    30: 'Spring',
    40: 'Summer'
  }

  const suffix = parseInt(code.slice(0, 2), 10)
  const year = `20${suffix}-${suffix + 1}`

  const season = SEASON_MAP[code.slice(2, 4)]

  return `${year} ${season}`
}

async function fetchTerm () {
  const response = await client.get(`${base}/`, {
    validateStatus: status => status === 302,
    maxRedirects: 0
  })
  const location = response.headers.location
  const code = new URL(location, base).pathname.split('/')[3]
  const name = parseTerm(code)
  return {
    code,
    name
  }
}

async function fetchSubjects (term) {
  const response = await client.get(`${base}/${term}/`)
  const html = response.data
  const root = parse(html)
  const subjectElements = root.querySelectorAll('.depts > a')
  return subjectElements.map(element => ({
    name: element.text,
    term,
    url: new URL(element.getAttribute('href'), base).href
  }))
}

async function fetchPage (subject) {
  const response = await client.get(subject.url)
  const html = response.data
  return {
    name: subject.name,
    term: subject.term,
    html
  }
}

module.exports = {
  fetchTerm,
  fetchSubjects,
  fetchPage
}
