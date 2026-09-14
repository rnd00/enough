# Enough

A work-hours planner for people who want to do enough, then clock out.

Calculate the daily hours needed to finish your month, exclude holidays and vacation, and arrange work around lunch, commuting, and life.

## Run locally

Requires Node.js 18 or newer. There are no packages to install.

From this repository's folder:

```sh
npm start
```

Open [localhost:4173](http://localhost:4173).

## Plan your month

1. Enter **Hours left**, or select **Monthly total** and enter the hours already worked.
2. Choose the month, first available date, working weekdays, and preferred daily limit.
3. Set how many hours each paid vacation day counts toward your monthly requirement. Use `0` if your company only counts hours actually worked.
4. Select your holiday calendar and, where available, your state or region. Click dates to add paid vacation or custom holidays.
5. Read your daily target. For example, **82 hours / 8 available workdays = 10.25 hours per day**.

Paid vacation removes that date from available workdays. Its configured credit also reduces the hours left when the vacation falls on or after the calculation start date and would otherwise be a working day. Changing the start date does not automatically update hours already worked.

## Arrange your hours

- Set **Work starts at**, **Finish by**, and your lunch preferences, then select **Distribute remaining hours**. Existing blocks stay in place. Hours that exceed your daily limit or do not fit remain unplanned.
- Drag **Work**, **Lunch**, or **Commute** onto the weekly calendar, or select a preset and tap a free slot. Customize its name and length before placement.
- Drag a placed block to move it in 15-minute increments. The preview shows its destination; red indicates an unavailable slot. Click a block to edit or delete it.
- Use **Add time block** for precise times or repetition across available days in a week. An end time of **00:00** means midnight at the end of that day.
- Use **Clear all blocks** to empty the schedule across all dates. **Undo clear** restores them until the page is reloaded, provided new blocks do not overlap them.

Only work on available days counts toward your target. Lunch, personal blocks, excluded dates, and dates outside the planning month do not count.

## Preferences and saving

Choose **English** or **日本語** in the header. The language preference is shared across the planner and sources page. Dates, labels, and messages follow your choice; saved block names and provider-supplied holiday names stay as entered.

Dark mode is the default; the header toggle switches themes. Choose any day as the start of your week.

Your plan and preferences stay in this browser. There is no account or cloud sync. Clearing browser data removes your saved plan.

## Holiday coverage

Japan and the other international calendars use online sources with offline fallbacks or cached data. Southeast Asia has bundled **2026–2027** calendars for all 11 countries, including state selection for Malaysia. The app shows a warning when data is unavailable.

Source details, coverage limitations, and third-party licenses live on the app's [Sources & licenses page](docs/sources.html).

## Project layout

```text
docs/               Website served locally and published by GitHub Pages
  js/               App, calculations, and translations
  css/              Styles
  data/             Bundled holiday calendars
  licenses/         Published license notices
scripts/            Local server and holiday-data generator
tests/              Calculation, translation, and site-path checks
```

The English interface text is the default. Japanese translations live in `docs/js/ja.js`.

## Development

Run the calculation, translation, and site checks:

```sh
npm test
```

To regenerate the bundled Southeast Asian calendars:

```sh
python -m pip install holidays==0.104
python scripts/generate-sea.py
```

Python is only needed to regenerate those data files, not to run the app.

## GitHub Pages

GitHub Pages publishes the `docs/` folder from the `main` branch. Every push to `main` updates the site automatically at [rnd00.github.io/enough](https://rnd00.github.io/enough/); no workflow command is needed.

All asset paths are relative, so the site works under `/enough/`. Only the website, holiday data, and license notices are published; the development server and tests are excluded. Plans saved on localhost do not transfer to the hosted site because browser storage is separate for each origin.

## License

Enough's application code is available under the [MIT License](LICENSE). Third-party holiday data retains its own attribution and terms; see [Sources & licenses](docs/sources.html) and the [bundled holiday-data license](docs/licenses/SEA-DATA-LICENSE.txt).
