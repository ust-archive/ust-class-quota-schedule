/* eslint-disable dot-notation */
const { Locale } = require('@js-joda/locale_en-us')
const { parse } = require('node-html-parser')
const { tabletojson } = require('tabletojson')
const {
  DayOfWeek,
  LocalTime,
  DateTimeFormatter,
  LocalDate
} = require('@js-joda/core')
const {
  br2nl,
  toTitleCase
} = require('./utils')

/**
 * @typedef {Object} Section The object representing a section of a course.
 *
 * @property {string} code The section code. e.g. "L1"
 * @property {number} number The section number. e.g. "1023"
 * @property {string[]} remarks The remarks of the section. e.g. ["For MSc(ACCT) students only", "Add/Drop Deadline : 08-Apr-2024"]
 *
 * @property {string[]} instructors The instructor(s) of the section. e.g. ["Jane Doe", "Alice Smith"]
 * @property {string[]} assistants The assistant(s) of the section. e.g. ["Jane Doe", "Alice Smith"]
 * @property {string} venue The venue of the section. e.g. "Lecture Theatre A"
 *
 * @property {Object[]} schedules The schedules of the section.
 *
 * @property {number} quota The quota of the section. e.g. 100
 * @property {number} enroll The number of enrolled students. e.g. 80
 * @property {number} available The number of available slots. e.g. 20
 * @property {number} waitlist The number of students on the waitlist. e.g. 5
 *
 * @property {Object<string, {quota: number, enroll: number, available: number}>} quotaDetail The quota detail of the section.
 */

/**
 * Converts the section table element into an array of sections.
 * @param {import("node-html-parser").HTMLElement} sectionsEl The table element containing the sections of a course.
 * @returns {Section[]} The array of sections.
 */
function convertSections (sectionsEl) {
  const [sections] = tabletojson.convert(sectionsEl.outerHTML, { stripHtmlFromCells: false })
  return sections.map(convertSection)
}

/**
 * Converts a section object into a Section object.
 * @param sectionTableRowObj The object representing a row of a section table.
 * @returns {Section} The section object.
 */
function convertSection (sectionTableRowObj) {
  const section = parseSectionString(sectionTableRowObj['Section'])
  const remarks = convertRemarks(parse(sectionTableRowObj['Remarks']))

  const instructors = convertPeople(parse(sectionTableRowObj['Instructor']))
  const assistants = convertPeople(parse(sectionTableRowObj['TA/IA/GTA']))
  const venue = sectionTableRowObj['Room']

  const schedules = convertSchedule(sectionTableRowObj['Date & Time'])

  const quota = convertQuota(parse(sectionTableRowObj['Quota']))
  const enroll = parseInt(parse(sectionTableRowObj['Enrol']).text, 10)
  const available = parseInt(parse(sectionTableRowObj['Avail']).text, 10)
  const waitlist = parseInt(parse(sectionTableRowObj['Wait']).text, 10)

  const quotaDetail = convertQuotaDetail(parse(sectionTableRowObj['Quota']))

  return {
    ...section,
    remarks,

    instructors,
    assistants,
    venue,

    schedules,

    quota,
    enroll,
    available,
    waitlist,

    quotaDetail
  }
}

/**
 * Parses the section string into an object.
 *
 * A typical section string is like "L1 (1023)", and it will be parsed into:
 * ```js
 * {
 *  section: "L1",
 *  number: 1023
 * }
 * ```
 *
 * @param {string} section The section string.
 * @return {{code: string, number: number}} The parsed section object.
 */
function parseSectionString (section) {
  const regex = /(\w+)\s+\((\d+)\)/
  const match = section.match(regex)
  if (match) {
    return {
      code: match[1],
      number: parseInt(match[2], 10)
    }
  } else {
    throw new Error(`Invalid section string format: ${section}.`)
  }
}

