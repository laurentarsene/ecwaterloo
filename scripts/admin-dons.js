// ═══════════════════════════════════════════════════════
//  ECW Admin — Dons (super-admins seulement)
//  Chiffres lus en direct chez Stripe par la fonction serveur, qui vérifie
//  le rôle super-admin à chaque appel : masquer l'onglet ne suffit pas, et
//  aucune donnée de don n'est stockée dans la base du site.
// ═══════════════════════════════════════════════════════

const EUR = (cents) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: cents % 100 ? 2 : 0 }).format((cents || 0) / 100);
const DONS = { tout: false, data: null };

window.addEventListener('ecw:onglet', (e) => { if (e.detail === 'dons') chargerDons().catch(erreurDons); });

function erreurDons(e) {
  const textes = {
    stripe_cle: 'Stripe refuse la clé enregistrée : elle a peut-être été supprimée ou mal copiée. Créez-en une nouvelle (voir les étapes ci-dessous) et enregistrez-la à nouveau.',
    stripe_droits: 'La clé Stripe n\'a pas les droits nécessaires. Dans Stripe, donnez-lui l\'accès en lecture à « Balance », « Charges » et « Payouts ».',
    non_autorise: 'Ce compte n\'a pas accès aux dons.',
  };
  $('#panelDons').innerHTML = entete('Dons') + `<div class="dons-vide"><p>${textes[e.message] || 'Stripe ne répond pas pour le moment. Réessayez dans quelques minutes.'}</p>${e.message?.startsWith('stripe') ? etapesStripe() : ''}<button class="btn btn--ghost" id="donsReessayer">Réessayer</button></div>`;
  $('#donsReessayer').onclick = () => chargerDons().catch(erreurDons);
}

const etapesStripe = () => `<ol class="dons-etapes">
  <li>Dans Stripe, ouvrez <strong>Développeurs › Clés API</strong>, puis <strong>Créer une clé restreinte</strong>.</li>
  <li>Donnez-lui un nom (« Site ECW, lecture des dons ») et cochez <strong>Lecture</strong> pour <strong>Balance</strong>, <strong>Charges</strong>, <strong>Payouts</strong> et <strong>Subscriptions</strong> (pour les dons mensuels). Rien d'autre : la clé ne pourra rien modifier ni rembourser.</li>
  <li>Dans le terminal du projet, enregistrez-la comme secret de Supabase : <code>supabase secrets set STRIPE_SECRET_KEY=rk_live_…</code>. Ne la collez nulle part ailleurs (ni dans un message, ni dans le code).</li>
</ol>`;

async function chargerDons() {
  const p = $('#panelDons');
  if (!DONS.data) p.innerHTML = entete('Dons') + '<div class="loading"><div class="spinner"></div></div>';
  const d = DONS.data = await api({ action: 'dons_resume' });
  if (!d.relie) {
    p.innerHTML = entete('Dons') + `<div class="dons-vide"><h2 class="bloc__t">Relier Stripe pour voir les dons</h2>
      <p>Les dons passent par Stripe. Pour afficher ici la balance, les derniers dons et les virements vers le compte de l'ASBL, le site a besoin d'une clé Stripe en <strong>lecture seule</strong>. Trois étapes, une seule fois :</p>${etapesStripe()}
      <p>Ensuite, rechargez cette page.</p></div>`;
    return;
  }
  rendreDons(d);
}

