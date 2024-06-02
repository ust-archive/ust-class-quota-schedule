const axios = require('axios')
const axiosRetry = require('axios-retry')
const { parse } = require('node-html-parser')
const beautify = require('js-beautify')

const BASE = 'https://w5.ab.ust.hk/wcq/cgi-bin'

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

/**
 * @typedef {Object} Term The term object.
 * @property {string} code Term code. (e.g., 2330)
 * @property {string} name Term name, human-readable. (e.g., 2023-24 Spring)
 */

/**
 * Fetch all available terms.
 * @returns {Promise<Term[]>} List of available terms.
 */
async function fetchTerms () {
  const response = await client.get(`${BASE}`)
  const html = response.data
  const root = parse(html)
  const termElements = root.querySelectorAll('#navigator > ul > li.term > div.termselect > a')
  return termElements.map(element => {
    const url = element.getAttribute('href')
    const code = new URL(url, BASE).pathname.split('/')[3]
    const name = parseTerm(code)
    return {
      code,
      name
    }
  })
}

/**
 * @typedef {Object} Subject The subject object, representing a subject for a given term.
 * @property {string} name Subject name. (e.g., COMP)
 * @property {Term} term Term object.
 * @property {string} url URL to the subject page
 */

/**
 * Fetch all subjects for a given term.
 * @param term {Term} The term object.
 * @returns {Promise<Subject[]>} List of subjects.
 */
async function fetchSubjects (term) {
  const response = await client.get(`${BASE}/${term.code}/`)
  const html = response.data
  const root = parse(html)
  const subjectElements = root.querySelectorAll('.depts > a')
  return subjectElements.map(element => ({
    name: element.text,
    term,
    url: new URL(element.getAttribute('href'), BASE).href
  }))
}

/**
 * @typedef {Object} SubjectPage The page object, representing a fetched subject page for a given term from a Subject object.
 * @property {string} name Subject name. (e.g., COMP)
 * @property {Term} term Term object.
 * @property {string} html HTML content of the page.
 */

const beautifyOptions = {
  indent_size: '1',
  indent_char: '\t',
  max_preserve_newlines: '-1',
  preserve_newlines: false,
  keep_array_indentation: false,
  break_chained_methods: false,
  indent_scripts: 'normal',
  brace_style: 'collapse',
  space_before_conditional: true,
  unescape_strings: false,
  jslint_happy: false,
  end_with_newline: false,
  wrap_line_length: '0',
  indent_inner_html: false,
  comma_first: false,
  e4x: false,
  indent_empty_lines: false
}

/**
 * Fetch a page for a given subject of a given term.
 * @param subject {Subject} The subject object
 * @returns {Promise<SubjectPage>} The page object.
 */
async function fetchPage (subject) {
  const response = await client.get(subject.url)
  const html = response.data
  return {
    name: subject.name,
    term: subject.term,
    html: beautify.html(html, beautifyOptions)
  }
}

module.exports = {
  fetchTerms,
  fetchSubjects,
  fetchPage
}
