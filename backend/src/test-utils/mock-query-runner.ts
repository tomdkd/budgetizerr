import { vi } from 'vitest';

/** Minimal fake TypeORM EntityManager used by service unit tests. */
export function createMockManager() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    count: vi.fn(),
    create: vi.fn((_entity: unknown, data: unknown) => ({ ...(data as object) })),
    save: vi.fn(async (_entity: unknown, data: unknown) => data),
    update: vi.fn(),
    delete: vi.fn(),
    getRepository: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
}

/** Minimal fake TypeORM QueryRunner wrapping a mock manager. */
export function createMockQueryRunner(manager = createMockManager()) {
  return {
    manager,
    connect: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
  };
}

/** Minimal fake TypeORM query builder chain (all methods return `this`, terminated by getOne/getMany/getRawOne). */
export function createMockQueryBuilder() {
  const builder: Record<string, any> = {};
  const chainMethods = [
    'select',
    'where',
    'andWhere',
    'orderBy',
    'setParameters',
    'leftJoinAndSelect',
  ];
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.getOne = vi.fn();
  builder.getMany = vi.fn();
  builder.getRawOne = vi.fn();
  return builder;
}
