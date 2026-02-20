import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userModel: { findOne: jest.Mock; create: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    userModel = { findOne: jest.fn(), create: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('token-123') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User), useValue: userModel },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('возвращает null при неверном пароле', async () => {
      userModel.findOne.mockResolvedValue({
        login: 'user',
        password_hash: 'hash',
        role: 'user',
        toJSON: () => ({ login: 'user', password_hash: 'hash', role: 'user' }),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('user', 'wrong');

      expect(result).toBeNull();
    });

    it('возвращает user без password_hash при верном пароле', async () => {
      const userData = { login: 'user', password_hash: 'hash', role: 'user' };
      userModel.findOne.mockResolvedValue({
        ...userData,
        toJSON: () => userData,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('user', 'pass');

      expect(result).toEqual({ login: 'user', role: 'user' });
      expect(result).not.toHaveProperty('password_hash');
    });

    it('создаёт user с ролью admin при логине admin', async () => {
      userModel.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      userModel.create.mockResolvedValue({
        login: 'admin',
        password_hash: 'hashed',
        role: 'admin',
        toJSON: () => ({ login: 'admin', password_hash: 'hashed', role: 'admin' }),
      });

      const result = await service.validateUser('admin', 'pass');

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ login: 'admin', role: 'admin' })
      );
      expect(result?.role).toBe('admin');
    });

    it('создаёт user с ролью nikita при логине Никита', async () => {
      userModel.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      userModel.create.mockResolvedValue({
        login: 'Никита',
        password_hash: 'hashed',
        role: 'nikita',
        toJSON: () => ({ login: 'Никита', password_hash: 'hashed', role: 'nikita' }),
      });

      const result = await service.validateUser('Никита', 'pass');

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ login: 'Никита', role: 'nikita' })
      );
      expect(result?.role).toBe('nikita');
    });

    it('создаёт user с ролью user при другом логине', async () => {
      userModel.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      userModel.create.mockResolvedValue({
        login: 'roma',
        password_hash: 'hashed',
        role: 'user',
        toJSON: () => ({ login: 'roma', password_hash: 'hashed', role: 'user' }),
      });

      const result = await service.validateUser('roma', 'pass');

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ login: 'roma', role: 'user' })
      );
      expect(result?.role).toBe('user');
    });
  });

  describe('login', () => {
    it('возвращает access_token', async () => {
      const result = await service.login({ login: 'user', role: 'user' });

      expect(jwtService.sign).toHaveBeenCalledWith({
        username: 'user',
        sub: 'user',
        role: 'user',
      });
      expect(result).toEqual({ access_token: 'token-123' });
    });
  });
});
