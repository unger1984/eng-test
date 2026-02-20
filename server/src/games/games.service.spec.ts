import { Test, TestingModule } from '@nestjs/testing';

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));
import { getModelToken } from '@nestjs/sequelize';
import { BadRequestException } from '@nestjs/common';
import { GamesService } from './games.service';
import { Round } from '../models/round.model';
import { Score } from '../models/score.model';
import { User } from '../models/user.model';

describe('GamesService', () => {
  let service: GamesService;
  let roundModel: jest.Mocked<{ findByPk: jest.Mock; findAll: jest.Mock; create: jest.Mock }>;
  let scoreModel: jest.Mocked<{
    findOne: jest.Mock;
    findOrCreate: jest.Mock;
    increment: jest.Mock;
    findAll: jest.Mock;
  }>;

  const createRound = (overrides: Partial<{ start_datetime: Date; end_datetime: Date }> = {}) => {
    const now = new Date();
    return {
      uuid: 'round-1',
      start_datetime: overrides.start_datetime ?? new Date(now.getTime() - 60000),
      end_datetime: overrides.end_datetime ?? new Date(now.getTime() + 60000),
      status: 'scheduled',
    } as Round;
  };

  const createScore = (taps: number) => {
    const score = {
      user: 'user1',
      round: 'round-1',
      taps,
      reload: jest.fn().mockImplementation(function (this: { taps: number }) {
        this.taps += 1;
        return Promise.resolve();
      }),
      userRef: { login: 'testuser' },
    };
    return score as unknown as Score;
  };

  beforeEach(async () => {
    const mockRoundModel = {
      findByPk: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    const mockScoreModel = {
      findOne: jest.fn(),
      findOrCreate: jest.fn(),
      increment: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn(),
    };
    const mockUserModel = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: getModelToken(Round), useValue: mockRoundModel },
        { provide: getModelToken(Score), useValue: mockScoreModel },
        { provide: getModelToken(User), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    roundModel = module.get(getModelToken(Round)) as typeof roundModel;
    scoreModel = module.get(getModelToken(Score)) as typeof scoreModel;
  });

  describe('scoreFromTapsCount', () => {
    it('1 тап = 1 очко', () => {
      expect(service.scoreFromTapsCount(1)).toBe(1);
      expect(service.scoreFromTapsCount(10)).toBe(10);
    });

    it('каждый 11-й тап даёт 10 вместо 1', () => {
      expect(service.scoreFromTapsCount(11)).toBe(20);
      expect(service.scoreFromTapsCount(22)).toBe(40);
    });
  });

  describe('isRoundActive', () => {
    it('возвращает true между start и end', () => {
      const round = createRound();
      expect(service.isRoundActive(round)).toBe(true);
    });

    it('возвращает false до start', () => {
      const round = createRound({
        start_datetime: new Date(Date.now() + 60000),
        end_datetime: new Date(Date.now() + 120000),
      });
      expect(service.isRoundActive(round)).toBe(false);
    });

    it('возвращает false после end', () => {
      const round = createRound({
        start_datetime: new Date(Date.now() - 120000),
        end_datetime: new Date(Date.now() - 60000),
      });
      expect(service.isRoundActive(round)).toBe(false);
    });
  });

  describe('getRoundStatus', () => {
    it('Cooldown если до start', () => {
      const round = createRound({
        start_datetime: new Date(Date.now() + 60000),
        end_datetime: new Date(Date.now() + 120000),
      });
      expect(service.getRoundStatus(round)).toBe('Cooldown');
    });

    it('Active между start и end', () => {
      const round = createRound();
      expect(service.getRoundStatus(round)).toBe('Active');
    });

    it('Completed после end', () => {
      const round = createRound({
        start_datetime: new Date(Date.now() - 120000),
        end_datetime: new Date(Date.now() - 60000),
      });
      expect(service.getRoundStatus(round)).toBe('Completed');
    });
  });

  describe('processTap', () => {
    it('кидает если раунд не найден', async () => {
      roundModel.findByPk.mockResolvedValue(null);
      await expect(service.processTap('u1', 'round-1', 'user')).rejects.toThrow(
        BadRequestException
      );
    });

    it('кидает если раунд не активен', async () => {
      const round = createRound({
        start_datetime: new Date(Date.now() + 60000),
        end_datetime: new Date(Date.now() + 120000),
      });
      roundModel.findByPk.mockResolvedValue(round);
      await expect(service.processTap('u1', 'round-1', 'user')).rejects.toThrow(
        BadRequestException
      );
    });

    it('для nikita не инкрементирует, возвращает 0', async () => {
      const round = createRound();
      roundModel.findByPk.mockResolvedValue(round);
      const score = createScore(0);
      scoreModel.findOrCreate.mockResolvedValue([score, true]);

      const result = await service.processTap('u1', 'round-1', 'nikita');

      expect(result.score).toBe(0);
      expect(scoreModel.increment).not.toHaveBeenCalled();
    });

    it('для user инкрементирует и возвращает очки', async () => {
      const round = createRound();
      roundModel.findByPk.mockResolvedValue(round);
      const score = createScore(5);
      scoreModel.findOrCreate.mockResolvedValue([score, false]);

      const result = await service.processTap('u1', 'round-1', 'user');

      expect(scoreModel.increment).toHaveBeenCalledWith('taps', {
        by: 1,
        where: { user: 'u1', round: 'round-1' },
      });
      expect(result.score).toBe(6);
    });
  });
});
