import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Score } from './score.model';

export interface IUserData {
  login: string;
  role: string;
}
@Table({
  tableName: 'users',
  timestamps: false,
})
export class User extends Model<User> implements IUserData {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
  })
  login: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password_hash: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  role: string;

  @HasMany(() => Score)
  scores: Score[];
}

export default User;
