import { ConflictException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { createMockManager, createMockQueryRunner } from '../test-utils/mock-query-runner';

describe('AuthService', () => {
  let manager: ReturnType<typeof createMockManager>;
  let queryRunner: ReturnType<typeof createMockQueryRunner>;
  let dataSource: any;
  let service: AuthService;

  beforeEach(() => {
    manager = createMockManager();
    queryRunner = createMockQueryRunner(manager);
    dataSource = {
      createQueryRunner: vi.fn(() => queryRunner),
      getRepository: vi.fn(),
    };
    service = new AuthService(dataSource);
  });

  describe('register', () => {
    const dto = {
      fullName: 'John Doe',
      email: 'John@Test.com',
      password: 'password123',
      monthlySalary: 2500,
    };

    it('creates a user, a household, a membership and an activity log', async () => {
      manager.findOne.mockResolvedValueOnce(null); // no existing user

      const result = await service.register(dto);

      expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), {
        where: { email: 'john@test.com' },
      });
      expect(manager.save).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result).toMatchObject({
        email: 'john@test.com',
        fullName: 'John Doe',
        household: { name: 'Foyer de John' },
      });
    });

    it('throws ConflictException when the email is already used', async () => {
      manager.findOne.mockResolvedValueOnce({ id: 'existing-user' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('wraps unexpected errors in an InternalServerErrorException', async () => {
      manager.findOne.mockRejectedValueOnce(new Error('db down'));

      await expect(service.register(dto)).rejects.toThrow(InternalServerErrorException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { email: 'John@Test.com', password: 'password123' };

    it('returns a raw token and the user when credentials are valid', async () => {
      const passwordHash = await bcrypt.hash(dto.password, 4);
      const findOne = vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'john@test.com',
        fullName: 'John Doe',
        passwordHash,
      });
      const sessionRepo = { create: vi.fn((data) => data), save: vi.fn() };
      dataSource.getRepository.mockImplementation((entity: any) =>
        entity.name === 'Session' ? sessionRepo : { findOne },
      );

      const result = await service.login(dto, { userAgent: 'vitest', ipAddress: '127.0.0.1' });

      expect(result.user).toEqual({ id: 'user-1', email: 'john@test.com', fullName: 'John Doe' });
      expect(result.rawToken).toEqual(expect.any(String));
      expect(sessionRepo.save).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      dataSource.getRepository.mockReturnValue({ findOne: vi.fn().mockResolvedValue(null) });

      await expect(service.login(dto, {})).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password is invalid', async () => {
      const passwordHash = await bcrypt.hash('a-different-password', 4);
      dataSource.getRepository.mockReturnValue({
        findOne: vi.fn().mockResolvedValue({ id: 'user-1', passwordHash }),
      });

      await expect(service.login(dto, {})).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('deletes the session matching the hashed token', async () => {
      const sessionRepo = { delete: vi.fn() };
      dataSource.getRepository.mockReturnValue(sessionRepo);

      await service.logout('raw-token');

      expect(sessionRepo.delete).toHaveBeenCalledWith({ refreshTokenHash: expect.any(String) });
    });

    it('does nothing when no token is provided', async () => {
      const sessionRepo = { delete: vi.fn() };
      dataSource.getRepository.mockReturnValue(sessionRepo);

      await service.logout('');

      expect(sessionRepo.delete).not.toHaveBeenCalled();
    });
  });
});
