import type { Complaint, EngineState, Group } from './types';

export const DRAIN_GROUP_ID = 'g_drain';
export const LIGHT_GROUP_ID = 'g_light';
export const DEMO_TODAY = '2026-11-19';
export const DRAIN_PLACE = 'Jalan Kerinchi, near the bus stop, Bangsar South';

function seeded(id: string, date: string, text: string): Complaint {
  return { id, date, text, source: 'seed' };
}

// The drain complaints echo Reportlah's sample data (10, 12, 14 and 16 Nov), in English.
const GROUPS: readonly Group[] = [
  {
    id: LIGHT_GROUP_ID,
    title: 'Street light out',
    place: 'Jalan Kerinchi, junction with Lorong 3',
    issue: 'a street light that is out',
    complaints: [
      seeded('c_l1', '2026-11-08', 'The street light at the Lorong 3 junction has been off since last week. It is very dark at night.'),
      seeded('c_l2', '2026-11-11', 'Still no light at the Jalan Kerinchi junction. Walking home after 8pm feels unsafe.'),
      seeded('c_l3', '2026-11-13', 'Street light pole near Lorong 3 is dead. Two others on the same stretch flicker.'),
      seeded('c_l4', '2026-11-15', 'The lamp at the corner of Lorong 3 is still out, three weeks now.'),
      seeded('c_l5', '2026-11-18', 'Dark stretch at the Lorong 3 junction again tonight. Please check the light.'),
    ],
  },
  {
    id: DRAIN_GROUP_ID,
    title: 'Clogged drain',
    place: DRAIN_PLACE,
    issue: 'a clogged drain with standing water beside the road',
    complaints: [
      seeded('c_d1', '2026-11-10', 'The drain in front of the Jalan Kerinchi bus stop is blocked and water has been standing for three days.'),
      seeded('c_d2', '2026-11-12', 'The drain near the bus stop is clogged again. Smells terrible.'),
      seeded('c_d3', '2026-11-14', 'The roadside drain beside Jalan Kerinchi is full of rubbish and there are more mosquitoes every day.'),
      seeded('c_d4', '2026-11-16', 'Drain blocked opposite the bus stop, water overflowed onto the walkway after the rain.'),
    ],
  },
  {
    id: 'g_tile',
    title: 'Damaged walkway tile',
    place: 'Walkway outside the shop lots, Jalan Kerinchi',
    issue: 'broken walkway tiles',
    complaints: [
      seeded('c_t1', '2026-11-09', 'Several walkway tiles outside the shop lots are cracked. Someone could trip.'),
      seeded('c_t2', '2026-11-13', 'A loose tile rocks under your foot near the second shop lot.'),
      seeded('c_t3', '2026-11-17', 'Broken tile still there. A stroller wheel got stuck this morning.'),
    ],
  },
  {
    id: 'g_bin',
    title: 'Overflowing public bin',
    place: 'Public bin at the playground, Taman Kerinchi',
    issue: 'an overflowing public bin',
    complaints: [
      seeded('c_b1', '2026-11-12', 'The bin at the playground is overflowing and the rubbish is spreading onto the grass.'),
      seeded('c_b2', '2026-11-17', 'The playground bin has not been emptied for days. Flies everywhere.'),
    ],
  },
  {
    id: 'g_zebra',
    title: 'Faded zebra crossing',
    place: 'Zebra crossing near the primary school, Jalan Kerinchi',
    issue: 'a faded zebra crossing',
    complaints: [
      seeded('c_z1', '2026-11-11', 'The zebra crossing in front of the school is almost invisible. Drivers do not slow down.'),
      seeded('c_z2', '2026-11-14', 'Please repaint the crossing near the school before the next term starts.'),
    ],
  },
  {
    id: 'g_branch',
    title: 'Fallen branch on footpath',
    place: 'Footpath by the community hall, Jalan Kerinchi',
    issue: 'a fallen branch blocking the footpath',
    complaints: [seeded('c_f1', '2026-11-18', 'A large branch fell on the footpath beside the community hall and is blocking the way.')],
  },
];

export function createSeedState(): EngineState {
  return { today: DEMO_TODAY, groups: GROUPS, drafts: [], approvals: {}, opened: {} };
}
