import './admin.css';

export const metadata = {
  title: { default: 'Painel', template: '%s | Painel Braziw' },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRoot({ children }) {
  return children;
}
