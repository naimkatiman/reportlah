# Gates: Reportlah one-page build

OWNS: app/**, lib/**, agent/**, data/**, scripts/**, tests/**, GATES.md, vitest.config.mts, package.json

Scope: the plan doc's one page, its rules that stay, its leave-out list and its do-not-drop list, each proven by a command.

- [x] G0: this ledger states outcomes that can fail
  CHECK: node C:/Users/thinkpad/.claude/skills/unlazy/scripts/gate-lint.mjs GATES.md
  EXPECT: LINT OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=089b0e1d9fe918bd65679a95549d957b2d12ae9e972e26c3e57099fcc826743c; exit=0; EXPECT=matched; output-sha256=48630b7361dd44ee870917b12c3d19b9d7bdea738aaca16bb04d4cab83b772d2; output-bytes=8; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G1: the count, the dates and the missing items come from the app, and the number inside the message equals the number on screen in every state
  CHECK: node scripts/gates/run.mjs count
  EXPECT: gate count: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=37af8010c0198107bfa896df25bebdc50861bcba3382a3dbe51719636b9481f9; exit=0; EXPECT=matched; output-sha256=63ed8081b1ae36392110d98c42b6ffd1fb475a85ed45de2346354871620171da; output-bytes=65; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G2: a complaint that joined the report never drops out of it, whatever the assistant returns later
  CHECK: node scripts/gates/run.mjs join-only
  EXPECT: gate join-only: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=c58cee588ab227aaac3b7201d717935fcd5a767f6607b2b954b42a0565718900; exit=0; EXPECT=matched; output-sha256=e2e2c0376a2c034f7659cf0cdbdeb36a7008408489c78d3932f5069944f7a511; output-bytes=73; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G3: a complaint about something else is marked as other and leaves the report untouched, before and after the sixth complaint
  CHECK: node scripts/gates/run.mjs other
  EXPECT: gate other: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=15fb883cd2a4e186f433e76b676a1424d0fd602a336d1b2c8920a58cb264f69c; exit=0; EXPECT=matched; output-sha256=935fd800054532afa2a99684c0e71321b3338d81921703804ccb1ec37e11c2a8; output-bytes=65; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G4: an exact repeat of a complaint is skipped with the doc's reply and changes nothing
  CHECK: node scripts/gates/run.mjs repeat
  EXPECT: gate repeat: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=59debe3bf3d55acd9f8e1a4ed667f424c63fcea30c536d8303c5c2c307ef1a1e; exit=0; EXPECT=matched; output-sha256=12e427bac13a3f21358e6f48acd12401c5fe53cf09dfc4cbff0ee84e92f56ef0; output-bytes=67; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G5: an empty or too-short message gets the doc's reply and stores nothing
  CHECK: node scripts/gates/run.mjs invalid
  EXPECT: gate invalid: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=f63c4582ac83bf7a4a33fb4520b5d8b92e71be9e7dade89bbfa881c418ac18c9; exit=0; EXPECT=matched; output-sha256=55605c79b648be769b42aca4dfc862c1edea98290645becc109a455e4fc4046f; output-bytes=69; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G6: the four steps of a run are shown on the page with who did each one
  CHECK: node scripts/gates/run.mjs steps
  EXPECT: gate steps: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=b129247454d5168981db1818b0eb55e0e5c8455c670fc6e24156de223ecdd7a3; exit=0; EXPECT=matched; output-sha256=b64b0ecf231519ffa85c1b1d57bbe71542563e7daf936cdf4fbb2ce92889a739; output-bytes=66; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G7: when the model cannot be reached the page says so, the old report stays, and Retry brings the run back
  CHECK: node scripts/gates/run.mjs retry
  EXPECT: gate retry: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=0bf753614add2c2711f02f745db27087d42cd9e6d8a93eb04afd78c405875661; exit=0; EXPECT=matched; output-sha256=5be04ba2878f162d1bb4f41b9537df96e920be426cb5bcb07f763d289125beb4; output-bytes=66; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G8: a Telegram message becomes the next complaint on the page, tagged Telegram, with the bot reply stating the new count, and only the complaint, the date and the channel are kept
  CHECK: node scripts/gates/run.mjs telegram
  EXPECT: gate telegram: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=71d685dda2eb15062a32971e7470d526b03bc35d88153bfcada51ee7ee69a2cd; exit=0; EXPECT=matched; output-sha256=2c34bb5e66fb3c8ca7eb69d85e70942b5daad5a08afb2f3b3f050c34991a1507; output-bytes=71; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G9: two quick Telegram messages stay as two complaints and are handled one at a time
  CHECK: node scripts/gates/run.mjs telegram-queue
  EXPECT: gate telegram-queue: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=202ec1f74d9228f564fdf58e7ba8183339f58be696d4ed054c159bdc2759620f; exit=0; EXPECT=matched; output-sha256=21947bab9afb740cee5d04c73166c1ae86f920ecb0abbe334268e027eda4eff7; output-bytes=83; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G10: the Telegram webhook turns away a caller without the shared secret
  CHECK: node scripts/gates/run.mjs telegram-secret
  EXPECT: gate telegram-secret: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=9a99a2f8f138f023f07be0d54745d036346c36c84edfc622eccd3231af35f484; exit=0; EXPECT=matched; output-sha256=c84a623a2d5a6b7867d887a7d480c87fa305b378648e9188b92b60e1e627bdab; output-bytes=85; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G11: an agency assistant with no key is turned away, with the key it reads the current count, and it has no way to change anything
  CHECK: node scripts/gates/run.mjs agency
  EXPECT: gate agency: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=f1675e77475d4757b44ceb55341b33be8095db1eda642a4c3f0dcfd6c539fd3a; exit=0; EXPECT=matched; output-sha256=7cd6b46e1c3a3163ffb14677370f833d89a4a8cc8d83aebed6deca6a7c9d0cb4; output-bytes=67; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G12: one page shows complaints on the left and the report on the right, every complaint carries its report tag and its channel tag, the report is addressed to the unconfirmed recipient, and the wording counts complaints and never people
  CHECK: node scripts/gates/run.mjs page
  EXPECT: gate page: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=8a10915f9b5f958434835becbe58935d112594174506d49784c8c60f81692ca6; exit=0; EXPECT=matched; output-sha256=5974a8aefce6e1913a8e82f3da766108e88e1201f100794616813fb537948fad; output-bytes=64; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G13: nothing from the leave-out list exists in the app, and the scanner fails on a planted positive control
  CHECK: node scripts/gates/leave-out.mjs
  EXPECT: leave-out scan: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=3a76a0a274116b8f98eb3d39d14937f0b995215647fc3d0912f0a44d52161b2f; exit=0; EXPECT=matched; output-sha256=eaddb67634a04428763df6af9324f5c180bba1523df44bbcbcd219c7b47b2644; output-bytes=25; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G14: the type check, the linter, the full offline suite and the production build all succeed
  CHECK: node scripts/gates/build.mjs
  EXPECT: build chain: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=52e09f8a613e4c3c66576fe3776c0b1552c4f0a2092696bac00ae408e592c30d; exit=0; EXPECT=matched; output-sha256=a69a62aff5756db6ba68e1a1b0fcd6fe12e1e261d50d491e8aabb6caae2fd29c; output-bytes=74; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G15: on the real model the main run reports the seed count three times in a row with Reset between, each run inside the doc's time limit
  CHECK: node scripts/gates/run.mjs live-main
  EXPECT: gate live-main: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=d619c090e175b729f11d7de7e6c14b5e8c5bb9350e5f803fe6055cb4b27c7bf0; exit=0; EXPECT=matched; output-sha256=43a0a2e40b8c4d3e838bf1f99d31a4813db26dea3295a7b362eabcf289488eef; output-bytes=73; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G16: on the real model the doc's own test sentences behave as the doc's table says, each read from the doc at check time
  CHECK: node scripts/gates/run.mjs live-doc
  EXPECT: gate live-doc: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=9f5d8790ac142b3678599f9613d44db507db8d36fb241d1885a3a0132a7e52a8; exit=0; EXPECT=matched; output-sha256=c2253f263058540caaa1d8a0a866fa3209c66882c44f477a71da4a70af44b5dd; output-bytes=71; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G17: the bottom of the page ranks what is reported most, with every count worked out by the app from the complaints and equal to the count on the report
  CHECK: node scripts/gates/run.mjs ranking
  EXPECT: gate ranking: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=23ea5218a171c20414313c8d87d24aef12dbc33126cbb88854e4c0ee864d1484; exit=0; EXPECT=matched; output-sha256=bc760954da4204ea5e691a1a7e572d6b08fe87cd0c06b1b13ec348b672019326; output-bytes=70; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries

- [x] G18: a complaint can carry a photo or a video from the page and from Telegram, either one clears the missing-evidence item, and nothing from the file is read or kept
  CHECK: node scripts/gates/run.mjs media
  EXPECT: gate media: verified
  EVIDENCE: automatic-evidence=v1; definition-sha256=01334c42fc37ba6d5d24d9725bc0ce74b847190eac941b0d88e5afa8c7449ce9; exit=0; EXPECT=matched; output-sha256=8b862fda773869ae53a04877d37a70969bc7b65d1622c8e32858010537d00812; output-bytes=66; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Hackthon\Rosak\reportlah; path=cbec1776725d/53 entries
