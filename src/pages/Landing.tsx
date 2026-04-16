import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Utensils, Dumbbell, Shield, Lock, RefreshCw, Star, ChevronDown, Leaf, Check, X, Menu, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useInView, useMotionValue, useTransform, useSpring } from "framer-motion";
import scannerMockup from "@/assets/scanner-mockup.jpg";

/* ─── Reduced motion check ─── */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

/* ─── Ease presets ─── */
const smooth = [0.22, 1, 0.36, 1] as const;

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
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: smooth } },
      }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Scroll-triggered section reveal ─── */
function Reveal({ children, className = "", delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: smooth, delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Icon with spring-in on view ─── */
function SpringIcon({ icon: Icon, spin = false }: { icon: React.ElementType; spin?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center will-change-transform"
      initial={{ scale: 0, rotate: spin ? -180 : 0 }}
      animate={inView ? { scale: 1, rotate: 0 } : {}}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.15, rotate: 8 }}
    >
      <Icon className="w-6 h-6 text-primary" />
    </motion.div>
  );
}

/* ─── FAQ Accordion ─── */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className="border-b border-white/[0.06]"
      initial={{ opacity: 0, x: -30 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, ease: smooth, delay: index * 0.08 }}
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-white font-medium text-base md:text-lg pr-4 group-hover:text-primary/90 transition-colors duration-200">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}>
          <ChevronDown className="w-5 h-5 text-primary shrink-0" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: smooth }}
            className="overflow-hidden"
          >
            <p className="text-[#6b7280] text-sm md:text-base leading-relaxed pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Floating phone ─── */
