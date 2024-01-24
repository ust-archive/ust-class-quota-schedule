# Quota (Data) @ UST

This repository contains 

1. The historical class quota data of HKUST (from 2023-24 Spring)
2. The GitHub Action that updates the data regularly.

The default period of update is 5 minutes. 

## Structure

### History

The historical data are maintained by Git. Every change is recorded in the commit history.

The commit message indicates the time of the update. The format is as follows:

```
update: ${UPDATE_TIME}
```

The `${UPDATE_TIME}` is in epoch seconds.

### Parsed Data

The data is stored in the repository following the structure below:

```
${TERM_CODE}/${PROGRAM_CODE}.json
```

- `TERM_CODE`: the first two digits is the last two digits of the year; the last two digits represent the term.
    - Fall: `10`
    - Winter: `20`
    - Spring: `30`
    - Summer: `40`
- `PROGRAM_CODE`: the program code of the course.


For example, the data of COMP in 2023-24 Spring is stored in `2330/COMP.json`.

> [!CAUTION] 
> The schema of the JSON files may be changed in the future. However, I will try not to do it.

### Raw Data

The raw data is stored in the repository following the structure below:

```
${TERM_CODE}/src/${PROGRAM_CODE}.html
```

This is the raw data directly from the webpage. 
