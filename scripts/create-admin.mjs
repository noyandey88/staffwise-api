// Creates the first admin, or promotes an existing user to admin.
// Usage: pnpm admin:create --email you@example.com [--first-name Ada --last-name Lovelace]
// A new user also needs a password: pass --password, or set ADMIN_PASSWORD
// to keep it out of shell history. An existing user keeps their password.
import { parseArgs } from 'node:util';
import bcrypt from 'bcrypt';
import pg from 'pg';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    'first-name': { type: 'string', default: 'Admin' },
    'last-name': { type: 'string', default: 'User' },
  },
});

// Same normalization as RegisterDto/LoginDto, so the admin can log in.
const email = values.email?.trim().toLowerCase();
if (!email) {
  console.error('Missing --email');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const promoted = await client.query(
    `UPDATE users SET role = 'admin', updated_at = now() WHERE email = $1 RETURNING id`,
    [email],
  );

  if (promoted.rowCount) {
    console.log(
      `Promoted existing user ${email} (id ${promoted.rows[0].id}) to admin.`,
    );
  } else {
    const password = values.password ?? process.env.ADMIN_PASSWORD;
    // 72 is bcrypt's input limit, matching RegisterDto.
    if (!password || password.length < 8 || password.length > 72) {
      console.error(
        `No user with email ${email}. To create one, pass --password or set ADMIN_PASSWORD (8-72 characters).`,
      );
      process.exitCode = 1;
    } else {
      const created = await client.query(
        `INSERT INTO users (first_name, last_name, email, password, role)
         VALUES ($1, $2, $3, $4, 'admin') RETURNING id`,
        [
          values['first-name'],
          values['last-name'],
          email,
          await bcrypt.hash(password, 10),
        ],
      );
      console.log(`Created admin ${email} (id ${created.rows[0].id}).`);
    }
  }
} finally {
  await client.end();
}
