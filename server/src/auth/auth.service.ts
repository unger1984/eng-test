import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IUserData, User } from '../models/user.model';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, password: string): Promise<IUserData | null> {
    const user = await this.userModel.findOne({
      where: { login: username },
    });

    if (user) {
      // Пользователь существует - проверяем пароль
      if (await bcrypt.compare(password, user.password_hash)) {
        const result = { ...user.toJSON() };
        delete result.password_hash;
        return result;
      }
      return null; // Неверный пароль
    } else {
      // Пользователь не существует - создаем нового
      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);

      // роли по логину: admin, Никита, остальные — user
      const role = username === 'admin' ? 'admin' : username === 'Никита' ? 'nikita' : 'user';

      const newUser = await this.userModel.create({
        login: username,
        password_hash: hash,
        role,
      });

      const result = { ...newUser.toJSON() };
      delete result.password_hash;
      return result;
    }
  }

  async login(user: IUserData) {
    const payload = { username: user.login, sub: user.login, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
