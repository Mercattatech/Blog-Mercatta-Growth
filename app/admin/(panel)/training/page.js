import { requireUser } from '@/lib/guard.js';
import { query } from '@/lib/db.js';
import { getTraining } from '@/lib/settings.js';
import { aiConfigured } from '@/lib/ai.js';
import TrainingForm from '@/components/admin/TrainingForm.js';

export const metadata = { title: 'Treinar a IA' };

export default async function TrainingPage() {
  await requireUser({ admin: true });
  const training = await getTraining();
  const refs = training.reference_post_ids.length ? await query('SELECT id, title FROM posts WHERE id = ANY($1::int[])', [training.reference_post_ids]) : [];
  return <TrainingForm initial={training} refs={refs} aiOn={aiConfigured()} model={process.env.GEMINI_MODEL || 'gemini-flash-latest'} />;
}
