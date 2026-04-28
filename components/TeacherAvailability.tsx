
import React, { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { SchoolShift, Database } from '../types';
import { WEEKDAYS } from '../constants';

interface TeacherAvailabilityProps {
  userId: string;
  schoolId: string;
  supabase: SupabaseClient<Database>;
  onShowNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
  onClose: () => void;
}

const TeacherAvailability: React.FC<TeacherAvailabilityProps> = ({ userId, schoolId, supabase, onShowNotify, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  
  // Estrutura: { "1": [true, false...], "2": [...] } onde a chave é o dia da semana (1=Segunda)
  const [availability, setAvailability] = useState<Record<string, boolean[]>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Buscar Turnos da Escola (para saber quantas colunas/aulas existem)
      const { data: shiftData, error: shiftError } = await supabase
        .from('school_shifts')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      
      if (shiftError) throw shiftError;
      if (!shiftData || shiftData.length === 0) {
        onShowNotify("A escola ainda não configurou os turnos. Entre em contato com a direção.", "error");
        onClose();
        return;
      }
      setShifts(shiftData);

      // 2. Buscar Disponibilidade Existente do Professor
      const { data: availData, error: availError } = await supabase
        .from('teacher_availability')
        .select('*')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (availError) throw availError;

      if (availData?.availability_data) {
        setAvailability(availData.availability_data);
      } else {
        // Inicializar tudo como TRUE (Disponível) se não existir registro
        const initial: Record<string, boolean[]> = {};
        // Para cada dia útil (1 a 5 - Seg a Sex)
        [1, 2, 3, 4, 5].forEach(day => {
            // Calcula o total de aulas somando todos os turnos
            const totalSlots = shiftData.reduce((acc, curr) => acc + curr.lessons_per_day, 0);
            initial[day.toString()] = Array(totalSlots).fill(true);
        });
        setAvailability(initial);
      }

    } catch (error: any) {
      console.error(error);
      onShowNotify("Erro ao carregar dados.", "error");
    } finally {
      setLoading(false);
    }
  }, [userId, schoolId, supabase, onShowNotify, onClose]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSlot = (dayKey: string, index: number) => {
    setAvailability(prev => {
      const currentDay = prev[dayKey] || [];
      const newDay = [...currentDay];
      newDay[index] = !newDay[index];
      return { ...prev, [dayKey]: newDay };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('teacher_availability').upsert({
        user_id: userId,
        school_id: schoolId,
        availability_data: availability,
        updated_at: new Date().toISOString() // Fixed to ISO string to match string type in JSON or potential column type
      }, { onConflict: 'user_id,school_id' });

      if (error) throw error;
      onShowNotify("Disponibilidade salva com sucesso!", "success");
      onClose();
    } catch (error: any) {
      onShowNotify(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Helper para calcular a string de horário (HH:MM)
  const getLessonTimeLabel = (shift: SchoolShift, lessonIndex: number) => {
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

  if (loading) return <div className="p-10 text-center"><i className="fa-solid fa-circle-notch fa-spin text-indigo-600 text-2xl"></i></div>;

  // Renderizar o cabeçalho das colunas (Turnos e Aulas)
  const renderHeader = () => {
    return (
      <div className="flex sticky top-0 bg-white z-10 shadow-sm">
        <div className="w-24 shrink-0 bg-slate-50 border-b border-r border-slate-200 flex items-center justify-center p-2">
            <span className="text-[9px] font-black uppercase text-slate-400">Dia</span>
        </div> 
        {shifts.map(shift => (
          <div key={shift.id} className="flex-1 border-l border-indigo-100">
             <div className="text-center bg-indigo-50 text-[10px] font-black text-indigo-800 uppercase py-2 border-b border-indigo-100 flex flex-col justify-center h-10">
               <span>{shift.name}</span>
               {shift.break_after_lesson && <span className="text-[8px] text-indigo-400 font-bold opacity-75">Recreio após {shift.break_after_lesson}ª aula</span>}
             </div>
             <div className="flex">
               {Array.from({ length: shift.lessons_per_day }).map((_, i) => {
                 return (
                   <div key={i} className="flex-1 text-center bg-white border-r border-slate-100 last:border-r-0 py-2">
                     <div className="text-[10px] font-black text-slate-700">{i + 1}ª</div>
                     <div className="text-[8px] font-bold text-slate-400 mt-0.5">{getLessonTimeLabel(shift, i)}</div>
                   </div>
                 );
               })}
             </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[2rem] w-full max-w-6xl shadow-2xl flex flex-col max-h-[90vh]">
      <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-[2rem]">
        <div>
           <h3 className="text-xl font-black text-slate-900">Minha Disponibilidade</h3>
           <p className="text-xs text-slate-500 font-bold">Clique nos horários para marcar como Indisponível (Vermelho).</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border text-slate-400 hover:text-slate-900 flex items-center justify-center">
          <i className="fa-solid fa-times"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {renderHeader()}
          
          {/* Linhas (Dias da Semana) */}
          {[1, 2, 3, 4, 5].map(day => {
            const dayKey = day.toString();
            const slots = availability[dayKey] || [];
            let globalSlotIndex = 0;

            return (
              <div key={day} className="flex border-t border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="w-24 shrink-0 flex items-center justify-center bg-slate-50 border-r border-slate-200">
                  <span className="text-[10px] font-black text-slate-600 uppercase writing-mode-vertical">{WEEKDAYS[day]}</span>
                </div>
                
                {shifts.map(shift => (
                  <div key={shift.id} className="flex-1 flex border-l border-slate-100">
                    {Array.from({ length: shift.lessons_per_day }).map((_, i) => {
                      const currentIndex = globalSlotIndex; // Captura valor atual
                      const isAvailable = slots[currentIndex] ?? true;
                      globalSlotIndex++; // Incrementa para o próximo
                      
                      return (
                        <div key={i} className="flex-1 p-1 border-r border-slate-50 last:border-r-0">
                          <button
                            onClick={() => toggleSlot(dayKey, currentIndex)}
                            className={`w-full h-14 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                              isAvailable 
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100' 
                                : 'bg-rose-50 text-rose-400 border border-rose-100 hover:bg-rose-100'
                            }`}
                          >
                            <i className={`fa-solid ${isAvailable ? 'fa-check text-lg' : 'fa-ban text-lg'}`}></i>
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
      </div>

      <div className="p-6 border-t bg-white rounded-b-[2rem] flex justify-between items-center">
        <div className="flex gap-4 text-[10px] font-black uppercase">
           <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-50 border border-emerald-100 rounded"></div> Disponível</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-50 border border-rose-100 rounded"></div> Indisponível</div>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          {saving && <i className="fa-solid fa-circle-notch fa-spin"></i>}
          Salvar Disponibilidade
        </button>
      </div>
    </div>
  );
};

export default TeacherAvailability;
