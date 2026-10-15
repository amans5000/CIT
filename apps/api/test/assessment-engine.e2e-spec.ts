import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { Role, RoundType, AttemptStatus } from '@cit9/database';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('CIT 9.0 Assessment Engine E2E Specification', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Admin user
  let adminToken: string;
  let adminCsrf: string;
  let adminUserId: string;
  let adminCookies: string[];

  // Student 1 (Top scorer)
  let student1Token: string;
  let student1Csrf: string;
  let student1UserId: string;
  let student1Cookies: string[];

  // Student 2 (Low scorer)
  let student2Token: string;
  let student2Csrf: string;
  let student2UserId: string;
  let student2Cookies: string[];

  // Assessment entity IDs
  let assessmentId: string;
  let prelimRoundId: string;
  let finalRoundId: string;
  let activeSlotId: string;
  let futureSlotId: string;
  let expiredSlotId: string;
  let finalsSlotId: string;

  let question1Id: string;
  let question1CorrectOptionId: string;

  let question2Id: string;
  let question2CorrectOptionId: string;
  let question2WrongOptionId: string;

  let question3Id: string;
  let question3WrongOptionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser('test_cookie_secret_at_least_32_characters_long_for_ci'));
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
    prisma = app.get(PrismaService);

    // 1. Authenticate Admin
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/mock-login')
      .send({ email: 'assessment_admin@cit9.test', role: Role.ADMIN })
      .expect(200);
    adminUserId = adminRes.body.data.userId;
    adminCsrf = adminRes.body.data.csrfToken;
    adminToken = extractCookieValue((adminRes.headers['set-cookie'] as unknown as string[]) || [], 'cit_session');
    adminCookies = [`cit_session=${adminToken}`, `cit_csrf=${adminCsrf}`];

    // 2. Authenticate Student 1
    const s1Res = await request(app.getHttpServer())
      .post('/api/v1/auth/mock-login')
      .send({ email: 'student1_assessment@cit9.test', role: Role.PARTICIPANT })
      .expect(200);
    student1UserId = s1Res.body.data.userId;
    student1Csrf = s1Res.body.data.csrfToken;
    student1Token = extractCookieValue((s1Res.headers['set-cookie'] as unknown as string[]) || [], 'cit_session');
    student1Cookies = [`cit_session=${student1Token}`, `cit_csrf=${student1Csrf}`];

    // Complete Student 1 Profile
    await request(app.getHttpServer())
      .patch('/api/v1/users/profile')
      .set('Cookie', student1Cookies)
      .set('x-csrf-token', student1Csrf)
      .send({
        fullName: 'Alice Test',
        displayName: 'Alice TopScorer',
        mobile: '+919876543210',
        instituteName: 'NIT Durgapur',
        yearOfStudy: '3rd Year',
      })
      .expect(200);

    // 3. Authenticate Student 2
    const s2Res = await request(app.getHttpServer())
      .post('/api/v1/auth/mock-login')
      .send({ email: 'student2_assessment@cit9.test', role: Role.PARTICIPANT })
      .expect(200);
    student2UserId = s2Res.body.data.userId;
    student2Csrf = s2Res.body.data.csrfToken;
    student2Token = extractCookieValue((s2Res.headers['set-cookie'] as unknown as string[]) || [], 'cit_session');
    student2Cookies = [`cit_session=${student2Token}`, `cit_csrf=${student2Csrf}`];

    // Complete Student 2 Profile
    await request(app.getHttpServer())
      .patch('/api/v1/users/profile')
      .set('Cookie', student2Cookies)
      .set('x-csrf-token', student2Csrf)
      .send({
        fullName: 'Bob Test',
        displayName: 'Bob LowScorer',
        mobile: '+919876543211',
        instituteName: 'NIT Durgapur',
        yearOfStudy: '2nd Year',
      })
      .expect(200);

    // 4. Setup Test Assessment with Prelim and Final rounds
    const assessment = await prisma.assessment.create({
      data: {
        title: 'CIT 9.0 Test Championship',
        description: 'Automated assessment suite test fixture',
        rounds: {
          create: [
            {
              roundNumber: 1,
              roundType: RoundType.PRELIMINARY,
              durationMinutes: 30,
              graceSeconds: 60,
              positiveScore: 4,
              negativeScore: 1,
              isPublished: true,
            },
            {
              roundNumber: 2,
              roundType: RoundType.FINAL,
              durationMinutes: 45,
              graceSeconds: 60,
              positiveScore: 4,
              negativeScore: 1,
              isPublished: true,
            },
          ],
        },
      },
    });

    assessmentId = assessment.id;
    const rounds = await prisma.assessmentRound.findMany({
      where: { assessmentId },
    });
    const prelimRound = rounds.find((r) => r.roundType === RoundType.PRELIMINARY)!;
    const finalRound = rounds.find((r) => r.roundType === RoundType.FINAL)!;
    prelimRoundId = prelimRound.id;
    finalRoundId = finalRound.id;

    // 5. Setup Assessment Slots
    const now = new Date();
    // Active Slot: started 5 minutes ago, ends in 25 minutes
    const activeSlot = await prisma.assessmentSlot.create({
      data: {
        roundId: prelimRoundId,
        slotNumber: 1,
        startTime: new Date(now.getTime() - 5 * 60 * 1000),
        endTime: new Date(now.getTime() + 25 * 60 * 1000),
        capacity: 100,
      },
    });
    activeSlotId = activeSlot.id;

    // Future Slot: starts tomorrow
    const futureSlot = await prisma.assessmentSlot.create({
      data: {
        roundId: prelimRoundId,
        slotNumber: 2,
        startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 25 * 60 * 60 * 1000),
        capacity: 100,
      },
    });
    futureSlotId = futureSlot.id;

    // Expired Slot: ended 2 hours ago
    const expiredSlot = await prisma.assessmentSlot.create({
      data: {
        roundId: prelimRoundId,
        slotNumber: 3,
        startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        capacity: 100,
      },
    });
    expiredSlotId = expiredSlot.id;

    // Finals Slot: active
    const finalsSlot = await prisma.assessmentSlot.create({
      data: {
        roundId: finalRoundId,
        slotNumber: 1,
        startTime: new Date(now.getTime() - 5 * 60 * 1000),
        endTime: new Date(now.getTime() + 40 * 60 * 1000),
        capacity: 20,
      },
    });
    finalsSlotId = finalsSlot.id;

    // 6. Setup Question Bank for Preliminary Round
    // Question 1
    const q1 = await prisma.question.create({
      data: {
        roundId: prelimRoundId,
        orderIndex: 1,
        promptText: 'What is the time complexity of lookup in a balanced binary search tree?',
        options: {
          create: [
            { optionIndex: 1, optionText: 'O(1)', isCorrect: false },
            { optionIndex: 2, optionText: 'O(log n)', isCorrect: true },
            { optionIndex: 3, optionText: 'O(n)', isCorrect: false },
            { optionIndex: 4, optionText: 'O(n log n)', isCorrect: false },
          ],
        },
      },
      include: { options: true },
    });
    question1Id = q1.id;
    question1CorrectOptionId = q1.options.find((o) => o.isCorrect)!.id;

    // Question 2
    const q2 = await prisma.question.create({
      data: {
        roundId: prelimRoundId,
        orderIndex: 2,
        promptText: 'Which protocol operates at the Transport Layer of the OSI model?',
        options: {
          create: [
            { optionIndex: 1, optionText: 'TCP', isCorrect: true },
            { optionIndex: 2, optionText: 'IP', isCorrect: false },
            { optionIndex: 3, optionText: 'HTTP', isCorrect: false },
            { optionIndex: 4, optionText: 'Ethernet', isCorrect: false },
          ],
        },
      },
      include: { options: true },
    });
    question2Id = q2.id;
    question2CorrectOptionId = q2.options.find((o) => o.isCorrect)!.id;
    question2WrongOptionId = q2.options.find((o) => !o.isCorrect)!.id;

    // Question 3
    const q3 = await prisma.question.create({
      data: {
        roundId: prelimRoundId,
        orderIndex: 3,
        promptText: 'What is the main principle of RESTful architecture?',
        options: {
          create: [
            { optionIndex: 1, optionText: 'Stateless communication', isCorrect: true },
            { optionIndex: 2, optionText: 'Stateful sessions', isCorrect: false },
            { optionIndex: 3, optionText: 'Synchronous locking', isCorrect: false },
            { optionIndex: 4, optionText: 'RPC encapsulation', isCorrect: false },
          ],
        },
      },
      include: { options: true },
    });
    question3Id = q3.id;
    question3WrongOptionId = q3.options.find((o) => !o.isCorrect)!.id;
  });

  afterAll(async () => {
    // Teardown test assessment and users
    if (assessmentId) {
      await prisma.assessment.delete({ where: { id: assessmentId } }).catch(() => {});
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'assessment_admin@cit9.test',
            'student1_assessment@cit9.test',
            'student2_assessment@cit9.test',
          ],
        },
      },
    }).catch(() => {});

    await app.close();
  });

  describe('1. Profile Completion Gating & Slot Selection', () => {
    it('should reject slot selection if participant profile is not completed', async () => {
      // Create user with incomplete profile
      const incRes = await request(app.getHttpServer())
        .post('/api/v1/auth/mock-login')
        .send({ email: 'incomplete_user@cit9.test', role: Role.PARTICIPANT });
      const incToken = extractCookieValue((incRes.headers['set-cookie'] as unknown as string[]) || [], 'cit_session');
      const incCsrf = incRes.body.data.csrfToken;
      const incCookies = [`cit_session=${incToken}`, `cit_csrf=${incCsrf}`];

      // Explicitly set profile isCompleted to false
      await prisma.participantProfile.update({
        where: { userId: incRes.body.data.userId },
        data: { isCompleted: false },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/attempts/select-slot')
        .set('Cookie', incCookies)
        .set('x-csrf-token', incCsrf)
        .send({ slotId: activeSlotId });

      expect(res.status).toBe(400);
      expect(res.body.error.message || res.body.message).toMatch(/complete profile/i);

      // Clean up incomplete user
      await prisma.user.delete({ where: { id: incRes.body.data.userId } });
    });

    it('should allow completed profile student to register for an active slot', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attempts/select-slot')
        .set('Cookie', student1Cookies)
        .set('x-csrf-token', student1Csrf)
        .send({ slotId: activeSlotId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(AttemptStatus.NOT_STARTED);
      expect(res.body.data.slotId).toBe(activeSlotId);
    });
  });

  describe('2. Security: Answer-Key Leak Prevention (Information Disclosure)', () => {
    it('should forbid participant from accessing question bank answer key endpoint (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/questions/round/${prelimRoundId}`)
        .set('Cookie', student1Cookies)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow admins to view answer keys for management', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/questions/round/${prelimRoundId}`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.success).toBe(true);
      const questions = res.body.data;
      const q1 = questions.find((q: any) => q.id === question1Id);
      expect(q1.options.some((o: any) => o.isCorrect === true)).toBe(true);
    });
  });

  describe('3. Authoritative Server Time & Slot Deadline Enforcement', () => {
    it('should forbid participant from starting exam in a future slot', async () => {
      // Re-register student 1 to future slot
      await prisma.assessmentAttempt.updateMany({
        where: { userId: student1UserId, roundId: prelimRoundId },
        data: { slotId: futureSlotId },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/attempts/start')
        .set('Cookie', student1Cookies)
        .set('x-csrf-token', student1Csrf)
        .send({ roundId: prelimRoundId });

      expect(res.status).toBe(403);
      expect(res.body.error.message || res.body.message).toMatch(/slot has not started yet/i);
    });

    it('should mark attempt EXPIRED and forbid starting if slot window has ended', async () => {
      // Re-register student 1 to expired slot
      await prisma.assessmentAttempt.updateMany({
        where: { userId: student1UserId, roundId: prelimRoundId },
        data: { slotId: expiredSlotId },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/attempts/start')
        .set('Cookie', student1Cookies)
        .set('x-csrf-token', student1Csrf)
        .send({ roundId: prelimRoundId });

      expect(res.status).toBe(403);
      expect(res.body.error.message || res.body.message).toMatch(/slot window has ended/i);

      // Verify database attempt status transitioned to EXPIRED
      const attempt = await prisma.assessmentAttempt.findUnique({
        where: { userId_roundId: { userId: student1UserId, roundId: prelimRoundId } },
      });
      expect(attempt?.status).toBe(AttemptStatus.EXPIRED);
    });

    it('should successfully start exam attempt during active slot window', async () => {
      // Reset student 1 attempt to active slot
      await prisma.assessmentAttempt.updateMany({
        where: { userId: student1UserId, roundId: prelimRoundId },
        data: { slotId: activeSlotId, status: AttemptStatus.NOT_STARTED },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/attempts/start')
        .set('Cookie', student1Cookies)
        .set('x-csrf-token', student1Csrf)
        .send({ roundId: prelimRoundId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(AttemptStatus.IN_PROGRESS);
      expect(res.body.data.remainingSeconds).toBeGreaterThan(0);
      expect(res.body.data.positiveScore).toBe(4);
      expect(res.body.data.negativeScore).toBe(1);
    });

    it('should provide questions during exam without leaking answer key', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/attempts/round/${prelimRoundId}/question/1`)
        .set('Cookie', student1Cookies)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orderIndex).toBe(1);
      expect(res.body.data.promptText).toBeDefined();
      expect(res.body.data.options.length).toBe(4);
      for (const opt of res.body.data.options) {
        expect(opt.isCorrect).toBeUndefined();
      }
    });
  });

  describe('4. Scoring Rules: Positive Marking, Negative Marking, and Skips', () => {
    let student1AttemptId: string;

    beforeAll(async () => {
      const attempt = await prisma.assessmentAttempt.findUnique({
        where: { userId_roundId: { userId: student1UserId, roundId: prelimRoundId } },
      });
      student1AttemptId = attempt!.id;
    });

    it('Question 1: Award +4 points for correct answer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Cookie', student1Cookies)
        .set('x-csrf-token', student1Csrf)
        .send({
          attemptId: student1AttemptId,
          questionId: question1Id,
          selectedOptionId: question1CorrectOptionId,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.awardedScore).toBe(4);
      expect(res.body.data.currentScore).toBe(4);
      expect(res.body.data.nextQuestion).toBe(2);
    });

    it('Question 2: Penalize -1 point for incorrect answer (negative marking)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Cookie', student1Cookies)
        .set('x-csrf-token', student1Csrf)
        .send({
          attemptId: student1AttemptId,
          questionId: question2Id,
          selectedOptionId: question2WrongOptionId,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.awardedScore).toBe(-1);
      // Previous 4 + (-1) = 3
      expect(res.body.data.currentScore).toBe(3);
      expect(res.body.data.nextQuestion).toBe(3);
    });

    it('Question 3: Award 0 points when skipped (no selected option)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Cookie', student1Cookies)
        .set('x-csrf-token', student1Csrf)
        .send({
          attemptId: student1AttemptId,
          questionId: question3Id,
          // selectedOptionId omitted => skip
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.awardedScore).toBe(0);
      expect(res.body.data.currentScore).toBe(3);
      // Auto-finished after last question
      expect(res.body.data.isFinished).toBe(true);
    });

    it('should have transitioned attempt to SUBMITTED upon completion', async () => {
      const attempt = await prisma.assessmentAttempt.findUnique({
        where: { id: student1AttemptId },
      });
      expect(attempt?.status).toBe(AttemptStatus.SUBMITTED);
      expect(attempt?.score).toBe(3);
      expect(attempt?.submittedAt).toBeDefined();
    });
  });

  describe('5. Concurrency, Idempotency & Duplicate Prevention', () => {
    let student2AttemptId: string;

    beforeAll(async () => {
      // Register and start Student 2
      await request(app.getHttpServer())
        .post('/api/v1/attempts/select-slot')
        .set('Cookie', student2Cookies)
        .set('x-csrf-token', student2Csrf)
        .send({ slotId: activeSlotId })
        .expect(201);

      const startRes = await request(app.getHttpServer())
        .post('/api/v1/attempts/start')
        .set('Cookie', student2Cookies)
        .set('x-csrf-token', student2Csrf)
        .send({ roundId: prelimRoundId })
        .expect(201);

      student2AttemptId = startRes.body.data.id;
    });

    it('Duplicate Slot Selection: Should reject duplicate slot attempt when in progress', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attempts/select-slot')
        .set('Cookie', student2Cookies)
        .set('x-csrf-token', student2Csrf)
        .send({ slotId: futureSlotId });

      expect(res.status).toBe(400);
      expect(res.body.error.message || res.body.message).toMatch(/cannot change slot after exam has started/i);
    });

    it('Simultaneous Requests: Parallel submission requests must not double count score', async () => {
      // Fire 5 identical simultaneous submission requests
      const submissions = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/submissions')
          .set('Cookie', student2Cookies)
          .set('x-csrf-token', student2Csrf)
          .send({
            attemptId: student2AttemptId,
            questionId: question1Id,
            selectedOptionId: question1CorrectOptionId, // +4
          }),
      );

      const responses = await Promise.all(submissions);

      // Verify all responses succeeded (201)
      for (const r of responses) {
        expect(r.status).toBe(201);
      }

      // Check database to ensure exactly 1 submission record exists
      const dbSubmissions = await prisma.questionSubmission.findMany({
        where: {
          attemptId: student2AttemptId,
          questionId: question1Id,
        },
      });
      expect(dbSubmissions.length).toBe(1);

      // Check database attempt score to ensure it is exactly 4, NOT 20
      const attempt = await prisma.assessmentAttempt.findUnique({
        where: { id: student2AttemptId },
      });
      expect(attempt?.score).toBe(4);
    });

    it('Submission Ownership Validation: Student 2 cannot submit answers for Student 1 attempt', async () => {
      const attempt1 = await prisma.assessmentAttempt.findUnique({
        where: { userId_roundId: { userId: student1UserId, roundId: prelimRoundId } },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Cookie', student2Cookies)
        .set('x-csrf-token', student2Csrf)
        .send({
          attemptId: attempt1!.id,
          questionId: question2Id,
          selectedOptionId: question2CorrectOptionId,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message || res.body.message).toMatch(/do not own this exam attempt/i);
    });
  });

  describe('6. Qualification Cutoffs, Promotion, & Audit Logging', () => {
    beforeAll(async () => {
      // Complete Student 2 exam with a negative score to test cutoff threshold
      const attempt2 = await prisma.assessmentAttempt.findUnique({
        where: { userId_roundId: { userId: student2UserId, roundId: prelimRoundId } },
      });

      // Submit wrong answer for Q2 (-1), score becomes 3
      await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Cookie', student2Cookies)
        .set('x-csrf-token', student2Csrf)
        .send({
          attemptId: attempt2!.id,
          questionId: question2Id,
          selectedOptionId: question2WrongOptionId,
        });

      // Submit wrong answer for Q3 (-1), score becomes 2
      await request(app.getHttpServer())
        .post('/api/v1/submissions')
        .set('Cookie', student2Cookies)
        .set('x-csrf-token', student2Csrf)
        .send({
          attemptId: attempt2!.id,
          questionId: question3Id,
          selectedOptionId: question3WrongOptionId, // Belongs to Q3
        })
        .expect(201);

      // Student 1 has score: 3
      // Student 2 has score: 2
    });

    it('Non-admin cannot evaluate qualification cutoffs', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/qualification/evaluate')
        .set('Cookie', student1Cookies)
        .set('x-csrf-token', student1Csrf)
        .send({
          roundId: prelimRoundId,
          cutoffScore: 3,
        });

      expect(res.status).toBe(403);
    });

    it('Admin evaluates cutoffScore=3: Student 1 qualifies (3 >= 3), Student 2 does not (2 < 3)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/qualification/evaluate')
        .set('Cookie', adminCookies)
        .set('x-csrf-token', adminCsrf)
        .send({
          roundId: prelimRoundId,
          cutoffScore: 3,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalEvaluated).toBe(2);
      expect(res.body.data.totalQualified).toBe(1);
      expect(res.body.data.qualifiedParticipants[0].userId).toBe(student1UserId);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'EVALUATE_QUALIFICATION_CUTOFFS',
          resource: `Round:${prelimRoundId}`,
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.userId).toBe(adminUserId);
    });

    it('Final Round Gating: Disqualified Student 2 cannot register for final round slot', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attempts/select-slot')
        .set('Cookie', student2Cookies)
        .set('x-csrf-token', student2Csrf)
        .send({ slotId: finalsSlotId });

      expect(res.status).toBe(403);
      expect(res.body.error.message || res.body.message).toMatch(/did not qualify|not qualified/i);
    });

    it('Final Round Gating: Qualified Student 1 can successfully register for final round slot', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attempts/select-slot')
        .set('Cookie', student1Cookies)
        .set('x-csrf-token', student1Csrf)
        .send({ slotId: finalsSlotId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isQualified).toBe(true);
      expect(res.body.data.roundId).toBe(finalRoundId);
    });
  });

  describe('7. Leaderboard & Analytics Validation', () => {
    it('should return paginated slot leaderboard ordered by score descending', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/leaderboard/slots/${activeSlotId}?page=1&limit=10`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.leaderboard).toBeDefined();
      expect(res.body.data.totalParticipants).toBe(2);
      // Scores may be masked for unauthenticated public viewers while active
      expect(res.body.data.scoresMasked).toBe(true);
    });

    it('Admin can view unmasked leaderboard while slot is active', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/leaderboard/slots/${activeSlotId}`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.scoresMasked).toBe(false);
      expect(res.body.data.leaderboard[0].score).toBe(3); // Alice TopScorer
    });

    it('Question-level analytics: computes accuracy, correct and incorrect counts', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/analytics/questions/${question1Id}`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalSubmissions).toBe(2);
      expect(res.body.data.correctCount).toBe(2); // Both Alice and Bob got Q1 right
      expect(res.body.data.accuracyRate).toBe(100);
      expect(res.body.data.optionsBreakdown.length).toBe(4);
    });

    it('Round Overview analytics: computes turnout and average scores', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/analytics/rounds/${prelimRoundId}/overview`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalParticipants).toBe(2);
      expect(res.body.data.submittedCount).toBe(2);
      expect(res.body.data.highestScore).toBe(3);
      expect(res.body.data.lowestScore).toBe(2);
      expect(res.body.data.averageScore).toBe(2.5);
    });
  });
});

function extractCookieValue(setCookieHeaders: string[], cookieName: string): string {
  for (const header of setCookieHeaders) {
    if (header.startsWith(`${cookieName}=`)) {
      const parts = header.split(';')[0];
      if (parts) {
        return parts.split('=')[1] || '';
      }
    }
  }
  return '';
}