function rendreDons(d) {
  const p = $('#panelDons');
  const max = Math.max(...d.mois.map(m => m.brut), 1);
  const ceMois = d.mois.at(-1);
  const nomMois = (m) => majusc(new Intl.DateTimeFormat('fr-BE', { month: 'long' }).format(new Date(m + '-15')));
  const court = (m) => new Intl.DateTimeFormat('fr-BE', { month: 'short' }).format(new Date(m + '-15')).replace('.', '');
  const liste = DONS.tout ? d.dons : d.dons.slice(0, 15);
  const STATUTS = { ok: '', rembourse: '<span class="statut-badge statut-badge--annule">Remboursé</span>', failed: '<span class="statut-badge statut-badge--absent">Échoué</span>', pending: '<span class="statut-badge statut-badge--attente">En cours</span>' };
  p.innerHTML = entete('Dons', `<button class="btn btn--ghost" id="donsCsv">Exporter ${d.annee.annee} en CSV</button><a class="btn btn--ghost" href="${esc(d.tableau)}" target="_blank" rel="noopener">Ouvrir Stripe</a>`) + `
    ${d.test ? '<p class="dons-test">Stripe est en <strong>mode test</strong> : ces chiffres ne sont pas de vrais dons. Ils deviendront réels quand la clé « live » sera enregistrée.</p>' : ''}
    <p class="lead-admin">Les chiffres viennent directement de Stripe, au moment où vous ouvrez cette page. Seuls les comptes super-admin y ont accès : les autres membres de l'équipe ne voient pas cet onglet, et le serveur refuse de leur envoyer ces données.</p>
    <div class="dons-cartes">
      <article class="dons-c dons-c--fort"><span>Disponible sur Stripe</span><b>${EUR(d.solde.disponible)}</b><p>Prêt à être viré sur le compte bancaire de l'ASBL.</p></article>
      <article class="dons-c"><span>En cours d'arrivée</span><b>${EUR(d.solde.en_cours)}</b><p>Dons récents, disponibles sous quelques jours (délai de Stripe).</p></article>
      <article class="dons-c"><span>${nomMois(ceMois.mois)}</span><b>${EUR(ceMois.net)}</b><p>${ceMois.nb ? `${ceMois.nb} don${ceMois.nb > 1 ? 's' : ''}, ${EUR(ceMois.brut)} donnés avant frais.` : 'Pas encore de don ce mois-ci.'}</p></article>
      ${d.mensuels ? `<article class="dons-c"><span>Dons mensuels actifs</span><b>${EUR(d.mensuels.total)}<small> /mois</small></b><p>${d.mensuels.nb ? `${d.mensuels.nb} personne${d.mensuels.nb > 1 ? 's donnent' : ' donne'} chaque mois, soit ${EUR(d.mensuels.total * 12)} sur une année.` : 'Personne pour l\'instant. Le choix « Chaque mois » s\'affiche sur la page Aider dès que ses liens sont configurés.'}</p></article>` : ''}
      <article class="dons-c"><span>Depuis le 1er janvier ${d.annee.annee}</span><b>${EUR(d.annee.net)}</b><p>${d.annee.nb} don${d.annee.nb > 1 ? 's' : ''} de ${d.annee.donateurs} personne${d.annee.donateurs > 1 ? 's' : ''} ; ${EUR(d.annee.frais)} de frais Stripe.</p></article>
    </div>
    <section class="bloc dons-graph"><h2 class="bloc__t">Les douze derniers mois</h2>
      <p class="lead-admin">Montants donnés chaque mois, avant les frais de Stripe (environ 1,5&nbsp;% + 0,25&nbsp;€ par don). Survolez une barre pour le détail.</p>
      <div class="barres" role="list">${d.mois.map(m => `<div class="barre" role="listitem" title="${nomMois(m.mois)} : ${EUR(m.brut)} donnés, ${EUR(m.net)} reçus, ${m.nb} don${m.nb > 1 ? 's' : ''}" aria-label="${nomMois(m.mois)} : ${EUR(m.brut)}, ${m.nb} dons">
        <span class="barre__v">${m.brut ? EUR(m.brut) : ''}</span><i style="height:${Math.max(m.brut ? 4 : 0, Math.round(m.brut / max * 100))}%"></i><span class="barre__m">${court(m.mois)}</span></div>`).join('')}</div>
    </section>
    <section class="bloc"><div class="bloc__row"><h2 class="bloc__t">Derniers dons</h2>${d.dons.length > 15 ? `<button class="btn btn--ghost btn--sm" id="donsTout">${DONS.tout ? 'Afficher moins' : `Afficher les ${d.dons.length} dons de l'année écoulée`}</button>` : ''}</div>
      ${d.dons.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Donateur ou donatrice</th><th class="text-right">Don</th><th class="text-right">Frais</th><th class="text-right">Reçu</th><th></th></tr></thead><tbody>
        ${liste.map(x => `<tr class="${x.statut === 'ok' ? '' : 'is-off'}"><td class="td-muted" style="white-space:nowrap">${fDateHeure(x.date)}</td>
          <td><span class="td-name">${esc(x.nom) || '<span class="td-muted">Sans nom</span>'}</span>${x.recurrent ? ' <span class="pill">mensuel</span>' : ''}<br><span class="td-muted">${esc(x.email)}</span></td>
          <td class="text-right"><strong>${EUR(x.montant)}</strong></td><td class="text-right td-muted">${x.frais ? `−${EUR(x.frais)}` : ''}</td><td class="text-right">${x.statut === 'ok' ? EUR(x.net) : STATUTS[x.statut] || x.statut}</td>
          <td class="text-right"><a class="btn btn--ghost btn--sm" href="${esc(x.lien)}" target="_blank" rel="noopener">Voir dans Stripe</a></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="vide">Aucun don sur les douze derniers mois.</p>'}
    </section>
    <section class="bloc"><h2 class="bloc__t">Virements vers le compte de l'ASBL</h2>
      ${d.virements.length ? `<ul class="virements">${d.virements.map(v => `<li><b>${EUR(v.montant)}</b><span>${v.statut === 'paid' ? `Arrivé le ${jourMois(new Date(v.arrivee))}` : v.statut === 'in_transit' ? `En route, arrivée prévue le ${jourMois(new Date(v.arrivee))}` : v.statut === 'pending' ? `Prévu pour le ${jourMois(new Date(v.arrivee))}` : `Échoué le ${jourMois(new Date(v.arrivee))} : vérifiez le compte bancaire dans Stripe`}</span></li>`).join('')}</ul>`
        : '<p class="vide">Aucun virement pour l\'instant. Stripe vire automatiquement le solde disponible sur le compte bancaire indiqué dans ses réglages.</p>'}
    </section>`;
  $('#donsCsv').onclick = () => {
    const an = d.dons.filter(x => x.date.startsWith(d.annee.annee));
    telechargerCsv(`dons-ecw-${d.annee.annee}.csv`, ['Date', 'Nom', 'E-mail', 'Don (€)', 'Frais (€)', 'Reçu (€)', 'Statut', 'Mensuel'],
      an.map(x => [fDateHeure(x.date), x.nom, x.email, (x.montant / 100).toFixed(2).replace('.', ','), (x.frais / 100).toFixed(2).replace('.', ','), (x.net / 100).toFixed(2).replace('.', ','), x.statut === 'ok' ? 'reçu' : x.statut, x.recurrent ? 'oui' : 'non']));
  };
  $('#donsTout')?.addEventListener('click', () => { DONS.tout = !DONS.tout; rendreDons(d); });
}
