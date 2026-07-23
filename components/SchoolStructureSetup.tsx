
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { SchoolShift, ClassMatrixItem, SchoolClass, Database } from '../types';
import { TURMAS_OPTIONS, DISCIPLINES } from '../constants';

interface SchoolStructureSetupProps {
  schoolId: string;
  supabase: SupabaseClient<Database>;
  onShowNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// Definição da Matriz PR 2026 baseada no PDF (Curso 0232)
const MATRIX_PR_2026 = [
  { subject: "Arte", lessons: 1 },
  { subject: "Biologia", lessons: 4 },
  { subject: "Educação Digital e Computação", lessons: 1 },
  { subject: "Educação Física", lessons: 2 },
  { subject: "Filosofia", lessons: 1 },
  { subject: "Física", lessons: 3 },
  { subject: "Geografia", lessons: 2 },
  { subject: "História", lessons: 3 },
  { subject: "Língua Espanhola", lessons: 1 },
  { subject: "Língua Inglesa", lessons: 1 },
  { subject: "Língua Portuguesa", lessons: 4 },
  { subject: "Matemática", lessons: 6 },
  { subject: "Química", lessons: 3 },
  { subject: "Sociologia", lessons: 1 },
  { subject: "Ensino Religioso", lessons: 1 },
  { subject: "Literatura", lessons: 2 },
  { subject: "PI Ciências da Natureza Tecnol", lessons: 2 },
  { subject: "PI Ciências Humanas e Sociais", lessons: 1 },
  { subject: "PI Linguagens Tecnol", lessons: 2 }
];

const CUSTOM_MATRIX_CONFIG: Record<string, { subject: string, lessons: number }[]> = {
  "6º": [
    { subject: "Matemática", lessons: 5 }, { subject: "Língua Portuguesa", lessons: 4 }, { subject: "Ciências", lessons: 3 }, { subject: "História", lessons: 3 }, { subject: "Língua Inglesa", lessons: 3 },
    { subject: "Educação Física", lessons: 2 }, { subject: "Língua Espanhola", lessons: 2 }, { subject: "Geografia", lessons: 2 }, { subject: "Literatura", lessons: 2 }, { subject: "Redação e Leitura", lessons: 2 },
    { subject: "Arte", lessons: 1 }, { subject: "Ensino Religioso", lessons: 1 }, { subject: "Filosofia", lessons: 1 }, { subject: "Laboratório", lessons: 1 }, { subject: "Educação Financeira", lessons: 1 }, { subject: "Robótica", lessons: 1 }, { subject: "Socioemocional", lessons: 1 }
  ],
  "7º": [
    { subject: "Matemática", lessons: 5 }, { subject: "Língua Portuguesa", lessons: 4 }, { subject: "Ciências", lessons: 3 }, { subject: "História", lessons: 3 }, { subject: "Língua Inglesa", lessons: 3 },
    { subject: "Educação Física", lessons: 2 }, { subject: "Língua Espanhola", lessons: 2 }, { subject: "Geografia", lessons: 2 }, { subject: "Literatura", lessons: 2 }, { subject: "Redação e Leitura", lessons: 2 },
    { subject: "Arte", lessons: 1 }, { subject: "Ensino Religioso", lessons: 1 }, { subject: "Filosofia", lessons: 1 }, { subject: "Laboratório", lessons: 1 }, { subject: "Educação Financeira", lessons: 1 }, { subject: "Robótica", lessons: 1 }, { subject: "Socioemocional", lessons: 1 }
  ],
  "8º": [
    { subject: "Matemática", lessons: 5 }, { subject: "Redação e Leitura", lessons: 4 }, { subject: "Língua Portuguesa", lessons: 4 }, { subject: "Ciências", lessons: 3 }, { subject: "História", lessons: 3 },
    { subject: "Educação Física", lessons: 2 }, { subject: "Língua Espanhola", lessons: 2 }, { subject: "Geografia", lessons: 2 }, { subject: "Língua Inglesa", lessons: 2 },
    { subject: "Arte", lessons: 1 }, { subject: "Ensino Religioso", lessons: 1 }, { subject: "Filosofia", lessons: 1 }, { subject: "Laboratório", lessons: 1 }, { subject: "Educação Financeira", lessons: 1 }, { subject: "Of. Ling. Port.", lessons: 1 }, { subject: "Robótica", lessons: 1 }, { subject: "Socioemocional", lessons: 1 }
  ],
  "9º": [
    { subject: "Matemática", lessons: 5 }, { subject: "Língua Portuguesa", lessons: 4 }, { subject: "História", lessons: 3 },
    { subject: "Ciências", lessons: 2 }, { subject: "Educação Física", lessons: 2 }, { subject: "Língua Espanhola", lessons: 2 }, { subject: "Física", lessons: 2 }, { subject: "Geografia", lessons: 2 }, { subject: "Língua Inglesa", lessons: 2 }, { subject: "Literatura", lessons: 2 }, { subject: "Redação e Leitura", lessons: 2 }, { subject: "Química", lessons: 2 },
    { subject: "Arte", lessons: 1 }, { subject: "Ensino Religioso", lessons: 1 }, { subject: "Filosofia", lessons: 1 }, { subject: "Robótica", lessons: 1 }, { subject: "Socioemocional", lessons: 1 }
  ],
  "1ª": [
    { subject: "Matemática", lessons: 5 }, { subject: "Biologia", lessons: 4 }, { subject: "Química", lessons: 4 }, { subject: "Física", lessons: 3 }, { subject: "História", lessons: 3 }, { subject: "Língua Portuguesa", lessons: 3 },
    { subject: "Geografia", lessons: 2 }, { subject: "Literatura", lessons: 2 }, { subject: "Redação e Leitura", lessons: 2 },
    { subject: "Arte", lessons: 1 }, { subject: "Educação Física", lessons: 1 }, { subject: "Ensino Religioso", lessons: 1 }, { subject: "Língua Espanhola", lessons: 1 }, { subject: "Língua Inglesa", lessons: 1 }, { subject: "Filosofia", lessons: 1 }, { subject: "Sociologia", lessons: 1 }
  ],
  "2ª": [
    { subject: "Matemática", lessons: 7 }, { subject: "Biologia", lessons: 4 }, { subject: "Física", lessons: 3 }, { subject: "Língua Portuguesa", lessons: 3 }, { subject: "Química", lessons: 3 },
    { subject: "Geografia", lessons: 2 }, { subject: "História", lessons: 2 }, { subject: "Literatura", lessons: 2 }, { subject: "Redação e Leitura", lessons: 2 },
    { subject: "Arte", lessons: 1 }, { subject: "Educação Física", lessons: 1 }, { subject: "Ensino Religioso", lessons: 1 }, { subject: "Língua Espanhola", lessons: 1 }, { subject: "Língua Inglesa", lessons: 1 }, { subject: "Filosofia", lessons: 1 }, { subject: "Sociologia", lessons: 1 }
  ],
  "3ª": [
    { subject: "Matemática", lessons: 5 }, { subject: "Biologia", lessons: 4 }, { subject: "Física", lessons: 4 }, { subject: "Geografia", lessons: 3 }, { subject: "Língua Portuguesa", lessons: 3 }, { subject: "Química", lessons: 3 },
    { subject: "Educação Física", lessons: 2 }, { subject: "História", lessons: 2 },
    { subject: "Arte", lessons: 1 }, { subject: "Ensino Religioso", lessons: 1 }, { subject: "Filosofia", lessons: 1 }, { subject: "Língua Inglesa", lessons: 1 }, { subject: "Literatura", lessons: 1 }, { subject: "Redação e Leitura", lessons: 1 }, { subject: "Projeto de Vida", lessons: 1 }, { subject: "Sociologia", lessons: 1 }
  ]
};

// Configurações específicas por letra se necessário (ex: 1º B tem matemática 6)
const SPECIFIC_MATRIX_OVERRIDE: Record<string, Record<string, number>> = {
  "1º B": { "Matemática": 6, "Química": 3 },
  "1ª SÉRIE EM B": { "Matemática": 6, "Química": 3 },
  "2º B": { "Matemática": 6, "Física": 4, "Química": 4, "Literatura": 1 },
  "2ª SÉRIE EM B": { "Matemática": 6, "Física": 4, "Química": 4, "Literatura": 1 },
  "3º B": { "Literatura": 2 }
};

const SchoolStructureSetup: React.FC<SchoolStructureSetupProps> = ({ schoolId, supabase, onShowNotify }) => {
  const [activeTab, setActiveTab] = useState<'shifts' | 'classes' | 'matrix'>('shifts');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Data States
  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [matrix, setMatrix] = useState<ClassMatrixItem[]>([]);
  
  // Shift Form State
  const [newShift, setNewShift] = useState<{
    name: string;
    start_time: string;
    lesson_duration_min: number;
    lessons_per_day: number;
    break_after_lesson: number;
    break_duration_min: number;
  }>({ 
    name: 'Matutino', 
    start_time: '07:00', 
    lesson_duration_min: 50, 
    lessons_per_day: 5,
    break_after_lesson: 0, // 0 = sem intervalo
    break_duration_min: 20
  });

  // Class Form State
  const [newClass, setNewClass] = useState({ name: '', shift_id: '' });
  
  // Matrix Filter State
  const [selectedClass, setSelectedClass] = useState('');

  const allSubjects = useMemo(() => {
    const customSubjects = matrix
      .filter(m => m.class_name === selectedClass)
      .map(m => m.subject);
    return Array.from(new Set([...DISCIPLINES, ...customSubjects])).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [matrix, selectedClass]);

  // Data Fetching
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Shifts
      const { data: shiftData, error: shiftError } = await supabase.from('school_shifts').select('*').eq('school_id', schoolId).order('name');
      if (shiftError) throw shiftError;
      if (shiftData) setShifts(shiftData);

      // Fetch Classes
      const { data: classData, error: classError } = await supabase.from('school_classes').select('*').eq('school_id', schoolId).order('name');
      if (classError) throw classError;
      if (classData) {
        setClasses(classData);
        // Set initial selected class for matrix if needed
        if (classData.length > 0 && !selectedClass) {
          setSelectedClass(classData[0].name);
        } else if (classData.length === 0 && !selectedClass) {
          // Fallback to constants if no classes in DB
          setSelectedClass(TURMAS_OPTIONS[0]);
        }
      }

      // Fetch Matrix
      const { data: matrixData, error: matrixError } = await supabase.from('class_matrix').select('*').eq('school_id', schoolId);
      if (matrixError) throw matrixError;
      if (matrixData) setMatrix(matrixData);

    } catch (error: any) {
      onShowNotify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [schoolId, supabase, onShowNotify, selectedClass]);

  useEffect(() => {
    if (schoolId) fetchData();
  }, [fetchData, schoolId]);

  // --- HANDLERS FOR SHIFTS ---
  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Prepara payload, removendo intervalo se for 0
      const payload: any = {
        school_id: schoolId,
        name: newShift.name,
        start_time: newShift.start_time,
        lesson_duration_min: newShift.lesson_duration_min,
        lessons_per_day: newShift.lessons_per_day
      };

      if (newShift.break_after_lesson > 0) {
        payload.break_after_lesson = newShift.break_after_lesson;
        payload.break_duration_min = newShift.break_duration_min;
      }

      const { data, error } = await supabase.from('school_shifts').insert(payload).select().single();

      if (error) throw error;
      setShifts([...shifts, data]);
      onShowNotify("Turno adicionado com sucesso!", "success");
    } catch (error: any) {
      onShowNotify(error.message, 'error');
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      const { error } = await supabase.from('school_shifts').delete().eq('id', id);
      if (error) throw error;
      setShifts(shifts.filter(s => s.id !== id));
      onShowNotify("Turno removido.", "success");
    } catch (error: any) {
      onShowNotify(error.message, 'error');
    }
  };

  // --- HANDLERS FOR CLASSES ---
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.name || !newClass.shift_id) {
        onShowNotify("Preencha o nome e selecione o turno.", "error");
        return;
    }
    try {
      const { data, error } = await supabase.from('school_classes').insert({
        school_id: schoolId,
        name: newClass.name,
        shift_id: newClass.shift_id
      }).select().single();

      if (error) throw error;
      setClasses([...classes, data]);
      setNewClass({ name: '', shift_id: '' });
      onShowNotify("Turma adicionada!", "success");
    } catch (error: any) {
      onShowNotify(error.message, "error");
    }
  };

  const handleImportDefaults = async () => {
    console.log("Iniciando importação de turmas...");
    if (shifts.length === 0) {
      onShowNotify("Atenção: Você precisa criar pelo menos um Turno (ex: Matutino) antes de importar as turmas!", "error");
      setActiveTab('shifts');
      return;
    }

    setImporting(true);
    try {
      const defaultShiftId = shifts.find(s => s.name.toLowerCase().includes('matutino') || s.name.toLowerCase().includes('manhã'))?.id || shifts[0].id;
      
      const newClassesPayload = TURMAS_OPTIONS
        .filter(opt => !classes.some(c => c.name === opt))
        .map(opt => ({
          school_id: schoolId,
          name: opt,
          shift_id: defaultShiftId
        }));

      if (newClassesPayload.length === 0) {
        onShowNotify("Todas as turmas padrão já foram adicionadas.", "info");
        setImporting(false);
        return;
      }

      const { data, error } = await supabase.from('school_classes').insert(newClassesPayload).select();
      if (error) throw error;
      
      if (data) {
        setClasses([...classes, ...data]);
        onShowNotify(`${data.length} turmas importadas com sucesso!`, "success");
      }
    } catch (error: any) {
      console.error(error);
      onShowNotify(error.message, "error");
    } finally {
      setImporting(false);
    }
  };

  const handleImportCustomMatrix = async () => {
    try {
      onShowNotify(`Iniciando importação... (Turmas: ${classes.length})`, "info");
      
      if (classes.length === 0) {
        onShowNotify("Nenhuma turma cadastrada. Adicione turmas primeiro na aba 'Turmas'.", "error");
        return;
      }

      setImporting(true);
      const payload: any[] = [];
      
      for (const cls of classes) {
        const name = cls.name.toUpperCase();
        let baseConfig = null;
        
        // Matching flexível
        if (name.includes("6º")) baseConfig = CUSTOM_MATRIX_CONFIG["6º"];
        else if (name.includes("7º")) baseConfig = CUSTOM_MATRIX_CONFIG["7º"];
        else if (name.includes("8º")) baseConfig = CUSTOM_MATRIX_CONFIG["8º"];
        else if (name.includes("9º")) baseConfig = CUSTOM_MATRIX_CONFIG["9º"];
        else if (name.includes("1º") || name.includes("1ª")) baseConfig = CUSTOM_MATRIX_CONFIG["1ª"];
        else if (name.includes("2º") || name.includes("2ª")) baseConfig = CUSTOM_MATRIX_CONFIG["2ª"];
        else if (name.includes("3º") || name.includes("3ª")) baseConfig = CUSTOM_MATRIX_CONFIG["3ª"];
        
        if (baseConfig) {
          const overrideKey = Object.keys(SPECIFIC_MATRIX_OVERRIDE).find(k => 
            name.includes(k.toUpperCase()) || k.toUpperCase().includes(name)
          );
          const overrides = overrideKey ? SPECIFIC_MATRIX_OVERRIDE[overrideKey] : {};
          
          baseConfig.forEach(item => {
            payload.push({
              school_id: schoolId,
              class_name: cls.name,
              subject: item.subject,
              lessons_per_week: overrides[item.subject] !== undefined ? overrides[item.subject] : item.lessons
            });
          });
        }
      }

      if (payload.length === 0) {
        onShowNotify("Nenhuma turma compatível encontrada (Ex: '6º ANO A', '1ª SÉRIE EM A').", "error");
        setImporting(false);
        return;
      }

      const classNamesToClear = Array.from(new Set(payload.map(p => p.class_name)));
      await supabase.from('class_matrix').delete().eq('school_id', schoolId).in('class_name', classNamesToClear);

      const { error } = await supabase.from('class_matrix').insert(payload);
      if (error) throw error;

      const { data: matrixData } = await supabase.from('class_matrix').select('*').eq('school_id', schoolId);
      if (matrixData) setMatrix(matrixData);

      onShowNotify(`Matriz personalizada aplicada a ${classNamesToClear.length} turmas!`, "success");
    } catch (error: any) {
      console.error("Erro ao importar matriz:", error);
      onShowNotify("Erro: " + (error.message || "Falha na comunicação"), "error");
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
     try {
       const { error } = await supabase.from('school_classes').delete().eq('id', id);
       if (error) throw error;
       setClasses(classes.filter(c => c.id !== id));
       onShowNotify("Turma removida.", "success");
     } catch (error: any) {
        onShowNotify(error.message, "error");
     }
  };

  // --- HANDLERS FOR MATRIX ---
  
  // Importação da Matriz PR 2026
  const handleImportMatrixPR2026 = async () => {
    console.log("Iniciando importação da matriz PR 2026...");
    if (classes.length === 0) {
        onShowNotify("Nenhuma turma cadastrada. Por favor, cadastre ou importe as turmas na aba 'Turmas' primeiro.", "error");
        return;
    }

    setImporting(true);
    try {
      // 1. Identificar turmas de Ensino Médio
      const emClasses = classes.filter(c => 
        c.name.toUpperCase().includes("EM") || 
        c.name.toUpperCase().includes("SÉRIE") || 
        c.name.toUpperCase().includes("ENSINO MÉDIO")
      );

      if (emClasses.length === 0) {
        onShowNotify("Nenhuma turma de Ensino Médio encontrada (Busquei por: 'EM', 'SÉRIE' ou 'ENSINO MÉDIO' no nome da turma). Cadastre turmas como '1ª SÉRIE EM A' para funcionar.", "error");
        setImporting(false);
        return;
      }

      onShowNotify(`Aplicando Matriz PR 2026 a ${emClasses.length} turmas...`, "info");

      // 2. Limpar matriz existente para essas turmas para evitar duplicidade/conflito
      const emClassNames = emClasses.map(c => c.name);
      await supabase.from('class_matrix').delete().eq('school_id', schoolId).in('class_name', emClassNames);

      // 3. Preparar payload
      const payload: any[] = [];
      emClasses.forEach(cls => {
         MATRIX_PR_2026.forEach(item => {
            payload.push({
               school_id: schoolId,
               class_name: cls.name,
               subject: item.subject,
               lessons_per_week: item.lessons
            });
         });
      });

      // 4. Inserir
      const { error } = await supabase.from('class_matrix').insert(payload);
      if (error) throw error;

      // 5. Atualizar estado local
      // Recarregar tudo para garantir consistência
      const { data: matrixData } = await supabase.from('class_matrix').select('*').eq('school_id', schoolId);
      if (matrixData) setMatrix(matrixData);
      
      onShowNotify(`Matriz PR 2026 aplicada a ${emClasses.length} turmas com sucesso!`, "success");

    } catch (error: any) {
      console.error(error);
      onShowNotify(error.message, "error");
    } finally {
      setImporting(false);
    }
  };

  const handleUpdateMatrix = async (subject: string, amount: number) => {
    try {
      // Find existing entry
      const existing = matrix.find(m => m.class_name === selectedClass && m.subject === subject);

      if (amount <= 0 && existing) {
        // Remove if 0 from class_matrix, teacher_assignments and class_schedules
        await supabase.from('class_matrix').delete().eq('id', existing.id);
        await supabase.from('teacher_assignments').delete().eq('school_id', schoolId).eq('class_name', selectedClass).eq('subject', subject);
        await supabase.from('class_schedules').delete().eq('school_id', schoolId).eq('class_name', selectedClass).eq('subject', subject);

        setMatrix(matrix.filter(m => m.id !== existing.id));
        onShowNotify(`Disciplina "${subject}" removida da turma ${selectedClass}.`, "info");
      } else if (existing) {
        // Update
        const { error } = await supabase.from('class_matrix').update({ lessons_per_week: amount }).eq('id', existing.id);
        if (error) throw error;
        setMatrix(matrix.map(m => m.id === existing.id ? { ...m, lessons_per_week: amount } : m));
      } else if (amount > 0) {
        // Create
        const { data, error } = await supabase.from('class_matrix').insert({
            school_id: schoolId,
            class_name: selectedClass,
            subject: subject,
            lessons_per_week: amount
        }).select().single();
        if (error) throw error;
        setMatrix([...matrix, data]);
      }
    } catch (error: any) {
      onShowNotify(error.message, 'error');
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
           <h3 className="text-xl font-black text-slate-900 uppercase">Estrutura Escolar</h3>
           <p className="text-xs text-slate-400 font-bold">Defina os turnos e a carga horária das turmas.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
           <button onClick={() => setActiveTab('shifts')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'shifts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>1. Turnos</button>
           <button onClick={() => setActiveTab('classes')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'classes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>2. Turmas</button>
           <button onClick={() => setActiveTab('matrix')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'matrix' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>3. Matriz</button>
        </div>
      </div>

      {activeTab === 'shifts' && (
          <div className="space-y-6">
              <form onSubmit={handleAddShift} className="bg-slate-50 p-4 rounded-2xl border flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[150px]"><label className="text-[10px] font-black uppercase text-slate-400">Nome do Turno</label><input required value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} className="w-full p-2 rounded-lg border text-xs font-bold" /></div>
                  <div className="w-24"><label className="text-[10px] font-black uppercase text-slate-400">Início</label><input type="time" required value={newShift.start_time} onChange={e => setNewShift({...newShift, start_time: e.target.value})} className="w-full p-2 rounded-lg border text-xs font-bold" /></div>
                  <div className="w-24"><label className="text-[10px] font-black uppercase text-slate-400">Duração (min)</label><input type="number" required value={newShift.lesson_duration_min} onChange={e => setNewShift({...newShift, lesson_duration_min: parseInt(e.target.value)})} className="w-full p-2 rounded-lg border text-xs font-bold" /></div>
                  <div className="w-24"><label className="text-[10px] font-black uppercase text-slate-400">Aulas/Dia</label><input type="number" required value={newShift.lessons_per_day} onChange={e => setNewShift({...newShift, lessons_per_day: parseInt(e.target.value)})} className="w-full p-2 rounded-lg border text-xs font-bold" /></div>
                  <div className="w-32"><label className="text-[10px] font-black uppercase text-slate-400">Intervalo após</label><select value={newShift.break_after_lesson} onChange={e => setNewShift({...newShift, break_after_lesson: parseInt(e.target.value)})} className="w-full p-2 rounded-lg border text-xs font-bold"><option value="0">Sem intervalo</option>{Array.from({length: 6}).map((_, i) => <option key={i} value={i+1}>{i+1}ª Aula</option>)}</select></div>
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-xs uppercase h-9 shadow-lg">Adicionar</button>
              </form>
              <div className="grid gap-3">
                  {shifts.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-white border p-4 rounded-xl shadow-sm">
                          <div><h4 className="font-black text-slate-900 text-sm">{s.name}</h4><p className="text-[10px] text-slate-500 font-bold">{s.start_time} • {s.lessons_per_day} aulas de {s.lesson_duration_min}min {s.break_after_lesson ? `• Intervalo após ${s.break_after_lesson}ª aula` : ''}</p></div>
                          <button onClick={() => handleDeleteShift(s.id)} className="text-rose-400 hover:text-rose-600"><i className="fa-solid fa-trash"></i></button>
                      </div>
                  ))}
                  {shifts.length === 0 && <p className="text-center text-xs text-slate-400 py-4 font-bold">Nenhum turno cadastrado.</p>}
              </div>
          </div>
      )}

      {activeTab === 'classes' && (
          <div className="space-y-6">
              <form onSubmit={handleAddClass} className="bg-slate-50 p-4 rounded-2xl border flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]"><label className="text-[10px] font-black uppercase text-slate-400">Nome da Turma</label><input required value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} className="w-full p-2 rounded-lg border text-xs font-bold" placeholder="Ex: 6º ANO A" /></div>
                  <div className="w-48"><label className="text-[10px] font-black uppercase text-slate-400">Turno</label><select required value={newClass.shift_id} onChange={e => setNewClass({...newClass, shift_id: e.target.value})} className="w-full p-2 rounded-lg border text-xs font-bold"><option value="">Selecione...</option>{shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-xs uppercase h-9 shadow-lg">Adicionar</button>
                  <button type="button" onClick={handleImportDefaults} disabled={importing} className="bg-white border text-indigo-600 px-4 py-2 rounded-lg font-black text-xs uppercase h-9 hover:bg-indigo-50">Importar Padrão</button>
              </form>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {classes.map(c => (
                      <div key={c.id} className="flex justify-between items-center bg-white border p-3 rounded-xl shadow-sm">
                          <div><h4 className="font-black text-slate-900 text-xs">{c.name}</h4><p className="text-[9px] text-slate-400 font-bold uppercase">{shifts.find(s => s.id === c.shift_id)?.name || 'Sem turno'}</p></div>
                          <button onClick={() => handleDeleteClass(c.id)} className="text-rose-400 hover:text-rose-600"><i className="fa-solid fa-trash"></i></button>
                      </div>
                  ))}
              </div>
              {classes.length === 0 && <p className="text-center text-xs text-slate-400 py-4 font-bold">Nenhuma turma cadastrada.</p>}
          </div>
      )}

      {activeTab === 'matrix' && (
          <div className="space-y-6">
              <div className="flex justify-between items-end">
                  <div className="w-64">
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Selecionar Turma</label>
                      <select value={selectedClass || ''} onChange={e => setSelectedClass(e.target.value)} className="w-full p-3 rounded-xl border text-xs font-bold bg-slate-50">
                          {classes.length > 0 ? classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : <option>Sem turmas cadastradas</option>}
                      </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleImportCustomMatrix} disabled={importing} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-indigo-100 flex items-center gap-2">
                        {importing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>} Aplicar Matriz Personalizada
                    </button>
                    <button onClick={handleImportMatrixPR2026} disabled={importing} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-emerald-100 flex items-center gap-2">
                        {importing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-table"></i>} Importar Matriz PR 2026 (EM)
                    </button>
                  </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                      {allSubjects.map(subject => {
                          const count = matrix.find(m => m.class_name === selectedClass && m.subject === subject)?.lessons_per_week || 0;
                          return (
                              <div key={subject} className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0">
                                  <span className={`text-[10px] font-bold uppercase truncate pr-2 ${count > 0 ? 'text-indigo-950 font-black' : 'text-slate-500'}`} title={subject}>{subject}</span>
                                  <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
                                      <button onClick={() => handleUpdateMatrix(subject, Math.max(0, count - 1))} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-minus text-[10px]"></i></button>
                                      <span className="w-4 text-center text-xs font-black text-indigo-900">{count}</span>
                                      <button onClick={() => handleUpdateMatrix(subject, count + 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-plus text-[10px]"></i></button>
                                  </div>
                              </div>
                          );
                      })}
                    </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SchoolStructureSetup;
