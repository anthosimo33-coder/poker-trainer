import { evaluateHand } from "@/lib/poker";

export default function HomePage() {
  // Test inline : évalue une royal flush au build
  const royalFlush = evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Ts']);

  return (
    <main style={{ padding: '48px 32px', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '44px',
        fontWeight: 600,
        letterSpacing: '-0.03em',
        marginBottom: '16px',
        background: 'linear-gradient(180deg, #F4F4F5 0%, rgba(244,244,245,0.7) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Poker Trainer
      </h1>
      <p style={{ color: 'rgba(244,244,245,0.6)', fontSize: '16px', marginBottom: '32px' }}>
        Session 1 — fondations posées.
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: '14px',
        padding: '24px',
      }}>
        <div style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '11px',
          color: 'rgba(244,244,245,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '12px',
        }}>
          Test évaluateur
        </div>
        <div style={{ fontSize: '18px', fontWeight: 500 }}>
          Main : A♠ K♠ Q♠ J♠ T♠
        </div>
        <div style={{ color: 'rgba(244,244,245,0.6)', marginTop: '8px' }}>
          Catégorie détectée : <strong style={{ color: '#A78BFA' }}>{royalFlush.category}</strong>
        </div>
      </div>
    </main>
  );
}
