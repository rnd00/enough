// Japan Cabinet Office / holidays-jp.github.io/api/v1/date.json, retrieved September 11, 2026.
const names=['New Year’s Day','Coming of Age Day','National Foundation Day','Emperor’s Birthday','Vernal Equinox Day','Showa Day','Constitution Memorial Day','Greenery Day','Children’s Day','Substitute holiday','Marine Day','Mountain Day','Respect for the Aged Day','Citizens’ Holiday','Autumnal Equinox Day','Sports Day','Culture Day','Labor Thanksgiving Day'];
const dates=['01-01','01-12','02-11','02-23','03-20','04-29','05-03','05-04','05-05','05-06','07-20','08-11','09-21','09-22','09-23','10-12','11-03','11-23'];
export const fallback=Object.fromEntries(dates.map((d,i)=>['2026-'+d,names[i]]));
