import React, { useState, useEffect } from 'react';
import { School, SchoolYearSettings } from '../types';

export function AdminAnoLetivo({ supabase, schools, onShowNotify }: { supabase: any, schools: School[], onShowNotify: (msg: string, type: 'success'|'error') => void }) {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [periodType, setPeriodType] = useState<'trimestre' | 'bimestre'>('trimestre');
  const [periods, setPeriods] = useState<{number: number, start: string, end: string}[]>([]);
  const [pppEvents, setPppEvents] = useState<{date: string, chapter: string, topic: string, learning: string}[]>([]);

  useEffect(() => {
    if (schools.length > 0 && !selectedSchoolId) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [schools, selectedSchoolId]);

  useEffect(() => {
    if (selectedSchoolId && year) {
      fetchSettings();
    }
  }, [selectedSchoolId, year]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('school_year_settings')
        .select('*')
        .eq('school_id', selectedSchoolId)
        .eq('year', year)
        .maybeSingle();

      if (error) {
        onShowNotify("Erro ao buscar configurações do ano letivo.", "error");
        return;
      }

      if (data) {
        setPeriodType(data.period_type);
        setPeriods(data.periods || []);
        setPppEvents(data.ppp_events || []);
      } else {
        // Reset to default
        setPeriodType('trimestre');
        setPeriods([
          { number: 1, start: `${year}-02-01`, end: `${year}-05-15` },
          { number: 2, start: `${year}-05-16`, end: `${year}-08-30` },
          { number: 3, start: `${year}-09-01`, end: `${year}-12-15` }
        ]);
        setPppEvents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodTypeChange = (pt: 'trimestre' | 'bimestre') => {
    setPeriodType(pt);
    if (pt === 'trimestre') {
      setPeriods([
         { number: 1, start: `${year}-02-01`, end: `${year}-05-15` },
         { number: 2, start: `${year}-05-16`, end: `${year}-08-30` },
         { number: 3, start: `${year}-09-01`, end: `${year}-12-15` }
      ]);
    } else {
      setPeriods([
         { number: 1, start: `${year}-02-01`, end: `${year}-04-15` },
         { number: 2, start: `${year}-04-16`, end: `${year}-06-30` },
         { number: 3, start: `${year}-08-01`, end: `${year}-10-15` },
         { number: 4, start: `${year}-10-16`, end: `${year}-12-15` }
      ]);
    }
  };

  const updatePeriod = (index: number, field: 'start' | 'end', value: string) => {
    const newPeriods = [...periods];
    newPeriods[index][field] = value;
    setPeriods(newPeriods);
  };

  const addPppEvent = () => {
    setPppEvents([...pppEvents, { date: '', chapter: 'EVENTO PPP', topic: '', learning: '' }]);
  };

  const updatePppEvent = (index: number, field: string, value: string) => {
    const newEvents = [...pppEvents];
    (newEvents[index] as any)[field] = value;
    setPppEvents(newEvents);
  };

  const removePppEvent = (index: number) => {
    setPppEvents(pppEvents.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedSchoolId) return;
    setSaving(true);
    try {
      const payload = {
        school_id: selectedSchoolId,
        year,
        period_type: periodType,
        periods,
        ppp_events: pppEvents
      };

      const { error } = await supabase.from('school_year_settings').upsert(payload, { onConflict: 'school_id, year' });
      if (error) throw error;
      onShowNotify("Configurações do ano letivo salvas com sucesso!", "success");
    } catch (err: any) {
      onShowNotify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border space-y-8">
      <div className="flex border-b pb-6 gap-4 items-end">
         <div className="flex-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Escola</label>
            <select value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold">
               {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
         </div>
         <div className="w-32">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Ano</label>
            <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold" />
         </div>
      </div>

      {loading ? (
        <div className="text-center p-10 text-slate-400 font-bold text-xs uppercase animate-pulse">Carregando configurações...</div>
      ) : (
        <div className="space-y-10">
          {/* Períodos */}
          <div>
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Períodos de Avaliação</h3>
                  <p className="text-xs text-slate-500">Defina se a escola usa Bimestres ou Trimestres, e as datas.</p>
               </div>
               <select value={periodType} onChange={e => handlePeriodTypeChange(e.target.value as any)} className="bg-slate-50 border p-2 rounded-lg text-xs font-bold text-slate-700">
                  <option value="trimestre">Trimestral (3 períodos)</option>
                  <option value="bimestre">Bimestral (4 períodos)</option>
               </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {periods.map((p, idx) => (
                 <div key={idx} className="bg-slate-50 p-4 rounded-2xl border">
                    <h4 className="text-xs font-black text-indigo-600 mb-2 uppercase">{p.number}º {periodType === 'trimestre' ? 'Trimestre' : 'Bimestre'}</h4>
                    <div className="space-y-4">
                       <div>
                          <label className="text-[10px] font-bold text-slate-400 block">Início</label>
                          <input type="date" value={p.start} onChange={e => updatePeriod(idx, 'start', e.target.value)} className="w-full bg-white border p-2 rounded-lg text-xs" />
                       </div>
                       <div>
                          <label className="text-[10px] font-bold text-slate-400 block">Fim</label>
                          <input type="date" value={p.end} onChange={e => updatePeriod(idx, 'end', e.target.value)} className="w-full bg-white border p-2 rounded-lg text-xs" />
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <hr className="border-dashed" />

          {/* Calendário e Eventos PPP */}
          <div>
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Eventos PPP / Feriados Locais</h3>
                  <p className="text-xs text-slate-500">Adicione datas fixas (simulados, festas, reuniões). O Gerador Automático reservará estas datas.</p>
               </div>
               <button onClick={addPppEvent} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-colors">
                 <i className="fa-solid fa-plus"></i> Adicionar Evento
               </button>
            </div>

            <div className="space-y-3">
               {pppEvents.length === 0 && <p className="text-xs text-slate-400 italic">Nenhum evento customizado cadastrado.</p>}
               {pppEvents.map((evt, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-slate-50 p-3 rounded-2xl border">
                     <div className="w-32">
                        <label className="text-[9px] font-bold text-slate-400 block">Data</label>
                        <input type="date" value={evt.date} onChange={e => updatePppEvent(idx, 'date', e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white" />
                     </div>
                     <div className="w-40">
                        <label className="text-[9px] font-bold text-slate-400 block">Capítulo</label>
                        <input type="text" value={evt.chapter} onChange={e => updatePppEvent(idx, 'chapter', e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white" />
                     </div>
                     <div className="flex-1">
                        <label className="text-[9px] font-bold text-slate-400 block">Tópico</label>
                        <input type="text" value={evt.topic} onChange={e => updatePppEvent(idx, 'topic', e.target.value)} placeholder="Ex: Festa Junina" className="w-full p-2 border rounded-lg text-xs bg-white" />
                     </div>
                     <div className="flex-1">
                        <label className="text-[9px] font-bold text-slate-400 block">Aprendizado</label>
                        <input type="text" value={evt.learning} onChange={e => updatePppEvent(idx, 'learning', e.target.value)} placeholder="Ex: Valorização da cultura" className="w-full p-2 border rounded-lg text-xs bg-white" />
                     </div>
                     <div className="pt-4">
                        <button onClick={() => removePppEvent(idx)} className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 flex items-center justify-center"><i className="fa-solid fa-trash"></i></button>
                     </div>
                  </div>
               ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
             <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
               {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
               Salvar Ano Letivo
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
