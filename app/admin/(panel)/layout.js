import { requireUser } from '@/lib/guard.js';
import { queryOne } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.js';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }) {
  const user = await requireUser();
  const pending = user.role === 'admin' ? (await queryOne("SELECT count(*)::int AS n FROM posts WHERE status = 'pending'")).n : 0;
  return <AdminShell user={{ name: user.name, role: user.role }} pending={pending}>{children}</AdminShell>;
}
