import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Utensils, Dumbbell, Shield, Lock, RefreshCw, Star, ChevronDown, Leaf, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import scannerMockup from "@/assets/scanner-mockup.jpg";

/* ─── fade-in-on-scroll hook ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, className: `transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}` };
}

/* ─── Accordion Item ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left">
        <span className="text-white font-medium text-base md:text-lg pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-primary shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-5" : "max-h-0"}`}>
        <p className="text-[#6b7280] text-sm md:text-base leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── Section wrapper ─── */
function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const r = useReveal();
  return <section id={id} ref={r.ref} className={`${r.className} ${className}`}>{children}</section>;
}

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const go = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-[#0f1117] text-white font-sans overflow-x-hidden">
      {/* ─── NAV ─── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0f1117]/90 backdrop-blur-lg border-b border-white/[0.06]" : ""}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-8 h-16">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Leaf className="w-5 h-5 text-primary" />
            <span>FitFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={go} className="text-white/70 hover:text-white rounded-lg">Entrar</Button>
            <Button onClick={go} className="bg-primary hover:bg-primary/90 text-white rounded-lg text-sm px-5">Começar Grátis</Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="min-h-screen flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-5 md:px-8 w-full grid md:grid-cols-2 gap-12 items-center">
          {/* left */}
          <div className="space-y-8 animate-fade-in">
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full border border-primary/20">
              🚀 Mais de 10.000 usuários ativos
            </span>

            <h1 className="text-4xl md:text-[52px] md:leading-[1.12] font-bold tracking-tight">
              Emagreça com{" "}
              <span className="text-primary">inteligência</span>,
              <br />não com sofrimento.
            </h1>

            <p className="text-[#6b7280] text-lg max-w-md">
              Scanner de alimentos com IA, treinos personalizados e dietas automáticas — tudo em um só app.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={go} className="bg-primary hover:bg-primary/90 text-white rounded-lg text-base h-12 px-8">
                Começar Grátis →
              </Button>
              <Button variant="outline" onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })} className="border-white/10 text-white hover:bg-white/5 rounded-lg text-base h-12 px-8">
                Ver como funciona
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6b7280]">
              <span>✓ Sem cartão de crédito</span>
              <span>✓ 7 dias grátis</span>
              <span>✓ Cancele quando quiser</span>
            </div>
          </div>

          {/* right — phone mockup */}
          <div className="relative flex justify-center animate-fade-in" style={{ animationDelay: "200ms" }}>
            {/* green ambient glow */}
            <div className="absolute w-72 h-72 bg-primary/20 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            {/* phone frame */}
            <div className="relative w-[280px] md:w-[300px] bg-[#16181f] rounded-[2.5rem] border border-white/[0.08] p-3 shadow-2xl">
              <div className="bg-[#0f1117] rounded-[2rem] overflow-hidden aspect-[9/19] flex flex-col items-center justify-center gap-4 p-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-primary" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-3xl font-bold text-white">410 kcal</p>
                  <p className="text-[#6b7280] text-sm">Frango grelhado + arroz</p>
                </div>
                <div className="flex gap-4 text-xs text-[#6b7280]">
                  <span className="text-center"><span className="block text-white font-semibold text-sm">32g</span>Proteína</span>
                  <span className="text-center"><span className="block text-white font-semibold text-sm">48g</span>Carbos</span>
                  <span className="text-center"><span className="block text-white font-semibold text-sm">12g</span>Gordura</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center mt-2">
                  <Check className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <Section id="como-funciona" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">Como funciona</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Camera, title: "Escaneie sua comida", text: "Aponte a câmera para qualquer alimento e a IA identifica as calorias e macros em segundos." },
              { icon: Utensils, title: "Receba sua dieta", text: "O app gera um plano alimentar completo baseado no seu objetivo, peso e preferências." },
              { icon: Dumbbell, title: "Treine com seu plano", text: "Treinos gerados automaticamente para o seu nível, com exercícios e séries definidos por IA." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-[#16181f] border border-white/[0.06] rounded-xl p-7 space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-white font-semibold text-lg">{title}</h3>
                <p className="text-[#6b7280] text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── PRICING ─── */}
      <Section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Escolha seu plano</h2>
            <p className="text-[#6b7280] text-lg">Comece grátis. Evolua no seu ritmo.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {/* FREE */}
            <PricingCard
              badge="GRÁTIS"
              name=""
              price="R$ 0"
              period="por 7 dias"
              subtitle=""
              features={[
                { ok: true, t: "Scanner de alimentos (1 scan/dia)" },
                { ok: true, t: "1 geração de treino" },
                { ok: true, t: "1 geração de dieta" },
                { ok: false, t: "Sem suporte prioritário" },
                { ok: false, t: "Gerações limitadas" },
              ]}
              cta="Começar Grátis"
              ctaVariant="outline"
              footnote="Sem cartão de crédito"
              onCta={go}
            />
            {/* FITFLOW — highlighted */}
            <PricingCard
              highlighted
              badge="⭐ MAIS POPULAR"
              name="FitFlow"
              price="R$ 29,90"
              period="/mês"
              subtitle="Cobrado mensalmente • Cancele quando quiser"
              features={[
                { ok: true, t: "Tudo do plano grátis" },
                { ok: true, t: "5 gerações de treino por mês" },
                { ok: true, t: "5 gerações de dieta por mês" },
                { ok: true, t: "Scanner ilimitado" },
                { ok: true, t: "Histórico completo" },
                { ok: true, t: "Suporte por email" },
              ]}
              cta="Assinar FitFlow →"
              ctaVariant="primary"
              onCta={go}
            />
            {/* FITFLOW+ */}
            <PricingCard
              badge="VITALÍCIO"
              name="FitFlow+"
              originalPrice="R$ 197,00"
              price="R$ 97,00"
              period=""
              subtitle="Pagamento único — para sempre"
              subtitleGreen
              features={[
                { ok: true, t: "Tudo do plano FitFlow" },
                { ok: true, t: "Gerações ILIMITADAS de treino" },
                { ok: true, t: "Gerações ILIMITADAS de dieta" },
                { ok: true, t: "Scanner ilimitado" },
                { ok: true, t: "Acesso a todas as novidades" },
                { ok: true, t: "Suporte prioritário" },
                { ok: true, t: "Nunca paga de novo" },
              ]}
              cta="Garantir FitFlow+ →"
              ctaVariant="white"
              footnote="🔒 Acesso vitalício garantido"
              footnoteGreen
              onCta={go}
            />
          </div>
        </div>
      </Section>

      {/* ─── TRUST ─── */}
      <Section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">Sua segurança é nossa prioridade</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: Shield, title: "Dados 100% protegidos", text: "Criptografia SSL em todas as transações. Seus dados nunca são compartilhados." },
              { icon: Lock, title: "Pagamento seguro", text: "Processado pela Stripe. Aceitamos cartão, PIX e boleto com total segurança." },
              { icon: RefreshCw, title: "Garantia de 7 dias", text: "Não ficou satisfeito? Devolvemos 100% do seu dinheiro sem perguntas." },
              { icon: Star, title: "+10.000 usuários ativos", text: "Pessoas reais usando o FitFlow todos os dias para emagrecer com saúde." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-[#16181f] border border-white/[0.06] rounded-xl p-7 space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-white font-semibold text-lg">{title}</h3>
                <p className="text-[#6b7280] text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── FAQ ─── */}
      <Section className="py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">Dúvidas frequentes</h2>
          <div>
            <FaqItem q="Preciso de cartão de crédito para testar grátis?" a="Não. O período de 7 dias é 100% gratuito e sem necessidade de cadastrar cartão. Você só paga se quiser continuar." />
            <FaqItem q="Posso cancelar quando quiser?" a="Sim. No plano mensal você cancela a qualquer momento diretamente pelo app, sem burocracia." />
            <FaqItem q="O que acontece depois dos 7 dias grátis?" a="Seu acesso continua mas as gerações ficam pausadas. Você escolhe se quer assinar ou não — sem cobranças automáticas." />
            <FaqItem q="O FitFlow+ realmente é pagamento único?" a="Sim. Você paga R$ 97,00 uma única vez e tem acesso vitalício a tudo, incluindo atualizações futuras." />
            <FaqItem q="Como funciona o scanner de alimentos?" a="Você aponta a câmera para o alimento ou prato e a IA identifica automaticamente as calorias, proteínas, carboidratos e gorduras em segundos." />
          </div>
        </div>
      </Section>

      {/* ─── FINAL CTA ─── */}
      <Section className="py-24 md:py-32 border-t border-primary/20">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center space-y-6">
          <h2 className="text-3xl md:text-[40px] md:leading-[1.15] font-bold">
            Pronto para transformar<br />seu corpo com IA?
          </h2>
          <p className="text-[#6b7280] text-lg">Comece grátis hoje. Sem cartão. Sem risco.</p>
          <Button onClick={go} className="bg-primary hover:bg-primary/90 text-white rounded-lg text-base h-14 px-10 mx-auto">
            Criar minha conta grátis →
          </Button>
          <p className="text-sm text-[#6b7280] flex flex-wrap justify-center gap-x-6 gap-y-1">
            <span>✓ 7 dias grátis</span>
            <span>✓ Cancele quando quiser</span>
            <span>✓ Resultados reais</span>
          </p>
        </div>
      </Section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#6b7280]">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Leaf className="w-4 h-4 text-primary" />
            FitFlow
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <span>Termos de Uso</span>
            <span>·</span>
            <span>Política de Privacidade</span>
            <span>·</span>
            <span>Contato</span>
          </div>
          <div className="text-center md:text-right space-y-1">
            <p>© 2025 FitFlow. Todos os direitos reservados.</p>
            <p className="text-xs">Desenvolvido com IA para resultados reais</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Pricing Card Component ─── */
interface PricingFeature { ok: boolean; t: string }
interface PricingCardProps {
  highlighted?: boolean;
  badge: string;
  name?: string;
  originalPrice?: string;
  price: string;
  period: string;
  subtitle?: string;
  subtitleGreen?: boolean;
  features: PricingFeature[];
  cta: string;
  ctaVariant: "outline" | "primary" | "white";
  footnote?: string;
  footnoteGreen?: boolean;
  onCta: () => void;
}

function PricingCard({ highlighted, badge, name, originalPrice, price, period, subtitle, subtitleGreen, features, cta, ctaVariant, footnote, footnoteGreen, onCta }: PricingCardProps) {
  return (
    <div className={`relative bg-[#16181f] rounded-xl p-7 space-y-6 border transition-transform duration-300 hover:-translate-y-1 ${
      highlighted
        ? "border-primary/40 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.25)] md:scale-[1.04] z-10"
        : "border-white/[0.06]"
    }`}>
      {/* badge */}
      <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
        highlighted ? "bg-primary/15 text-primary" : "bg-white/5 text-[#6b7280]"
      }`}>{badge}</span>

      {/* name + price */}
      <div>
        {name && <p className="text-white font-semibold text-lg mb-1">{name}</p>}
        {originalPrice && <p className="text-[#6b7280] line-through text-sm mb-1">{originalPrice}</p>}
        <div className="flex items-baseline gap-1">
          <span className="text-white font-bold text-4xl">{price}</span>
          {period && <span className="text-[#6b7280] text-sm">{period}</span>}
        </div>
        {subtitle && <p className={`text-xs mt-2 ${subtitleGreen ? "text-primary" : "text-[#6b7280]"}`}>{subtitle}</p>}
      </div>

      <hr className="border-white/[0.06]" />

      {/* features */}
      <ul className="space-y-3">
        {features.map(({ ok, t }) => (
          <li key={t} className="flex items-start gap-2.5 text-sm">
            {ok
              ? <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              : <X className="w-4 h-4 text-[#6b7280]/50 mt-0.5 shrink-0" />
            }
            <span className={ok ? "text-white/80" : "text-[#6b7280]/50"}>{t}</span>
          </li>
        ))}
      </ul>

      {/* cta */}
      <Button
        onClick={onCta}
        className={`w-full h-11 rounded-lg font-medium ${
          ctaVariant === "primary"
            ? "bg-primary hover:bg-primary/90 text-white"
            : ctaVariant === "white"
            ? "bg-white hover:bg-white/90 text-[#0f1117]"
            : "border border-white/10 bg-transparent hover:bg-white/5 text-white"
        }`}
      >
        {cta}
      </Button>

      {footnote && (
        <p className={`text-xs text-center ${footnoteGreen ? "text-primary" : "text-[#6b7280]"}`}>{footnote}</p>
      )}
    </div>
  );
}