/**
 * Parse Date & Time string into an object.
 *
 * There are 2 types of Data & Time string: one covers the whole semester and the other covers a specific date range.
 *
 * Example of the type covering the whole semester:
 * ```
 * WeFr 04:30PM - 05:50PM
 * ```
 * and it will be parsed into:
 * ```js
 * [
 *   {
 *     "day": "WEDNESDAY",
 *     "from": "16:30:00",
 *     "to": "17:50:00"
 *   },
 *   {
 *     "day": "FRIDAY",
 *     "from": "16:30:00",
 *     "to": "17:50:00"
 *   }
 * ]
 * ```
 *
 * Example of the type covering a specific date range:
 * ```
 * 17-JUN-2024 - 12-JUL-2024
 * MoWeFr 02:00PM - 05:50PM
 * ```
 * and it will be parsed into:
 * ```js
 * [
 *   {
 *     "fromDate": "2024-06-17",
 *     "toDate": "2024-07-12",
 *     "day": "MONDAY",
 *     "from": "14:00:00",
 *     "to": "17:50:00"
 *   },
 *   {
 *     "fromDate": "2024-06-17",
 *     "toDate": "2024-07-12",
 *     "day": "WEDNESDAY",
 *     "from": "14:00:00",
 *     "to": "17:50:00"
 *   },
 *   {
 *     "fromDate": "2024-06-17",
 *     "toDate": "2024-07-12",
 *     "day": "FRIDAY",
 *     "from": "14:00:00",
 *     "to": "17:50:00"
 *   }
 * ]
 *  ```
 *
 * @param {string} strDateTime the Date & Time string.
 * @return {{day: string, from: string, to: string, fromDate?: string, toDate?: string}[]} The array of parsed Date & Time objects.
 */
function convertSchedule (strDateTime) {
  if (strDateTime === 'TBA') return []

  strDateTime = br2nl(strDateTime)

  let dateRange
  // 17-JUN-2024 - 12-JUL-2024
  // MoWeFr 02:00PM - 05:50PM
  if (strDateTime.includes('\n')) {
    const parser = DateTimeFormatter.ofPattern('dd-MMM-yyyy').withLocale(Locale.ENGLISH)
    const [strDateRange, strSchedule] = strDateTime.split('\n')
    const [strStartDate, strEndDate] = strDateRange.split(' - ')
    const fromDate = LocalDate.parse(toTitleCase(strStartDate), parser).format(DateTimeFormatter.ISO_LOCAL_DATE)
    const toDate = LocalDate.parse(toTitleCase(strEndDate), parser).format(DateTimeFormatter.ISO_LOCAL_DATE)
    dateRange = {
      fromDate,
      toDate
    }
    strDateTime = strSchedule
  }

  const DAY_OF_WEEK = {
    Mo: DayOfWeek.MONDAY,
    Tu: DayOfWeek.TUESDAY,
    We: DayOfWeek.WEDNESDAY,
    Th: DayOfWeek.THURSDAY,
    Fr: DayOfWeek.FRIDAY,
    Sa: DayOfWeek.SATURDAY,
    Su: DayOfWeek.SUNDAY
  }
  const FORMATTER = DateTimeFormatter.ofPattern('hh:mma').withLocale(Locale.ENGLISH)

  const [strDays, strStart, strEnd] = strDateTime.split(/[\s-]+/)
  const days = strDays.match(/.{2}/g).map(s => DAY_OF_WEEK[s])
  const start = LocalTime.parse(strStart, FORMATTER)
  const end = LocalTime.parse(strEnd, FORMATTER)

  return days.map(day => ({
    ...dateRange,
    day: day.toString(),
    from: start.format(DateTimeFormatter.ISO_LOCAL_TIME),
    to: end.format(DateTimeFormatter.ISO_LOCAL_TIME)
  }))
}

