# SHOTS: reference notes (v1, first pass, refinement in progress)

Private comparison notes. Never publish the reference images or name their sources in public files or UI copy.

Status: v1 written from a full read of every image in `cook/refs/`. Numbers marked "measured" come from pixel scans of the files. Numbers marked "est." are read by eye. A refined version replaces this file in place.

## 1. Audit of `cook/refs/`

| File | Pixels | What it shows | Valid for its purpose |
|---|---|---|---|
| R01-source-3024x1898.png | 3024x1898 | Plane web inbox, full app window, 2x capture of a 1512x949 CSS viewport. No Mobbin chrome. | Yes. Master file. Sample colours and sizes from this one. |
| R01-desktop.png | 1440x900 | The same screen resized to 1440x900 (scale 0.476 of the source, so 0.952 of true CSS size). No Mobbin chrome. | Yes. This is the desktop comparison still. |
| R01-phone.png | 390x844 | The whole desktop screen shrunk to 390 wide (about 0.27 scale) and floated in the middle of a white 390x844 canvas (app occupies y 298 to 542). Text is 3 px tall. | NO. It is a squeezed desktop screen, not a phone layout. Do not compare against it. |
| R01-phone-listpane.png | 390x844 | A crop of the desktop list pane only (header "Inbox", tab row, three rows), upscaled 1.083x from its true 360 CSS px to 390 wide, placed at the top of a white canvas. Content ends at y 363, the rest is empty white. | Usable with a caveat: it is real product pixels at phone density and the honest phone comparison of the two, but it is a derived crop, not a native phone capture. It has no detail view, no bottom content, slightly soft text. |
| R02-desktop.png | 1440x900 | Interior of a live 3D home tour, living room seen from the hallway node, side panel collapsed. Top dark bar with a three-way segmented control, room label, three floor chevrons. | Yes. Primary walk comparison at desktop. |
| R02-desktop-default.png | 1440x900 | The same tour in its default state: kitchen and living room, floor plan side panel open (400 px wide). | Yes, as a second angle and for the floor plan panel. |
| R02-phone.png | 390x844 | Same node as R02-desktop at phone size, bottom sheet collapsed to a 20 px handle bar. | Yes. Primary walk comparison at phone. |
| R02-phone-default.png | 390x844 | Phone default state: panorama in the top 605 px, floor plan sheet open below. | Yes, secondary. |
| R03-desktop.png | 1440x900 | Street-level panorama, Kuala Lumpur (Kerinchi), captured Mar 2024. Asphalt road, yellow edge line, drain covered by perforated concrete slabs, raised concrete kerb, grass verge, lamp posts, chain-link fence, car park, white and blue flats, large rain trees. Google Maps chrome on top (search box, place card, minimap, zoom, compass, footer). | Yes. Note: map chrome covers about 12 percent of the frame. |
| R03-down-desktop.png | 1440x900 | Same spot pitched down about 25 degrees and turned to face the drain side. Best close view of the slab drain cover, kerb, moss and verge. | Yes. Use for walk-drain materials. |
| R03-phone.png | 390x844 | Same panorama at phone size. Map chrome covers about 30 percent of the frame. | Yes. |
| R03-down-phone.png | 390x844 | Pitched-down view at phone size. | Yes. |
| V01-desktop-f01..f06.png | 1440x900 each | Six frames of one move in the home tour: kitchen node to living room node. | Yes. |
| V01-desktop-strip.png | 8640x900 | The six frames side by side, left to right. | Yes. |
| V01-phone-f01..f06.png | 390x844 each | Six frames of a move at phone size: hallway to living room. | Yes. |
| V01-phone-strip.png | 1170x1688 | 3x2 grid of the six phone frames, reading order. | Yes. |
| V02-desktop-f01..f06.png | 1440x900 each | Six frames of one street-panorama move along the road. | Yes. Frames 4 to 6 are blurred because the next panorama's tiles had not loaded. |
| V02-desktop-strip.png | 8640x900 | The six frames side by side. | Yes. |
| V02-phone-f01..f06.png | 390x844 each | Six frames of the same kind of street move at phone size. | Yes, same blur in frames 4 to 6. |
| V02-phone-strip.png | 1170x1688 | 3x2 grid, reading order. | Yes. |

No capture shows a blocked page, a login wall or a CAPTCHA.

## 2. R01: Plane inbox (the bar for draft, merge, rank, approval, type)

