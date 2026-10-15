import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { Role } from '@cit9/database';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Auth & Security E2E Specification', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let participantToken: string;
  let participantCsrf: string;
  let participantUserId: string;

  let participant2Token: string;
  let participant2UserId: string;

  let adminToken: string;
  let adminCsrf: string;
  let adminUserId: string;

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

    // Setup Test Users via mock-login
    // 1. Participant 1
    const p1Res = await request(app.getHttpServer())
      .post('/api/v1/auth/mock-login')
      .send({ email: 'participant1_security_test@test.com', role: Role.PARTICIPANT })
      .expect(200);

    participantUserId = p1Res.body.data.userId;
    participantCsrf = p1Res.body.data.csrfToken;
    const p1Cookies = (p1Res.headers['set-cookie'] as unknown as string[]) || [];
    participantToken = extractCookieValue(p1Cookies, 'cit_session');

    // 2. Participant 2
    const p2Res = await request(app.getHttpServer())
      .post('/api/v1/auth/mock-login')
      .send({ email: 'participant2_security_test@test.com', role: Role.PARTICIPANT })
      .expect(200);

    participant2UserId = p2Res.body.data.userId;
    const p2Cookies = (p2Res.headers['set-cookie'] as unknown as string[]) || [];
    participant2Token = extractCookieValue(p2Cookies, 'cit_session');

    // 3. Admin
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/mock-login')
      .send({ email: 'admin_security_test@test.com', role: Role.ADMIN })
      .expect(200);

    adminUserId = adminRes.body.data.userId;
    adminCsrf = adminRes.body.data.csrfToken;
    const adminCookies = (adminRes.headers['set-cookie'] as unknown as string[]) || [];
    adminToken = extractCookieValue(adminCookies, 'cit_session');
  });

  afterAll(async () => {
    // Cleanup test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'participant1_security_test@test.com',
            'participant2_security_test@test.com',
            'admin_security_test@test.com',
          ],
        },
      },
    });
    await app.close();
  });

  describe('1. Unauthenticated Requests', () => {
    it('should reject GET /api/v1/users/me without credentials (401)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Authentication required');
    });

    it('should reject GET /api/v1/admin/users without credentials (401)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Invalid & Forged Sessions', () => {
    it('should reject request with tampered/fake cookie (401)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', [`cit_session=forged_invalid_session_token_1234567890`])
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Role-Based Authorization & Role Escalation Prevention', () => {
    it('should forbid participant from accessing GET /api/v1/admin/users (403)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', [`cit_session=${participantToken}`])
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Access denied');
    });

    it('should allow admin to access GET /api/v1/admin/users (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', [`cit_session=${adminToken}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
    });

    it('should reject extra role field in profile update (whitelist validation)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/profile')
        .set('Cookie', [`cit_session=${participantToken}`, `cit_csrf=${participantCsrf}`])
        .set('x-csrf-token', participantCsrf)
        .send({
          fullName: 'Hacker Name',
          displayName: 'Hacker',
          mobile: '+919999999999',
          instituteName: 'NIT Durgapur',
          yearOfStudy: '4th Year',
          role: 'ADMIN', // Illegal field injection
        })
        .expect(400); // ForbidNonWhitelisted rejects injected 'role'
    });
  });

  describe('4. Cross-User Data Access (IDOR Protection)', () => {
    it('should allow participant to view their own profile by ID (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${participantUserId}`)
        .set('Cookie', [`cit_session=${participantToken}`])
        .expect(200);

      expect(res.body.data.id).toBe(participantUserId);
    });

    it('should prevent Participant 1 from viewing Participant 2’s profile by ID (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${participant2UserId}`)
        .set('Cookie', [`cit_session=${participantToken}`])
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Access denied: You do not have permission to view other users');
    });

    it('should allow Admin to view any user profile by ID (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${participant2UserId}`)
        .set('Cookie', [`cit_session=${adminToken}`])
        .expect(200);

      expect(res.body.data.id).toBe(participant2UserId);
    });
  });

  describe('5. Administrative Role Updates & Session Revocation', () => {
    it('should allow Admin to promote a participant and revoke their sessions', async () => {
      // 1. Admin updates Participant 2's role to ORGANIZER
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${participant2UserId}/role`)
        .set('Cookie', [`cit_session=${adminToken}`, `cit_csrf=${adminCsrf}`])
        .set('x-csrf-token', adminCsrf)
        .send({ role: Role.ORGANIZER })
        .expect(200);

      expect(updateRes.body.data.role).toBe(Role.ORGANIZER);
      expect(updateRes.body.data.sessionsRevoked).toBe(true);

      // 2. Privilege Change Invariant: Participant 2's previous session must now be revoked (401)
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', [`cit_session=${participant2Token}`])
        .expect(401);

      // 3. Verify Audit Log entry created in database
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'UPDATE_USER_ROLE',
          resource: `User:${participant2UserId}`,
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(adminUserId);
    });
  });

  describe('6. Logout & Session Invalidation', () => {
    it('should successfully log out and invalidate the session', async () => {
      // 1. Perform Logout
      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', [`cit_session=${participantToken}`])
        .expect(200);

      expect(logoutRes.body.success).toBe(true);

      // 2. Re-attempt request with the logged-out session cookie -> must fail with 401
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', [`cit_session=${participantToken}`])
        .expect(401);
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
