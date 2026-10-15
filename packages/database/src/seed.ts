import { PrismaClient, Role, RoundType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CIT 9.0 database with initial assessment structure...');

  // 1. Create or update Default Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cit.istenitdgp.com' },
    update: {},
    create: {
      email: 'admin@cit.istenitdgp.com',
      role: Role.ADMIN,
      profile: {
        create: {
          fullName: 'CIT Administrator',
          displayName: 'Admin',
          mobile: '+919999999999',
          instituteName: 'NIT Durgapur',
          department: 'Computer Science and Engineering',
          yearOfStudy: 'Other',
          isCompleted: true,
        },
      },
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // 2. Create Active Assessment
  const assessment = await prisma.assessment.create({
    data: {
      title: 'Cognitive Intelligence Test 9.0',
      description: 'Annual technical intelligence and problem-solving assessment organized by ISTE NIT Durgapur.',
      isActive: true,
      rounds: {
        create: [
          {
            roundType: RoundType.PRELIMINARY,
            roundNumber: 1,
            positiveScore: 4,
            negativeScore: 1,
            durationMinutes: 45,
            graceSeconds: 60,
            isPublished: true,
            slots: {
              create: [
                {
                  slotNumber: 1,
                  startTime: new Date(Date.now() - 30 * 60 * 1000), // Active now for testing
                  endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
                  capacity: 1000,
                },
                {
                  slotNumber: 2,
                  startTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
                  endTime: new Date(Date.now() + 10 * 60 * 60 * 1000),
                  capacity: 1000,
                },
                {
                  slotNumber: 3,
                  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                  endTime: new Date(Date.now() + 28 * 60 * 60 * 1000),
                  capacity: 1000,
                },
              ],
            },
            questions: {
              create: [
                {
                  orderIndex: 1,
                  promptText: 'What is the time complexity of searching in a balanced Binary Search Tree containing N nodes?',
                  options: {
                    create: [
                      { optionIndex: 1, optionText: 'O(1)', isCorrect: false },
                      { optionIndex: 2, optionText: 'O(log N)', isCorrect: true },
                      { optionIndex: 3, optionText: 'O(N)', isCorrect: false },
                      { optionIndex: 4, optionText: 'O(N log N)', isCorrect: false },
                    ],
                  },
                },
                {
                  orderIndex: 2,
                  promptText: 'Which HTTP method is guaranteed by the HTTP/1.1 specification to be idempotent and safe?',
                  options: {
                    create: [
                      { optionIndex: 1, optionText: 'POST', isCorrect: false },
                      { optionIndex: 2, optionText: 'GET', isCorrect: true },
                      { optionIndex: 3, optionText: 'PATCH', isCorrect: false },
                      { optionIndex: 4, optionText: 'DELETE', isCorrect: false },
                    ],
                  },
                },
                {
                  orderIndex: 3,
                  promptText: 'In PostgreSQL, which transaction isolation level prevents non-repeatable reads but allows phantom reads in standard SQL theory?',
                  options: {
                    create: [
                      { optionIndex: 1, optionText: 'Read Uncommitted', isCorrect: false },
                      { optionIndex: 2, optionText: 'Read Committed', isCorrect: false },
                      { optionIndex: 3, optionText: 'Repeatable Read', isCorrect: true },
                      { optionIndex: 4, optionText: 'Serializable', isCorrect: false },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Created assessment: ${assessment.title}`);
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
