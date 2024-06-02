const core = require('@actions/core')
const {
  fetchPage,
  fetchSubjects,
  fetchTerms
} = require('./api')
const fs = require('fs/promises')
const { parse } = require('./parser')

const DATA_DIR = 'data'

async function pull () {
  core.info('Fetching available terms...')
  const terms = await fetchTerms()
  core.info(`Available terms: ${terms.map(it => it.name).join(', ')}.`)
  return Promise.all(terms.map(pullTerm))
}

async function pullTerm (term) {
  core.info(`Fetching subjects of term ${term.name}...`)
  const subjects = await fetchSubjects(term)
  core.info(`Fetched ${subjects.length} subjects.`)

  core.info(`Fetching pages of the ${subjects.length} subjects...`)
  const pages = await Promise.all(subjects.map(fetchPage))
  core.info(`Fetched ${pages.length} pages.`)

  await Promise.all(pages.map(async page => {
    const base = `${DATA_DIR}/${term.code}/`
    await fs.mkdir(base, { recursive: true })
    await fs.writeFile(`${base}/${page.name}.html`, page.html, { encoding: 'utf8' })
    core.info(`Pull: ${page.term.name}/${page.name}.`)
  }))

  return {
    ...term,
    subjects
  }
}

async function update (terms) {
  await Promise.all(terms.map(convertTerm))
}

async function convertTerm (term) {
  const subjects = await Promise.all(term.subjects.map(subject => convertSubject(term, subject)))

  const data = Object.fromEntries(subjects.map(subject => ([subject.name, subject.data])))
  const dataSlim = Object.fromEntries(subjects.map(subject => ([subject.name, subject.data.map(slimize)])))

  await fs.writeFile(`${DATA_DIR}/${term.code}.json`, JSON.stringify(data, null, 2))
  await fs.writeFile(`${DATA_DIR}/${term.code}-slim.json`, JSON.stringify(dataSlim, null, 2))

  core.info(`Update: ${term.name}`)
}

async function convertSubject (term, subject) {
  const base = `${DATA_DIR}/${term.code}/`

  const htmlPath = `${base}/${subject.name}.html`
  const html = await fs.readFile(htmlPath, { encoding: 'utf8' })
  const data = parse(html)

  return {
    ...subject,
    data
  }
}

/**
 * Slimize a course object.
 * @param {Course} courseObj
 * @returns {Object} Slimized course object.
 */
function slimize (courseObj) {
  return {
    subject: courseObj.subject,
    course: courseObj.course,
    name: courseObj.name,
    sections: courseObj.sections.map(section => ({
      code: section.code,
      number: section.number,
      schedules: section.schedules,
      instructors: section.instructors,
      assistants: section.assistants,
      venue: section.venue,
      quota: [section.quota, section.enroll, section.available, section.waitlist]
    }))
  }
}

async function run () {
  try {
    const terms = await pull()
    await update(terms)
  } catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
