
import React, { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, SchoolShift, ScheduleEntry } from '../types';
import { WEEKDAYS } from '../constants';

interface TeacherScheduleViewProps {
  userId: string;
  schoolId: string;
  supabase: SupabaseClient<Database>;
}

const TeacherScheduleView: React.FC<TeacherScheduleViewProps> = ({ userId, schoolId, supabase }) => {
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [shifts, setShifts] = useState<SchoolShift[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: schedData }, { data: shiftData }] = await Promise.all([
        supabase.from('class_schedules').select('*').eq('teacher_id', userId).eq('school_id', schoolId),
        supabase.from('school_shifts').select('*').eq('school_id', schoolId)
      ]);

      if (schedData) setSchedules(schedData);
      if (shiftData) setShifts(shiftData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userId, schoolId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-10 text-center"><i className="fa-solid fa-circle-notch fa-spin text-indigo-600 text-2xl"></i></div>;

  if (schedules.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] p-10 text-center border shadow-sm">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-calendar-xmark text-2xl"></i>
        </div>
        <h3 className="text-sm font-black text-slate-900 uppercase">Nenhum horário atribuído</h3>
        <p className="text-[10px] text-slate-400 font-bold mt-2">Você ainda não possui aulas vinculadas ao seu perfil nesta escola.</p>
      </div>
    );
  }

  // Group by shift to handle multiple shifts if necessary, but usually a teacher belongs to one
  // For simplicity, we'll show a grid for each shift that has at least one lesson for this teacher
  const relevantShiftIds = Array.from(new Set(schedules.map(s => {
    // We need to find the shift for the class. 
    // This is a bit complex since we don't have the class -> shift mapping here easily.
    // We'll just use all school shifts for now and show where the teacher has lessons.
    return s.class_name; 
  })));

  return (
    <div className="space-y-8">
      {shifts.map(shift => {
        const shiftSchedules = schedules.filter(s => {
          // Ideally we'd filter by classes that belong to this shift
          return true; // For now show all in all shifts, or we'd need more data
        });

        return (
          <div key={shift.id} className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
            <div className="bg-slate-50 p-6 border-b">
              <h3 className="text-sm font-black text-slate-900 uppercase">Minha Grade - {shift.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Início: {shift.start_time} | {shift.lesson_duration_min}min por aula</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-4 border-b border-r text-[10px] font-black uppercase text-slate-400 w-20">Aula</th>
                    {[1, 2, 3, 4, 5].map(day => (
                      <th key={day} className="p-4 border-b text-[10px] font-black uppercase text-slate-400 text-center">{WEEKDAYS[day]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: shift.lessons_per_day }).map((_, periodIdx) => (
                    <tr key={periodIdx}>
                      <td className="p-4 border-r border-b bg-slate-50 text-center">
                        <p className="text-xs font-black text-slate-700">{periodIdx + 1}ª</p>
                      </td>
                      {[1, 2, 3, 4, 5].map(day => {
                        const scheds = schedules.filter(s => s.day_of_week === day && s.period_index === periodIdx);
                        
                        return (
                          <td key={day} className="p-2 border-b min-w-[140px] h-20">
                            {scheds.map(s => (
                              <div key={s.id} className="bg-indigo-50 border border-indigo-100 p-2 rounded-xl mb-1">
                                <p className="text-[9px] font-black text-indigo-700 uppercase">{s.subject}</p>
                                <p className="text-[8px] font-bold text-indigo-400 uppercase">{s.class_name}</p>
                              </div>
                            ))}
                            {scheds.length === 0 && <div className="text-center text-[8px] text-slate-300 font-bold uppercase">Livre</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeacherScheduleView;
