import { requireUser } from '@/lib/guard.js';
import { ProfileForm } from '@/components/admin/ProfileForm.js';

export const metadata = { title: 'Meu perfil' };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <div className="adm-head"><div><h2>Meu perfil</h2><p>Atualize seu nome e sua senha.</p></div></div>
      <ProfileForm user={{ name: user.name, email: user.email, role: user.role }} />
    </>
  );
}
