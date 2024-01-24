const actionsHttpClient = require('@actions/http-client')
const { parse } = require('node-html-parser')

const base = 'https://w5.ab.ust.hk/wcq/cgi-bin'

const client = new actionsHttpClient.HttpClient(undefined, undefined, {
  allowRedirects: false
})

async function fetchTerm() {
  const response = await client.get(`${base}/`)
  const location = response.message.headers.location
  return new URL(location, base).pathname.split('/')[3]
}

async function fetchSubjects(term) {
  const response = await client.get(`${base}/${term}/`)
  const html = await response.readBody()
  const root = parse(html)
  const subjectElements = root.querySelectorAll('.depts > a')
  return subjectElements.map(element => ({
    name: element.text,
    term,
    url: new URL(element.getAttribute('href'), base).href
  }))
}

async function fetchPage(subject) {
  const response = await client.get(subject.url)
  const html = await response.readBody()
  return {
    name: subject.name,
    term: subject.term,
    html
  }
}

module.exports = {
  fetchCurrentTerm: fetchTerm,
  fetchSubjects,
  fetchPage
}
