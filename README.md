# DriveCAST

Official project page for **DriveCAST: Interaction-Preserving Transfer of Driving Scenarios**.

The site presents the project overview, Inter2Scene and Scene2BEV methodology,
selected experimental results, and qualitative figures. Paper and code links will
be enabled when their public URLs are available.

## Release checks

HTML references content-addressed CSS and JavaScript under `assets/site-*.css`
and `assets/site-*.js`. When editing `styles.css` or `script.js`, create a new
asset named with the first 12 characters of its SHA-256 hash and update the
HTML reference. Keep previous assets available for cached pages.

Run `node tools/check_release_assets.cjs` before publishing. Changing a query
parameter on the page URL alone does not invalidate cached styles or scripts.

The comparison always includes front, third-person, and ego-centered BEV views
for both policies. At widths up to 600px, a reframed copy stacks the two camera
views beside BEV. Both encodings retain the same 25.9-second timeline; resizing
preserves playback time, speed, and pause state. Do not restore view selectors.
