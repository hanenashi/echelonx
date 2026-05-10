# EchelonX

EchelonX is a Tampermonkey userscript for **okoun.cz** that hides and optionally deletes posts from users listed in the Ryba bez parazitu blacklist, plus your own custom local filter.

It is based on the original **Echelonuv filtr**, but updated for newer/mobile Okoun layouts and made less fragile.

Current script version: **0.2.4**

## Install

Install/update directly from here:

[Install EchelonX](https://raw.githubusercontent.com/hanenashi/echelonx/main/echelonx.user.js)

Tampermonkey should open the install screen automatically. If it only shows plain text, copy the file into a new Tampermonkey userscript manually.

## Current behavior

EchelonX runs automatically on Okoun pages.

It can:

- fetch official blacklist data from `ryba_bez_parazitu`
- hide matching posts
- optionally minimize posts instead of removing them
- optionally submit matching posts through Okoun's existing moderation delete form
- keep a local custom troll list
- save settings explicitly with **Save + apply now**
- apply custom filter changes immediately without needing random reload rituals
- offer a **Reload page** button when already-rendered posts need a clean pass

## Menu / settings UI

On desktop Okoun, EchelonX adds an inline **EchelonX** link next to **Přítomní** in the main page menu and opens settings as a popup.

On newer Okoun mobile layout, EchelonX is also wired into the avatar `...` menu.

Open it like this:

1. tap the avatar/menu `...`
2. tap **EchelonX**
3. the settings panel rolls down directly under the EchelonX row
4. use Okoun's original **Zavřít** button to close the menu

There is no separate EchelonX close button anymore. One close button is enough. We are not building airplane cockpit UI here.

If neither desktop header actions nor the avatar menu can be found, EchelonX falls back to a small floating **EX** button.

## Settings

Available options:

- **Hide matching posts** — hides/removes posts from filtered users.
- **Only minimize** — shrinks matching posts instead of fully removing them.
- **Delete official blacklist matches** — submits matching official-blacklist posts through Okoun's moderation form, where available.
- **Also delete custom filter matches** — includes your custom list in deletion too. Use carefully.
- **Custom trolls, comma-separated** — local list of usernames to hide.
- **Update blacklist** — fetches the latest official blacklist.
- **Save + apply now** — saves settings and immediately re-runs hiding on the current page.
- **Reload page** — reloads Okoun if the current DOM is already half-chewed and needs a clean pass.

## Custom filter notes

Custom usernames are comma-separated:

```text
Adelbert_Steiner, Some_Other_User, annoying.example
```

Usernames are escaped before being converted to regex rules, so dots and other regex-looking characters are treated as literal username characters.

Settings are saved only after pressing **Save + apply now**. This avoids the old mobile-browser problem where textarea `change` events could be delayed or skipped until blur, reload, moon phase, etc.

## What changed from the original Echelonuv filtr?

Original Echelonuv filtr was useful, but it expected older Okoun DOM structure. Newer Okoun pages changed enough that the old script could fail while creating its settings widget or while locating post containers.

EchelonX changes:

- replaced brittle XPath/header assumptions with tolerant DOM selectors
- moved settings into the current Okoun desktop header and avatar `...` menu
- added mobile-friendly settings panel behavior
- added explicit **Save + apply now** instead of relying on textarea blur/change timing
- added immediate re-apply after saving settings
- added visible status messages after saving/updating
- added a reload button for stubborn already-rendered pages
- finds post roots using `.closest('.item')` before falling back to old parent walking
- escapes usernames before turning them into regex rules
- keeps a fallback floating **EX** button if Okoun's avatar menu is missing
- avoids crashing when expected UI elements are missing

## Technical TL;DR footer

Original script failure mode: **old DOM assumptions**.

The old script looked for specific header/user elements and old parent relationships. When Okoun moved layout pieces around, settings injection could return `null`, then later code tried to append into `null`, and the script died before filtering did useful work.

EchelonX fixes that by:

- using resilient selectors instead of one exact XPath
- treating missing UI elements as recoverable, not fatal
- integrating settings into `.head .user .user-menu` when available
- storing settings via `GM_setValue` / `GM_getValue`, with localStorage fallback
- applying filters through a fresh regex build from saved settings
- matching post authors from `.item span.user`, `.item .user`, and `span.user`
- locating post containers with `.closest()` instead of assuming `parentNode.parentNode`
- submitting deletes through Okoun's own `markArticlesForm` / `markMessagesForm` inside a hidden iframe

In short: same spirit as Echelonuv filtr, less glass-boned. Still Okoun, though, so DOM goblins remain legally possible.

## Credits

Original idea and script: **Echelonuv filtr** by echelon / lukas-hosek.

This fork/update: **EchelonX** by hanenashi.
