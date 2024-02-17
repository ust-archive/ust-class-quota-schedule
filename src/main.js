const core = require('@actions/core')
const { fetchPage, fetchSubjects, fetchTerm } = require('./api')
const fs = require('fs/promises')
const { convert } = require('./parse')
const path = require('path')

const DATA_DIR = 'data'

async function pull () {
  core.info('Fetching the current term...')
  const termObj = await fetchTerm()
  const term = termObj.code
  core.info(`Fetched the current term: ${termObj.name}.`)

  core.info('Fetching subjects...')
  const subjects = await fetchSubjects(term)
  core.info(`Fetched ${subjects.length} subjects.`)

  core.info(`Fetching ${subjects.length} pages...`)
  const pages = await Promise.all(subjects.map(fetchPage))
  core.info(`Fetched ${pages.length} page.`)

  await Promise.all(
    pages.map(async page => {
      const base = `${DATA_DIR}/${termObj.name}/`
      try {
        await fs.access(base)
      } catch (e) {
        await fs.mkdir(base, { recursive: true })
      }
      await fs.writeFile(`${base}/${page.name}.html`, page.html)
      core.info(`Written src: ${page.term}/${page.name}.`)
    })
  )
  await fs.writeFile(`${DATA_DIR}/current-term.txt`, termObj.name)

  return [termObj, pages]
}

function slimize (courseObj) {
  return {
    program: courseObj.program,
    code: courseObj.code,
    name: courseObj.name,
    units: courseObj.units,
    description: courseObj.info.description,
    sections: courseObj.sections.map(section => ({
      section: section.section,
      number: section.number,
      schedule: section.schedule,
      instructors: section.instructors,
      room: section.room,
      quota: [
        section.quota,
        section.enroll,
        section.available,
        section.waitlist
      ]
    }))
  }
}

async function run () {
  try {
    const [term, pages] = await pull()

    core.info(`Converting ${pages.length} pages.`)
    const data = pages.map(page => ({
      name: page.name,
      term: page.term,
      data: convert(page.html)
    }))
    core.info(`Converted ${data.length} pages.`)

    await fs.mkdir(DATA_DIR, { recursive: true })

    const jsonObj = Object.fromEntries(
      data.map(datum => [datum.name, datum.data])
    )
    await fs.writeFile(
      path.join(DATA_DIR, `${term.name}.json`),
      JSON.stringify(jsonObj, null, 2)
    )

    const slimJsonObj = Object.fromEntries(
      data.map(datum => [datum.name, datum.data.map(slimize)])
    )
    await fs.writeFile(
      path.join(DATA_DIR, `${term.name} Slim.json`),
      JSON.stringify(slimJsonObj, null, 2)
    )
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
