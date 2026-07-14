
import React, { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, SchoolTeacher } from '../types';
import { DISCIPLINES, WEEKDAYS } from '../constants';

interface TeachersManagerProps {
  schoolId: string;
  supabase: SupabaseClient<Database>;
  onShowNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const TeachersManager: React.FC<TeachersManagerProps> = ({ schoolId, supabase, onShowNotify }) => {
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<SchoolTeacher | null>(null);
  const [shifts, setShifts] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    disciplines: [] as string[],
    availability: {} as Record<string, boolean[]>
  });

  // Availability Grid State (Temp)
  // Estrutura: { "1": [true, true...], "2": ... } onde 1=Segunda
  const [tempAvailability, setTempAvailability] = useState<Record<string, boolean[]>>({});

  const getLessonTimeLabel = (shift: any, lessonIndex: number) => {
    if (!shift.start_time) return '';
    const [startH, startM] = shift.start_time.split(':').map(Number);
    let totalMinutes = startH * 60 + startM;

    // Adiciona tempo das aulas anteriores
    totalMinutes += lessonIndex * shift.lesson_duration_min;

    // Adiciona intervalo se já passou da aula de quebra
    if (shift.break_after_lesson && lessonIndex >= shift.break_after_lesson) {
      totalMinutes += (shift.break_duration_min || 0);
    }

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('school_teachers').select('*').eq('school_id', schoolId).order('name');
      if (error) throw error;
      setTeachers(data || []);

      // Buscar turnos da escola
      const { data: shiftData, error: shiftError } = await supabase.from('school_shifts').select('*').eq('school_id', schoolId).order('name');
      if (shiftError) throw shiftError;
      setShifts(shiftData || []);
    } catch (error: any) {
      onShowNotify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [schoolId, supabase, onShowNotify]);

  useEffect(() => {
    if (schoolId) fetchTeachers();
  }, [fetchTeachers, schoolId]);

  const handleOpenModal = (teacher?: SchoolTeacher) => {
    const totalSlots = shifts.length > 0 
      ? shifts.reduce((acc, curr) => acc + curr.lessons_per_day, 0)
      : 10;

    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        name: teacher.name,
        email: teacher.email || '',
        disciplines: teacher.disciplines,
        availability: teacher.availability
      });

      const avail = teacher.availability || {};
      const normalizedAvail: Record<string, boolean[]> = {};
      for (let i = 1; i <= 5; i++) {
        const dayKey = i.toString();
        const existingArray = avail[dayKey] || [];
        const newArray = Array(totalSlots).fill(true);
        for (let j = 0; j < totalSlots; j++) {
          if (j < existingArray.length) {
            newArray[j] = existingArray[j];
          }
        }
        normalizedAvail[dayKey] = newArray;
      }
      setTempAvailability(normalizedAvail);
    } else {
      setEditingTeacher(null);
      setFormData({
        name: '',
        email: '',
        disciplines: [],
        availability: {}
      });
      const defaultAvail: Record<string, boolean[]> = {};
      for (let i = 1; i <= 5; i++) {
        defaultAvail[i.toString()] = Array(totalSlots).fill(true);
      }
      setTempAvailability(defaultAvail);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return onShowNotify("Nome é obrigatório", "error");
    if (formData.disciplines.length === 0) return onShowNotify("Selecione pelo menos uma disciplina", "error");

    try {
      const payload = {
        school_id: schoolId,
        name: formData.name,
        email: formData.email,
        disciplines: formData.disciplines,
        availability: tempAvailability
      };

      if (editingTeacher) {
        const { error } = await supabase.from('school_teachers').update(payload as any).eq('id', editingTeacher.id);
        if (error) throw error;
        onShowNotify("Professor atualizado!", "success");
      } else {
        const { error } = await supabase.from('school_teachers').insert(payload as any);
        if (error) throw error;
        onShowNotify("Professor cadastrado!", "success");
      }
      setIsModalOpen(false);
      fetchTeachers();
    } catch (error: any) {
      onShowNotify(error.message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    // Removido window.confirm pois ele costuma ser bloqueado no ambiente de preview (iframe)
    try {
      const { error } = await supabase.from('school_teachers').delete().eq('id', id);
      if (error) throw error;
      onShowNotify("Professor removido.", "success");
      setTeachers(prev => prev.filter(t => t.id !== id));
    } catch (error: any) {
      onShowNotify(error.message, "error");
    }
  };

  const toggleDiscipline = (d: string) => {
    setFormData(prev => {
      const exists = prev.disciplines.includes(d);
      return {
        ...prev,
        disciplines: exists ? prev.disciplines.filter(x => x !== d) : [...prev.disciplines, d]
      };
    });
  };

  const toggleAvailability = (day: number, period: number) => {
    setTempAvailability(prev => {
      const dayKey = day.toString();
      const totalSlots = shifts.length > 0 
        ? shifts.reduce((acc, curr) => acc + curr.lessons_per_day, 0)
        : 10;
      const currentDay = prev[dayKey] ? [...prev[dayKey]] : Array(totalSlots).fill(true);
      currentDay[period] = !currentDay[period];
      return { ...prev, [dayKey]: currentDay };
    });
  };

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const handleSyncUsers = async () => {
    setLoading(true);
    try {
      // 1. Buscar perfis de professores cadastrados na escola
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('school_id', schoolId)
        .eq('role', 'teacher');
      
      if (pError) throw pError;
      if (!profiles || profiles.length === 0) {
        onShowNotify("Nenhum usuário cadastrado encontrado para esta escola.", "info");
        return;
      }

      // 2. Filtrar os que ainda não estão na school_teachers (pelo email ou auth_id)
      const existingEmails = teachers.map(t => t.email?.toLowerCase()).filter(Boolean);
      const existingAuthIds = teachers.map(t => t.auth_id).filter(Boolean);

      const toInsert = profiles.filter(p => 
        !existingEmails.includes(p.email?.toLowerCase()) && 
        !existingAuthIds.includes(p.id)
      ).map(p => ({
        school_id: schoolId,
        name: p.full_name,
        email: p.email,
        auth_id: p.id,
        disciplines: p.disciplines ? p.disciplines.split(',').map(d => d.trim()) : [],
        availability: {} // Começa vazio
      }));

      if (toInsert.length === 0) {
        onShowNotify("Todos os usuários cadastrados já estão na lista.", "info");
        return;
      }

      const { error: iError } = await supabase.from('school_teachers').insert(toInsert);
      if (iError) throw iError;

      onShowNotify(`${toInsert.length} professores sincronizados com sucesso!`, "success");
      fetchTeachers();
    } catch (error: any) {
      onShowNotify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const applyPromptRestricoes = async () => {
    setLoading(true);
    try {
      const constraints = [
        { name: "Angelo", avail: {"1": Array(10).fill(true), "2": Array(10).fill(true), "3": Array(10).fill(false), "4": Array(10).fill(false), "5": Array(10).fill(false)} },
        { name: "Camila", avail: {"1": Array(10).fill(true), "2": Array(10).fill(true), "3": Array(10).fill(true), "4": Array(10).fill(false), "5": Array(10).fill(false)} },
        { name: "Cláudia", avail: {"1": Array(10).fill(false), "2": Array(10).fill(false), "3": [true, true, true, false, false, false, false, false, false, false], "4": [true, true, true, false, false, false, false, false, false, false], "5": [true, true, true, false, false, false, false, false, false, false]} },
        { name: "Eduardo", avail: {"1": [true, true, true, true, true, false, false, false, false, false], "2": [true, true, true, true, true, false, false, false, false, false], "3": [true, true, true, true, true, false, false, false, false, false], "4": [true, true, true, true, true, false, false, false, false, false], "5": Array(10).fill(false)} },
        { name: "Emilene", avail: {"1": Array(10).fill(true), "2": Array(10).fill(false), "3": Array(10).fill(true), "4": Array(10).fill(false), "5": Array(10).fill(false)} },
        { name: "Gabriel", avail: {"1": [true, true, true, true, false, false, false, false, false, false], "2": Array(10).fill(true), "3": Array(10).fill(false), "4": Array(10).fill(true), "5": Array(10).fill(true)} },
        { name: "Gabriela", avail: {"1": Array(10).fill(true), "2": Array(10).fill(true), "3": Array(10).fill(true), "4": Array(10).fill(true), "5": Array(10).fill(true)} },
        { name: "Humberto", avail: {"1": [false, false, true, true, true, true, true, true, true, true], "2": [false, false, true, true, true, true, true, true, true, true], "3": [false, false, true, true, true, true, true, true, true, true], "4": [false, false, true, true, true, true, true, true, true, true], "5": [false, false, true, true, true, true, true, true, true, true]} },
        { name: "Jaqueline", avail: {"1": Array(10).fill(false), "2": Array(10).fill(false), "3": Array(10).fill(true), "4": Array(10).fill(true), "5": Array(10).fill(true)} },
        { name: "João", avail: {"1": Array(10).fill(true), "2": Array(10).fill(true), "3": Array(10).fill(false), "4": Array(10).fill(false), "5": Array(10).fill(false)} },
        { name: "José Tadeu", avail: {"1": Array(10).fill(false), "2": Array(10).fill(true), "3": Array(10).fill(false), "4": Array(10).fill(true), "5": Array(10).fill(true)} },
        { name: "Leandro", avail: {"1": Array(10).fill(true), "2": Array(10).fill(false), "3": Array(10).fill(false), "4": [true, true, true, true, true, false, false, false, false, false], "5": [true, true, true, true, true, false, false, false, false, false]} },
        { name: "Luiz", avail: {"1": [false, true, true, true, true, true, true, true, true, true], "2": Array(10).fill(true), "3": Array(10).fill(true), "4": Array(10).fill(true), "5": Array(10).fill(true)} },
        { name: "Raquel", avail: {"1": Array(10).fill(false), "2": Array(10).fill(false), "3": Array(10).fill(true), "4": Array(10).fill(true), "5": Array(10).fill(true)} },
        { name: "Rita", avail: {"1": [false, false, true, true, true, true, true, true, true, true], "2": [false, false, true, true, true, true, true, true, true, true], "3": [false, false, true, true, true, true, true, true, true, true], "4": [false, false, true, true, true, true, true, true, true, true], "5": Array(10).fill(false)} },
        { name: "Silvio", avail: {"1": Array(10).fill(true), "2": Array(10).fill(true), "3": Array(10).fill(true), "4": Array(10).fill(true), "5": Array(10).fill(true)} },
        { name: "Taline", avail: {"1": [true, true, true, false, false, false, false, false, false, false], "2": [true, true, true, false, false, false, false, false, false, false], "3": [true, true, true, false, false, false, false, false, false, false], "4": [true, true, true, false, false, false, false, false, false, false], "5": [true, true, true, false, false, false, false, false, false, false]} },
        { name: "Victor", avail: {"1": Array(10).fill(true), "2": Array(10).fill(true), "3": Array(10).fill(true), "4": Array(10).fill(true), "5": Array(10).fill(true)} }
      ];

      const toUpdate = teachers.filter(t => constraints.some(c => t.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(c.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))));
      
      let count = 0;
      for (const t of toUpdate) {
        const constraint = constraints.find(c => t.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(c.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
        if (constraint) {
          const { error } = await supabase.from('school_teachers').update({ availability: constraint.avail }).eq('id', t.id);
          if (!error) count++;
        }
      }
      onShowNotify(`Disponibilidade atualizada via IA para ${count} professores!`, "success");
      fetchTeachers();
    } catch (err: any) {
      onShowNotify(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    
    const lines = bulkText.split('\n');
    const newTeachers: any[] = [];
    
    // Regex flexível para capturar Numero, Nome e Disponibilidade
    // Suporta: "01 Nome Disponibilidade" ou "01 - Nome - Disponibilidade"
    const lineRegex = /^(\d+)\s*[-–—]?\s*(.+?)\s*[-–—]\s*(.+)$/;

    lines.forEach(line => {
      let match = line.trim().match(lineRegex);
      
      // Fallback para o formato sem hífens se o primeiro falhar
      if (!match) {
        const fallbackRegex = /^(\d+)\s+(.+?)\s+([A-Z].+)$/;
        match = line.trim().match(fallbackRegex);
      }

      if (match) {
        const name = match[2].trim();
        const rawAvail = match[3].trim().toLowerCase();
        
        if (!name) {
          console.warn("Linha ignorada (nome vazio):", line);
          return;
        }
        
        // Lógica de tradução de disponibilidade (Heurística)
        const avail: Record<string, boolean[]> = {};
        for (let i = 1; i <= 5; i++) avail[i.toString()] = Array(10).fill(true);

        const isMon = rawAvail.includes('segunda');
        const isTue = rawAvail.includes('terça');
        const isWed = rawAvail.includes('quarta');
        const isThu = rawAvail.includes('quinta');
        const isFri = rawAvail.includes('sexta');

        // Se cita dias específicos, vamos assumir que só pode nesses dias, 
        // A MENOS que diga "deixar livre" ou "folga"
        const isNegative = rawAvail.includes('deixar') || rawAvail.includes('livre') || rawAvail.includes('folga');

        if (isNegative) {
          // Se pediu pra deixar livre, marcamos esses dias como FALSE
          if (isMon) avail["1"] = Array(10).fill(false);
          if (isTue) avail["2"] = Array(10).fill(false);
          if (isWed) avail["3"] = Array(10).fill(false);
          if (isThu) avail["4"] = Array(10).fill(false);
          if (isFri) avail["5"] = Array(10).fill(false);
        } else {
          // Se citou dias positivamente, marcamos os OUTROS como FALSE
          if (!isMon && (isTue || isWed || isThu || isFri)) avail["1"] = Array(10).fill(false);
          if (!isTue && (isMon || isWed || isThu || isFri)) avail["2"] = Array(10).fill(false);
          if (!isWed && (isMon || isTue || isThu || isFri)) avail["3"] = Array(10).fill(false);
          if (!isThu && (isMon || isTue || isWed || isFri)) avail["4"] = Array(10).fill(false);
          if (!isFri && (isMon || isTue || isWed || isThu)) avail["5"] = Array(10).fill(false);
        }

        // Restrições de horários
        if (rawAvail.includes('primeiros horários') || rawAvail.includes('livrar os primeiros')) {
          [1,2,3,4,5].forEach(d => {
            const day = avail[d.toString()];
            day[0] = false; day[1] = false; // Bloqueia 1ª e 2ª aula
          });
        }
        if (rawAvail.includes('últimos horários')) {
          [1,2,3,4,5].forEach(d => {
            const day = avail[d.toString()];
            day[3] = false; day[4] = false; // Bloqueia 4ª e 5ª aula
          });
        }

        newTeachers.push({
          school_id: schoolId,
          name: name,
          disciplines: [], // Usuário preenche depois
          availability: avail
        });
      }
    });

    if (newTeachers.length === 0) {
      onShowNotify("Não consegui identificar professores no texto. Use o formato: '01 Nome Disponibilidade'", "error");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('school_teachers').insert(newTeachers);
      if (error) throw error;
      onShowNotify(`${newTeachers.length} professores importados! Agora edite cada um para definir as disciplinas.`, "success");
      setIsBulkModalOpen(false);
      setBulkText('');
      fetchTeachers();
    } catch (error: any) {
      onShowNotify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h3 className="text-xl font-black text-slate-900 uppercase">Professores</h3>
           <p className="text-xs text-slate-400 font-bold">Gerencie o corpo docente e suas disponibilidades.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={applyPromptRestricoes} disabled={loading} className="bg-purple-50 text-purple-600 px-4 py-2 rounded-lg font-black text-xs uppercase hover:bg-purple-100 transition-all shadow-sm border border-purple-100">
            <i className="fa-solid fa-wand-magic-sparkles mr-2"></i> Processar Regras da IA
          </button>
          <button onClick={handleSyncUsers} disabled={loading} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-black text-xs uppercase hover:bg-emerald-100 transition-all">
            <i className="fa-solid fa-sync mr-2"></i> Sincronizar Usuários
          </button>
          <button onClick={() => setIsBulkModalOpen(true)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-black text-xs uppercase hover:bg-slate-200 transition-all">
            <i className="fa-solid fa-file-import mr-2"></i> Importar Lista (Texto)
          </button>
          <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all">
            <i className="fa-solid fa-plus mr-2"></i> Novo Professor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map(t => (
          <div key={t.id} className="border p-4 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-black text-slate-900">{t.name}</h4>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleOpenModal(t)} className="text-indigo-400 hover:text-indigo-600"><i className="fa-solid fa-pen-to-square"></i></button>
                <button type="button" onClick={() => handleDelete(t.id)} className="text-rose-400 hover:text-rose-600"><i className="fa-solid fa-trash"></i></button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mb-2 truncate">{t.email || "Sem email"}</p>
            <div className="flex flex-wrap gap-1">
              {t.disciplines.map(d => (
                <span key={d} className="bg-white border px-2 py-1 rounded-md text-[9px] font-bold text-slate-600 uppercase">{d}</span>
              ))}
            </div>
          </div>
        ))}
        {teachers.length === 0 && !loading && (
          <div className="col-span-full text-center py-10 text-slate-400 font-bold text-xs uppercase">
            Nenhum professor cadastrado.
          </div>
        )}
      </div>

      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-black uppercase text-slate-800">Importar Lista de Professores</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-500"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 font-bold">Cole a lista de professores abaixo. O sistema identificará o nome e a disponibilidade automaticamente.</p>
              <textarea 
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                className="w-full h-64 p-4 rounded-2xl border bg-slate-50 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="01 Nome Disponibilidade..."
              />
              <div className="flex gap-3">
                <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-black text-xs uppercase">Cancelar</button>
                <button onClick={handleBulkImport} disabled={loading} className="flex-1 bg-indigo-600 text-white p-4 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-indigo-700">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> : <i className="fa-solid fa-cloud-arrow-up mr-2"></i>} Importar Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="text-lg font-black uppercase text-slate-800">{editingTeacher ? 'Editar Professor' : 'Novo Professor'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-500"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nome Completo</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 rounded-xl border bg-slate-50 text-sm font-bold" placeholder="Ex: João Silva" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Email (Opcional)</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 rounded-xl border bg-slate-50 text-sm font-bold" placeholder="email@exemplo.com" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Disciplinas</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border rounded-xl bg-slate-50">
                  {DISCIPLINES.map(d => (
                    <label key={d} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${formData.disciplines.includes(d) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                      <input type="checkbox" checked={formData.disciplines.includes(d)} onChange={() => toggleDiscipline(d)} className="accent-indigo-600" />
                      <span className="text-[10px] font-bold uppercase text-slate-700">{d}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Disponibilidade de Horário</label>
                <p className="text-[10px] text-slate-500 mb-4">Clique nos blocos para marcar como <span className="text-rose-500 font-bold">Indisponível</span> (Vermelho).</p>
                
                {shifts.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {/* Header: Turnos e Aulas */}
                    <div className="flex sticky top-0 bg-white z-10 shadow-sm overflow-x-auto">
                      <div className="w-24 shrink-0 bg-slate-50 border-b border-r border-slate-200 flex items-center justify-center p-2">
                        <span className="text-[9px] font-black uppercase text-slate-400">Dia</span>
                      </div> 
                      {shifts.map(shift => (
                        <div key={shift.id} className="flex-1 border-l border-indigo-100 min-w-[120px]">
                          <div className="text-center bg-indigo-50 text-[10px] font-black text-indigo-800 uppercase py-2 border-b border-indigo-100 flex flex-col justify-center h-10 truncate">
                            <span>{shift.name}</span>
                          </div>
                          <div className="flex">
                            {Array.from({ length: shift.lessons_per_day }).map((_, i) => (
                              <div key={i} className="flex-1 text-center bg-white border-r border-slate-100 last:border-r-0 py-2">
                                <div className="text-[10px] font-black text-slate-700">{i + 1}ª</div>
                                {shift.start_time && (
                                  <div className="text-[8px] font-bold text-slate-400 mt-0.5">
                                    {getLessonTimeLabel(shift, i)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Linhas (Dias da Semana) */}
                    {[1, 2, 3, 4, 5].map(day => {
                      const dayKey = day.toString();
                      let globalSlotIndex = 0;

                      return (
                        <div key={day} className="flex border-t border-slate-100 hover:bg-slate-50 transition-colors">
                          <div className="w-24 shrink-0 flex items-center justify-center bg-slate-50 border-r border-slate-200">
                            <span className="text-[10px] font-black text-slate-600 uppercase">{WEEKDAYS[day]}</span>
                          </div>
                          
                          {shifts.map(shift => (
                            <div key={shift.id} className="flex-1 flex border-l border-slate-100 min-w-[120px]">
                              {Array.from({ length: shift.lessons_per_day }).map((_, i) => {
                                const currentIndex = globalSlotIndex;
                                const isAvailable = tempAvailability[dayKey]?.[currentIndex] !== false;
                                globalSlotIndex++;
                                
                                return (
                                  <div key={i} className="flex-1 p-1 border-r border-slate-50 last:border-r-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleAvailability(day, currentIndex)}
                                      className={`w-full h-12 rounded-lg transition-all flex flex-col items-center justify-center gap-1 border ${
                                        isAvailable 
                                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                                          : 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100'
                                      }`}
                                    >
                                      <i className={`fa-solid ${isAvailable ? 'fa-check text-[10px]' : 'fa-ban text-[10px]'}`}></i>
                                      <span className="text-[8px] font-black uppercase opacity-75">{isAvailable ? 'Livre' : 'Ocupado'}</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Fallback se não houver turnos */
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      <div className="grid grid-cols-6 gap-2 mb-2">
                        <div className="text-center text-[10px] font-black uppercase text-slate-400">Aula</div>
                        {WEEKDAYS.slice(1, 6).map(day => <div key={day} className="text-center text-[10px] font-black uppercase text-slate-600">{day}</div>)}
                      </div>
                      
                      {Array.from({length: 7}).map((_, periodIndex) => (
                        <div key={periodIndex} className="grid grid-cols-6 gap-2 mb-2">
                          <div className="flex items-center justify-center text-[10px] font-black text-slate-400 bg-slate-100 rounded-lg">
                            {periodIndex + 1}ª Aula
                          </div>
                          {[1, 2, 3, 4, 5].map(dayIndex => {
                            const isAvailable = tempAvailability[dayIndex.toString()]?.[periodIndex] !== false;
                            return (
                              <button
                                key={`${dayIndex}-${periodIndex}`}
                                type="button"
                                onClick={() => toggleAvailability(dayIndex, periodIndex)}
                                className={`h-10 rounded-lg border transition-all flex items-center justify-center ${isAvailable ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}
                              >
                                {isAvailable ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-ban"></i>}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-black text-xs uppercase hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white p-4 rounded-xl font-black text-xs uppercase hover:bg-indigo-700 shadow-lg">Salvar Professor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeachersManager;
