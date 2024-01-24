const core = require('@actions/core')
const { fetchPage, fetchSubjects, fetchCurrentTerm } = require('./api')
const fs = require('fs/promises')

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
    core.info(JSON.stringify(subjects, null, 2))

    core.info(`Fetching ${subjects.length} pages...`)
    const pages = await Promise.all(subjects.map(fetchPage))
    core.info(`Fetched ${pages.length} page.`)

    await Promise.all(
      pages.map(async page => {
        const base = `pages/${page.term}`
        try {
          await fs.access(base)
        } catch (e) {
          await fs.mkdir(base, { recursive: true })
        }
        await fs.writeFile(`${base}/${page.name}.html`, page.html)
        core.info(`Written page: ${page.term}/${page.name}.`)
      })
    )
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
