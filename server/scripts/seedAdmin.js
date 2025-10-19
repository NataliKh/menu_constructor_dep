import bcrypt from 'bcryptjs';
import { connectDB, isMongoEnabled } from '../db.js';
import { UserModel } from '../models/user.js';

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function main() {
  if (!MONGODB_URI) {
    console.error('[seed:admin] MONGODB_URI is not set');
    process.exit(1);
  }
  const ok = await connectDB(MONGODB_URI);
  if (!ok || !isMongoEnabled()) {
    console.error('[seed:admin] Failed to connect MongoDB');
    process.exit(1);
  }

  let user = await UserModel.findOne({ username: 'admin' });
  if (user) {
    let updated = false;
    if (user.role !== 'admin') { user.role = 'admin'; updated = true; }
    if (process.env.RESET_ADMIN_PASSWORD === '1') {
      const passwordHashNew = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      user.passwordHash = passwordHashNew; updated = true;
    }
    if (updated) { await user.save(); console.log('[seed:admin] Admin updated' + (process.env.RESET_ADMIN_PASSWORD === '1' ? ' (password reset)' : '')); }
    else { console.log('[seed:admin] Admin already exists'); }
    process.exit(0);
  }

  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  await UserModel.create({ username: 'admin', passwordHash, role: 'admin' });
  console.log('[seed:admin] Admin user created with provided ADMIN_PASSWORD');
  process.exit(0);
}

main().catch((e) => {
  console.error('[seed:admin] Error:', e?.message || e);
  process.exit(1);
});