### Scale warning

The source is a 1512x949 CSS viewport. `R01-desktop.png` is that screen shrunk by 0.952. The blind critic sees the 1440 image, so two columns are given: "true" (Plane's real CSS value) and "at 1440" (what the still shows). Build to the true values and the density will read as equal or slightly roomier; never go larger than true.

### Layout, measured

| Thing | True CSS px | At 1440 |
|---|---|---|
| App background (canvas behind everything) | #f2f2f3 | same |
| Top bar height | 40 | 38 |
| Left icon rail width | 60 | 57 |
| Main panel | starts x 60, y 40; 1 px border #eaebec; right margin 8; bottom margin 8; top-left radius about 8 | 57, 38 |
| List pane width | 360 (plus 1 px divider #eaebec) | 343 |
| Detail pane width | about 1082 | 1030 |
| List pane header ("Inbox") height | 48, bottom border 1 px #eaebec | 46 |
| Tab and filter row height | 47 (tab group 28 tall, 8 above, 10 below) | 45 |
| List row height | 80 | 76 |
| Row horizontal padding | 16 | 15 |
| Detail content left padding | 32 from the divider | 31 |
| Detail content right padding | 32 | 31 |

Row anatomy (true px): 16 top padding, title line 20, 8 gap, meta line 24 (16 px type icon, id text, 20 px round avatar, right-aligned time), 12 bottom padding. No divider line between rows: rows are separated by background tint only.

### Type, measured from glyph heights (plus or minus 1 px)

Typeface: Inter (variable). No uppercase labels, no monospace anywhere, letter-spacing 0 or slightly negative on the title.

| Text | Size true | Weight | Colour |
|---|---|---|---|
| Workspace name (top bar) | 14 | 500 | #0f0f10 |
| Search placeholder | 13 | 400 | #5d6265 |
| Rail labels (Projects, Wiki, AI, Settings) | 11 to 12 | 500 | #313435 |
| Pane header "Inbox" | 16 | 500 | #0f0f10 |
| Tabs (All 2, Mentions) | 12 | 500 active #0f0f10, inactive #313435 | |
| Row title | 14 | 500 | #0f0f10 |
| Row id (ASMOB-42) | 13 | 400 | #3d3d3f |
| Row time ("about 6 hours ago") | 12 | 400 | #0f0f10 |
| Detail type chip "Task" | 13 | 500 | #6595ff on #d9e4ff |
| Detail id | 13 | 400 | #494d50 |
| Detail title | 24 | 600 | #0f0f10 |
| Detail meta values (Backlog, Medium, name, dates) | 14 | 400 | #0f0f10, dates #313435 |
| Detail body | 15 to 16, line height about 24 | 400 | #0f0f10 |
| "Properties" | 15 to 16 | 600 | #0f0f10 |
| Group heads ("Details", "Project structure") | 13 | 600 | #0f0f10 |
| Property labels | 13 to 14 | 400 | #494d50 |
| Property placeholder values | 14 | 400 | #5d6265 |
| "Last edited by ..." | 12 | 400 | #494d50 |
| Button text (Unsubscribe, Get started, Add sub-work item) | 13 | 500 | #313435 |

### Colours, sampled

- Canvas #f2f2f3. Panel #ffffff. Panel border and all hairlines #eaebec. Control borders #d6d7d9 (buttons) and #e1e2e3 (search field, active tab pill, avatar ring).
- Text: primary #0f0f10, strong secondary #313435, secondary #494d50, tertiary and placeholder #5d6265. Icons #5d6265 (rail) and #313435 (toolbar).
- Unread row background #f3f7fa (a cold 3 percent blue tint). Read row background #fdfdfd. There is no hover or selected border.
- Accent blue #006399 (unread count badge, round avatar fill). White glyph on it.
- Type chip: background #d8e3ff, glyph #6595ff.
- Priority "Medium" bars #e9b136.
- Tab group track #f2f2f3, active pill #ffffff with 1 px #e1e2e3 border.
- Toolbar strip #f9f9f9 with 1 px #eaebec border.
- One red notification dot in the top bar (about #e5484d). No other saturated colour on the page.

### Components, measured (true px)

- Tab group: 28 tall, radius 8, track #f2f2f3, 2 px inner padding. Active pill 24 tall, radius 6, white, 1 px border, count sits 8 px after the label in the same weight.
- Icon buttons in the filter row: 24x24, radius 6, 1 px #d6d7d9, white, 8 px gap, 16 px icon with 1.5 px stroke.
- Unread count badge: 15x15, radius 4, #006399, white 10 px bold digit, right-aligned on the title line.
- Round avatar: 20 px with 1 px #e1e2e3 ring.
- Type icon chip: 16x16, radius 4.
- Detail header buttons: 28 tall, radius 6, 1 px #d6d7d9, white, with a 1 px soft bottom shadow (rgba 0,0,0,0.04). Square ones 28x28, 8 px gaps.
- Detail action strip: 36 tall, radius 8, #f9f9f9, segments split by 1 px #eaebec.
- Section divider: 1 px #eaebec, 32 px of air above and below.
- Property rows: 40 px pitch, label column 320 wide, 16 px icon, 8 px icon gap.

### What makes it read as finished

- One grey canvas, one white panel. Depth comes from 1 px hairlines, never from drop shadows or cards inside cards.
- Three text greys only, one accent hue, used on about 1 percent of the pixels.
- Everything sits on a 4 px grid: 8, 12, 16, 24, 32.
- Large quiet areas: the list pane is 60 percent empty below three rows and nothing fills it.
- Icons are 16 px line icons at 1.5 px stroke, the same grey as secondary text.

### Phone (390x844)

Compare against `R01-phone-listpane.png` only. In that file: header 52 tall with a 20 px back arrow and "Inbox" at 17 px; tab row 51 tall; rows 87 tall (80 true scaled 1.083); title 15 px, id 14 px, time 13 px; side padding 17. Everything below y 363 is white. A real phone layout of ours that fills the viewport with a full list, a proper header and a bottom action will read as more finished than this crop, as long as density and type stay at these sizes.

## 3. R02: 3D home tour (walk bar, interior)

- Viewport: desktop 1440x900, panorama fills x 0 to 1420, y 56 to 900 (a 20 px dark gutter with a drag handle sits on the right). Phone 390x844, panorama y 56 to 824, 20 px dark handle bar at the bottom.
- Chrome: top bar 56 px, #272a35 (dark blue-grey), holds one centred segmented control (300x28 at desktop, radius 14, track #4a4d57, active pill white with #0a62d6 bold 14 px text). On phone the control becomes three icons, 305x28. A 1 px light line separates bar and view. Bottom-left: a 40 px dark round button (fullscreen). Bottom-right: a 44x30 dark rounded button (panel toggle).
- Camera: equirectangular photo sphere, eye height est. 1.45 to 1.55 m (tripod), horizontal field of view est. 95 to 105 degrees at desktop, vertical est. 100 to 110 degrees at phone. Wide-angle stretch is visible at the frame edges. Pitch about 0, horizon at 55 to 60 percent of the view height.
- Light: daylight from one sliding door at the far end, colour est. 6000 to 6500 K, slightly blue. Walls are lifted almost to white (HDR tone-mapped), the door area clips to pure white, a soft bloom wraps the door frame. Shadows are short and soft, contact shadows under the sofa and table legs are the darkest things in the frame.
- Materials: matte white painted walls with faint scuffs, glossy cream ceramic floor tiles (about 45 cm, laid on the diagonal, dark grout 2 to 3 mm) carrying a long specular reflection of the door, navy leather sofa with highlights on the cushions, rust-red curtain, black metal furniture.
- Wayfinding: floor markers are flat light-grey ellipses (about 80x28 px at desktop, 50 percent opacity) with a black chevron, each with a white 16 px label above carrying a soft dark text shadow. Room name centred at the top of the view, white 17 px bold with shadow. A large faint translucent disc marks the hover target. No rings, no glow, no particles.
- Far detail: through the door, a balcony rail and foliage blown out to near white. The tour does not show a sky.
- What it does well: real photographic light, reflections, and clutter. What it does badly: edge stretch, stitching ghosts, flat 2D markers that do not sit on the floor. A code-made scene can win on crisp edges, correct perspective on markers and clean UI.

## 4. R03: street panorama, Kuala Lumpur (walk bar, exterior)

- Viewport: desktop 1440x900 full-bleed, phone 390x844 full-bleed. Map chrome overlays: search pill top-left (375x48, white, radius 24), black place card (413x115, radius 8), minimap bottom-left (220x102, 2 px white border, radius 8), compass and zoom bottom-right, 14 px footer strip.
- Camera: car-roof panorama, eye height est. 2.4 to 2.6 m (higher than a pedestrian: car roofs are seen from above). Horizontal field of view est. 90 degrees at desktop, vertical est. 95 to 100 degrees at phone. R03-desktop: yaw along the road and about 35 degrees right, pitch about minus 8 degrees, horizon at 44 percent of frame height. R03-down: pitch est. minus 25 to minus 30 degrees, facing the verge square-on, horizon out of frame at the top.
- Sun: near overhead, slightly behind and left of the camera (est. elevation 65 to 75 degrees). Hard-edged dappled leaf shadows on the asphalt. Sunlit asphalt is about 2.5 stops brighter than shaded asphalt. Colour temperature est. 5500 K in sun, shade leans cool blue-grey.
- Sky: hazy tropical overcast-bright, almost white (#e9edf2 to #f7f8fa), no visible blue, no clouds with edges. Only 5 to 8 percent of the frame is sky: trees and flats cover the rest.
- Materials, near to far:
  - Asphalt: mid grey est. #7d7f83 in sun, #4a4d52 in shade, fine aggregate speckle, lighter worn wheel tracks, a few dark patches.
  - Road edge line: single yellow est. #c9a63a, 12 to 15 cm wide, worn and broken at the edges, dirt-stained.
  - Drain: a covered roadside drain. Precast concrete cover slabs about 45 to 50 cm wide, each perforated with a grid of small square holes (about 8x8 per slab, holes 3 to 4 cm), grey-green est. #6f766b, black moss and algae in the joints and along the road edge, yellow fallen flowers caught in the grid. Slab joints every 60 cm or so, a few slabs cracked or tilted.
  - Kerb wall: raised cast concrete upstand on the verge side, 20 to 25 cm high and 15 cm thick, dark weathered grey est. #55584f with black streaks and a mossy top.
  - Verge: patchy tropical grass est. #5f8a2f in sun and #3f5e22 in shade, bare red-brown laterite soil est. #7a4a33 under the trees, leaf litter, exposed roots, a few bits of litter.
  - Lamp post: grey galvanised or concrete pole 20 to 25 cm thick at the base, plain, no decoration.
  - Fence: chain-link in blue-painted steel frame with angled barbed-wire arms, posts every 2.5 to 3 m.
  - Cars: compact hatchbacks (white, red, silver) and a white pickup, parked nose-in.
  - Buildings: 15 to 20 storey white flats with pale blue bands and louvre windows, a 4 storey block with blue awnings and laundry.
  - Trees: large rain trees with dark trunks and broad canopies that reach over the road, one small palm at the verge.
  - Overhead: 3 to 5 sagging utility cables crossing the top left of the frame.
- Far-distance detail: the road runs to a vanishing point at x 7 percent, y 45 percent with parked cars along the left side shrinking to dots, an elevated rail structure crossing at the end, tree canopies overlapping the towers. Atmospheric haze lifts contrast on the far towers by est. 15 to 20 percent.
- What sells it: dappled shadow, dirt and moss gradients where surfaces meet, overlapping layers (pole in front of fence in front of cars in front of building), and nothing is clean or evenly coloured.

## 5. V01 and V02: motion strips

- V01 (home tour move, 6 frames): the camera does not cut. The current panorama is projected onto rough room geometry and the camera dollies forward through it, so near objects (kitchen counter, cupboards) stretch, smear and slide off the frame edges faster than far objects. Around frames 3 to 4 the next panorama cross-fades in (double image of counter edges for one or two frames). Frame 5 is sharp again at the new node, frame 6 brings the floor markers and room label back. Labels and markers are hidden for the whole move. Heading stays locked on the destination. No motion blur filter, no vignette, no flash. Eased: slow out, slow in.
- V02 (street move, 6 frames): frames 1 to 3 the current image zooms toward the vanishing point with slight radial stretch at the edges. Frames 4 to 6 the next panorama appears at low resolution and stays blurred while tiles load. The overlays never move. This reference ends soft: a move of ours that lands sharp on the last frame beats it on that point.
- Target for our walk-move: one continuous dolly with true parallax (real geometry gives this for free), about 0.9 to 1.2 s, ease in-out, markers and labels fade out in the first 15 percent and back in during the last 15 percent, last frame fully sharp. Under reduced motion: a 150 to 200 ms cross-fade with no travel.
