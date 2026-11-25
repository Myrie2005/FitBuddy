
/**
 * Demo data: npm run db:reset-demo
 * DELETES ALL DATA in the database and inserts a few users and upcoming workouts.
 * Asks for confirmation first, showing which database it is about to wipe.
 */
import { createInterface } from 'node:readline/promises';
import { prisma } from '../src/core/prisma.js';

// Seeded users can't log in with a password until the auth module sets real hashes.
const NO_PASSWORD = 'seed-user-no-password';

/** A date `days` from today at hh:mm local time. */
function at(days: number, hh: number, mm = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/** Shows which database will be wiped and requires typing "delete". */
async function confirmReset() {
  let target = 'unknown database';
  try {
    const url = new URL(process.env.DATABASE_URL ?? '');
    target = `${url.host}${url.pathname}`;
  } catch {}

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(`\n⚠️  This will DELETE ALL DATA in: ${target}`);
  console.log('   Everyone on the team who uses this database will lose their data too.\n');
  const answer = await rl.question('Type "delete" to continue: ');
  rl.close();

  if (answer.trim() !== 'delete') {
    console.log('Cancelled. Nothing was deleted.');
    process.exit(0);
  }
}

async function main() {
  await confirmReset();

  await prisma.report.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.user.deleteMany();

  const [admin, moshe, miri, sara, amit] = await Promise.all([
    prisma.user.create({ data: { name: 'Admin', email: 'admin@fitbuddy.dev', passwordHash: NO_PASSWORD, role: 'ADMIN' } }),
    prisma.user.create({ data: { name: 'משה קלין', email: 'moshe@fitbuddy.dev', passwordHash: NO_PASSWORD, isTrainer: true, area: 'ירושלים', level: 'INTERMEDIATE', preferredCategory: 'RUNNING', preferredTime: 'ערב' } }),
    prisma.user.create({ data: { name: 'מירי', email: 'miri@fitbuddy.dev', passwordHash: NO_PASSWORD, isTrainer: true, area: 'ירושלים', level: 'ADVANCED', preferredCategory: 'STRENGTH', preferredTime: '20:00' } }),
    prisma.user.create({ data: { name: 'שרה', email: 'sara@fitbuddy.dev', passwordHash: NO_PASSWORD, isTrainer: true, area: 'ירושלים', level: 'ALL' } }),
    prisma.user.create({ data: { name: 'עמית', email: 'amit@fitbuddy.dev', passwordHash: NO_PASSWORD, isTrainer: true, area: 'ירושלים', level: 'INTERMEDIATE' } }),
  ]);

  const workouts = [
    { title: 'ריצת ערב קבוצתית', category: 'RUNNING', level: 'INTERMEDIATE', location: 'גן סאקר, ירושלים', lat: 31.7841, lng: 35.2012, startTime: at(1, 19), maxParticipants: 8, creatorId: moshe.id, joiners: [miri.id, amit.id] },
    { title: 'אימון כוח ומשקל גוף', category: 'STRENGTH', level: 'ADVANCED', location: 'בית וגן, ירושלים', lat: 31.7679, lng: 35.1873, startTime: at(2, 20, 30), maxParticipants: 5, cost: 20, creatorId: miri.id, joiners: [amit.id] },
    { title: 'יוגה בשקיעה', category: 'YOGA', level: 'ALL', location: 'פארק המסילה, ירושלים', lat: 31.7615, lng: 35.2195, startTime: at(3, 17, 30), maxParticipants: 15, wazeUrl: 'https://waze.com/ul?ll=31.7615,35.2195&navigate=yes', creatorId: sara.id, joiners: [miri.id, moshe.id, amit.id] },
    { title: 'כדורסל', category: 'BASKETBALL', level: 'INTERMEDIATE', location: 'מגרש ספורטק, ירושלים', lat: 31.7741, lng: 35.1997, startTime: at(4, 18), maxParticipants: 6, creatorId: amit.id, joiners: [moshe.id] },
    { title: 'רכיבת בוקר', category: 'CYCLING', level: 'ADVANCED', location: 'מסילת הרכבת הישנה, ירושלים', lat: 31.7525, lng: 35.2123, startTime: at(5, 6, 30), maxParticipants: 12, creatorId: moshe.id, joiners: [amit.id] },
    { title: 'טניס זוגות', category: 'TENNIS', level: 'BEGINNER', location: 'מרכז הטניס, ירושלים', lat: 31.7489, lng: 35.1876, startTime: at(6, 17), maxParticipants: 4, cost: 40, creatorId: miri.id, joiners: [sara.id] },
    { title: 'הליכה בפארק', category: 'WALKING', level: 'BEGINNER', location: 'פארק הרכבת, ירושלים', lat: 31.7605, lng: 35.2178, startTime: at(1, 7), maxParticipants: 2, creatorId: sara.id, joiners: [moshe.id] }, // full
  ] as const;

  for (const { joiners, ...w } of workouts) {
    await prisma.workout.create({
      data: {
        ...w,
        registrations: { create: [w.creatorId, ...joiners].map((userId) => ({ userId })) },
      },
    });
  }

  console.log(`Seeded ${await prisma.user.count()} users and ${await prisma.workout.count()} workouts.`);
  console.log(`Admin user id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