function FloatingPhone({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      className="relative flex justify-center will-change-transform"
      initial={{ opacity: 0, x: 60, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.9, ease: smooth, delay: 0.4 }}
    >
      {/* green ambient glow — pulsing */}
      <motion.div
        className="absolute w-72 h-72 bg-primary/20 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 will-change-[opacity]"
        animate={reduced ? {} : { opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* phone with gentle float */}
      <motion.div
        className="relative w-[280px] md:w-[300px] bg-[#16181f] rounded-[2.5rem] border border-white/[0.08] p-3 shadow-2xl will-change-transform"
        animate={reduced ? {} : { y: [-8, 8, -8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="bg-[#0f1117] rounded-[2rem] overflow-hidden aspect-[9/19]">
          <img src={scannerMockup} alt="FitFlow scanner de alimentos" className="w-full h-full object-cover" width={512} height={1024} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Animated price count-up ─── */
function AnimatedPrice({ value, prefix = "R$ " }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  useEffect(() => {
    const unsub = springVal.on("change", (v) => {
      if (value === 0) { setDisplay("0"); return; }
      setDisplay(v.toFixed(2).replace(".", ","));
    });
    return unsub;
  }, [springVal, value]);

  return (
    <span ref={ref} className="text-white font-bold text-4xl">
      {prefix}{display}
    </span>
  );
}

/* ─── Rotating gradient border for highlighted pricing ─── */
function RotatingBorder() {
  return (
    <motion.div
      className="absolute -inset-[1px] rounded-xl pointer-events-none overflow-hidden"
      style={{ padding: "1px" }}
    >
      <motion.div
        className="w-[200%] h-[200%] absolute top-[-50%] left-[-50%]"
        style={{
          background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary)) 25%, transparent 50%, hsl(var(--primary)) 75%, transparent 100%)",
          opacity: 0.4,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

/* ─── Mobile menu ─── */
function MobileMenu({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 top-16 z-40 bg-[#0f1117]/95 backdrop-blur-xl border-b border-white/[0.06] md:hidden"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: smooth }}
        >
          <div className="px-5 py-6 space-y-4">
            {["Entrar", "Começar Grátis"].map((label, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
              >
                <Button
                  onClick={() => { onClose(); onNavigate(); }}
                  className={`w-full h-12 rounded-lg text-base ${
                    i === 1 ? "bg-primary hover:bg-primary/90 text-white" : "bg-transparent border border-white/10 text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const go = useCallback(() => navigate("/auth"), [navigate]);

  /* hero line stagger helpers */
  const heroLine = (delay: number) => ({
    initial: reduced ? {} : { opacity: 0, y: 25 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, ease: smooth, delay },
  });

  const btnAnim = {
    initial: reduced ? {} : { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.55, ease: smooth, delay: 0.45 },
  };

  return (
    <motion.div
      className="min-h-screen bg-[#0f1117] text-white font-sans overflow-x-hidden"
      initial={reduced ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* ─── NAV ─── */}
      <motion.nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[#0f1117]/90 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"
        }`}
        initial={reduced ? {} : { y: -60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: smooth, type: "spring", stiffness: 120, damping: 20 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-8 h-16">
          <motion.div className="flex items-center gap-2 font-bold text-xl cursor-pointer" whileHover={{ scale: 1.02 }}>
            <Leaf className="w-5 h-5 text-primary" />
            <span>FitFlow</span>
          </motion.div>

          {/* desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button variant="ghost" onClick={go} className="text-white/70 hover:text-white rounded-lg relative overflow-hidden group">
                Entrar
                <span className="absolute bottom-1 left-2 right-2 h-[1px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(34,197,94,0.3)" }} whileTap={{ scale: 0.97 }} className="rounded-lg">
              <Button onClick={go} className="bg-primary hover:brightness-110 text-white rounded-lg text-sm px-5 transition-all duration-150">Começar Grátis</Button>
            </motion.div>
          </div>

          {/* mobile hamburger */}
          <motion.button
            className="md:hidden relative w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            onClick={() => setMenuOpen(!menuOpen)}
            whileTap={{ scale: 0.9 }}
          >
            <motion.span className="w-5 h-[2px] bg-white block origin-center" animate={menuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }} transition={{ duration: 0.3 }} />
            <motion.span className="w-5 h-[2px] bg-white block" animate={menuOpen ? { opacity: 0 } : { opacity: 1 }} transition={{ duration: 0.15 }} />
            <motion.span className="w-5 h-[2px] bg-white block origin-center" animate={menuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }} transition={{ duration: 0.3 }} />
          </motion.button>
        </div>
      </motion.nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={go} />

      {/* ─── HERO ─── */}
      <section className="min-h-screen flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-5 md:px-8 w-full grid md:grid-cols-2 gap-12 items-center">
          {/* left */}
          <div className="space-y-8">
            {/* badge */}
            <motion.span
              initial={reduced ? {} : { opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full border border-primary/20"
            >
              🚀 Mais de 10.000 usuários ativos
            </motion.span>

            {/* headline — staggered lines */}
            <div>
              <motion.div {...heroLine(0.15)}>
                <span className="block text-4xl md:text-[52px] md:leading-[1.12] font-bold tracking-tight">
                  Emagreça com{" "}
                  <motion.span
                    className="text-primary inline-block"
                    initial={reduced ? {} : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.4 }}
                  >
                    inteligência
                  </motion.span>,
                </span>
              </motion.div>
              <motion.div {...heroLine(0.3)}>
                <span className="block text-4xl md:text-[52px] md:leading-[1.12] font-bold tracking-tight">
                  não com sofrimento.
                </span>
              </motion.div>
            </div>

            {/* subtitle */}
            <motion.p
              className="text-[#6b7280] text-lg max-w-md"
              initial={reduced ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: smooth }}
            >
              Scanner de alimentos com IA, treinos personalizados e dietas automáticas — tudo em um só app.
            </motion.p>

            {/* CTA buttons */}
            <motion.div className="flex flex-col sm:flex-row gap-3" {...btnAnim}>
              <motion.div
                whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(34,197,94,0.3)" }}
                whileTap={{ scale: 0.97 }}
                className="rounded-lg"
              >
                <Button onClick={go} className="bg-primary hover:brightness-110 text-white rounded-lg text-base h-12 px-8 transition-all duration-150 w-full sm:w-auto">
                  Começar Grátis →
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="rounded-lg">
                <Button variant="outline" onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })} className="border-white/10 text-white hover:bg-white/5 rounded-lg text-base h-12 px-8 transition-all duration-150 w-full sm:w-auto">
                  Ver como funciona
                </Button>
              </motion.div>
            </motion.div>

            {/* trust signals */}
            <motion.div
              className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6b7280]"
              initial={reduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              {["✓ Sem cartão de crédito", "✓ 7 dias grátis", "✓ Cancele quando quiser"].map((t, i) => (
                <motion.span
                  key={t}
                  initial={reduced ? {} : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.1, duration: 0.4 }}
                >
                  {t}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* right */}
          <FloatingPhone reduced={reduced} />
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
              <StaggerCard key={title} className="bg-[#16181f] border border-white/[0.06] rounded-xl p-7 space-y-4 transition-colors duration-250 hover:border-white/[0.15]">
                <SpringIcon icon={Icon} />
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
              <PricingCard badge="GRÁTIS" name="" priceValue={0} price="R$ 0" period="por 7 dias" subtitle="" features={[
                { ok: true, t: "Scanner de alimentos (1 scan/dia)" },
                { ok: true, t: "1 geração de treino" },
                { ok: true, t: "1 geração de dieta" },
                { ok: false, t: "Sem suporte prioritário" },
                { ok: false, t: "Gerações limitadas" },
              ]} cta="Começar Grátis" ctaVariant="outline" footnote="Sem cartão de crédito" onCta={go} />
            </StaggerCard>
            <StaggerCard className="h-full">
              <PricingCard highlighted badge="⭐ MAIS POPULAR" name="FitFlow" priceValue={29.9} price="R$ 29,90" period="/mês" subtitle="Cobrado mensalmente • Cancele quando quiser" features={[
                { ok: true, t: "Tudo do plano grátis" },
                { ok: true, t: "5 gerações de treino por mês" },
                { ok: true, t: "5 gerações de dieta por mês" },
                { ok: true, t: "Scanner ilimitado" },
                { ok: true, t: "Histórico completo" },
                { ok: true, t: "Suporte por email" },
              ]} cta="Assinar FitFlow →" ctaVariant="primary" onCta={go} />
            </StaggerCard>
            <StaggerCard className="h-full">
              <PricingCard badge="VITALÍCIO" name="FitFlow+" originalPrice="R$ 197,00" priceValue={97} price="R$ 97,00" period="" subtitle="Pagamento único — para sempre" subtitleGreen features={[
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
              <StaggerCard key={title} className="bg-[#16181f] border border-white/[0.06] rounded-xl p-7 space-y-4 transition-colors duration-250 hover:border-[rgba(34,197,94,0.2)]">
                <SpringIcon icon={Icon} spin />
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
            {[
              { q: "Preciso de cartão de crédito para testar grátis?", a: "Não. O período de 7 dias é 100% gratuito e sem necessidade de cadastrar cartão. Você só paga se quiser continuar." },
              { q: "Posso cancelar quando quiser?", a: "Sim. No plano mensal você cancela a qualquer momento diretamente pelo app, sem burocracia." },
              { q: "O que acontece depois dos 7 dias grátis?", a: "Seu acesso continua mas as gerações ficam pausadas. Você escolhe se quer assinar ou não — sem cobranças automáticas." },
              { q: "O FitFlow+ realmente é pagamento único?", a: "Sim. Você paga R$ 97,00 uma única vez e tem acesso vitalício a tudo, incluindo atualizações futuras." },
              { q: "Como funciona o scanner de alimentos?", a: "Você aponta a câmera para o alimento ou prato e a IA identifica automaticamente as calorias, proteínas, carboidratos e gorduras em segundos." },
            ].map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} index={i} />
            ))}
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
          <motion.div
            className="inline-block rounded-lg"
            whileHover={{ scale: 1.04, boxShadow: "0 4px 25px rgba(34,197,94,0.35)" }}
            whileTap={{ scale: 0.97 }}
            animate={reduced ? {} : { scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Button onClick={go} className="bg-primary hover:brightness-110 text-white rounded-lg text-base h-14 px-10 transition-all duration-150">
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
    </motion.div>
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
  priceValue: number;
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

function PricingCard({ highlighted, badge, name, originalPrice, priceValue, period, subtitle, subtitleGreen, features, cta, ctaVariant, footnote, footnoteGreen, onCta }: PricingCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className={`relative bg-[#16181f] rounded-xl p-7 flex flex-col border h-full transition-colors duration-250 ${
        highlighted
          ? "border-primary/40 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.3)] z-10"
          : "border-white/[0.06] hover:border-white/[0.15]"
      }`}
      /* highlighted: scale bounce on appear */
      animate={highlighted && inView ? { scale: [1, 1.06, 1.04] } : {}}
      transition={{ duration: 0.5, ease: smooth, delay: 0.2 }}
    >
      {/* rotating gradient border */}
      {highlighted && <RotatingBorder />}

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
          <AnimatedPrice value={priceValue} />
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
        <motion.div
          whileHover={
            ctaVariant === "primary"
              ? { scale: 1.03, boxShadow: "0 4px 20px rgba(34,197,94,0.3)" }
              : { scale: 1.03 }
          }
          whileTap={{ scale: 0.97 }}
          className="rounded-lg"
        >
          <Button
            onClick={onCta}
            className={`w-full h-11 rounded-lg font-medium transition-all duration-150 ${
              ctaVariant === "primary"
                ? "bg-primary hover:brightness-110 text-white"
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
    </motion.div>
  );
}
