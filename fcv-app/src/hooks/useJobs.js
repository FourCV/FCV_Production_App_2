import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useJobs({ year = '', month = '', status = '', search = '' } = {}) {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal]     = useState(0)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('jobs').select('*', { count: 'exact' })
    if (year)   q = q.eq('year', year)
    if (month)  q = q.eq('month', month)
    if (status === 'collected') q = q.not('fee_collected_date', 'is', null)
    if (status === 'pending')   q = q.is('fee_collected_date', null).not('fee', 'is', null)
    if (status === 'cancelled') q = q.eq('is_cancelled', true)
    if (search) q = q.or(`job_number.ilike.%${search}%,client_name.ilike.%${search}%,address.ilike.%${search}%`)
    q = q.order('created_at', { ascending: false })
    const { data, count } = await q
    setJobs(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [year, month, status, search])

  useEffect(() => { fetch() }, [fetch])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetch())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch])

  return { jobs, loading, total, refresh: fetch }
}
