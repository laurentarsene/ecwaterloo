import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Logo } from "./components/Logo";
import { Marquee } from "./components/Marquee";
import { Reveal } from "./components/RevealSection";
import { StudentFormModal } from "./components/StudentForm";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import {
  Heart,
  Users,
  ShoppingBasket,
  Briefcase,
  Home,
  Scale,
  HandHeart,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  ClipboardList,
  PackageCheck,
  UserCheck,
  Handshake,
  Menu,
  X,
  Euro,
  Coffee,
  ShoppingCart,
  Stethoscope,
  BookOpen,
  GraduationCap,
  Calendar,
} from "lucide-react";

/* ─── PALETTE ─── */
const MINT = "#d6f5e8";
const PINK = "#fce4ec";
const CREAM = "#fdf6ec";
const LIME = "#eef5d0";
const DARK = "#1c3038";

/* ─── DATA ─── */
const NAV_ITEMS = [
  { label: "Mission", href: "#mission" },
  { label: "Services", href: "#services" },
  { label: "Workflow", href: "#workflow" },
  { label: "Étudiants", href: "#etudiants" },
  { label: "Rendez-vous", href: "#rdv" },
  { label: "Bénévoles", href: "#benevoles" },
  { label: "Soutenir", href: "#soutenir" },
  { label: "Contact", href: "#contact" },
];

const SERVICES = [
  { icon: ShoppingBasket, title: "ALIMENTATION", desc: "Colis alimentaires hebdomadaires pour les familles dans le besoin.", bg: PINK },
  { icon: Briefcase, title: "EMPLOI", desc: "Accompagnement vers l'emploi : CV, formations, mises en relation avec des employeurs.", bg: MINT },
  { icon: Home, title: "LOGEMENT", desc: "Recherche de logement, constitution de dossiers, médiation avec les propriétaires.", bg: CREAM },
  { icon: Scale, title: "JUSTICE", desc: "Accompagnement dans les démarches judiciaires et administratives.", bg: LIME },
  { icon: Stethoscope, title: "SANTÉ", desc: "Orientation vers les hôpitaux, médecins et services de santé adaptés.", bg: PINK },
  { icon: HandHeart, title: "FINANCES", desc: "Aide à la gestion budgétaire et orientation vers les aides sociales existantes.", bg: MINT },
];

const WORKFLOW_STEPS = [
  { icon: ClipboardList, title: "ACCUEIL & ÉCOUTE", desc: "Chaque personne est reçue individuellement. On écoute, on comprend la situation, on identifie les besoins réels.", bg: MINT },
  { icon: UserCheck, title: "ÉVALUATION", desc: "Nos bénévoles formés évaluent la situation globale : alimentation, logement, emploi, santé, administratif.", bg: PINK },
  { icon: PackageCheck, title: "PLAN D'ACTION", desc: "Un plan d'accompagnement sur mesure est mis en place avec la personne. Chaque étape est définie ensemble.", bg: CREAM },
  { icon: Handshake, title: "SUIVI CONTINU", desc: "Un suivi régulier et humain. On ne lâche personne. Chaque bénévole est un point de contact de confiance.", bg: LIME },
];

const MARQUEE_WORDS = [
  "SOLIDARITÉ", "DIGNITÉ", "ENTRAIDE", "ÉCOUTE", "HUMANITÉ",
  "PARTAGE", "RESPECT", "ESPOIR", "COMMUNAUTÉ", "ACTION",
];

const DONATION_USES = [
  { icon: ShoppingCart, text: "20€ = 1 colis alimentaire pour une famille pendant 1 semaine" },
  { icon: BookOpen, text: "50€ = fournitures scolaires pour 3 enfants" },
  { icon: Coffee, text: "100€ = 1 mois de permanences d'accueil (café, chauffage, matériel)" },
  { icon: Stethoscope, text: "200€ = accompagnement médical complet pour 1 personne" },
];

