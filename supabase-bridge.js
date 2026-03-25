/**
 * QuincéSinistr — Supabase Bridge
 * Ce script est injecté dans app.html pour connecter
 * l'application HTML existante à Supabase.
 *
 * Il remplace les opérations en mémoire (DATA[], RELANCES[])
 * par des appels à la base de données.
 */

(function() {
  'use strict';

  // Attendre que l'app soit initialisée
  window.addEventListener('load', function() {
    setTimeout(patchApp, 500);
  });

  function patchApp() {
    // ── 1. Charger les données depuis Supabase ──────────────
    if (window.__DB_SINISTRES__ && window.DATA !== undefined) {
      // Convertir les colonnes Supabase → format JS de l'app
      window.DATA = window.__DB_SINISTRES__.map(dbToApp);
      window.RAW = window.DATA;
      window.filteredData = [...window.DATA];
      console.log('[Supabase] Chargé:', window.DATA.length, 'sinistres');
    }

    if (window.__DB_RELANCES__ && window.RELANCES !== undefined) {
      window.RELANCES = window.__DB_RELANCES__.map(dbRelanceToApp);
      console.log('[Supabase] Chargé:', window.RELANCES.length, 'relances');
    }

    // ── 2. Patcher l'utilisateur connecté ──────────────────
    if (window.__DB_USER__ && window.currentUser !== undefined) {
      const u = window.__DB_USER__;
      window.currentUser = {
        id: u.email,
        name: u.name,
        role: u.role,
        av: u.av,
        bg: '#FEF0E7',
        color: '#B84A07',
      };
      // Mettre à jour l'affichage sidebar
      const avEl = document.querySelector('.user-av');
      const nameEl = document.querySelector('.user-name');
      const roleEl = document.querySelector('.user-role');
      if (avEl) { avEl.textContent = u.av; avEl.style.background = '#E8610A'; avEl.style.color = '#fff'; }
      if (nameEl) nameEl.textContent = u.name;
      if (roleEl) roleEl.textContent = u.role;
    }

    // ── 3. Patcher doLogout ─────────────────────────────────
    if (window.__DB_LOGOUT__) {
      window._originalLogout = window.doLogout;
      window.doLogout = async function() {
        await window.__DB_LOGOUT__();
        // Recharger la page pour revenir à l'écran de connexion React
        window.location.reload();
      };
    }

    // ── 4. Patcher saveNew — sauvegarder dans Supabase ─────
    if (window.__DB_SAVE__ && window.saveNew) {
      const origSaveNew = window.saveNew;
      window.saveNew = async function() {
        origSaveNew.call(this);
        // Récupérer le sinistre qui vient d'être ajouté
        const newS = window.DATA[0];
        if (newS) {
          try {
            await window.__DB_SAVE__(newS);
            console.log('[Supabase] Sinistre créé:', newS.archive);
          } catch (e) {
            console.error('[Supabase] Erreur création sinistre:', e);
            showNotifSafe('⚠️ Erreur sauvegarde: ' + e.message);
          }
        }
      };
    }

    // ── 5. Patcher saveEdit — sauvegarder les modifications ─
    if (window.__DB_SAVE__ && window.saveEdit) {
      const origSaveEdit = window.saveEdit;
      window.saveEdit = async function() {
        origSaveEdit.call(this);
        // Le sinistre modifié est dans DATA[currentDetailIdx]
        const idx = window.currentDetailIdx;
        if (idx >= 0 && window.DATA[idx]) {
          try {
            await window.__DB_SAVE__(window.DATA[idx]);
            console.log('[Supabase] Sinistre modifié:', window.DATA[idx].archive);
          } catch (e) {
            console.error('[Supabase] Erreur modification:', e);
            showNotifSafe('⚠️ Erreur sauvegarde: ' + e.message);
          }
        }
      };
    }

    // ── 6. Patcher ieSave ──────────────────────────────────
    if (window.__DB_SAVE__ && window.ieSave) {
      const origIeSave = window.ieSave;
      window.ieSave = async function(sec) {
        origIeSave.call(this, sec);
        const idx = window.currentDetailIdx;
        if (idx >= 0 && window.DATA[idx]) {
          try {
            await window.__DB_SAVE__(window.DATA[idx]);
          } catch (e) {
            console.error('[Supabase] Erreur ieSave:', e);
          }
        }
      };
    }

    // ── 7. Patcher dpObsAdd ────────────────────────────────
    if (window.__DB_SAVE__ && window.dpObsAdd) {
      const origObs = window.dpObsAdd;
      window.dpObsAdd = async function() {
        origObs.call(this);
        const idx = window.currentDetailIdx;
        if (idx >= 0 && window.DATA[idx]) {
          try {
            await window.__DB_SAVE__(window.DATA[idx]);
          } catch (e) {
            console.error('[Supabase] Erreur obs:', e);
          }
        }
      };
    }

    // ── 8. Patcher saveRelance ────────────────────────────
    if (window.__DB_SAVE_RELANCE__ && window.saveRelance) {
      const origSaveRelance = window.saveRelance;
      window.saveRelance = async function() {
        origSaveRelance.call(this);
        const r = window.RELANCES[0]; // plus récente en tête
        if (r) {
          try {
            await window.__DB_SAVE_RELANCE__(appRelanceToDb(r));
            console.log('[Supabase] Relance sauvegardée:', r.titre);
          } catch (e) {
            console.error('[Supabase] Erreur relance:', e);
          }
        }
      };
    }

    // ── 9. Patcher deleteRelance ──────────────────────────
    if (window.__DB_DELETE_RELANCE__ && window.deleteRelance) {
      const origDel = window.deleteRelance;
      window.deleteRelance = async function(id) {
        await window.__DB_DELETE_RELANCE__(id);
        origDel.call(this, id);
      };
    }

    // ── 10. Re-render avec les données chargées ────────────
    if (window.renderDash) window.renderDash();
    if (window.renderList) window.renderList();
    if (window.renderRelanceStat) window.renderRelanceStat();

    console.log('[Supabase] Bridge actif ✓');
  }

  // ── Conversions DB ↔ App ──────────────────────────────────

  function dbToApp(row) {
    return {
      archive:      row.archive,
      date:         row.date,
      entite:       row.entite,
      type_sinistre: row.type_sinistre,
      conducteur:   row.conducteur,
      immat:        row.immat || '',
      affreteur:    row.affreteur || '',
      ldv:          row.ldv || '',
      chassis:      row.chassis || '',
      nref:         row.nref || '',
      etat:         row.etat || 'en-cours',
      franchise:    row.franchise || 0,
      chiffrage:    row.chiffrage || 0,
      factures:     row.factures || [],
      rbt:          row.rbt || 0,
      drbt:         row.drbt || '',
      revente:      row.revente || 0,
      drevente:     row.drevente || '',
      rbtList:      row.rbt_list || [],
      mmalus:       row.mmalus || 0,
      dmalus:       row.dmalus || '',
      nmalus:       row.nmalus || '',
      dpmalus:      row.dpmalus || '',
      contest:      row.contest || '',
      expertise:    row.expertise || '',
      obs:          row.obs || '',
      obsList:      row.obs_list || [],
      lien:         row.lien || '',
      presc:        0,
    };
  }

  function dbRelanceToApp(row) {
    return {
      id:          row.id,
      titre:       row.titre,
      type:        row.type,
      priorite:    row.priorite,
      archive:     row.archive || '',
      entite:      row.entite || '',
      responsable: row.responsable,
      echeance:    row.echeance,
      desc:        row.description || '',
      statut:      row.statut || 'À faire',
      creeLe:      row.cree_le || '',
      creePar:     row.cree_par || '',
    };
  }

  function appRelanceToDb(r) {
    return {
      id:          typeof r.id === 'number' ? undefined : r.id,
      titre:       r.titre,
      type:        r.type,
      priorite:    r.priorite,
      archive:     r.archive || null,
      entite:      r.entite || null,
      responsable: r.responsable,
      echeance:    r.echeance,
      description: r.desc || null,
      statut:      r.statut || 'À faire',
      cree_le:     r.creeLe || null,
      cree_par:    r.creePar || null,
    };
  }

  function showNotifSafe(msg) {
    if (window.showNotif) window.showNotif(msg);
    else console.warn(msg);
  }

})();
