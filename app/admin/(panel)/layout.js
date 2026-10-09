import { requireUser } from '@/lib/guard.js';
import { queryOne } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.js';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }) {
  const user = await requireUser();
  const isSuperOrAdmin = user.role === 'admin' || user.role === 'superadmin';
  const filter = user.role === 'superadmin' ? '' : (user.tenant_id ? `AND (tenant_id = ${Number(user.tenant_id)} OR tenant_id IS NULL)` : '');
  const pending = isSuperOrAdmin ? ((await queryOne(`SELECT count(*)::int AS n FROM posts WHERE status = 'pending' ${filter}`))?.n || 0) : 0;
  return <AdminShell user={user} pending={pending}>{children}</AdminShell>;
}
