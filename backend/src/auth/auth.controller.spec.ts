import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { register: ReturnType<typeof vi.fn>; login: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('delegates to AuthService.register', async () => {
      const dto: RegisterDto = { fullName: 'John Doe', email: 'john@test.com', password: 'password123' };
      authService.register.mockResolvedValue({ id: '1' });

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('login', () => {
    it('sets a session cookie and returns the user', async () => {
      const dto: LoginDto = { email: 'john@test.com', password: 'password123' };
      const req: any = { headers: { 'user-agent': 'vitest' }, ip: '127.0.0.1', socket: {} };
      const res: any = { cookie: vi.fn() };
      const expiresAt = new Date('2030-01-01');
      authService.login.mockResolvedValue({
        rawToken: 'raw-token',
        expiresAt,
        user: { id: '1', email: dto.email, fullName: 'John Doe' },
      });

      const result = await controller.login(dto, req, res);

      expect(authService.login).toHaveBeenCalledWith(dto, {
        userAgent: 'vitest',
        ipAddress: '127.0.0.1',
      });
      expect(res.cookie).toHaveBeenCalledWith(
        'budgetizerr_session',
        'raw-token',
        expect.objectContaining({ httpOnly: true, expires: expiresAt }),
      );
      expect(result).toEqual({ user: { id: '1', email: dto.email, fullName: 'John Doe' } });
    });

    it('falls back to the socket remote address when req.ip is missing', async () => {
      const dto: LoginDto = { email: 'john@test.com', password: 'password123' };
      const req: any = { headers: {}, ip: undefined, socket: { remoteAddress: '10.0.0.1' } };
      const res: any = { cookie: vi.fn() };
      authService.login.mockResolvedValue({
        rawToken: 'raw-token',
        expiresAt: new Date(),
        user: { id: '1' },
      });

      await controller.login(dto, req, res);

      expect(authService.login).toHaveBeenCalledWith(dto, {
        userAgent: undefined,
        ipAddress: '10.0.0.1',
      });
    });
  });

  describe('getProfile', () => {
    it('returns a subset of the request user', async () => {
      const req: any = {
        user: { id: '1', email: 'john@test.com', fullName: 'John Doe', monthlySalary: 2000, passwordHash: 'secret' },
      };

      const result = await controller.getProfile(req);

      expect(result).toEqual({ id: '1', email: 'john@test.com', fullName: 'John Doe', monthlySalary: 2000 });
    });
  });

  describe('logout', () => {
    it('logs out and clears the cookie when a session token is present', async () => {
      const req: any = { cookies: { budgetizerr_session: 'raw-token' } };
      const res: any = { clearCookie: vi.fn() };

      const result = await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith('raw-token');
      expect(res.clearCookie).toHaveBeenCalledWith('budgetizerr_session', expect.any(Object));
      expect(result).toEqual({ message: 'Déconnexion réussie.' });
    });

    it('does not call AuthService.logout when there is no session cookie', async () => {
      const req: any = { cookies: {} };
      const res: any = { clearCookie: vi.fn() };

      await controller.logout(req, res);

      expect(authService.logout).not.toHaveBeenCalled();
    });
  });
});
