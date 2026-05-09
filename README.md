# EchelonX

A small Tampermonkey userscript for okoun.cz that hides and optionally deletes posts from users listed in the Ryba bez parazitu blacklist.

It is based on the original **Echelonuv filtr**, but with less brittle DOM handling for newer Okoun page layouts.

## Install

Install/update directly from here:

[Install EchelonX](https://raw.githubusercontent.com/hanenashi/echelonx/main/echelonx.user.js)

Tampermonkey should open the install screen automatically. If it only shows plain text, copy the file into a new Tampermonkey userscript manually.

## What it does

- Fetches blacklist data from `ryba_bez_parazitu`.
- Hides matching posts.
- Can minimize instead of fully removing posts.
- Can mark matching posts for deletion using Okoun's existing moderation form.
- Keeps a small `EchelonX` settings link in the Okoun header.
- Falls back gracefully if Okoun moves header elements again, because yes, one moved div can still kill civilization.

## Settings

Open the `EchelonX` link in the Okoun header.

Available settings:

- `Schovávat` — hide matching posts.
- `Jen minimalizovat` — shrink matching posts instead of removing them.
- `Mazat` — submit matching posts through the moderation delete form.
- `I z vlastního filtru ⚠️` — include your custom filter in deletion too.
- `Vlastní filtr` — comma-separated custom usernames.

## Notes

This script is intentionally defensive:

- It uses tolerant selectors instead of old exact XPath-only header lookup.
- It finds post containers via `.closest()` before falling back to old parent walking.
- It escapes usernames before converting them into regex rules.
- It skips the settings widget instead of crashing if the header cannot be found.

## Credits

Original idea and script: Echelonuv filtr by echelon / lukas-hosek.

This fork/update: EchelonX by hanenashi.
