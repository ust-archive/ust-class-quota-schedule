const { parse } = require('node-html-parser')
const { tabletojson } = require('tabletojson')

function convert(pageHTML) {
  const root = parse(pageHTML)
  const courseElements = root.querySelectorAll('.course')
  return courseElements.map(convertCourse)
}

function convertCourse(courseEl) {
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

function convertTitle(title) {
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

function convertInfo(infoEl) {
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

function convertAttr(attrEl) {
  return {
    title: attrEl.querySelector('span').text,
    description: attrEl.querySelector('div').text
  }
}

function convertSections(sectionsEl) {
  const [sections] = tabletojson.convert(sectionsEl.outerHTML, {
    stripHtmlFromCells: false
  })
  return sections.map(section => {
    function convertPeople(instructorEl) {
      const instructors = instructorEl.querySelectorAll('a')
      if (instructors.length) {
        return instructors.map(a => a.text).filter(s => s !== '')
      } else {
        return [instructorEl.text]
      }
    }
    const instructor = convertPeople(parse(section['Instructor']))
    const ta = convertPeople(parse(section['TA/IA/GTA']))
    const remarks = parse(section['Remarks'])
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
    })(section['Quota'])
    const quotaDetail = (quotaHTML => {
      function convertDetail(detailEl) {
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
    })(section['Quota'])

    return {
      // eslint-disable-next-line prettier/prettier
      'Section': section['Section'],
      // eslint-disable-next-line prettier/prettier
      'Date & Time': section['Date & Time'],
      // eslint-disable-next-line prettier/prettier
      'Room': section['Room'],
      // eslint-disable-next-line prettier/prettier
      'Instructor': instructor,
      // eslint-disable-next-line prettier/prettier
      'TA/IA/GTA': ta,
      // eslint-disable-next-line prettier/prettier
      'Quota': quota,
      // eslint-disable-next-line prettier/prettier
      'Enrol': parseInt(parse(section['Enrol']).text, 10),
      // eslint-disable-next-line prettier/prettier
      'Avail': parseInt(parse(section['Avail']).text, 10),
      // eslint-disable-next-line prettier/prettier
      'Wait': parseInt(parse(section['Wait']).text, 10),
      // eslint-disable-next-line prettier/prettier
      'QuotaDetail': quotaDetail,
      // eslint-disable-next-line prettier/prettier
      'Remarks': remarks
    }
  })
}

module.exports = {
  convert
}