/**
 * Converts a list of elements containing people into an array of their names.
 *
 * The elements are like:
 * ```html
 * <a href="/wcq/cgi-bin/2330/instructor/CHEUNG, Kwok Yip">CHEUNG, Kwok Yip</a>
 * ```
 * ```html
 * <a href="/wcq/cgi-bin/2330/instructor/DAI, Ting">DAI, Ting</a><br><a href="/wcq/cgi-bin/2330/instructor/DENG, Jin">DENG, Jin</a><br><a href="/wcq/cgi-bin/2330/instructor/YI, Yi">YI, Yi</a>
 * ```
 *
 * and they will be converted into an array of names, like:
 * ```js
 * ["CHEUNG, Kwok Yip"]
 * ```
 * ```js
 * ["DAI, Ting", "DENG, Jin", "YI, Yi"]
 * ```
 *
 * @param peopleEl The element containing people.
 * @returns {string[]} The array of names of the people.
 */
function convertPeople (peopleEl) {
  const instructors = peopleEl.querySelectorAll('a')
  if (instructors.length) {
    return instructors.map(a => a.text).filter(s => s !== '')
  } else {
    return [peopleEl.text]
  }
}

/**
 * Converts the remarks element into an array of remarks.
 *
 * A typical remark popup is like:
 * ```
 * > For MSc(ACCT) students only
 * > Add/Drop Deadline : 08-Apr-2024
 * ```
 * and it will be converted into:
 * ```js
 * [ "For MSc(ACCT) students only", "Add/Drop Deadline : 08-Apr-2024" ]
 * ```
 *
 * Another typical remark popup is like:
 * ```
 * Instructor Consent Required
 * ```
 * and it will be converted into:
 * ```js
 * [ "Instructor Consent Required" ]
 * ```
 *
 * A section may have more than one remark elements. In such case, the remarks will be concatenated.
 *
 * @param remarksEl the element cell in the "Remarks" column of the course table.
 * @returns {string[]} the array of remarks.
 */
function convertRemarks (remarksEl) {
  return remarksEl
    .querySelectorAll('.popup')
    .map(a => a.text)
    .flatMap(s => s.split(/\s*>\s*/))
    .filter(s => s !== '')
    .map(s => s.trim())
}

/**
 * Converts the quota element into a number of quota.
 *
 * This function exists because of the existence of quota detail.
 * If the quota element contains a quota detail, there will be extra elements in the quota element.
 *
 * @param quotaEl The quota element.
 * @returns {number} The number of quota.
 */
function convertQuota (quotaEl) {
  const detailEl = quotaEl.querySelector('.quotadetail')
  if (detailEl) {
    return parseInt(quotaEl.querySelector('> span').text, 10)
  } else {
    return parseInt(quotaEl.text, 10)
  }
}

/**
 * Converts the quota detail element into an object.
 *
 * The quota detail is the popup window on hovering the quota number (only if the quota number is underlined).
 *
 * A quota detail element is like:
 * ```
 * Quota/Enrol/Avail
 * Digital MBA: 17/14/3
 * MBA: 27/25/2
 * MBA Bi-weekly: 21/21/0
 * ```
 * and it will be converted into:
 * ```js
 * {
 *   'Digital MBA': {
 *     quota: 17,
 *     enroll: 14,
 *     available: 3
 *   },
 *   'MBA': {
 *     quota: 27,
 *     enroll: 25,
 *     available: 2
 *   },
 *   'MBA Bi-weekly': {
 *     quota: 21,
 *     enroll: 21,
 *     available: 0
 *   }
 * }
 * ```
 *
 * @param quotaEl The element containing the quota (not quota detail).
 * @returns {Object<string, {quota: number, enroll: number, available: number}>} The quota detail object.
 */
function convertQuotaDetail (quotaEl) {
  const detailEl = quotaEl.querySelector('.quotadetail')
  if (detailEl) {
    // Quota/Enrol/Avail
    // ACCT: 68/43/25
    const lines = detailEl.text.split('\n')
    const result = {}
    for (const line of lines.slice(1)) {
      if (line === '') continue
      const [category, numbers] = line.split(':')
      const [q, e, a] = numbers.split('/')
      result[category.trim()] = {
        quota: parseInt(q, 10),
        enroll: parseInt(e, 10),
        available: parseInt(a, 10)
      }
    }
    return result
  }
}

module.exports = {
  convertSections
}
