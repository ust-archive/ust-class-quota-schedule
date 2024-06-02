/* eslint-disable no-labels */
const { tabletojson } = require('tabletojson')

function toTitleCase (str) {
  return str.replace(
    /\w*/g,
    function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    }
  )
}

function br2nl (str) {
  return str.replace(/<br\s*\/?>/mg, '\n')
}

/**
 * Parses a table element that acts as a list into a list of items.
 *
 * For example, given the following HTML:
 * ```html
 * <table style="border:0px;">
 *   <tbody>
 *     <tr>
 *       <td>1.</td>
 *       <td>Describe the background of development of corporate governance, and its importance to the sustainability of
 *         businesses by way of protecting stakeholders’ interests.</td>
 *     </tr>
 *     <tr>
 *       <td>2.</td>
 *       <td>Explain the objectives and roles of directors, accountants and other responsible persons in the corporate
 *         governance system, and how stakeholders’ interests can be protected under different corporate governance
 *         theories and models.</td>
 *     </tr>
 *     <tr>
 *       <td>3.</td>
 *       <td>Comply with the legal and regulatory framework for governance of companies in Hong Kong, while acknowledging
 *         recent developments in China and other countries.</td>
 *     </tr>
 *     <tr>
 *       <td>4.</td>
 *       <td>Promulgate corporate governance principles and best practice.</td>
 *     </tr>
 *     <tr>
 *       <td>5.</td>
 *       <td>Apply probity and ethical standards in governance.</td>
 *     </tr>
 *     <tr>
 *       <td>6.</td>
 *       <td>Assert the value and importance of internal control functions and risk management to sound corporate
 *         governance.</td>
 *     </tr>
 *     <tr>
 *       <td>7.</td>
 *       <td>Explain corporate social responsibility and its emerging importance to modern businesses, and recent
 *         developments in related corporate governance practice.</td>
 *     </tr>
 *   </tbody>
 * </table>
 * ```
 * This function will return the following string:
 * ```
 * On successful completion of the course, students will be able to:
 * 1. Describe the background of development of corporate governance, and its importance to the sustainability of businesses by way of protecting stakeholders’ interests.
 * 2. Explain the objectives and roles of directors, accountants and other responsible persons in the corporate governance system, and how stakeholders’ interests can be protected under different corporate governance theories and models.
 * 3. Comply with the legal and regulatory framework for governance of companies in Hong Kong, while acknowledging recent developments in China and other countries.
 * 4. Promulgate corporate governance principles and best practice.
 * 5. Apply probity and ethical standards in governance.
 * 6. Assert the value and importance of internal control functions and risk management to sound corporate governance.
 * 7. Explain corporate social responsibility and its emerging importance to modern businesses, and recent developments in related corporate governance practice.
 * ```
 *
 * @param tableEl The table element to parse.
 * @returns {string} The parsed list.
 */
function parseTableList (tableEl) {
  const [table] = tabletojson.convert(tableEl.outerHTML)
  return table.map(row => Object.values(row).join(' ')).join('\n')
}

module.exports = {
  toTitleCase,
  br2nl,
  parseTableList
}
