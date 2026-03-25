import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Variables Supabase manquantes. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── SINISTRES ────────────────────────────────────────────
export async function fetchSinistres() {
  const { data, error } = await supabase
    .from('sinistres')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function upsertSinistre(sinistre) {
  // Convertir les champs JS en colonnes Supabase
  const row = {
    archive:       sinistre.archive,
    date:          sinistre.date,
    entite:        sinistre.entite || null,
    type_sinistre: sinistre.type_sinistre || null,
    conducteur:    sinistre.conducteur,
    immat:         sinistre.immat || null,
    affreteur:     sinistre.affreteur || null,
    ldv:           sinistre.ldv || null,
    chassis:       sinistre.chassis || null,
    nref:          sinistre.nref || null,
    etat:          sinistre.etat || 'en-cours',
    franchise:     sinistre.franchise || 0,
    chiffrage:     sinistre.chiffrage || 0,
    factures:      sinistre.factures || [],
    rbt:           sinistre.rbt || 0,
    drbt:          sinistre.drbt || null,
    revente:       sinistre.revente || 0,
    drevente:      sinistre.drevente || null,
    rbt_list:      sinistre.rbtList || [],
    mmalus:        sinistre.mmalus || 0,
    dmalus:        sinistre.dmalus || null,
    nmalus:        sinistre.nmalus || null,
    dpmalus:       sinistre.dpmalus || null,
    contest:       sinistre.contest || null,
    expertise:     sinistre.expertise || null,
    obs:           sinistre.obs || null,
    obs_list:      sinistre.obsList || [],
    lien:          sinistre.lien || null,
  }
  const { data, error } = await supabase
    .from('sinistres')
    .upsert(row, { onConflict: 'archive' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSinistre(archive) {
  const { error } = await supabase
    .from('sinistres')
    .delete()
    .eq('archive', archive)
  if (error) throw error
}

// ─── ACTIVITÉ ─────────────────────────────────────────────
export async function fetchActivite(archive) {
  const { data, error } = await supabase
    .from('activite')
    .select('*')
    .eq('archive', archive)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addActivite(entry) {
  const { error } = await supabase.from('activite').insert(entry)
  if (error) throw error
}

// ─── RELANCES ─────────────────────────────────────────────
export async function fetchRelances() {
  const { data, error } = await supabase
    .from('relances')
    .select('*')
    .order('echeance', { ascending: true })
  if (error) throw error
  return data
}

export async function upsertRelance(relance) {
  const row = {
    id:          relance.id?.toString().length === 36 ? relance.id : undefined,
    titre:       relance.titre,
    type:        relance.type,
    priorite:    relance.priorite,
    archive:     relance.archive || null,
    entite:      relance.entite || null,
    responsable: relance.responsable,
    echeance:    relance.echeance,
    description: relance.desc || null,
    statut:      relance.statut || 'À faire',
    cree_le:     relance.creeLe || null,
    cree_par:    relance.creePar || null,
  }
  const { data, error } = await supabase
    .from('relances')
    .upsert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRelance(id) {
  const { error } = await supabase
    .from('relances')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── DOCUMENTS ────────────────────────────────────────────
export async function fetchDocuments(archive) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('archive', archive)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addDocument(doc) {
  const { error } = await supabase.from('documents').insert(doc)
  if (error) throw error
}

export async function deleteDocument(id) {
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
}

// ─── AUTH ─────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}
