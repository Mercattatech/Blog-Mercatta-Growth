import { Shell } from '@/components/Shell';
import { Card } from '@/components/Parts';
import { listVisible } from '@/lib/posts';

export const metadata = { title: 'Página não encontrada', robots: { index: false } };

export default async function NotFound() {
  const posts = await listVisible({ limit: 3 }).catch(() => []);
  return (
    <Shell>
      <main id="conteudo" className="container notfound">
        <div className="nf-code">404</div>
        <h1>Página não encontrada</h1>
        <p>O endereço que você tentou acessar não existe ou foi movido. Que tal explorar nossos artigos mais recentes?</p>
        <a className="btn btn-primary btn-lg" href="/">Voltar ao início</a>
        <div className="grid grid-3 nf-grid">{posts.map((p) => <Card key={p.id} post={p} />)}</div>
      </main>
    </Shell>
  );
}
