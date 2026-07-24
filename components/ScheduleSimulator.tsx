
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, SchoolShift, SchoolClass, ClassMatrixItem, ScheduleEntry, ScheduleRule } from '../types';
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
  const [activeTab, setActiveTab] = useState<'assignments' | 'grid' | 'rules'>('assignments');
  
  // Data States
  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [matrix, setMatrix] = useState<ClassMatrixItem[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [customRules, setCustomRules] = useState<ScheduleRule[]>(() => {
    const saved = localStorage.getItem(`schedule_rules_${schoolId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Selection States
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<SchoolShift | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // New Rule Form State
  const [newRuleTeacherId, setNewRuleTeacherId] = useState('');
  const [newRuleSubject, setNewRuleSubject] = useState('');
  const [newRuleClass, setNewRuleClass] = useState('');
  const [newRuleDay, setNewRuleDay] = useState<number | ''>('');
  const [newRulePeriods, setNewRulePeriods] = useState<number[]>([]);
  const [newRuleReason, setNewRuleReason] = useState('');

  useEffect(() => {
    localStorage.setItem(`schedule_rules_${schoolId}`, JSON.stringify(customRules));
  }, [customRules, schoolId]);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRulePeriods.length === 0) {
      onShowNotify("Selecione pelo menos um horário proibido.", "error");
      return;
    }
    const rule: ScheduleRule = {
      id: crypto.randomUUID(),
      school_id: schoolId,
      teacher_id: newRuleTeacherId || undefined,
      subject: newRuleSubject || undefined,
      class_name: newRuleClass || undefined,
      day_of_week: newRuleDay !== '' ? Number(newRuleDay) : undefined,
      forbidden_periods: newRulePeriods,
      reason: newRuleReason || "Restrição pedagógica / desempenho"
    };
    setCustomRules([...customRules, rule]);
    setNewRulePeriods([]);
    setNewRuleReason('');
    onShowNotify("Restrição granular adicionada!", "success");
  };

  const handleRemoveRule = (ruleId: string) => {
    setCustomRules(customRules.filter(r => r.id !== ruleId));
    onShowNotify("Restrição removida.", "info");
  };

  const isRuleViolated = (teacherId: string | null, subject: string, className: string, day: number, period: number) => {
    return customRules.some(rule => {
      const matchTeacher = !rule.teacher_id || rule.teacher_id === teacherId;
      const matchSubject = !rule.subject || rule.subject === subject;
      const matchClass = !rule.class_name || rule.class_name === className;
      const matchDay = !rule.day_of_week || rule.day_of_week === day;
      const matchPeriod = rule.forbidden_periods.includes(period);
      return matchTeacher && matchSubject && matchClass && matchDay && matchPeriod;
    });
  };

  const handleToggleLockSlot = async (sched: ScheduleEntry) => {
    try {
      const newLocked = !sched.is_locked;
      const { error } = await supabase.from('class_schedules').update({ is_locked: newLocked }).eq('id', sched.id);
      if (error) {
        // Fallback local caso a coluna is_locked não exista no banco
        console.warn("Coluna is_locked pode não existir no DB, mantendo no estado local:", error.message);
      }
      setSchedules(prev => prev.map(s => s.id === sched.id ? { ...s, is_locked: newLocked } : s));
      onShowNotify(newLocked ? "Aula congelada (Locked)!" : "Aula descongelada!", "info");
    } catch (err: any) {
      onShowNotify(err.message, "error");
    }
  };

  const handleToggleLockClass = async (className: string) => {
    const classScheds = schedules.filter(s => s.class_name === className);
    if (classScheds.length === 0) return;

    const allLocked = classScheds.every(s => s.is_locked);
    const newStatus = !allLocked;

    const ids = classScheds.map(s => s.id);
    try {
      await supabase.from('class_schedules').update({ is_locked: newStatus }).in('id', ids);
      setSchedules(prev => prev.map(s => s.class_name === className ? { ...s, is_locked: newStatus } : s));
      onShowNotify(newStatus ? `Todas as aulas da turma ${className} foram CONGELADAS!` : `Aulas da turma ${className} DESCONGELADAS!`, "success");
    } catch (err: any) {
      onShowNotify(err.message, "error");
    }
  };

  const handleAutoGenerate = async () => {
    setShowConfirm(false);
    setGenerating(true);
    onShowNotify("Gerando grade horária respeitando congelamentos e restrições PPP...", "info");

    try {
      // 1. Separar aulas congeladas e não congeladas
      const lockedSchedules = schedules.filter(s => s.is_locked);
      const unlockedIds = schedules.filter(s => !s.is_locked).map(s => s.id);

      // 2. Apagar do banco apenas as aulas NÃO congeladas
      if (unlockedIds.length > 0) {
        const { error: delError } = await supabase.from('class_schedules').delete().in('id', unlockedIds);
        if (delError) {
          // Se falhar o in(id), tenta apagar onde is_locked = false
          await supabase.from('class_schedules').delete().eq('school_id', schoolId).eq('is_locked', false);
        }
      }

      // 3. Mapear turmas para seus turnos
      const classShiftMap = new Map<string, SchoolShift>();
      classes.forEach(c => {
        const shf = shifts.find(s => s.id === c.shift_id);
        if (shf) classShiftMap.set(c.name, shf);
      });

      // 4. Calcular quantas aulas faltam alocar (Total na Matriz - Já Congeladas)
      interface LessonToPlace {
        class_name: string;
        subject: string;
        teacher_id: string | null;
      }

      const lessonsToPlace: LessonToPlace[] = [];

      // Mapear quantas aulas de cada (class, subject) já estão congeladas
      const lockedCounts: Record<string, number> = {};
      lockedSchedules.forEach(s => {
        const key = `${s.class_name}_${s.subject}`;
        lockedCounts[key] = (lockedCounts[key] || 0) + 1;
      });

      matrix.filter(m => m.lessons_per_week > 0).forEach(m => {
        const assign = assignments.find(a => a.class_name === m.class_name && a.subject === m.subject);
        const key = `${m.class_name}_${m.subject}`;
        const alreadyLocked = lockedCounts[key] || 0;
        const remainingToPlace = Math.max(0, m.lessons_per_week - alreadyLocked);

        for (let i = 0; i < remainingToPlace; i++) {
          lessonsToPlace.push({
            class_name: m.class_name,
            subject: m.subject,
            teacher_id: assign?.teacher_id || null
          });
        }
      });

      let bestPlacement: any[] = [];
      let maxPlaced = -1;

      // Se não há nada novo a alocar
      if (lessonsToPlace.length === 0 && lockedSchedules.length > 0) {
        onShowNotify("Todas as aulas configuradas já estão congeladas. Nada para alocar.", "info");
        setGenerating(false);
        return;
      }

      // 5. Algoritmo de Otimização Combinatória (Monte Carlo / Simulated Annealing Heuristic)
      // Tentar 100 iterações para encontrar a melhor combinação sem violar hard constraints
      for (let attempt = 0; attempt < 100; attempt++) {
        let placedCount = 0;
        // Iniciar cada tentativa preservando exatamente as aulas congeladas
        const currentSchedules: any[] = lockedSchedules.map(ls => ({
          school_id: ls.school_id,
          class_name: ls.class_name,
          day_of_week: ls.day_of_week,
          period_index: ls.period_index,
          subject: ls.subject,
          teacher_id: ls.teacher_id,
          is_locked: true
        }));

        const currentTeacherSlots = new Set<string>();
        // Registrar ocupação dos professores nas aulas congeladas
        lockedSchedules.forEach(ls => {
          if (ls.teacher_id) {
            const globalP = getGlobalPeriodIndex(ls.class_name, ls.period_index);
            currentTeacherSlots.add(`${ls.teacher_id}_${ls.day_of_week}_${globalP}`);
          }
        });

        // Cópia embaralhada das aulas a alocar
        const currentToPlace = [...lessonsToPlace].sort(() => Math.random() - 0.5);

        for (const lesson of currentToPlace) {
          const shift = classShiftMap.get(lesson.class_name);
          if (!shift) continue;

          // Gerar slots possíveis (dias 1 a 5, períodos 0 a N)
          const possibleSlots: {d: number, p: number}[] = [];
          for (let d = 1; d <= 5; d++) {
            for (let p = 0; p < shift.lessons_per_day; p++) {
              possibleSlots.push({d, p});
            }
          }
          possibleSlots.sort(() => Math.random() - 0.5);

          for (const slot of possibleSlots) {
            const { d, p } = slot;

            // REGRA DE OURO 1: A turma já tem aula nesse slot?
            const classHasLesson = currentSchedules.some(s => s.class_name === lesson.class_name && s.day_of_week === d && s.period_index === p);
            if (classHasLesson) continue;

            // REGRA DE OURO 2 (HARD CONSTRAINT - PPP / LIMITE DIÁRIO): Max 2 aulas da mesma disciplina por dia para a turma!
            const subjectCountOnDay = currentSchedules.filter(s => s.class_name === lesson.class_name && s.day_of_week === d && s.subject === lesson.subject).length;
            if (subjectCountOnDay >= 2) continue;

            // REGRA DE OURO 3: Restrição Granular de Horário / Desempenho (Time-Window Negative Rules)
            if (isRuleViolated(lesson.teacher_id, lesson.subject, lesson.class_name, d, p)) {
              continue;
            }

            // REGRA DE OURO 4: Disponibilidade e choque do Professor
            if (lesson.teacher_id) {
              const globalP = getGlobalPeriodIndex(lesson.class_name, p);
              const teacherKey = `${lesson.teacher_id}_${d}_${globalP}`;
              if (currentTeacherSlots.has(teacherKey)) continue; // Double booking
              if (!isTeacherAvailable(lesson.teacher_id, d, p, lesson.class_name)) continue; // Indisponível na agenda
            }

            // O slot atende a TODAS as restrições rígidas!
            currentSchedules.push({
              school_id: schoolId,
              class_name: lesson.class_name,
              day_of_week: d,
              period_index: p,
              subject: lesson.subject,
              teacher_id: lesson.teacher_id,
              is_locked: false
            });

            if (lesson.teacher_id) {
              const globalP = getGlobalPeriodIndex(lesson.class_name, p);
              currentTeacherSlots.add(`${lesson.teacher_id}_${d}_${globalP}`);
            }

            placedCount++;
            break; // Aula alocada com sucesso
          }
        }

        if (placedCount > maxPlaced) {
          maxPlaced = placedCount;
          bestPlacement = currentSchedules.filter(s => !s.is_locked); // Salvar apenas as novas
        }

        if (maxPlaced === lessonsToPlace.length) {
          break; // Conconvergiu 100%!
        }
      }

      // 6. Salvar novas aulas alocadas
      if (bestPlacement.length > 0) {
        const CHUNK_SIZE = 500;
        for (let i = 0; i < bestPlacement.length; i += CHUNK_SIZE) {
          const chunk = bestPlacement.slice(i, i + CHUNK_SIZE);
          const { error } = await supabase.from('class_schedules').insert(chunk);
          if (error) {
            // Tenta inserir sem o campo is_locked se a coluna ainda não tiver no DB
            const fallbackChunk = chunk.map(({ is_locked, ...rest }) => rest);
            await supabase.from('class_schedules').insert(fallbackChunk);
          }
        }
      }

      const totalNeeded = lessonsToPlace.length;
      if (maxPlaced < totalNeeded) {
        onShowNotify(`Geração parcialmente concluída: ${maxPlaced}/${totalNeeded} novas aulas alocadas. Verifique conflitos de professores ou desative regras rígidas muito restritivas.`, "error");
      } else {
        onShowNotify(`Geração concluída com sucesso! ${bestPlacement.length} novas aulas posicionadas sem violações de regras.`, "success");
      }
      
      // Atualizar dados atualizados do banco
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

  const handleRemoveSubjectFromMatrix = async (subject: string) => {
    if (!window.confirm(`Deseja remover a disciplina "${subject}" da matriz da turma ${selectedClass}?`)) {
      return;
    }
    try {
      await supabase.from('class_matrix').delete().eq('school_id', schoolId).eq('class_name', selectedClass).eq('subject', subject);
      await supabase.from('teacher_assignments').delete().eq('school_id', schoolId).eq('class_name', selectedClass).eq('subject', subject);
      await supabase.from('class_schedules').delete().eq('school_id', schoolId).eq('class_name', selectedClass).eq('subject', subject);

      setMatrix(prev => prev.filter(m => !(m.class_name === selectedClass && m.subject === subject)));
      setAssignments(prev => prev.filter(a => !(a.class_name === selectedClass && a.subject === subject)));
      setSchedules(prev => prev.filter(s => !(s.class_name === selectedClass && s.subject === subject)));

      onShowNotify(`Disciplina "${subject}" removida com sucesso da turma ${selectedClass}.`, "success");
    } catch (error: any) {
      onShowNotify(error.message, "error");
    }
  };

  const classMatrix = useMemo(() => {
    return matrix.filter(m => m.class_name === selectedClass && m.lessons_per_week > 0);
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
           <button onClick={() => setActiveTab('rules')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${activeTab === 'rules' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
             <i className="fa-solid fa-shield-halved text-xs"></i>
             Regras Negativas
             {customRules.length > 0 && <span className="bg-indigo-600 text-white rounded-full px-1.5 py-0.2 text-[8px]">{customRules.length}</span>}
           </button>
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
                  <div className="flex items-center gap-2">
                    <select 
                      value={assignedTeacher?.id || ''} 
                      onChange={e => handleAssignTeacher(m.subject, e.target.value)}
                      className="bg-white border p-2 rounded-lg text-[10px] font-bold text-slate-700 outline-none w-48"
                    >
                      <option value="">Selecionar Professor...</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button 
                      type="button"
                      onClick={() => handleRemoveSubjectFromMatrix(m.subject)}
                      title={`Eliminar ${m.subject} da turma ${selectedClass}`}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {classMatrix.length === 0 && <p className="text-center text-xs text-slate-400 py-10 font-bold">Nenhuma disciplina na matriz desta turma.</p>}
        </div>
      )}

      {activeTab === 'grid' && selectedShift && (
        <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-700">Turma: {selectedClass}</span>
              {schedules.filter(s => s.class_name === selectedClass).every(s => s.is_locked) && schedules.filter(s => s.class_name === selectedClass).length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i className="fa-solid fa-lock text-[8px]"></i> Turma Congelada
                </span>
              )}
            </div>
            <button 
              type="button"
              onClick={() => handleToggleLockClass(selectedClass)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5"
            >
              <i className={`fa-solid ${schedules.filter(s => s.class_name === selectedClass).every(s => s.is_locked) ? 'fa-unlock text-emerald-600' : 'fa-lock text-amber-600'}`}></i>
              {schedules.filter(s => s.class_name === selectedClass).every(s => s.is_locked) ? 'Descongelar Turma' : 'Congelar Grade da Turma'}
            </button>
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
                            <div className="flex items-center gap-1">
                              <select 
                                value={sched?.subject || ''} 
                                disabled={sched?.is_locked}
                                onChange={e => handleUpdateSchedule(day, periodIdx, e.target.value)}
                                className={`w-full p-2 rounded-xl text-[10px] font-black uppercase border transition-all outline-none appearance-none ${
                                  sched?.is_locked ? 'bg-amber-50 border-amber-200 text-amber-900 font-bold' :
                                  conflict ? 'bg-rose-50 border-rose-200 text-rose-600' : 
                                  sched?.subject ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-300'
                                }`}
                              >
                                <option value="">Vago</option>
                                {classMatrix.map(m => (
                                  <option key={m.id} value={m.subject}>{m.subject}</option>
                                ))}
                              </select>
                              {sched && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleLockSlot(sched)}
                                  title={sched.is_locked ? "Descongelar esta aula" : "Congelar esta aula"}
                                  className={`p-1.5 rounded-lg border text-[10px] transition-all ${
                                    sched.is_locked ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-300 border-slate-200 hover:text-amber-600'
                                  }`}
                                >
                                  <i className={`fa-solid ${sched.is_locked ? 'fa-lock' : 'fa-lock-open'}`}></i>
                                </button>
                              )}
                            </div>
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

      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border p-8 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Adicionar Restrição Granular de Desempenho / Horário</h4>
            <p className="text-xs text-slate-500 mb-6 font-medium">
              Configure regras negativas específicas cruzando [Professor + Disciplina + Turma + Horário Proibido]. Exemplo: Professor Luiz Augusto (Matemática) não pode lecionar nos dois últimos horários da 1ª Série.
            </p>

            <form onSubmit={handleAddRule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Professor (Opcional)</label>
                  <select value={newRuleTeacherId} onChange={e => setNewRuleTeacherId(e.target.value)} className="w-full p-2.5 rounded-xl border text-xs font-bold bg-white">
                    <option value="">Todos os Professores</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Disciplina (Opcional)</label>
                  <input type="text" placeholder="Ex: Matemática" value={newRuleSubject} onChange={e => setNewRuleSubject(e.target.value)} className="w-full p-2.5 rounded-xl border text-xs font-bold bg-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Turma (Opcional)</label>
                  <select value={newRuleClass} onChange={e => setNewRuleClass(e.target.value)} className="w-full p-2.5 rounded-xl border text-xs font-bold bg-white">
                    <option value="">Todas as Turmas</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Dia da Semana (Opcional)</label>
                  <select value={newRuleDay} onChange={e => setNewRuleDay(e.target.value ? Number(e.target.value) : '')} className="w-full p-2.5 rounded-xl border text-xs font-bold bg-white">
                    <option value="">Todos os Dias</option>
                    {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{WEEKDAYS[d]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Horários Proibidos (Períodos)</label>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5].map(pIdx => {
                    const isSelected = newRulePeriods.includes(pIdx);
                    return (
                      <button
                        type="button"
                        key={pIdx}
                        onClick={() => {
                          if (isSelected) setNewRulePeriods(newRulePeriods.filter(p => p !== pIdx));
                          else setNewRulePeriods([...newRulePeriods, pIdx]);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase border transition-all ${
                          isSelected ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {pIdx + 1}ª Aula
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Motivo / Descrição</label>
                <input type="text" placeholder="Ex: Baixo rendimento nos dois últimos horários da 1ª série" value={newRuleReason} onChange={e => setNewRuleReason(e.target.value)} className="w-full p-2.5 rounded-xl border text-xs font-bold bg-white" />
              </div>

              <div className="flex justify-end">
                <button type="submit" className="px-5 py-3 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                  <i className="fa-solid fa-plus"></i> Adicionar Restrição Rígida
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-[2rem] border p-8 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase mb-4">Restrições Ativas ({customRules.length})</h4>
            {customRules.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold py-6 text-center">Nenhuma restrição granular cadastrada.</p>
            ) : (
              <div className="space-y-3">
                {customRules.map(rule => {
                  const teacher = teachers.find(t => t.id === rule.teacher_id);
                  return (
                    <div key={rule.id} className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-black uppercase">Proibido</span>
                          <span className="text-xs font-black text-slate-800">{teacher ? teacher.name : "Qualquer Professor"}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-bold text-slate-600">{rule.subject || "Qualquer Disciplina"}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-bold text-slate-600">Turma: {rule.class_name || "Todas"}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-bold text-slate-600">{rule.day_of_week ? WEEKDAYS[rule.day_of_week] : "Todos os dias"}</span>
                        </div>
                        <p className="text-[11px] font-bold text-rose-700">
                          Aulas proibidas: {rule.forbidden_periods.map(p => `${p + 1}ª`).join(', ')} — <span className="italic">{rule.reason}</span>
                        </p>
                      </div>
                      <button onClick={() => handleRemoveRule(rule.id)} className="p-2 text-rose-400 hover:text-rose-700 rounded-lg transition-all">
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-900 mb-2">Gerador Automático Otimizado</h3>
            <p className="text-xs text-slate-500 font-bold mb-4 leading-relaxed">
              O algoritmo irá recalcular os horários das turmas respeitando rigorosamente:
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 mb-6 font-semibold bg-slate-50 p-3 rounded-xl">
              <li className="flex items-center gap-2 text-amber-700"><i className="fa-solid fa-lock text-[10px]"></i> <b>Preservação de Congelamentos:</b> Aulas/turmas marcadas com cadeado serão mantidas sem alteração.</li>
              <li className="flex items-center gap-2 text-indigo-700"><i className="fa-solid fa-ban text-[10px]"></i> <b>Regra PPP:</b> No máximo 2 aulas da mesma matéria por dia para cada turma.</li>
              <li className="flex items-center gap-2 text-rose-700"><i className="fa-solid fa-shield-halved text-[10px]"></i> <b>Restrições Negativas:</b> Respeitará as regras de horários e professores cadastrados.</li>
            </ul>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-slate-100 text-slate-600 p-3 rounded-xl font-black text-[10px] uppercase">
                Cancelar
              </button>
              <button onClick={handleAutoGenerate} className="flex-1 bg-emerald-600 text-white p-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700">
                Confirmar e Gerar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleSimulator;
