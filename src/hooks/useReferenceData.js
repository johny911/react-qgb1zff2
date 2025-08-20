// src/hooks/useReferenceData.js
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

const TTL_MS = 10 * 60 * 1000 // 10 minutes

const cacheKey = (k, userId) => `ref:${k}:${userId || 'anon'}`
const now = () => Date.now()

function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.ts || !parsed.data) return null
    if (now() - parsed.ts > TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}
function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: now(), data })) } catch {}
}

// Normalize ids to strings so Select value comparisons remain stable
const s = (v) => (v == null ? '' : String(v))

export default function useReferenceData(userId) {
  const [projects, setProjects] = useState([])
  const [teams, setTeams] = useState([])
  const [typesByTeam, setTypesByTeam] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const mounted = useRef(true)
  const refreshing = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // Warm from cache instantly (for snappy dropdowns)
  useEffect(() => {
    const cp = readCache(cacheKey('projects', userId))
    const ct = readCache(cacheKey('teams', userId))
    const cty = readCache(cacheKey('types', userId))
    if (cp?.length) setProjects(cp)
    if (ct?.length) setTeams(ct)
    if (cty && Object.keys(cty).length) setTypesByTeam(cty)

    // Always kick a fresh load right after mount
    refresh(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const refresh = async (force = false) => {
    if (refreshing.current) return
    refreshing.current = true
    setError('')
    setLoading(true)

    try {
      // fetch in parallel
      const [{ data: p, error: ep }, { data: t, error: et }, { data: ty, error: ety }] =
        await Promise.all([
          supabase.from('projects').select('id,name').order('name'),
          supabase.from('labour_teams').select('id,name').order('name'),
          supabase.from('labour_types').select('id,team_id,type_name').order('team_id').order('type_name'),
        ])

      if (ep || et || ety) throw (ep || et || ety)

      const proj = (p || []).map(row => ({ id: s(row.id), name: row.name }))
      const team = (t || []).map(row => ({ id: s(row.id), name: row.name }))

      const types = {}
      ;(ty || []).forEach(x => {
        const teamId = s(x.team_id)
        types[teamId] = types[teamId] || []
        types[teamId].push({ id: s(x.id), team_id: teamId, type_name: x.type_name })
      })

      if (!mounted.current) return
      setProjects(proj)
      setTeams(team)
      setTypesByTeam(types)

      writeCache(cacheKey('projects', userId), proj)
      writeCache(cacheKey('teams', userId), team)
      writeCache(cacheKey('types', userId), types)
    } catch (e) {
      if (!mounted.current) return
      setError(e?.message || 'Failed to load reference data')
      // keep whatever we had (possibly from cache) so UI still works
    } finally {
      if (mounted.current) setLoading(false)
      refreshing.current = false
    }
  }

  // Auto-retry when the tab becomes visible or network returns
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        const empty =
          projects.length === 0 || teams.length === 0 || Object.keys(typesByTeam).length === 0
        if (empty && !loading) refresh(true)
      }
    }
    const onOnline = () => refresh(true)

    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', onOnline)
    }
  }, [projects, teams, typesByTeam, loading])

  return {
    projects, teams, typesByTeam,
    loading, error,
    refresh,
  }
}