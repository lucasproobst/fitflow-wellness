import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Utensils, Dumbbell, Shield, Lock, RefreshCw, Star, ChevronDown, Leaf, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useRef } from "react";
import scannerMockup from "@/assets/scanner-mockup.jpg";

/* ─── Reusable scroll-triggered wrapper ─── */
function Reveal({ children, className = "", delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Staggered card container ─── */
function StaggerCards({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.97 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Accordion Item ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left">
        <span className="text-white font-medium text-base md:text-lg pr-4">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
          <ChevronDown className="w-5 h-5 text-primary shrink-0" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-[#6b7280] text-sm md:text-base leading-relaxed pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Floating phone animation ─── */
function FloatingPhone() {
  return (
    <motion.div
      className="relative flex justify-center"
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
    >
      {/* green ambient glow with pulse */}
      <motion.div
        className="absolute w-72 h-72 bg-primary/20 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* phone with gentle float */}
      <motion.div
        className="relative w-[280px] md:w-[300px] bg-[#16181f] rounded-[2.5rem] border border-white/[0.08] p-3 shadow-2xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="bg-[#0f1117] rounded-[2rem] overflow-hidden aspect-[9/19]">
          <img src={scannerMockup} alt="FitFlow scanner de alimentos" className="w-full h-full object-cover" width={512} height={1024} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Counter animation ─── */
function CountUp({ target, suffix = "" }: { target: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="text-white font-bold text-4xl"
    >
      {target}{suffix}
    </motion.span>
  );
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
      <motion.nav
        className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${scrolled ? "bg-[#0f1117]/90 backdrop-blur-lg border-b border-white/[0.06]" : ""}`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-8 h-16">
          <motion.div className="flex items-center gap-2 font-bold text-xl" whileHover={{ scale: 1.04 }}>
            <Leaf className="w-5 h-5 text-primary" />
            <span>FitFlow</span>
          </motion.div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={go} className="text-white/70 hover:text-white rounded-lg">Entrar</Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={go} className="bg-primary hover:bg-primary/90 text-white rounded-lg text-sm px-5">Começar Grátis</Button>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* ─── HERO ─── */}
      <section className="min-h-screen flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-5 md:px-8 w-full grid md:grid-cols-2 gap-12 items-center">
          {/* left */}
          <div className="space-y-8">
            <motion.span
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full border border-primary/20"
            >
              🚀 Mais de 10.000 usuários ativos
            </motion.span>

            <motion.h1
              className="text-4xl md:text-[52px] md:leading-[1.12] font-bold tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              Emagreça com{" "}
              <motion.span
                className="text-primary inline-block"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5, type: "spring", stiffness: 200 }}
              >
                inteligência
              </motion.span>,
              <br />não com sofrimento.
            </motion.h1>

            <motion.p
              className="text-[#6b7280] text-lg max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Scanner de alimentos com IA, treinos personalizados e dietas automáticas — tudo em um só app.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button onClick={go} className="bg-primary hover:bg-primary/90 text-white rounded-lg text-base h-12 px-8">
                  Começar Grátis →
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })} className="border-white/10 text-white hover:bg-white/5 rounded-lg text-base h-12 px-8">
                  Ver como funciona
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6b7280]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              {["✓ Sem cartão de crédito", "✓ 7 dias grátis", "✓ Cancele quando quiser"].map((t, i) => (
                <motion.span key={t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.1 }}>
                  {t}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* right — phone mockup */}
          <FloatingPhone />
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <Reveal id="como-funciona" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">Como funciona</h2>
          <StaggerCards className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Camera, title: "Escaneie sua comida", text: "Aponte a câmera para qualquer alimento e a IA identifica as calorias e macros em segundos." },
              { icon: Utensils, title: "Receba sua dieta", text: "O app gera um plano alimentar completo baseado no seu objetivo, peso e preferências." },
              { icon: Dumbbell, title: "Treine com seu plano", text: "Treinos gerados automaticamente para o seu nível, com exercícios e séries definidos por IA." },
            ].map(({ icon: Icon, title, text }) => (
              <StaggerCard key={title} className="bg-[#16181f] border border-white/[0.06] rounded-xl p-7 space-y-4">
                <motion.div
                  className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Icon className="w-6 h-6 text-primary" />
                </motion.div>
                <h3 className="text-white font-semibold text-lg">{title}</h3>
                <p className="text-[#6b7280] text-sm leading-relaxed">{text}</p>
              </StaggerCard>
            ))}
          </StaggerCards>
        </div>
      </Reveal>

      {/* ─── PRICING ─── */}
      <Reveal className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Escolha seu plano</h2>
            <p className="text-[#6b7280] text-lg">Comece grátis. Evolua no seu ritmo.</p>
          </div>

          <StaggerCards className="grid md:grid-cols-3 gap-6 items-stretch">
            <StaggerCard className="h-full">
              <PricingCard badge="GRÁTIS" name="" price="R$ 0" period="por 7 dias" subtitle="" features={[
                { ok: true, t: "Scanner de alimentos (1 scan/dia)" },
                { ok: true, t: "1 geração de treino" },
                { ok: true, t: "1 geração de dieta" },
                { ok: false, t: "Sem suporte prioritário" },
                { ok: false, t: "Gerações limitadas" },
              ]} cta="Começar Grátis" ctaVariant="outline" footnote="Sem cartão de crédito" onCta={go} />
            </StaggerCard>
            <StaggerCard className="h-full">
              <PricingCard highlighted badge="⭐ MAIS POPULAR" name="FitFlow" price="R$ 29,90" period="/mês" subtitle="Cobrado mensalmente • Cancele quando quiser" features={[
                { ok: true, t: "Tudo do plano grátis" },
                { ok: true, t: "5 gerações de treino por mês" },
                { ok: true, t: "5 gerações de dieta por mês" },
                { ok: true, t: "Scanner ilimitado" },
                { ok: true, t: "Histórico completo" },
                { ok: true, t: "Suporte por email" },
              ]} cta="Assinar FitFlow →" ctaVariant="primary" onCta={go} />
            </StaggerCard>
            <StaggerCard className="h-full">
              <PricingCard badge="VITALÍCIO" name="FitFlow+" originalPrice="R$ 197,00" price="R$ 97,00" period="" subtitle="Pagamento único — para sempre" subtitleGreen features={[
                { ok: true, t: "Tudo do plano FitFlow" },
                { ok: true, t: "Gerações ILIMITADAS de treino" },
                { ok: true, t: "Gerações ILIMITADAS de dieta" },
                { ok: true, t: "Scanner ilimitado" },
                { ok: true, t: "Acesso a todas as novidades" },
                { ok: true, t: "Suporte prioritário" },
                { ok: true, t: "Nunca paga de novo" },
              ]} cta="Garantir FitFlow+ →" ctaVariant="white" footnote="🔒 Acesso vitalício garantido" footnoteGreen onCta={go} />
            </StaggerCard>
          </StaggerCards>
        </div>
      </Reveal>

      {/* ─── TRUST ─── */}
      <Reveal className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">Sua segurança é nossa prioridade</h2>
          <StaggerCards className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: Shield, title: "Dados 100% protegidos", text: "Criptografia SSL em todas as transações. Seus dados nunca são compartilhados." },
              { icon: Lock, title: "Pagamento seguro", text: "Processado pela Stripe. Aceitamos cartão, PIX e boleto com total segurança." },
              { icon: RefreshCw, title: "Garantia de 7 dias", text: "Não ficou satisfeito? Devolvemos 100% do seu dinheiro sem perguntas." },
              { icon: Star, title: "+10.000 usuários ativos", text: "Pessoas reais usando o FitFlow todos os dias para emagrecer com saúde." },
            ].map(({ icon: Icon, title, text }) => (
              <StaggerCard key={title} className="bg-[#16181f] border border-white/[0.06] rounded-xl p-7 space-y-4">
                <motion.div
                  className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Icon className="w-6 h-6 text-primary" />
                </motion.div>
                <h3 className="text-white font-semibold text-lg">{title}</h3>
                <p className="text-[#6b7280] text-sm leading-relaxed">{text}</p>
              </StaggerCard>
            ))}
          </StaggerCards>
        </div>
      </Reveal>

      {/* ─── FAQ ─── */}
      <Reveal className="py-24 md:py-32">
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
      </Reveal>

      {/* ─── FINAL CTA ─── */}
      <Reveal className="py-24 md:py-32 border-t border-primary/20">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center space-y-6">
          <h2 className="text-3xl md:text-[40px] md:leading-[1.15] font-bold">
            Pronto para transformar<br />seu corpo com IA?
          </h2>
          <p className="text-[#6b7280] text-lg">Comece grátis hoje. Sem cartão. Sem risco.</p>
          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Button onClick={go} className="bg-primary hover:bg-primary/90 text-white rounded-lg text-base h-14 px-10">
              Criar minha conta grátis →
            </Button>
          </motion.div>
          <p className="text-sm text-[#6b7280] flex flex-wrap justify-center gap-x-6 gap-y-1">
            <span>✓ 7 dias grátis</span>
            <span>✓ Cancele quando quiser</span>
            <span>✓ Resultados reais</span>
          </p>
        </div>
      </Reveal>

      {/* ─── FOOTER ─── */}
      <motion.footer
        className="border-t border-white/[0.06] py-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
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
      </motion.footer>
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
    <div className={`relative bg-[#16181f] rounded-xl p-7 flex flex-col border h-full ${
      highlighted
        ? "border-primary/40 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.3)] ring-1 ring-primary/20 z-10"
        : "border-white/[0.06]"
    }`}>
      {/* green glow pulse for highlighted */}
      {highlighted && (
        <motion.div
          className="absolute -inset-[1px] rounded-xl border border-primary/30 pointer-events-none"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
        highlighted ? "bg-primary/15 text-primary" : "bg-white/5 text-[#6b7280]"
      }`}>{badge}</span>

      <div className="mt-4">
        {name && <p className="text-white font-semibold text-lg mb-1">{name}</p>}
        {originalPrice && <p className="text-[#6b7280] line-through text-sm mb-1">{originalPrice}</p>}
        <div className="flex items-baseline gap-1">
          <CountUp target={price} />
          {period && <span className="text-[#6b7280] text-sm">{period}</span>}
        </div>
        {subtitle && <p className={`text-xs mt-2 ${subtitleGreen ? "text-primary" : "text-[#6b7280]"}`}>{subtitle}</p>}
      </div>

      <hr className="border-white/[0.06] my-4" />

      <ul className="space-y-3 flex-1">
        {features.map(({ ok, t }, i) => (
          <motion.li
            key={t}
            className="flex items-start gap-2.5 text-sm"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            {ok
              ? <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              : <X className="w-4 h-4 text-[#6b7280]/50 mt-0.5 shrink-0" />
            }
            <span className={ok ? "text-white/80" : "text-[#6b7280]/50"}>{t}</span>
          </motion.li>
        ))}
      </ul>

      <div className="mt-6">
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
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
      </motion.div>

      {footnote && (
        <p className={`text-xs text-center mt-3 ${footnoteGreen ? "text-primary" : "text-[#6b7280]"}`}>{footnote}</p>
      )}
      </div>
    </div>
  );
}
