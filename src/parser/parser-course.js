const { convertSections } = require('./parser-section')
const { parseTableList } = require('./utils')

/**
 * @typedef {Object} Course The object representing a course.
 *
 * @property {string} subject The program code. e.g. "ACCT"
 * @property {string} course The course code. e.g. "1010"
 * @property {string} name The course name. e.g. "Accounting, Business and Society"
 * @property {number} units The number of units. e.g. 3
 * @property {Object.<string, string>} info The course information.
 * @property {{description: string, title: string}[]} attrs The course attributes.
 * @property {Section[]} sections The course sections.
 */

/**
 * Converts a course HTML element to a course object.
 * @param {import('node-html-parser').HTMLElement} courseEl The course HTML element, usually belongs to the class `course`.
 * @returns {Course} The course object.
 */
function convertCourse (courseEl) {
  const title = parseHeading(courseEl.querySelector('h2'))
  const info = parseInfo(courseEl.querySelector('.courseattr'))
  const attrs = courseEl.querySelectorAll('.attrword').map(parseAttributes)
  const sections = convertSections(courseEl.querySelector('.sections'))
  return {
    ...title,
    info,
    attrs,
    sections
  }
}

/**
 * Parses the heading of a course.
 *
 * For example, given the heading "ACCT 1010 - Accounting, Business and Society (3 units)",
 * this function will return the following object:
 *
 * ```javascript
 * {
 *   subject: "ACCT",
 *   course: "1010",
 *   name: "Accounting, Business and Society",
 *   units: 3
 * }
 * ```
 *
 * @param {import('node-html-parser').HTMLElement} headingEl The heading element.
 * @returns {{subject: string, course: string, name: string, units: number}} The parsed heading.
 */
function parseHeading (headingEl) {
  const regex = /(\w+)\s+(\w+)\s+-\s+(.+)\s+\(([\d\\.]+)\s+units?\)/
  const heading = headingEl.text
  const match = heading.match(regex)
  if (match) {
    return {
      subject: match[1],
      course: match[2],
      name: match[3],
      units: parseFloat(match[4])
    }
  } else {
    throw new Error(`Invalid course string format: ${heading}.`)
  }
}

/**
 * Parses the course info element into an object.
 *
 * Course info is the popup window in the top right corner of a course, labelled "COURSE INFO".
 *
 * A typical course info elements contains:
 *
 * ###### ATTRIBUTES
 *  - Common Core (SA) for 36-credit program
 *  - Common Core (SA) for 30-credit program
 * ###### PRE-REQUISITE
 * a passing letter grade in LANG 1401 OR LANG 1402 OR LANG 1403 OR LANG 1404 OR LANG 1002 (prior to 2022-23)
 * ###### EXCLUSION
 * ACCT 2010, CORE 1310
 * ###### DESCRIPTION
 * Overview of accounting in business and social contexts; use of accounting information for accountability and decision-making in companies, non-profit organizations, and government; major elements of accounting, including assets, liabilities, revenues and expenses; discharge of accountability by companies through corporate social and environmental reports. The aim of this course is to make students aware of how accounting could be applicable to fundamental business transactions and ways to evaluate how businesses are operated.
 *
 * and this function will convert it to the following object:
 *
 * ```javascript
 * {
 *  ATTRIBUTES: "Common Core (SA) for 36-credit program\nCommon Core (SA) for 30-credit program",
 *  PRE-REQUISITE: "a passing letter grade in LANG 1401 OR LANG 1402 OR LANG 1403 OR LANG 1404 OR LANG 1002 (prior to 2022-23)",
 *  EXCLUSION: "ACCT 2010, CORE 1310",
 *  DESCRIPTION: "Overview of accounting in business and social contexts; use of accounting information for accountability and decision-making in companies, non-profit organizations, and government; major elements of accounting, including assets, liabilities, revenues and expenses; discharge of accountability by companies through corporate social and environmental reports. The aim of this course is to make students aware of how accounting could be applicable to fundamental business transactions and ways to evaluate how businesses are operated."
 * }
 * ```
 *
 * @param {import('node-html-parser').HTMLElement} infoEl The course info element, usually belongs to the class `courseattr`.
 * @returns {Object.<string, string>} The parsed course info.
 */
function parseInfo (infoEl) {
  const rows = infoEl.querySelectorAll('tr:not(tr tr)')
  const info = {}
  for (const row of rows) {
    const key = row
      .querySelector('th')
      .text
      .toLowerCase()
      .replaceAll(/\s+/g, '-')
    info[key] = parseInfoEntry(row.querySelector('td'))
  }
  return info
}

/**
 * Parses an info entry element into a string.
 *
 * An info entry element is a table cell element in the course info element.
 * It can contain multiple elements, such as text, tables, and others.
 * If the element is a table, it will be parsed using `parseTableList`.
 * Otherwise, the text content will be returned.
 * Note that empty text content will be ignored.
 *
 * @param {import('node-html-parser').HTMLElement} infoEntryEl The info entry element to parse.
 * @returns {string} The parsed info entry.
 */
function parseInfoEntry (infoEntryEl) {
  return infoEntryEl.childNodes
    .map(child => {
      switch (child.rawTagName) {
        case 'table':
          return parseTableList(child)
        default:
          return child.text.trim() !== '' ? child.text : null
      }
    })
    .filter(it => it !== null)
    .join('\n')
}

/**
 * Parses the attributes element into an object.
 *
 * Attributes are on the left of the course info, labelled with "[CC22]", "[4Y]", or others.
 *
 * Typical attributes are:
 *  - **[CC22]**: Students admitted from 2022
 *  - **[4Y]**: Students admitted before 2022
 *
 * and this function will convert them to the following objects:
 * ```javascript
 * {
 *  title: "[CC22]",
 *  description: "Students admitted from 2022"
 * }
 * ```
 * ```javascript
 * {
 *  title: "[4Y]",
 *  description: "Students admitted before 2022"
 * }
 * ```
 *
 * @param {import('node-html-parser').HTMLElement} attrEl The attributes element, usually belongs to class `attrword`.
 * @returns {{description: string, title: string}} The parsed attributes.
 */
function parseAttributes (attrEl) {
  return {
    title: attrEl.querySelector('span').text,
    description: attrEl.querySelector('div').text
  }
}

module.exports = {
  convertCourse
}