function Label({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-block px-4 py-1.5 text-xs uppercase tracking-[0.2em] border rounded-sm mb-6 ${
        dark ? "border-white/30 text-white/70" : "border-[#1c3038]/20 text-[#1c3038]/60"
      }`}
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {children}
    </span>
  );
}

function BigHeading({ children, className = "", dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <h2
      className={`font-['Archivo_Black',sans-serif] uppercase leading-[1.05] tracking-tight ${
        dark ? "text-white" : "text-[#1c3038]"
      } ${className}`}
    >
      {children}
    </h2>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [studentFormOpen, setStudentFormOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c3038] overflow-x-hidden" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ═══════════ NAV ═══════════ */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-white/90 backdrop-blur-xl shadow-sm" : "bg-transparent"
        }`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 flex items-center justify-between h-20">
          <Logo className="h-12" />
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm text-[#1c3038]/50 hover:text-[#1c3038] transition-colors uppercase tracking-wider"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#contact"
              className="ml-4 px-6 py-2.5 rounded-sm bg-[#1c3038] text-white text-sm uppercase tracking-wider hover:bg-[#2a4250] transition-colors"
            >
              Nous contacter
            </a>
          </div>
          <button className="lg:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="lg:hidden bg-white border-t border-gray-100 px-6 py-4"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block py-3 text-sm text-[#1c3038]/60 hover:text-[#1c3038] uppercase tracking-wider"
              >
                {item.label}
              </a>
            ))}
          </motion.div>
        )}
      </motion.nav>

      {/* ═══════════ HERO ═══════════ */}
      <section id="accueil" className="min-h-screen flex items-center pt-20" style={{ background: MINT }}>
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <Label>ASBL &middot; Waterloo &middot; Depuis 2014</Label>
              </motion.div>

              <motion.h1
                className="font-['Archivo_Black',sans-serif] text-[#1c3038] uppercase leading-[1.0] tracking-tight text-5xl sm:text-6xl lg:text-7xl xl:text-8xl mb-8"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                BIEN PLUS
                <br />
                QU'UNE
                <br />
                <span className="text-[#d96363]">ÉPICERIE</span>
              </motion.h1>

              <motion.p
                className="text-lg text-[#1c3038]/50 max-w-md mb-10 leading-relaxed"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
              >
                Fondée par <strong className="text-[#1c3038]">Wivine Mayaya</strong>, l'Espace Convivial accompagne des milliers de personnes vers une vie digne. Uniquement des bénévoles, zéro salariés.
              </motion.p>

              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
                <a
                  href="#mission"
                  className="group inline-flex items-center gap-3 bg-[#1c3038] text-white px-8 py-4 rounded-sm text-sm uppercase tracking-wider hover:bg-[#2a4250] transition-all"
                >
                  Découvrir
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="#benevoles"
                  className="group inline-flex items-center gap-3 border-2 border-[#1c3038]/20 text-[#1c3038] px-8 py-4 rounded-sm text-sm uppercase tracking-wider hover:border-[#1c3038] transition-all"
                >
                  Rejoindre l'équipe
                  <Heart size={16} className="group-hover:scale-110 transition-transform" />
                </a>
              </motion.div>
            </div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="rounded-sm overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1593113616828-6f22bca04804?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwYmFuayUyMHZvbHVudGVlcnMlMjBoZWxwaW5nJTIwY29tbXVuaXR5fGVufDF8fHx8MTc3NTM5ODAwMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Bénévoles en action"
                  className="w-full h-80 sm:h-[32rem] object-cover"
                />
              </div>

              {/* Floating stats */}
              <motion.div
                className="absolute -bottom-6 -left-6 bg-white rounded-sm shadow-xl px-6 py-4"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <p className="font-['Archivo_Black',sans-serif] text-3xl text-[#1c3038]">1000+</p>
                <p className="text-xs text-[#1c3038]/40 uppercase tracking-wider">Personnes aidées</p>
              </motion.div>

              <motion.div
                className="absolute -top-5 -right-5 bg-[#1c3038] rounded-sm shadow-xl px-6 py-4"
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                <p className="font-['Archivo_Black',sans-serif] text-3xl text-[#c9c918]">0</p>
                <p className="text-xs text-white/40 uppercase tracking-wider">Salariés</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ MARQUEE ═══════════ */}
      <section className="py-5 bg-[#1c3038]">
        <Marquee
          items={MARQUEE_WORDS}
          speed={20}
          separator="✦"
          className="text-xl font-['Archivo_Black',sans-serif] text-white/30"
        />
      </section>

      {/* ═══════════ MISSION ═══════════ */}
      <section id="mission" className="py-28" style={{ background: CREAM }}>
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <Reveal direction="left">
              <div className="relative">
                <div className="rounded-sm overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1771340588962-174f6dbafecb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBzb2NpYWwlMjBzdXBwb3J0JTIwaGVscGluZyUyMHBlb3BsZXxlbnwxfHx8fDE3NzUzOTgwMDJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Communauté"
                    className="w-full h-[30rem] object-cover"
                  />
                </div>
                <div className="absolute -z-10 -bottom-4 -right-4 w-full h-full rounded-sm" style={{ background: PINK }} />
              </div>
            </Reveal>
            <div>
              <Reveal><Label>Notre Mission</Label></Reveal>
              <Reveal delay={0.1}>
                <BigHeading className="text-4xl sm:text-5xl lg:text-6xl mb-8">
                  ÉCOUTE,
                  <br />
                  ENTRAIDE
                  <br />
                  <span className="text-[#59a2b4]">& ACTION</span>
                </BigHeading>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-[#1c3038]/50 mb-5 leading-relaxed">
                  L'Espace Convivial de Waterloo n'est pas une simple distribution alimentaire. C'est un véritable <strong className="text-[#1c3038]">tremplin vers l'autonomie</strong>. Chaque bénéficiaire est accompagné de manière holistique : on ne traite pas juste le symptôme, on s'attaque aux causes.
                </p>
              </Reveal>
              <Reveal delay={0.3}>
                <p className="text-[#1c3038]/50 mb-5 leading-relaxed">
                  Créée par <strong className="text-[#1c3038]">Wivine Mayaya</strong> il y a 12 ans, cette ASBL fonctionne <strong className="text-[#1c3038]">uniquement avec des bénévoles</strong> — pas un seul employé salarié. C'est la preuve vivante que l'engagement et la solidarité peuvent déplacer des montagnes.
                </p>
              </Reveal>
              <Reveal delay={0.4}>
                <p className="text-[#1c3038]/50 leading-relaxed">
                  Des milliers de personnes ont été aidées : logement, hôpitaux, justice, aides financières, emploi, alimentation... Tout est possible quand on agit ensemble.
                </p>
              </Reveal>
              <Reveal delay={0.5}>
                <div className="flex gap-10 mt-10 pt-10 border-t border-[#1c3038]/10">
                  {[
                    { val: "12+", lbl: "ANNÉES" },
                    { val: "1000+", lbl: "AIDÉS" },
                    { val: "100%", lbl: "BÉNÉVOLES" },
                  ].map((s) => (
                    <div key={s.lbl}>
                      <p className="font-['Archivo_Black',sans-serif] text-3xl text-[#1c3038]">{s.val}</p>
                      <p className="text-xs text-[#1c3038]/30 uppercase tracking-wider mt-1">{s.lbl}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SERVICES ═══════════ */}
      <section id="services" className="py-28 bg-[#1c3038]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
          <div className="grid lg:grid-cols-2 gap-16 mb-20">
            <div>
              <Reveal><Label dark>Nos Services</Label></Reveal>
              <Reveal delay={0.1}>
                <BigHeading dark className="text-4xl sm:text-5xl lg:text-6xl">
                  ON S'OCCUPE
                  <br />
                  DE <span className="text-[#c9c918]">TOUT</span>
                </BigHeading>
              </Reveal>
            </div>
            <div className="flex items-end">
              <Reveal delay={0.2}>
                <p className="text-white/40 leading-relaxed max-w-md">
                  Alimentation, emploi, logement, justice, santé, finances. L'Espace Convivial sait ce dont les personnes en difficulté ont besoin et planifie chaque étape avec elles.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <motion.div
                  className="rounded-sm p-8 cursor-default h-full flex flex-col"
                  style={{ background: `${s.bg}` }}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                >
                  <s.icon size={32} className="text-[#1c3038] mb-6" />
                  <h3 className="font-['Archivo_Black',sans-serif] text-[#1c3038] text-xl uppercase tracking-tight mb-3">
                    {s.title}
                  </h3>
                  <p className="text-[#1c3038]/50 text-sm leading-relaxed mt-auto">{s.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ WORKFLOW ═══════════ */}
      <section id="workflow" className="relative">
        {WORKFLOW_STEPS.map((step, i) => (
          <div key={step.title} style={{ background: step.bg }} className="py-24 sm:py-28">
            <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
              <div className={`grid lg:grid-cols-2 gap-16 items-center ${i % 2 !== 0 ? "lg:direction-rtl" : ""}`}>
                <Reveal direction={i % 2 === 0 ? "left" : "right"}>
                  <div className={`${i % 2 !== 0 ? "lg:order-2" : ""}`}>
                    <Label>Étape {i + 1}</Label>
                    <BigHeading className="text-4xl sm:text-5xl lg:text-6xl mb-6">
                      {step.title}
                    </BigHeading>
                    <p className="text-[#1c3038]/50 text-lg leading-relaxed max-w-lg">
                      {step.desc}
                    </p>
                  </div>
                </Reveal>
                <Reveal direction={i % 2 === 0 ? "right" : "left"}>
                  <div className={`flex justify-center ${i % 2 !== 0 ? "lg:order-1" : ""}`}>
                    <motion.div
                      className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[#1c3038] flex items-center justify-center shadow-xl"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <step.icon className="text-white" size={48} />
                    </motion.div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ═══════════ ÉTUDIANTS ═══════════ */}
      <section id="etudiants" className="py-28 bg-[#1c3038]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <Reveal><Label dark>Épicerie Étudiante</Label></Reveal>
              <Reveal delay={0.1}>
                <BigHeading dark className="text-4xl sm:text-5xl lg:text-6xl mb-8">
                  ÉTUDIANT<span className="text-[#c9c918]"> ?</span>
                  <br />
                  ON PENSE
                  <br />
                  <span className="text-[#d96363]">À TOI</span>
                </BigHeading>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-white/50 mb-5 leading-relaxed">
                  Chaque <strong className="text-white">premier jeudi du mois</strong>, les étudiants peuvent venir faire leurs courses à l'Espace Convivial pour seulement <strong className="text-[#c9c918]">5€ symboliques</strong>.
                </p>
              </Reveal>
              <Reveal delay={0.3}>
                <p className="text-white/50 mb-5 leading-relaxed">
                  On sait que la vie étudiante n'est pas facile. Entre le loyer, les cours, les transports — l'alimentation ne devrait pas être un stress supplémentaire. C'est pour ça qu'on a créé cette formule simple et accessible.
                </p>
              </Reveal>
              <Reveal delay={0.35}>
                <p className="text-white/50 mb-10 leading-relaxed">
                  Il suffit de s'inscrire en avance pour qu'on puisse préparer les quantités nécessaires. L'inscription prend 30 secondes.
                </p>
              </Reveal>
              <Reveal delay={0.4}>
                <motion.button
                  onClick={() => setStudentFormOpen(true)}
                  className="group inline-flex items-center gap-3 bg-[#c9c918] text-[#1c3038] px-8 py-4 rounded-sm text-sm uppercase tracking-wider hover:bg-[#d4d426] transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <GraduationCap size={18} />
                  Je m'inscris pour le prochain jeudi
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Reveal>
            </div>

            <Reveal direction="right">
              <div className="grid grid-cols-2 gap-5">
                {[
                  { val: "5€", lbl: "PAR INSCRIPTION", bg: MINT },
                  { val: "1er", lbl: "JEUDI DU MOIS", bg: CREAM },
                  { val: "30s", lbl: "POUR S'INSCRIRE", bg: PINK },
                  { val: "∞", lbl: "BONNE AMBIANCE", bg: LIME },
                ].map((card) => (
                  <motion.div
                    key={card.lbl}
                    className="rounded-sm p-8 text-center"
                    style={{ background: card.bg }}
                    whileHover={{ y: -4, transition: { duration: 0.25 } }}
                  >
                    <p className="font-['Archivo_Black',sans-serif] text-4xl text-[#1c3038] mb-2">{card.val}</p>
                    <p className="text-xs text-[#1c3038]/40 uppercase tracking-wider">{card.lbl}</p>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════ RENDEZ-VOUS (CAL.COM) ═══════════ */}
      <section id="rdv" style={{ background: LIME }} className="py-28">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
          <div className="text-center mb-16">
            <Reveal><Label>Prendre Rendez-vous</Label></Reveal>
            <Reveal delay={0.1}>
              <BigHeading className="text-4xl sm:text-5xl lg:text-6xl mb-6">
                RÉSERVEZ UN
                <br />
                <span className="text-[#59a2b4]">CRÉNEAU</span>
              </BigHeading>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-[#1c3038]/50 max-w-lg mx-auto">
                Besoin d'un rendez-vous pour un accompagnement personnalisé ? Choisissez le créneau qui vous convient directement dans notre agenda.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.3}>
            <div className="bg-white rounded-sm shadow-sm border border-[#1c3038]/5 overflow-hidden">
              {/* 
                Remplacez l'URL ci-dessous par votre lien Cal.com réel.
                Exemple : https://cal.com/espace-convivial-waterloo/rendez-vous
              */}
              <iframe
                src="https://cal.com/espace-convivial/rendez-vous"
                className="w-full border-0"
                style={{ height: "680px", minHeight: "680px" }}
                title="Prendre rendez-vous — Espace Convivial de Waterloo"
              />
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <p className="text-center text-[#1c3038]/30 text-xs mt-6">
              Propulsé par Cal.com &middot; Si le calendrier ne s'affiche pas,{" "}
              <a
                href="https://cal.com/espace-convivial/rendez-vous"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#1c3038]/50"
              >
                cliquez ici pour ouvrir dans un nouvel onglet
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════ BÉNÉVOLES ═══════════ */}
      <section id="benevoles" className="py-28 bg-[#faf9f6]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <Reveal><Label>Rejoignez-nous</Label></Reveal>
              <Reveal delay={0.1}>
                <BigHeading className="text-4xl sm:text-5xl lg:text-6xl mb-8">
                  NOS BÉNÉVOLES
                  <br />
                  SONT NOTRE
                  <br />
                  <span className="text-[#d96363]">SUPER-POUVOIR</span>
                </BigHeading>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-[#1c3038]/50 mb-5 leading-relaxed">
                  Aucun employé. Que des bénévoles impliqués, organisés et passionnés. Chaque personne apporte ses compétences, son temps et son coeur.
                </p>
              </Reveal>
              <Reveal delay={0.3}>
                <p className="text-[#1c3038]/50 mb-8 leading-relaxed">
                  Nous recevons régulièrement des demandes de personnes souhaitant aider. <strong className="text-[#1c3038]">Toute aide sérieuse est toujours la bienvenue</strong> : logistique, accompagnement social, cuisine, transport, administratif, traduction...
                </p>
              </Reveal>

              <Reveal delay={0.4}>
                <div className="bg-white rounded-sm p-8 border border-[#1c3038]/5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#1c3038]/30 mb-6">Comment nous rejoindre</p>
                  <div className="space-y-5">
                    {[
                      { n: "01", text: "Contactez-nous par téléphone ou email" },
                      { n: "02", text: "Rencontrez notre équipe lors d'une permanence" },
                      { n: "03", text: "On identifie ensemble comment vous pouvez contribuer" },
                      { n: "04", text: "Vous êtes intégré(e) dans l'équipe, à votre rythme" },
                    ].map((item) => (
                      <div key={item.n} className="flex items-start gap-4">
                        <span className="font-['Archivo_Black',sans-serif] text-2xl text-[#1c3038]/10">{item.n}</span>
                        <p className="text-[#1c3038]/60 text-sm pt-1">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal direction="right">
              <div className="relative">
                <div className="rounded-sm overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1542323228-002ac256e7b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2x1bnRlZXJzJTIwdGVhbXdvcmslMjBoYW5kcyUyMHRvZ2V0aGVyfGVufDF8fHx8MTc3NTM5ODAwMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Bénévoles ensemble"
                    className="w-full h-[32rem] object-cover"
                  />
                </div>
                <div className="absolute -z-10 -top-4 -left-4 w-full h-full rounded-sm" style={{ background: MINT }} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════ SOUTENIR / DONS ═══════════ */}
      <section id="soutenir" style={{ background: PINK }} className="py-28">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <div>
              <Reveal><Label>Soutenir notre action</Label></Reveal>
              <Reveal delay={0.1}>
                <BigHeading className="text-4xl sm:text-5xl lg:text-6xl mb-8">
                  CHAQUE EURO
                  <br />
                  COMPTE <span className="text-[#d96363]">DOUBLE</span>
                </BigHeading>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-[#1c3038]/50 mb-5 leading-relaxed">
                  Puisque nous n'avons <strong className="text-[#1c3038]">aucun salarié</strong>, chaque euro donné va directement à l'aide des bénéficiaires. Pas de frais de personnel, pas de bureaux luxueux — juste de l'aide concrète, là où elle est nécessaire.
                </p>
              </Reveal>
              <Reveal delay={0.3}>
                <p className="text-[#1c3038]/50 mb-5 leading-relaxed">
                  Nous fonctionnons en toute <strong className="text-[#1c3038]">transparence</strong>. Chaque don est utilisé pour financer les colis alimentaires, le matériel de nos permanences, les déplacements pour accompagner les bénéficiaires, et les fournitures essentielles.
                </p>
              </Reveal>
              <Reveal delay={0.35}>
                <p className="text-[#1c3038]/50 mb-8 leading-relaxed">
                  Nous ne demandons pas de gros montants. <strong className="text-[#1c3038]">Même un petit geste régulier fait une différence énorme</strong> quand il est multiplié par la générosité de toute une communauté.
                </p>
              </Reveal>

              <Reveal delay={0.4}>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="#contact"
                    className="group inline-flex items-center gap-3 bg-[#1c3038] text-white px-8 py-4 rounded-sm text-sm uppercase tracking-wider hover:bg-[#2a4250] transition-all"
                  >
                    Faire un don
                    <Heart size={16} className="group-hover:scale-110 transition-transform" />
                  </a>
                  <a
                    href="#contact"
                    className="group inline-flex items-center gap-3 border-2 border-[#1c3038]/20 text-[#1c3038] px-8 py-4 rounded-sm text-sm uppercase tracking-wider hover:border-[#1c3038] transition-all"
                  >
                    Nous contacter d'abord
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </Reveal>
            </div>

            <div>
              <Reveal delay={0.2}>
                <p className="text-xs uppercase tracking-[0.2em] text-[#1c3038]/30 mb-8">Concrètement, votre don finance</p>
              </Reveal>
              <div className="space-y-4">
                {DONATION_USES.map((d, i) => (
                  <Reveal key={i} delay={0.3 + i * 0.1}>
                    <motion.div
                      className="bg-white rounded-sm p-6 flex items-start gap-5 border border-[#1c3038]/5"
                      whileHover={{ x: 4, transition: { duration: 0.2 } }}
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-sm bg-[#1c3038] flex items-center justify-center">
                        <d.icon size={20} className="text-white" />
                      </div>
                      <p className="text-[#1c3038]/60 text-sm leading-relaxed pt-1">{d.text}</p>
                    </motion.div>
                  </Reveal>
                ))}
              </div>

              <Reveal delay={0.7}>
                <div className="mt-8 bg-[#1c3038] rounded-sm p-6 text-center">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Compte bancaire ASBL</p>
                  <p className="font-['Archivo_Black',sans-serif] text-white text-lg tracking-wide">
                    BE XX XXXX XXXX XXXX
                  </p>
                  <p className="text-white/30 text-xs mt-2">Communication : "Don ECW"</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CONTACT ═══════════ */}
      <section id="contact" className="py-28 bg-[#1c3038]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 text-center">
          <Reveal>
            <Label dark>Contact</Label>
          </Reveal>
          <Reveal delay={0.1}>
            <BigHeading dark className="text-4xl sm:text-5xl lg:text-6xl mb-6">
              ENVIE D'AIDER<span className="text-[#c9c918]"> ?</span>
              <br />
              BESOIN D'AIDE<span className="text-[#d96363]"> ?</span>
            </BigHeading>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-white/40 mb-16 max-w-md mx-auto">
              Notre porte est toujours ouverte. N'hésitez pas.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { icon: Phone, label: "+32 XXX XX XX XX", bg: MINT },
              { icon: Mail, label: "info@espaceconvivial.be", bg: CREAM },
              { icon: MapPin, label: "Waterloo, Belgique", bg: PINK },
            ].map((c) => (
              <Reveal key={c.label} delay={0.3}>
                <motion.div
                  className="rounded-sm p-8 flex flex-col items-center gap-4"
                  style={{ background: c.bg }}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                >
                  <c.icon size={28} className="text-[#1c3038]" />
                  <p className="text-[#1c3038]/70 text-sm">{c.label}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-[#131a1f] py-10">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo className="h-10" dark />
          <p className="text-white/20 text-xs uppercase tracking-wider">&copy; 2014–2026 Espace Convivial de Waterloo &middot; ASBL</p>
        </div>
      </footer>

      {/* Student Form Modal */}
      <StudentFormModal open={studentFormOpen} onClose={() => setStudentFormOpen(false)} />
    </div>
  );
}