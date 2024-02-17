const core = require('@actions/core')
const { fetchPage, fetchSubjects, fetchCurrentTerm } = require('./api')
const fs = require('fs/promises')
const { convert } = require('./parse')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    core.info('Fetching current term...')
    const term = await fetchCurrentTerm()
    core.info(`Fetched current term: ${term}.`)

    core.info('Fetching subjects...')
    const subjects = await fetchSubjects(term)
    core.info(`Fetched ${subjects.length} subjects.`)

    core.info(`Fetching ${subjects.length} pages...`)
    const pages = await Promise.all(subjects.map(fetchPage))
    core.info(`Fetched ${pages.length} page.`)

    await Promise.all(
      pages.map(async page => {
        const base = `${page.term}/src`
        try {
          await fs.access(base)
        } catch (e) {
          await fs.mkdir(base, { recursive: true })
        }
        await fs.writeFile(`${base}/${page.name}.html`, page.html)
        core.info(`Written src: ${page.term}/${page.name}.`)
      })
    )

    core.info(`Converting ${pages.length} pages.`)
    const data = pages.map(page => ({
      name: page.name,
      term: page.term,
      data: convert(page.html)
    }))
    core.info(`Converted ${data.length} pages.`)

    await Promise.all(
      data.map(async datum => {
        const base = `${datum.term}`
        try {
          await fs.access(base)
        } catch (e) {
          await fs.mkdir(base, { recursive: true })
        }
        await fs.writeFile(
          `${base}/${datum.name}.json`,
          JSON.stringify(datum.data, null, 2)
        )
        core.info(`Written JSON: ${datum.term}/${datum.name}.`)
      })
    )
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
