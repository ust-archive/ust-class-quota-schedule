const { Locale } = require('@js-joda/locale_en-us')
const { parse } = require('node-html-parser')
const { tabletojson } = require('tabletojson')
const { DayOfWeek, LocalTime, DateTimeFormatter } = require('@js-joda/core')

function convert (pageHTML) {
  const root = parse(pageHTML)
  const courseElements = root.querySelectorAll('.course')
  return courseElements.map(convertCourse)
}

function convertCourse (courseEl) {
  const title = convertTitle(courseEl.querySelector('h2').text)
  const info = convertInfo(courseEl.querySelector('.courseattr'))
  const attrs = courseEl.querySelectorAll('.attrword').map(convertAttr)
  const sections = convertSections(courseEl.querySelector('.sections'))
  return {
    ...title,
    info,
    attrs,
    sections
  }
}

function convertTitle (title) {
  // ACCT 1010 - Accounting, Business and Society (3 units)
  // program: ACCT
  // code: 1010
  // name: Accounting, Business and Society
  // units: 3
  const regex = /(\w+)\s+(\w+)\s+-\s+(.+)\s+\((\d+)\s+units?\)/
  const match = title.match(regex)
  if (match) {
    return {
      program: match[1],
      code: match[2],
      name: match[3],
      units: parseInt(match[4], 10)
    }
  } else {
    throw new Error(`Invalid course string format: ${title}.`)
  }
}

function convertInfo (infoEl) {
  const rows = infoEl.querySelectorAll('tr:not(tr tr)')
  const data = {}
  for (const row of rows) {
    const key = row
      .querySelector('th')
      .text.toLowerCase()
      .replaceAll(/\s+/g, ' ')
    data[key] = row.querySelector('td').innerHTML
  }
  return data
}

function convertAttr (attrEl) {
  return {
    title: attrEl.querySelector('span').text,
    description: attrEl.querySelector('div').text
  }
}

/**
 * Parses section string (e.g., L1 (1023), LA1 (1979)) into an object.
 * @param {string} strSection
 * @return {{section: string, type: string}}
 */
function parseSection (strSection) {
  const regex = /(\w+)\s+\((\d+)\)/
  const match = strSection.match(regex)
  if (match) {
    return {
      section: match[1],
      number: parseInt(match[2], 10)
    }
  } else {
    throw new Error(`Invalid section string format: ${strSection}.`)
  }
}

/**
 * Parse Date & Time string (e.g., Tu 01:30PM - 03:20PM, WeFr 04:30PM - 05:20PM, MoWeFr 10:00AM - 10:50AM) into an object.
 * @param {string} strDateTime
 * @return {{day: string, start: string, end: string}[]}
 */
function parseDateTime (strDateTime) {
  try {
    if (strDateTime === 'TBA') return []

    const DAY_OF_WEEK = {
      Mo: DayOfWeek.MONDAY,
      Tu: DayOfWeek.TUESDAY,
      We: DayOfWeek.WEDNESDAY,
      Th: DayOfWeek.THURSDAY,
      Fr: DayOfWeek.FRIDAY,
      Sa: DayOfWeek.SATURDAY,
      Su: DayOfWeek.SUNDAY
    }
    const FORMATTER = DateTimeFormatter.ofPattern('hh:mma').withLocale(
      Locale.ENGLISH
    )

    const [strDays, strStart, strEnd] = strDateTime.split(/[\s-]+/)
    const days = strDays.match(/.{2}/g).map(s => DAY_OF_WEEK[s])
    const start = LocalTime.parse(strStart, FORMATTER)
    const end = LocalTime.parse(strEnd, FORMATTER)

    return days.map(day => ({
      day: day.toString(),
      start: start.format(DateTimeFormatter.ISO_LOCAL_TIME),
      end: end.format(DateTimeFormatter.ISO_LOCAL_TIME)
    }))
  } catch (e) {
    return []
  }
}

function convertSections (sectionsEl) {
  const [sections] = tabletojson.convert(sectionsEl.outerHTML, {
    stripHtmlFromCells: false
  })
  return sections.flatMap(section => {
    function convertPeople (instructorEl) {
      const instructors = instructorEl.querySelectorAll('a')
      if (instructors.length) {
        return instructors.map(a => a.text).filter(s => s !== '')
      } else {
        return [instructorEl.text]
      }
    }

    const instructor = convertPeople(parse(section.Instructor))
    const ta = convertPeople(parse(section['TA/IA/GTA']))
    const remarks = parse(section.Remarks)
      .querySelectorAll('.popup')
      .map(a => a.text)
      .flatMap(s => s.split(/\s*>\s*/))
      .filter(s => s !== '')
    const quota = (quotaHTML => {
      const quotaEl = parse(quotaHTML)
      const detailEl = quotaEl.querySelector('.quotadetail')
      if (detailEl) {
        return parseInt(quotaEl.querySelector('> span').text, 10)
      } else {
        return parseInt(quotaEl.text, 10)
      }
    })(section.Quota)
    const quotaDetail = (quotaHTML => {
      function convertDetail (detailEl) {
        // Quota/Enrol/Avail
        // ACCT: 68/43/25
        const lines = detailEl.text.split('\n')
        const result = {}
        for (const line of lines.slice(1)) {
          if (line === '') continue
          const [category, numbers] = line.split(':')
          const [q, e, a] = numbers.split('/')
          result[category.trim()] = {
            Quota: parseInt(q, 10),
            Enrol: parseInt(e, 10),
            Avail: parseInt(a, 10)
          }
        }
        return result
      }

      const quotaEl = parse(quotaHTML)
      const detailEl = quotaEl.querySelector('.quotadetail')
      if (detailEl) {
        return {
          ...convertDetail(detailEl)
        }
      }
    })(section.Quota)

    const schedules = parseDateTime(section['Date & Time'])
    return schedules.map(schedule => ({
      ...parseSection(section.Section),
      schedule,
      room: section.Room,
      instructors: instructor,
      assistants: ta,
      quota,
      enroll: parseInt(parse(section.Enrol).text, 10),
      available: parseInt(parse(section.Avail).text, 10),
      waitlist: parseInt(parse(section.Wait).text, 10),
      quotaDetail,
      remarks
    }))
  })
}

module.exports = {
  convert
}
