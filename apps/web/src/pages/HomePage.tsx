import { useState } from "react";
import { useProducts } from "../hooks/useProducts";
import { useProductCategories } from "../hooks/useProductCategories";
import { ProductCard } from "../components/ProductCard";
import { CustomQuoteModal } from "../components/CustomQuoteModal";

const TESTIMONIALS = [
  {
    text: "Impressionante! Pedi peças para um protótipo industrial e chegaram perfeitas em 18 horas. A qualidade é melhor do que esperava.",
    author: "Carlos Mendes",
    role: "Engenheiro Mecânico",
  },
  {
    text: "Uso a Vórtex 3D para todas as minhas miniaturas de RPG. Detalhamento incrível e o preço é muito justo. Recomendo demais!",
    author: "Ana Ferreira",
    role: "Game Designer",
  },
  {
    text: "Salvaram meu projeto! Precisei de 50 peças para uma apresentação em 24h e conseguiram entregar tudo com qualidade perfeita.",
    author: "Rafael Costa",
    role: "Diretor de Produto",
  },
];

export function HomePage() {
  const [category, setCategory] = useState<string>("all");
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const { data: products = [], isLoading } = useProducts(category);
  // Pede a lista toda (inativa em uso vem junto, para o card do produto ter o rótulo)
  // e mostra como filtro só o que está ativo.
  const { data: categories = [] } = useProductCategories(true);
  const visibleCategories = categories.filter((cat) => cat.active);

  return (
    <div>
      <div className="hero">
        <div className="vortex-bg">
          <div className="vortex-ring" />
          <div className="vortex-ring" />
          <div className="vortex-ring" />
        </div>
        <div className="hero-grid">
          <div className="hero-content">
            <div className="hero-eyebrow">Impressão 3D de Precisão Profissional</div>
            <h1 className="hero-title">
              Do Digital ao
              <br />
              <span>Real em 24h</span>
            </h1>
            <p className="hero-sub">
              Transformamos seus projetos em peças físicas com qualidade industrial. FDM, resina e SLS —
              entregamos o futuro hoje.
            </p>
            <div className="hero-ctas">
              <button
                className="btn-primary"
                onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}
              >
                Ver Catálogo
              </button>
              <button className="btn-outline" onClick={() => setQuoteModalOpen(true)}>
                Enviar Meu Arquivo
              </button>
            </div>
          </div>
          <div className="printer-scene" aria-hidden="true">
            <div className="printer-glow" />
            <div className="printer-frame">
              <div className="printer-post printer-post-left" />
              <div className="printer-post printer-post-right" />
              <div className="printer-rail" />
              <div className="printer-head">
                <div className="printer-head-light" />
              </div>
              <div className="printer-filament" />
              <div className="printer-bed">
                <div className="printer-object" />
              </div>
              <div className="printer-spark" />
            </div>
            <div className="printer-caption">Imprimindo agora · Camada 214/300</div>
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-num">4.800+</div>
          <div className="stat-label">Peças Entregues</div>
        </div>
        <div className="stat">
          <div className="stat-num">98.4%</div>
          <div className="stat-label">Satisfação</div>
        </div>
        <div className="stat">
          <div className="stat-num">24h</div>
          <div className="stat-label">Prazo Mínimo</div>
        </div>
        <div className="stat">
          <div className="stat-num">12</div>
          <div className="stat-label">Materiais</div>
        </div>
      </div>

      <div className="section" id="catalog">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Catálogo</div>
            <h2 className="section-title">Produtos em Estoque</h2>
            <p className="section-sub">Peças prontas para envio imediato ou personalize sob medida.</p>
          </div>
          <div className="cats">
            <button className={`cat-btn${category === "all" ? " active" : ""}`} onClick={() => setCategory("all")}>
              Todos
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.slug}
                className={`cat-btn${category === cat.slug ? " active" : ""}`}
                onClick={() => setCategory(cat.slug)}
              >
                {cat.name}
              </button>
            ))}
          </div>
          {isLoading ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center" }}>Carregando produtos...</p>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="section"
        id="how"
        style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Processo</div>
            <h2 className="section-title">Como Funciona</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-icon">📁</div>
              <div className="step-num">PASSO 01</div>
              <div className="step-title">Envie seu arquivo</div>
              <div className="step-text">Aceite STL, OBJ, 3MF. Nosso sistema analisa automaticamente e gera um orçamento.</div>
            </div>
            <div className="step">
              <div className="step-icon">⚙️</div>
              <div className="step-num">PASSO 02</div>
              <div className="step-title">Escolha o material</div>
              <div className="step-text">PLA, PETG, ABS, resina ou nylon. Ajuste resolução, cor e acabamento.</div>
            </div>
            <div className="step">
              <div className="step-icon">🏭</div>
              <div className="step-num">PASSO 03</div>
              <div className="step-title">Produção expressa</div>
              <div className="step-text">Nossa frota de 24 impressoras trabalha 24/7 para cumprir prazos.</div>
            </div>
            <div className="step">
              <div className="step-icon">🚀</div>
              <div className="step-num">PASSO 04</div>
              <div className="step-title">Entrega garantida</div>
              <div className="step-text">Rastreamento em tempo real. Peça com dano? Reimprimimos sem custo.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="section" id="custom">
        <div className="container">
          <div className="custom-banner">
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧩</div>
            <h2>Tem seu próprio projeto?</h2>
            <p>
              Envie seu arquivo STL e receba um orçamento em até 1 hora. Produção personalizada para makers,
              engenheiros e designers.
            </p>
            <button className="btn-primary" onClick={() => setQuoteModalOpen(true)}>
              Solicitar Orçamento Personalizado
            </button>
          </div>
        </div>
      </div>

      <div className="section" style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Clientes</div>
            <h2 className="section-title">O que dizem sobre nós</h2>
          </div>
          <div className="testimonials">
            {TESTIMONIALS.map((t) => (
              <div className="testimonial" key={t.author}>
                <div className="test-stars">★★★★★</div>
                <p className="test-text">&quot;{t.text}&quot;</p>
                <div className="test-author">{t.author}</div>
                <div className="test-role">{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="nav-logo">VÓRTEX 3D</div>
            <p>Especialistas em impressão 3D profissional. Do protótipo ao produto final, transformamos bits em átomos.</p>
          </div>
          <div className="footer-col">
            <h4>Produtos</h4>
            {visibleCategories.slice(0, 3).map((cat) => (
              <a key={cat.slug} href="#catalog" onClick={() => setCategory(cat.slug)}>
                {cat.name}
              </a>
            ))}
            <a href="#custom">Personalizado</a>
          </div>
        </div>
        <div className="footer-bottom">© 2026 Vórtex 3D · Todos os direitos reservados</div>
      </footer>

      <CustomQuoteModal open={quoteModalOpen} onClose={() => setQuoteModalOpen(false)} />
    </div>
  );
}
