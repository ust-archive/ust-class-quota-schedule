const { parse: parseHtml } = require('node-html-parser')
const { convertCourse } = require('./parser-course')

/**
 * Parses the HTML of a page for a subject to a list of courses.
 * @param {string} html The HTML of the page for a subject.
 * @returns {Course[]} The list of subjects.
 */
function parse (html) {
  return parseHtml(html)
    .querySelectorAll('.course')
    .map(convertCourse)
}

module.exports = {
  parse
}
