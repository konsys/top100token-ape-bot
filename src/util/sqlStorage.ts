import { databaseName } from '../contants';

import { Knex, knex } from 'knex';

import { app } from 'electron';

import * as path from 'path';
import {Logger} from './logger';
import { StorageTables } from '../types';

let dbFileLocation = databaseName;

if (app) {
  dbFileLocation = path.join(app.getPath('userData'), databaseName);
}

const storageConfig: Knex.Config = { 
  client: 'sqlite3',
  connection: {
    filename: `${dbFileLocation}`,
  },
  useNullAsDefault: true,
};

export class SQLStorageService {
  knex!: Knex<any, unknown[]>;
  instance: any = null;

  constructor() {
    if (!this.instance) {
      this.instance = this;

      this.knex = knex(storageConfig);

      this.CreateTables();
    }

    return this.instance;
  }

  public init() {}

  public async GetKey(key: string) {
    const allRows = await this.knex('settings').select('*').where({ key: key });

    if (allRows[0] !== '') {
      return allRows[0].value;
    } else {
      return undefined;
    }
  }

  public async SetKey(key: string, value: string) {
    try {
      await this.knex('settings').insert({ key, value });
    } catch (error) {
      Logger.log('Failed to write DB', error);
    }
  }

  public async ReadData<T>(table: StorageTables, where?: any): Promise<T[]> {
    if (!where) {
      const allRows = await this.knex(table).select('*');

      return allRows;
    } else {
      const allRows = await this.knex(table).select('*').where(where);

      return allRows;
    }
  }

  public async InsertData<T>(data: T | T[], table: StorageTables) {
    let insertData: T[] = [];

    if (!Array.isArray(data)) {
      insertData = [data];
    } else {
      insertData = [...data];
    }

    insertData.forEach(async (singleData) => {
      try {
        await this.knex(table).insert(singleData as any);
      } catch (error) {
        Logger.log('Failed to write DB', error);
      }
    });
  }

  private async CreateTables() {
    try {
      await this.CreateTable('apeHistory', (table) => {
        table.increments('id');
        table.string('chain');
        table.string('data');
      });

      await this.CreateTable('erc20Data', (table) => {
        table.increments('id');
        table.string('chain');
        table.string('address');
        table.string('symbol');
        table.string('name');
        table.string('totalSupply');
        table.integer('intTotalSupply');
        table.integer('decimals');
      });

      await this.CreateTable('settings', (table) => {
        table.string('key').primary();
        table.string('value');
      });

      await this.CreateTable('transactions', (table) => {
        table.increments('id');
        table.string('chain');
        table.string('address');
        table.string('side');
        table.integer('time');
        table.string('amountCoin');
        table.string('amountToken');
      });
    } catch (error) {
      Logger.log('SQL create table error', error);
    }
  }

  private async CreateTable(name: string, schema: (tableBuilder: any) => any) {
    const exist = await this.knex.schema.hasTable(name);

    if (!exist) {
      await this.knex.schema.createTable(name, schema);
    }
  }
}

const SQL: SQLStorageService = new SQLStorageService();

export default SQL;
