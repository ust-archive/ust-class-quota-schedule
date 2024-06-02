# UST Class Quota Schedule

This repository contains:

1. The (historical) class quota & schedule data of HKUST.
2. The GitHub Action that updates the data regularly.

> [!NOTE]
> The update period is 5 minutes.

## Structure

### History

The historical data are maintained by Git. Every change is recorded in the commit history.

The commit message indicates the time of the update. The format is as follows:

```
update: ${UPDATE_TIME}
```

where `${UPDATE_TIME}` is the time of the update, formatted in ISO 8601 with the Hong Kong timezone.

### Parsed Data

The parsed data is stored in the repository following the structure below:

```
data/${TERM_CODE}.json
```

where `TERM_CODE` represents the term of the data. The first two digits represent the academic year; the last two digits
represent the term.

- Fall: `10`
- Winter: `20`
- Spring: `30`
- Summer: `40`

For example, the data of 2023-24 Spring is stored in `2330.json`; the data of 2023-24 Summer is stored in `2340.json`.

### Raw Data

The raw data is stored in the repository following the structure below:

```
data/${TERM_CODE}/${SUBJECT_CODE}.html
```

where `TERM_CODE` is the term code (same as above), and `SUBJECT_CODE` is the subject code, for example, `ACCT` is accounting. 

The raw data is the HTML content of the class quota & schedule page of HKUST. 
