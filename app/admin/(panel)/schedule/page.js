import { requireAdmin } from '@/lib/guard.js';
import { getScheduleConfig } from '@/lib/scheduler.js';
import { getTenantById } from '@/lib/tenant.js';
import { query } from '@/lib/db.js';
import ScheduleManager from '@/components/admin/ScheduleManager.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agendamento Automático de Artigos — Painel' };

export default async function SchedulePage() {
  const user = await requireAdmin();
  const tenantId = user.tenant_id || 1;

  const tenant = await getTenantById(tenantId);
  const config = await getScheduleConfig(tenantId);
  const scheduled = await query(`
    SELECT p.id, p.title, p.slug, p.publish_at, p.cover_thumb, p.cover_url, p.created_at
    FROM posts p
    WHERE (p.tenant_id = $1 OR p.tenant_id IS NULL)
      AND p.deleted_at IS NULL
      AND p.status = 'published'
      AND p.publish_at > now()
    ORDER BY p.publish_at ASC
    LIMIT 50
  `, [tenantId]);

  return <ScheduleManager user={user} tenant={tenant} initialConfig={config} initialScheduled={scheduled} />;
}
