
import {
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import {
  createDatabase,
  type Database,
} from '@dictaz/db';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private connection?: ReturnType<typeof createDatabase>;

  get db(): Database {
    return this.getConnection().db;
  }

  async ping(): Promise<void> {
    const { client } = this.getConnection();
    await client`SELECT 1`;
  }

  private getConnection(): ReturnType<typeof createDatabase> {
    if (!this.connection) {
      const url = process.env.DATABASE_URL;

      if (!url?.trim()) {
        throw new Error('DATABASE_URL is not configured');
      }

      this.connection = createDatabase(url);
    }

    return this.connection;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.client.end();
    }
  }
}
