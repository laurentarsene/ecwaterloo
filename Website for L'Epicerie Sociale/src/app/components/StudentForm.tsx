import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, GraduationCap, Minus, Plus, CheckCircle, ArrowRight } from "lucide-react";

interface FormData {
  prenom: string;
  nom: string;
  ecole: string;
  genre: string;
  telephone: string;
  email: string;
  personnes: number;
}

const INITIAL: FormData = {
  prenom: "",
  nom: "",
  ecole: "",
  genre: "",
  telephone: "",
  email: "",
  personnes: 1,
};

function getNextFirstThursday(): string {
  const now = new Date();
  let d = new Date(now.getFullYear(), now.getMonth(), 1);
  // Find first Thursday of current month
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  // If it's already past, go to next month
  if (d < now) {
    d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  }
  return d.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function StudentFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(0);

  const nextDate = getNextFirstThursday();

  const update = (field: keyof FormData, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setForm(INITIAL);
      setSubmitted(false);
      setStep(0);
    }, 300);
  };

  const canNext =
    step === 0
      ? form.prenom.trim() && form.nom.trim() && form.ecole.trim()
      : step === 1
      ? form.genre && form.telephone.trim() && form.email.trim()
      : true;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-[#1c3038]/60 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="bg-[#d6f5e8] p-8 relative">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-sm hover:bg-[#1c3038]/10 transition-colors"
              >
                <X size={18} />
              </button>
              <div className="w-14 h-14 rounded-sm bg-[#1c3038] flex items-center justify-center mb-4">
                <GraduationCap className="text-white" size={24} />
              </div>
              <h3
                className="font-['Archivo_Black',sans-serif] text-[#1c3038] uppercase text-2xl tracking-tight"
              >
                ÉPICERIE ÉTUDIANTE
              </h3>
              <p className="text-[#1c3038]/50 text-sm mt-2">
                Prochain rendez-vous : <strong className="text-[#1c3038]">{nextDate}</strong>
              </p>
              <p className="text-[#1c3038]/40 text-xs mt-1">
                5€ symboliques &middot; Premier jeudi du mois
              </p>
            </div>

            {submitted ? (
              <motion.div
                className="p-8 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-16 h-16 rounded-full bg-[#d6f5e8] flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="text-[#1c3038]" size={32} />
                </div>
                <h4 className="font-['Archivo_Black',sans-serif] text-[#1c3038] uppercase text-lg mb-3">
                  INSCRIPTION ENVOYÉE !
                </h4>
                <p className="text-[#1c3038]/50 text-sm mb-2">
                  Merci <strong className="text-[#1c3038]">{form.prenom}</strong> ! On te confirme ton inscription par email sous peu.
                </p>
                <p className="text-[#1c3038]/40 text-xs mb-6">
                  Rendez-vous le <strong>{nextDate}</strong> avec ta carte étudiant.
                </p>
                <button
                  onClick={handleClose}
                  className="px-8 py-3 bg-[#1c3038] text-white text-sm uppercase tracking-wider rounded-sm hover:bg-[#2a4250] transition-colors"
                >
                  Fermer
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="p-8">
                {/* Step indicators */}
                <div className="flex gap-2 mb-8">
                  {[0, 1, 2].map((s) => (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                        s <= step ? "bg-[#1c3038]" : "bg-[#1c3038]/10"
                      }`}
                    />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div
                      key="step0"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-[#1c3038]/30 mb-4">Identité</p>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-[#1c3038]/40 mb-1.5 block">Prénom *</label>
                        <input
                          type="text"
                          value={form.prenom}
                          onChange={(e) => update("prenom", e.target.value)}
                          className="w-full border border-[#1c3038]/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#1c3038]/30 bg-[#faf9f6] transition-colors"
                          placeholder="Ton prénom"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-[#1c3038]/40 mb-1.5 block">Nom *</label>
                        <input
                          type="text"
                          value={form.nom}
                          onChange={(e) => update("nom", e.target.value)}
                          className="w-full border border-[#1c3038]/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#1c3038]/30 bg-[#faf9f6] transition-colors"
                          placeholder="Ton nom de famille"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-[#1c3038]/40 mb-1.5 block">École / Université *</label>
                        <input
                          type="text"
                          value={form.ecole}
                          onChange={(e) => update("ecole", e.target.value)}
                          className="w-full border border-[#1c3038]/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#1c3038]/30 bg-[#faf9f6] transition-colors"
                          placeholder="Ex: UCLouvain, ULB, EPHEC..."
                          required
                        />
                      </div>
                    </motion.div>
                  )}

                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-[#1c3038]/30 mb-4">Coordonnées</p>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-[#1c3038]/40 mb-2 block">Genre *</label>
                        <div className="flex gap-3">
                          {["Homme", "Femme"].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => update("genre", g)}
                              className={`flex-1 py-3 text-sm rounded-sm border transition-all duration-200 ${
                                form.genre === g
                                  ? "border-[#1c3038] bg-[#1c3038] text-white"
                                  : "border-[#1c3038]/10 text-[#1c3038]/50 hover:border-[#1c3038]/30"
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-[#1c3038]/40 mb-1.5 block">Téléphone *</label>
                        <input
                          type="tel"
                          value={form.telephone}
                          onChange={(e) => update("telephone", e.target.value)}
                          className="w-full border border-[#1c3038]/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#1c3038]/30 bg-[#faf9f6] transition-colors"
                          placeholder="+32 4XX XX XX XX"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-[#1c3038]/40 mb-1.5 block">Adresse email *</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => update("email", e.target.value)}
                          className="w-full border border-[#1c3038]/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[#1c3038]/30 bg-[#faf9f6] transition-colors"
                          placeholder="ton.email@ecole.be"
                          required
                        />
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-[#1c3038]/30 mb-6">Nombre de personnes</p>
                      <p className="text-[#1c3038]/50 text-sm mb-6">
                        Pour combien de personnes viens-tu chercher des courses ? (toi inclus)
                      </p>
                      <div className="flex items-center justify-center gap-6 mb-8">
                        <button
                          type="button"
                          onClick={() => update("personnes", Math.max(1, form.personnes - 1))}
                          className="w-12 h-12 rounded-sm border border-[#1c3038]/10 flex items-center justify-center hover:bg-[#1c3038]/5 transition-colors"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="font-['Archivo_Black',sans-serif] text-5xl text-[#1c3038] w-16 text-center">
                          {form.personnes}
                        </span>
                        <button
                          type="button"
                          onClick={() => update("personnes", Math.min(10, form.personnes + 1))}
                          className="w-12 h-12 rounded-sm border border-[#1c3038]/10 flex items-center justify-center hover:bg-[#1c3038]/5 transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      {/* Recap */}
                      <div className="bg-[#faf9f6] rounded-sm p-5 mb-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#1c3038]/30 mb-3">Récapitulatif</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-[#1c3038]/40">Nom</span>
                          <span className="text-[#1c3038] text-right">{form.prenom} {form.nom}</span>
                          <span className="text-[#1c3038]/40">École</span>
                          <span className="text-[#1c3038] text-right">{form.ecole}</span>
                          <span className="text-[#1c3038]/40">Personnes</span>
                          <span className="text-[#1c3038] text-right">{form.personnes}</span>
                          <span className="text-[#1c3038]/40">Montant</span>
                          <span className="font-['Archivo_Black',sans-serif] text-[#1c3038] text-right">5€</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex gap-3 mt-8">
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="px-6 py-3 border border-[#1c3038]/10 text-[#1c3038]/50 text-sm uppercase tracking-wider rounded-sm hover:border-[#1c3038]/30 transition-colors"
                    >
                      Retour
                    </button>
                  )}
                  {step < 2 ? (
                    <button
                      type="button"
                      disabled={!canNext}
                      onClick={() => setStep(step + 1)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm uppercase tracking-wider rounded-sm transition-all ${
                        canNext
                          ? "bg-[#1c3038] text-white hover:bg-[#2a4250]"
                          : "bg-[#1c3038]/10 text-[#1c3038]/30 cursor-not-allowed"
                      }`}
                    >
                      Suivant <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#d96363] text-white text-sm uppercase tracking-wider rounded-sm hover:bg-[#c44f4f] transition-colors"
                    >
                      Confirmer mon inscription <CheckCircle size={14} />
                    </button>
                  )}
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
