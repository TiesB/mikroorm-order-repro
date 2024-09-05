import { Collection, Entity, EntityDTO, ManyToOne, MikroORM, OneToMany, PrimaryKey, Property, QueryOrder } from '@mikro-orm/sqlite';

@Entity()
class Author {

  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @OneToMany(() => Book, book => book.author, { eager: true, orderBy: { year: QueryOrder.ASC } })
  books = new Collection<Book>(this);

  constructor(name: string) {
    this.name = name;
  }

}

@Entity()
class Book {

  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @ManyToOne()
  author!: Author;

  @Property()
  year: number;

  constructor(name: string, year: number) {
    this.name = name;
    this.year = year;
  }
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [Author, Book],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

const books = [{ name: 'Book 1', year: 1997 }, { name: 'Book 2', year: 1960 }, { name: 'Book 3', year: 2020 }];
const updatedBooks = [{ name: 'Book 1', year: 2024 }, { name: 'Book 2', year: 1960 }, { name: 'Book 3', year: 2020 }];

function sortBooks(books: { year: number }[]) {
  return books.sort((a, b) => a.year - b.year);
}

test('retain order', async () => {
  orm.em.create(Author, { name: 'John Doe', books });
  await orm.em.flush();
  orm.em.clear();

  const author = await orm.em.findOneOrFail(Author, { name: 'John Doe' });
  expect(author.books.length).toBe(books.length);
  expect(author.books.toArray().map(b => b.year)).toStrictEqual(sortBooks(books).map(b => b.year));

  author.books.find(book => book.name === 'Book 1')!.year = 2024;
  await orm.em.flush();

  await orm.em.clear();

  expect((await author.books.loadItems()).map(b => b.year)).toStrictEqual(sortBooks(updatedBooks).map(b => b.year));
});
