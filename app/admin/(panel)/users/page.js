import { requireUser } from '@/lib/guard.js';
import { query } from '@/lib/db.js';
import { mailConfigured } from '@/lib/mail.js';
import UsersManager from '@/components/admin/UsersManager.js';

export const metadata = { title: 'Usuários' };

export default async function UsersPage() {
  const me = await requireUser({ admin: true });
  const users = await query(`SELECT u.id, u.name, u.email, u.role, u.active, u.last_login, u.created_at, u.password_hash IS NOT NULL AS has_password,
    (SELECT count(*)::int FROM posts p WHERE p.author_id = u.id) AS posts FROM users u ORDER BY u.id`);
  return <UsersManager initial={JSON.parse(JSON.stringify(users))} me={me.id} smtp={mailConfigured()} />;
}
