
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, SchoolShift, SchoolClass, ClassMatrixItem, ScheduleEntry } from '../types';
import { WEEKDAYS } from '../constants';

interface ScheduleSimulatorProps {
  schoolId: string;
  supabase: SupabaseClient<Database>;
  onShowNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface TeacherAssignment {
  id: string;
  school_id: string;
  class_name: string;
  subject: string;
  teacher_id: string;
}

const ScheduleSimulator: React.FC<ScheduleSimulatorProps> = ({ schoolId, supabase, onShowNotify }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'assignments' | 'grid'>('assignments');
  
  // Data States
  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [matrix, setMatrix] = useState<ClassMatrixItem[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [availabilities, setAvailabilities] = useState<any[]>([]);

  // Selection States
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<SchoolShift | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleAutoGenerate = async () => {
    setShowConfirm(false);
    setGenerating(true);
    onShowNotify("Gerando grade horária... Isso pode levar alguns segundos.", "info");

    try {
      // 1. Apagar todas as aulas atuais
      await supabase.from('class_schedules').delete().eq('school_id', schoolId);

      // 2. Preparar dados
      // Precisamos mapear as turmas para seus turnos
      const classShiftMap = new Map<string, SchoolShift>();
      classes.forEach(c => {
        const shf = shifts.find(s => s.id === c.shift_id);
        if (shf) classShiftMap.set(c.name, shf);
      });

      // E criar a lista de aulas que precisam ser alocadas
      interface LessonToPlace {
        class_name: string;
        subject: string;
        teacher_id: string | null;
      }

      const lessonsToPlace: LessonToPlace[] = [];
      matrix.forEach(m => {
        const assign = assignments.find(a => a.class_name === m.class_name && a.subject === m.subject);
        for (let i = 0; i < m.lessons_per_week; i++) {
          lessonsToPlace.push({
            class_name: m.class_name,
            subject: m.subject,
            teacher_id: assign?.teacher_id || null
          });
        }
      });

      if (lessonsToPlace.length === 0) {
         onShowNotify("Nenhuma disciplina encontrada na matriz curricular. Vá em 'Estrutura' para configurar a matriz antes de gerar horários.", "error");
         setGenerating(false);
         return;
      }

      // 3. Estruturar a grade vazia [day][period][className] = LessonToPlace | null
      // Vamos assumir dias de 1 a 5 (segunda a sexta)
      // Array para acompanhar onde os professores estão a cada slot temporal
      const teacherSlots = new Map<string, string>(); // chane para: `teacherId_day_period` -> `className`

      const newSchedules: any[] = [];

      // Embaralhar as aulas para evitar padrões fixos e dar chance de resolver melhor
      lessonsToPlace.sort(() => Math.random() - 0.5);

      // Ordem de prioridade (tentar colocar professores com menos horários primeiro)
      // Isso é uma heurística simples. O ideal é ordenar as aulas.
      // Vamos tentar um Guloso Simples com "Tentativas Aleatórias" até convergir (simulated annealing super simples / monte carlo)
      
      let bestPlacement: any[] = [];
      let maxPlaced = -1;

      // Tentar 50 rodadas para ver qual encaixa mais aulas
      for (let attempt = 0; attempt < 50; attempt++) {
        let placedCount = 0;
        const currentSchedules: any[] = [];
        const currentTeacherSlots = new Set<string>();
        
        // Cópia das aulas a serem alocadas, embaralhadas
        const currentToPlace = [...lessonsToPlace].sort(() => Math.random() - 0.5);

        for (const lesson of currentToPlace) {
          const shift = classShiftMap.get(lesson.class_name);
          if (!shift) continue;

          let placed = false;
          // Tentar encontrar um slot (dia, período) livre e válido para a turma e professor
          
          // Gerar lista de slots possíveis (x dias, y períodos)
          const possibleSlots: {d: number, p: number}[] = [];
          for (let d = 1; d <= 5; d++) {
            for (let p = 0; p < shift.lessons_per_day; p++) {
              possibleSlots.push({d, p});
            }
          }
          // Embaralhar slots para distribuição parelha
          possibleSlots.sort(() => Math.random() - 0.5);

          for (const slot of possibleSlots) {
            const { d, p } = slot;
            
            // Verifica se a turma já tem aula nesse slot
            const classHasLesson = currentSchedules.some(s => s.class_name === lesson.class_name && s.day_of_week === d && s.period_index === p);
            if (classHasLesson) continue;

            // Verifica professor
            if (lesson.teacher_id) {
              const globalP = getGlobalPeriodIndex(lesson.class_name, p);
              const teacherKey = `${lesson.teacher_id}_${d}_${globalP}`;
              if (currentTeacherSlots.has(teacherKey)) continue; // Double booking
              if (!isTeacherAvailable(lesson.teacher_id, d, p, lesson.class_name)) continue; // Indisponível
            }

            // O slot é válido!
            currentSchedules.push({
              school_id: schoolId,
              class_name: lesson.class_name,
              day_of_week: d,
              period_index: p,
              subject: lesson.subject,
              teacher_id: lesson.teacher_id
            });

            if (lesson.teacher_id) {
              const globalP = getGlobalPeriodIndex(lesson.class_name, p);
              currentTeacherSlots.add(`${lesson.teacher_id}_${d}_${globalP}`);
            }

            placedCount++;
            placed = true;
            break; // A aula foi alocada
          }
        }

        if (placedCount > maxPlaced) {
          maxPlaced = placedCount;
          bestPlacement = currentSchedules;
        }

        if (maxPlaced === lessonsToPlace.length) {
          break; // Perfeito!
        }
      }

      if (maxPlaced < lessonsToPlace.length) {
        console.warn(`Não foi possível alocar todas as aulas perfeitamente. Alocados: ${maxPlaced}/${lessonsToPlace.length}`);
      }

      // 4. Salvar tudo
      if (bestPlacement.length > 0) {
        // Inserir em chunks de 500 para não estourar payload do supabase
        const CHUNK_SIZE = 500;
        for (let i = 0; i < bestPlacement.length; i += CHUNK_SIZE) {
          const chunk = bestPlacement.slice(i, i + CHUNK_SIZE);
          const { error } = await supabase.from('class_schedules').insert(chunk);
          if (error) throw error;
        }
      }

      if (maxPlaced < lessonsToPlace.length) {
        onShowNotify(`Geração concluída com ressalvas: ${maxPlaced}/${lessonsToPlace.length} aulas alocadas. Podem haver aulas sem horário devido a conflitos ou falta de professores.`, "error");
      } else {
        onShowNotify(`Geração perfeita! ${bestPlacement.length} aulas posicionadas na grade sem conflitos.`, "success");
      }
      
      // Atualiza o estado lendo do banco para pegar os IDs gerados
      const { data: generatedSchedules } = await supabase.from('class_schedules').select('*').eq('school_id', schoolId);
      if (generatedSchedules) {
        setSchedules(generatedSchedules);
      }
      
    } catch (error: any) {
      onShowNotify(error.message, "error");
    } finally {
      setGenerating(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: shiftData },
        { data: classData },
        { data: matrixData },
        { data: teacherData },
        { data: assignData },
        { data: schedData },
        { data: availData }
      ] = await Promise.all([
        supabase.from('school_shifts').select('*').eq('school_id', schoolId).order('name'),
        supabase.from('school_classes').select('*').eq('school_id', schoolId).order('name'),
        supabase.from('class_matrix').select('*').eq('school_id', schoolId),
        supabase.from('school_teachers').select('*').eq('school_id', schoolId).order('name'),
        supabase.from('teacher_assignments').select('*').eq('school_id', schoolId),
        supabase.from('class_schedules').select('*').eq('school_id', schoolId),
        supabase.from('teacher_availability').select('*').eq('school_id', schoolId)
      ]);

      if (shiftData) setShifts(shiftData);
      if (classData) {
        setClasses(classData);
        if (classData.length > 0 && !selectedClass) setSelectedClass(classData[0].name);
      }
      if (matrixData) setMatrix(matrixData);
      if (teacherData) setTeachers(teacherData);
      if (assignData) setAssignments(assignData);
      if (schedData) setSchedules(schedData);
      if (availData) setAvailabilities(availData);

    } catch (error: any) {
      onShowNotify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [schoolId, supabase, onShowNotify, selectedClass]);

  useEffect(() => {
    if (schoolId) fetchData();
  }, [fetchData, schoolId]);

  useEffect(() => {
    if (selectedClass && classes.length > 0 && shifts.length > 0) {
      const cls = classes.find(c => c.name === selectedClass);
      if (cls) {
        const shf = shifts.find(s => s.id === cls.shift_id);
        setSelectedShift(shf || null);
      }
    }
  }, [selectedClass, classes, shifts]);

  const handleAssignTeacher = async (subject: string, teacherId: string) => {
    try {
      const existing = assignments.find(a => a.class_name === selectedClass && a.subject === subject);
      
      if (existing) {
        if (!teacherId) {
          await supabase.from('teacher_assignments').delete().eq('id', existing.id);
          setAssignments(assignments.filter(a => a.id !== existing.id));
        } else {
          await supabase.from('teacher_assignments').update({ teacher_id: teacherId }).eq('id', existing.id);
          setAssignments(assignments.map(a => a.id === existing.id ? { ...a, teacher_id: teacherId } : a));
        }
      } else if (teacherId) {
        const { data, error } = await supabase.from('teacher_assignments').insert({
          school_id: schoolId,
          class_name: selectedClass,
          subject,
          teacher_id: teacherId
        }).select().single();
        if (error) throw error;
        setAssignments([...assignments, data]);
      }
      onShowNotify("Atribuição atualizada.", "success");
    } catch (error: any) {
      onShowNotify(error.message, "error");
    }
  };

  const handleUpdateSchedule = async (day: number, period: number, subject: string) => {
    try {
      const existing = schedules.find(s => s.class_name === selectedClass && s.day_of_week === day && s.period_index === period);
      const assignment = assignments.find(a => a.class_name === selectedClass && a.subject === subject);
      const teacherId = assignment?.teacher_id || null;

      if (existing) {
        if (!subject) {
          await supabase.from('class_schedules').delete().eq('id', existing.id);
          setSchedules(schedules.filter(s => s.id !== existing.id));
        } else {
          await supabase.from('class_schedules').update({ subject, teacher_id: teacherId }).eq('id', existing.id);
          setSchedules(schedules.map(s => s.id === existing.id ? { ...s, subject, teacher_id: teacherId } : s));
        }
      } else if (subject) {
        const { data, error } = await supabase.from('class_schedules').insert({
          school_id: schoolId,
          class_name: selectedClass,
          day_of_week: day,
          period_index: period,
          subject,
          teacher_id: teacherId
        }).select().single();
        if (error) throw error;
        setSchedules([...schedules, data]);
      }
    } catch (error: any) {
      onShowNotify(error.message, "error");
    }
  };

  const getGlobalPeriodIndex = useCallback((className: string, periodIndex: number) => {
    const cls = classes.find(c => c.name === className);
    if (!cls || !cls.shift_id || shifts.length === 0) return periodIndex;
    
    const sortedShifts = [...shifts].sort((a, b) => a.name.localeCompare(b.name));
    const shiftIdx = sortedShifts.findIndex(s => s.id === cls.shift_id);
    if (shiftIdx <= 0) return periodIndex;
    
    let offset = 0;
    for (let i = 0; i < shiftIdx; i++) {
      offset += sortedShifts[i].lessons_per_day;
    }
    return offset + periodIndex;
  }, [classes, shifts]);

  const isTeacherAvailable = (teacherId: string, day: number, period: number, className?: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return true;

    const globalPeriod = className ? getGlobalPeriodIndex(className, period) : period;

    // 1. Buscar na tabela 'teacher_availability'
    const avail = availabilities.find(
      a => a.user_id === teacher.auth_id
    );

    if (avail?.availability_data) {
      const dayAvail = avail.availability_data[day.toString()];
      if (dayAvail && dayAvail[globalPeriod] === false) return false;
      return true;
    }

    // 2. FALLBACK: se o professor não se logou e não tem registro em 'teacher_availability', 
    // usamos o campo 'availability' do próprio 'school_teachers' cadastrado pelo admin
    if (teacher.availability) {
      const dayAvail = teacher.availability[day.toString()];
      if (dayAvail && dayAvail[globalPeriod] === false) return false;
    }

    return true;
  };

  const getTeacherForSubject = (subject: string) => {
    const assign = assignments.find(a => a.class_name === selectedClass && a.subject === subject);
    return teachers.find(t => t.id === assign?.teacher_id);
  };

  const checkConflict = (day: number, period: number, subject: string) => {
    if (!subject) return null;
    const assignment = assignments.find(a => a.class_name === selectedClass && a.subject === subject);
    if (!assignment) return null;

    const teacherId = assignment.teacher_id;
    if (!teacherId) return null;

    // 1. Check Teacher Availability
    if (!isTeacherAvailable(teacherId, day, period, selectedClass)) {
      return "Professor indisponível neste horário.";
    }

    // 2. Check Teacher Double Booking (in other classes)
    const globalP = getGlobalPeriodIndex(selectedClass, period);
    const otherClassSched = schedules.find(s => 
      s.teacher_id === teacherId && 
      s.day_of_week === day && 
      getGlobalPeriodIndex(s.class_name, s.period_index) === globalP && 
      s.class_name !== selectedClass
    );
    if (otherClassSched) {
      return `Professor já alocado na turma ${otherClassSched.class_name}.`;
    }

    return null;
  };

  const classMatrix = useMemo(() => {
    return matrix.filter(m => m.class_name === selectedClass);
  }, [matrix, selectedClass]);

  const usedLessonsCount = useMemo(() => {
    const counts: Record<string, number> = {};
    schedules.filter(s => s.class_name === selectedClass).forEach(s => {
      if (s.subject) counts[s.subject] = (counts[s.subject] || 0) + 1;
    });
    return counts;
  }, [schedules, selectedClass]);

  if (loading) return <div className="p-10 text-center"><i className="fa-solid fa-circle-notch fa-spin text-indigo-600 text-2xl"></i></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-full md:w-64">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Turma</label>
            <select value={selectedClass || ''} onChange={e => setSelectedClass(e.target.value)} className="w-full p-3 rounded-xl border text-xs font-bold bg-white">
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <button 
            type="button"
            onClick={(e) => {
               e.preventDefault();
               console.log("Clicou no botão Gerador Automático");
               setShowConfirm(true);
            }} 
            disabled={generating}
            className="bg-emerald-600 text-white mt-4 px-4 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
          >
            {generating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
            Gerador Automático
          </button>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
           <button onClick={() => setActiveTab('assignments')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'assignments' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Atribuições</button>
           <button onClick={() => setActiveTab('grid')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Grade Horária</button>
        </div>
      </div>

      {activeTab === 'assignments' && (
        <div className="bg-white rounded-[2rem] border p-8 shadow-sm">
          <h4 className="text-sm font-black text-slate-900 uppercase mb-6">Atribuição de Professores - {selectedClass}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classMatrix.map(m => {
              const assignedTeacher = getTeacherForSubject(m.subject);
              return (
                <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800 uppercase">{m.subject}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{m.lessons_per_week} aulas semanais</p>
                  </div>
                  <select 
                    value={assignedTeacher?.id || ''} 
                    onChange={e => handleAssignTeacher(m.subject, e.target.value)}
                    className="bg-white border p-2 rounded-lg text-[10px] font-bold text-slate-700 outline-none w-48"
                  >
                    <option value="">Selecionar Professor...</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
          {classMatrix.length === 0 && <p className="text-center text-xs text-slate-400 py-10 font-bold">Nenhuma disciplina na matriz desta turma.</p>}
        </div>
      )}

      {activeTab === 'grid' && selectedShift && (
        <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
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
                {Array.from({ length: selectedShift.lessons_per_day }).map((_, periodIdx) => (
                  <tr key={periodIdx}>
                    <td className="p-4 border-r border-b bg-slate-50 text-center">
                      <p className="text-xs font-black text-slate-700">{periodIdx + 1}ª</p>
                    </td>
                    {[1, 2, 3, 4, 5].map(day => {
                      const sched = schedules.find(s => s.class_name === selectedClass && s.day_of_week === day && s.period_index === periodIdx);
                      const conflict = checkConflict(day, periodIdx, sched?.subject || '');
                      
                      return (
                        <td key={day} className="p-2 border-b min-w-[140px]">
                          <div className="relative group">
                            <select 
                              value={sched?.subject || ''} 
                              onChange={e => handleUpdateSchedule(day, periodIdx, e.target.value)}
                              className={`w-full p-2 rounded-xl text-[10px] font-black uppercase border transition-all outline-none appearance-none ${
                                conflict ? 'bg-rose-50 border-rose-200 text-rose-600' : 
                                sched?.subject ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-300'
                              }`}
                            >
                              <option value="">Vago</option>
                              {classMatrix.map(m => (
                                <option key={m.id} value={m.subject}>{m.subject}</option>
                              ))}
                            </select>
                            {conflict && (
                              <div className="absolute -top-10 left-0 bg-rose-600 text-white text-[9px] p-2 rounded-lg shadow-xl z-20 w-48 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                {conflict}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 bg-slate-50 border-t flex flex-wrap gap-4">
            <h5 className="text-[10px] font-black uppercase text-slate-400 w-full mb-2">Resumo de Aulas (Alocadas / Total)</h5>
            {classMatrix.map(m => {
              const used = usedLessonsCount[m.subject] || 0;
              const total = m.lessons_per_week;
              const isComplete = used === total;
              const isOver = used > total;

              return (
                <div key={m.id} className={`px-3 py-1 rounded-full text-[9px] font-black border ${
                  isOver ? 'bg-rose-50 border-rose-200 text-rose-600' :
                  isComplete ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  {m.subject}: {used}/{total}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-900 mb-2">Gerador Automático</h3>
            <p className="text-xs text-slate-500 font-bold mb-6">
              Isso vai apagar a grade atual de todas as turmas e gerar uma nova grade do zero. Deseja continuar?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-slate-100 text-slate-600 p-3 rounded-xl font-black text-[10px] uppercase">
                Cancelar
              </button>
              <button onClick={handleAutoGenerate} className="flex-1 bg-emerald-600 text-white p-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleSimulator;
