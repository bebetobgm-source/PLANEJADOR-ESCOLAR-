import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { createClient, User } from '@supabase/supabase-js';
import { WEEKDAYS, TURMAS_OPTIONS, SHIFT_OPTIONS, DISCIPLINES, SCHOOL_LOGO_BASE64 } from './constants';
import { SchoolSettings, PlanningRow, Holiday, CurriculumItem, School, Database, PlanDocument, SchoolYearSettings } from './types';
import { formatDisplayDate, isHoliday } from './utils/dateUtils';
import SchoolStructureSetup from './components/SchoolStructureSetup';
import ScheduleSimulator from './components/ScheduleSimulator';
import TeachersManager from './components/TeachersManager';
import TeacherScheduleView from './components/TeacherScheduleView';
import TeacherAvailability from './components/TeacherAvailability';
import { AdminAnoLetivo } from './components/AdminAnoLetivo';
import { SalesPage } from './components/SalesPage';

// ACESSO MESTRE
const MASTER_EMAIL = "bebeto.bgm@gmail.com"; 

// Configure isso nas configurações (Secrets) do seu ambiente
const rawSupUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || '').trim();
const rawSupKey = ((import.meta as any).env?.VITE_SUPABASE_KEY || '').trim();

const supabaseUrl = rawSupUrl ? rawSupUrl : 'https://vwpcseyurdtbhkhkftjn.supabase.co';
const supabaseKey = rawSupKey ? rawSupKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3cGNzZXl1cmR0YmhraGtmdGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MzE3MzUsImV4cCI6MjA4NTMwNzczNX0.c6JF9T7HIUsFYg3vEkbkptEVl_JO_d_-oaif6xb4gT8';

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

const getAIClient = (userKey?: string) => {
  const key = userKey || process.env.API_KEY;
  if (!key) throw new Error("Chave de API não configurada.");
  return new GoogleGenAI({ apiKey: key });
};

const TRIMESTER_RANGES = {
  1: { start: "2026-02-02", end: "2026-05-14", label: "1º Trimestre" },
  2: { start: "2026-05-15", end: "2026-09-04", label: "2º Trimestre" },
  3: { start: "2026-09-08", end: "2026-11-30", label: "3º Trimestre" },
};

const FIXED_PPP_EVENTS: Record<string, { chapter: string, topic: string, learning: string }> = {
  "2026-03-07": { chapter: "EVENTO PPP", topic: "Projeto Integração Família Escola", learning: "Dia letivo com CCH / Integração e acolhimento da comunidade escolar." },
  "2026-04-25": { chapter: "EVENTO PPP", topic: "Festival Cultural", learning: "Dia Letivo com CCH / Desenvolvimento de competências culturais e artísticas." },
  "2026-05-09": { chapter: "EVENTO PPP", topic: "Projeto Integração Família Escola", learning: "Dia letivo com CCH / Fortalecimento de vínculos entre família e escola." },
  "2026-05-16": { chapter: "EVENTO PPP", topic: "Aplicação simulado 1º dia", learning: "Dia Letivo com CCH / Avaliação diagnóstica de competências e habilidades." },
  "2026-05-23": { chapter: "EVENTO PPP", topic: "Aplicação simulado 2º dia", learning: "Dia Letivo com CCH / Continuidade da avaliação de rendimento acadêmico." },
  "2026-07-04": { chapter: "EVENTO PPP", topic: "Festa Junina", learning: "Dia letivo com CCH / Valorização da cultura regional e integração social." },
  "2026-08-15": { chapter: "EVENTO PPP", topic: "Projeto Integração Família Escola", learning: "Dia letivo com CCH / Diálogo e participação comunitária no ambiente escolar." },
  "2026-09-19": { chapter: "EVENTO PPP", topic: "Aplicação simulado 1º dia", learning: "Dia letivo com CCH / Monitoramento do progresso educacional e preparação técnica." },
  "2026-09-26": { chapter: "EVENTO PPP", topic: "Aplicação simulado 2º dia", learning: "Dia letivo com CCH / Conclusão do ciclo de simulados e análise de desempenho." },
  "2026-11-07": { chapter: "EVENTO PPP", topic: "Projeto Integração Família Escola", learning: "Dia letivo com CCH / Encerramento das atividades de integração do ano letivo." },
  "2026-11-19": { chapter: "PROJETO", topic: "Atividade Zumbi e Consciência Negra", learning: "Debate e reflexão sobre a diversidade ethnic-racial e história afro-brasileira." },
  "2026-11-21": { chapter: "EVENTO PPP", topic: "Projeto Esportivo Interclasses", learning: "Dia letivo com CCH / Promoção da saúde, cooperação e espírito esportivo." },
};

const MONTHS_BR = [
  { id: '02', name: 'FEVEREIRO', trimester: 1 },
  { id: '03', name: 'MARÇO', trimester: 1 },
  { id: '04', name: 'ABRIL', trimester: 1 },
  { id: '05', name: 'MAIO', trimester: 1 },
  { id: '06', name: 'JUNHO', trimester: 2 },
  { id: '07', name: 'JULHO', trimester: 2 },
  { id: '08', name: 'AGOSTO', trimester: 2 },
  { id: '09', name: 'SETEMBRO', trimester: 3 },
  { id: '10', name: 'OUTUBRO', trimester: 3 },
  { id: '11', name: 'NOVEMBRO', trimester: 3 },
];

const DEFAULT_METHODOLOGY = `• Aulas expositivas\n• Trabalhos práticos em classe e extraclasse\n• Questões instigadoras - oral\n• Resolução de exercícios\n• Produção de texto e trabalhos individuais, em duplas e em equipes\n• Vídeos\n• Músicas\n• Utilização de material pedagógico convencional\n• Plataformas digitais (Quizziz, Word Wall, Canva)\n• Projetor digital\n• Apostila\n• Plataforma tecnológica (Positivo On)`;
const DEFAULT_EVALUATION = `• A Avaliação será realizada através de atividades realizadas em classe e extraclasse, participação, projetos e ideias criativas.\n• Avaliação trimestral dividida em:\n- Parte escrita com questões objetivas e/ou subjetivas (Valor: 8,0).\n- Atividades diversas realizadas durante o trimestre (Valor: 2,0).`;

// SQL Script para criação das tabelas
const SETUP_SQL_SCRIPT = `
-- 1. Tabela de Escolas
create table if not exists schools (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text,
  pedagogical_coordinator text,
  director text,
  created_at timestamptz default now()
);

-- 2. Tabela de Turnos e Configuração de Horário
create table if not exists school_shifts (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  start_time text not null default '07:00',
  lesson_duration_min int not null default 50,
  lessons_per_day int not null default 5,
  break_after_lesson int default 0,
  break_duration_min int default 0,
  created_at timestamptz default now()
);

-- 3. Tabela de Turmas
create table if not exists school_classes (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  shift_id uuid references school_shifts(id) on delete set null,
  created_at timestamptz default now()
);

-- 4. Matriz Curricular
create table if not exists class_matrix (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references schools(id) on delete cascade,
  class_name text not null,
  subject text not null,
  lessons_per_week int not null default 1,
  created_at timestamptz default now()
);

-- 5. Professores da Escola (Cadastro Manual ou Vinculado)
create table if not exists school_teachers (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  email text,
  disciplines jsonb not null default '[]'::jsonb,
  availability jsonb not null default '{}'::jsonb,
  auth_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 6. Grade Horária
create table if not exists class_schedules (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references schools(id) on delete cascade,
  class_name text not null,
  day_of_week int not null,
  period_index int not null,
  subject text,
  teacher_id uuid references school_teachers(id) on delete set null,
  created_at timestamptz default now()
);

-- 7. Atribuição de Professores
create table if not exists teacher_assignments (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references schools(id) on delete cascade,
  class_name text not null,
  subject text not null,
  teacher_id uuid references school_teachers(id) on delete cascade,
  created_at timestamptz default now(),
  unique(school_id, class_name, subject)
);

-- 8. Perfis de Usuário
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text,
  school_id uuid references schools(id),
  disciplines text,
  role text default 'teacher'
);

-- Trigger para criar profile automaticamente após o signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'Professor'), 'teacher');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. Planos de Aula
create table if not exists user_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  settings jsonb not null,
  curriculum jsonb not null,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 6. Atribuição de Professores
create table if not exists teacher_assignments (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references schools(id) on delete cascade,
  class_name text not null,
  subject text not null,
  teacher_id uuid references school_teachers(id) on delete cascade,
  created_at timestamptz default now(),
  unique(school_id, class_name, subject)
);
`;

const RLS_POLICY_SCRIPT = `-- Correção de Visibilidade e Recursão nas Políticas RLS
-- Execute este script no SQL Editor do Supabase se seus planos desapareceram

-- 0. Garantir permissão de Administrador para o seu usuário (Resolve a sua visualização de planos)
UPDATE profiles SET role = 'admin' WHERE email = 'bebeto.bgm@gmail.com';

-- 1. Políticas para User Plans (O professor vê os seus, e o admin vê todos)
DROP POLICY IF EXISTS "Admins podem acessar tudo em user_plans" ON user_plans;
DROP POLICY IF EXISTS "Acesso as user_plans" ON user_plans;

ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso as user_plans" ON user_plans
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Políticas para Profiles (Evitar recursão infinita que bloqueava todo o acesso)
DROP POLICY IF EXISTS "Admins podem acessar tudo em profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles visibilidade geral" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles visibilidade geral" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated'); -- Qualquer professor logado pode ler a lista de professores

DROP POLICY IF EXISTS "Usuários editam próprio profile" ON profiles;
CREATE POLICY "Usuários editam próprio profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

create table if not exists teacher_availability (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  availability_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  unique(user_id, school_id)
);
ALTER TABLE teacher_availability DISABLE ROW LEVEL SECURITY;

-- 3. Tabela de Configuração do Ano Letivo (Para o novo modal)
create table if not exists school_year_settings (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references schools(id) on delete cascade,
  year int not null default 2026,
  period_type text not null default 'trimestre',
  periods jsonb not null default '[]'::jsonb,
  ppp_events jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  unique(school_id, year)
);
ALTER TABLE school_year_settings DISABLE ROW LEVEL SECURITY; -- Apenas o próprio usuário edita seu perfil (Admin fará isso via superuser se necessário, ou adicione regra específica)
`;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showSalesPage, setShowSalesPage] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'success'>('login');
  const [authLoading, setAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<'lobby' | 'editor' | 'admin'>('lobby');
  const [lobbyTab, setLobbyTab] = useState<'planos' | 'disponibilidade' | 'horario'>('planos');
  const [userProfile, setUserProfile] = useState<any>(null);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setUserProfile(data);
  };
  const [adminTab, setAdminTab] = useState<'professores' | 'escolas' | 'planos' | 'estrutura' | 'horarios' | 'ano_letivo' | 'db_setup'>('professores');
  
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [allPlans, setAllPlans] = useState<PlanDocument[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [yearSettings, setYearSettings] = useState<SchoolYearSettings | null>(null);
  const [plans, setPlans] = useState<PlanDocument[]>([]);
  const [fetchingPlans, setFetchingPlans] = useState(false);
  const [dbClasses, setDbClasses] = useState<string[]>([]); // Turmas vindas do banco

  // Estados de Edição Admin
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [adminSelectedSchoolId, setAdminSelectedSchoolId] = useState<string>('');

  // Estados de Edição e Criação Docente
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);
  const [planning, setPlanning] = useState<PlanningRow[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Estados de Importação e Gestão de Conteúdo
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  
  // NOVO: Estado para Modal de Disponibilidade
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  
  // Estados para Edição Manual de Conteúdo
  const [editingContentIndex, setEditingContentIndex] = useState<number | null>(null);
  const [editingContentData, setEditingContentData] = useState<CurriculumItem | null>(null);
  const [newContentData, setNewContentData] = useState<CurriculumItem>({ chapter: '', topic: '', essentialLearning: '' });
  
  const [newPlanData, setNewPlanData] = useState({
    discipline: '',
    organization: '', // Removido valor padrão fixo
    shift: SHIFT_OPTIONS[0],
    schoolId: '' // Agora guardamos a escola selecionada no modal
  });

  const [isEditSettingsModalOpen, setIsEditSettingsModalOpen] = useState(false);
  const [editPlanData, setEditPlanData] = useState({ discipline: '', organization: '', shift: '' });

  // Estado para Duplicação
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [planToDuplicate, setPlanToDuplicate] = useState<PlanDocument | null>(null);
  const [duplicateData, setDuplicateData] = useState({
    organization: '',
    shift: SHIFT_OPTIONS[0],
    classDays: [] as number[]
  });

  const [notification, setNotification] = useState<{isOpen: boolean, message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    fullName: '', 
    selectedDisciplines: [] as string[], 
    phone: '',
    schoolId: ''
  });

  const showNotify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ isOpen: true, message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const isMaster = user?.email === MASTER_EMAIL || userProfile?.role === 'admin';
  const currentUserName = user?.user_metadata?.full_name || "Professor";
  const currentUserSchoolId = user?.user_metadata?.school_id;

  const availableDisciplines = useMemo(() => {
    const raw = user?.user_metadata?.disciplines;
    if (typeof raw === 'string') return raw.split(',').map((d: string) => d.trim()).filter(Boolean);
    if (Array.isArray(raw)) return raw;
    return DISCIPLINES;
  }, [user]);

  const fetchSchools = useCallback(async () => {
    setSchoolsLoading(true);
    try {
      const { data, error } = await supabase.from('schools').select('*').order('name');
      if (error) throw error;
      const schoolsData = (data || []) as School[];
      setSchools(schoolsData);
      // Seleciona a primeira escola por padrão no admin
      if (schoolsData.length > 0 && !adminSelectedSchoolId) {
        setAdminSelectedSchoolId(schoolsData[0].id);
      }
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setSchoolsLoading(false);
    }
  }, [supabase, adminSelectedSchoolId]);

  const fetchYearSettings = useCallback(async (schoolId?: string, year?: number) => {
    if (!schoolId || !year) return;
    try {
      const { data, error } = await supabase.from('school_year_settings')
        .select('*')
        .eq('school_id', schoolId)
        .eq('year', year)
        .maybeSingle(); // Not throwing error if it doesn't exist
      
      if (error) {
        console.error("Erro ao buscar ano letivo do banco:", error.message);
        return;
      }
      setYearSettings(data as SchoolYearSettings | null);
    } catch (err: any) {
      console.error(err);
    }
  }, [supabase]);

  const fetchTeachers = useCallback(async () => {
    if (!isMaster) return;
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');
    if (!error) setTeachers(data || []);
  }, [isMaster]);

  const fetchAllPlans = useCallback(async () => {
    if (!isMaster) return;
    const { data, error } = await supabase.from('user_plans').select('*').order('updated_at', { ascending: false }).limit(100);
    if (error) console.error("Error fetching admin plans:", error);
    if (!error) setAllPlans(data as PlanDocument[] || []);
  }, [isMaster]);

  const fetchUserPlans = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setFetchingPlans(true);
    const { data, error } = await supabase.from('user_plans').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (error) console.error("Error fetching user plans:", error);
    if (!error) setPlans(data as PlanDocument[] || []);
    setFetchingPlans(false);
  }, [user]);

  // Busca turmas da escola do usuário logado OU da escola selecionada no modal
  const fetchClassesForModal = useCallback(async (targetSchoolId: string) => {
    if (!targetSchoolId) {
        setDbClasses([]);
        return;
    }
    const { data } = await supabase.from('school_classes').select('name').eq('school_id', targetSchoolId).order('name');
    const classesData = (data || []) as { name: string }[];
    if (classesData.length > 0) {
      setDbClasses(classesData.map(d => d.name));
      // Seta a primeira opção se não tiver sido selecionada ainda ou se a atual não existir na nova lista
      setNewPlanData(prev => ({...prev, organization: classesData[0].name}));
    } else {
      // Fallback
      setDbClasses([]);
      setNewPlanData(prev => ({...prev, organization: ''}));
    }
  }, []);

  // Effect para atualizar as turmas e configuracoes quando mudar a escola no modal de novo plano
  useEffect(() => {
    if (newPlanData.schoolId) {
        fetchClassesForModal(newPlanData.schoolId);
        // By default use 2026 for now, or new Date().getFullYear() later
        fetchYearSettings(newPlanData.schoolId, 2026);
    }
  }, [newPlanData.schoolId, fetchClassesForModal, fetchYearSettings]);

  // Inicializa o modal com a escola do usuário
  useEffect(() => {
    if (user && currentUserSchoolId && !newPlanData.schoolId) {
        setNewPlanData(prev => ({ ...prev, schoolId: currentUserSchoolId }));
    }
  }, [user, currentUserSchoolId]);

  useEffect(() => {
    fetchSchools();
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) { supabase.auth.signOut(); setUser(null); setUserProfile(null); } 
      else { 
        setUser(session?.user ?? null); 
        if (session?.user) fetchUserProfile(session.user.id);
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchSchools]);

  useEffect(() => {
    if (view === 'lobby' && user) {
      fetchUserPlans();
    }
    if (view === 'admin' && isMaster) {
      fetchTeachers();
      fetchAllPlans();
    }
  }, [view, user, fetchUserPlans, isMaster, fetchTeachers, fetchAllPlans]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ 
          email: formData.email, password: formData.password, 
          options: { data: { full_name: formData.fullName, school_id: formData.schoolId, disciplines: formData.selectedDisciplines.join(', ') } } 
        });
        if (error) throw error;
        setAuthMode('success');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password });
        if (error) throw error;
      }
    } catch (err: any) { showNotify(err.message, "error"); } finally { setIsSubmitting(false); }
  };

  const handleCreateNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!newPlanData.schoolId) {
        showNotify("Selecione uma escola.", "error");
        return;
    }
    if (!newPlanData.organization) {
        showNotify("Selecione uma turma. Se não houver turmas, cadastre-as no painel administrativo.", "error");
        return;
    }

    setSyncing(true);
    try {
      // Usar a escola selecionada no modal, não apenas a do usuário
      const sid = newPlanData.schoolId;
      const school = schools.find(s => s.id === sid);
      const initialSettings: SchoolSettings = { 
        schoolId: school?.id, schoolName: school?.name || "Escola", cnpj: "00.000.000/0000-00", address: "Endereço", phone: "(00) 0000-0000",
        teacherPhone: "", logoUrl: school?.logo_url || "", year: yearSettings?.year || 2026, startDate: "2026-02-02", endDate: "2026-11-30", classDays: [1, 3], 
        teacherName: user.user_metadata?.full_name || "", course: "Ensino Fundamental", discipline: newPlanData.discipline, 
        organization: newPlanData.organization, shift: newPlanData.shift, methodology: DEFAULT_METHODOLOGY, evaluation: DEFAULT_EVALUATION, 
        holidays: [], pedagogicalCoordinator: school?.pedagogical_coordinator || "", director: school?.director || ""
      };
      const { data, error } = await (supabase.from('user_plans') as any).insert({ 
        user_id: user.id, 
        settings: initialSettings as any, 
        curriculum: [] as any 
      }).select().single();
      if (error) throw error;
      setPlans(prev => [data as unknown as PlanDocument, ...prev]);
      setIsNewPlanModalOpen(false);
      openEditor(data as PlanDocument);
    } catch (err: any) { showNotify(err.message, "error"); } finally { setSyncing(false); }
  };

  const openEditor = (plan: PlanDocument) => { setActivePlanId(plan.id); setSettings(plan.settings); setCurriculum(plan.curriculum || []); setView('editor'); };

  const performSave = async () => {
    if (!user || !activePlanId || !settings) return;
    setSyncing(true);
    const { error } = await (supabase.from('user_plans') as any).update({ 
      settings: settings as any, 
      curriculum: curriculum as any, 
      updated_at: new Date().toISOString() 
    } as any).eq('id', activePlanId);
    if (!error) {
      showNotify("Alterações salvas!", "success");
      setPlans(prev => prev.map(p => p.id === activePlanId ? { ...p, settings, curriculum } : p));
    } else { showNotify(error.message, "error"); }
    setSyncing(false);
  };

  // Helper para resgatar configuracoes dinâmicas ou fallback
  const getYearConfig = useCallback(() => {
    const periods = (yearSettings?.periods && yearSettings.periods.length > 0) 
      ? yearSettings.periods 
      : [
          { number: 1, start: TRIMESTER_RANGES[1].start, end: TRIMESTER_RANGES[1].end },
          { number: 2, start: TRIMESTER_RANGES[2].start, end: TRIMESTER_RANGES[2].end },
          { number: 3, start: TRIMESTER_RANGES[3].start, end: TRIMESTER_RANGES[3].end }
        ];
    
    const pppEventsArr = yearSettings?.ppp_events || Object.keys(FIXED_PPP_EVENTS).map(date => ({
      date,
      ...FIXED_PPP_EVENTS[date]
    }));

    const periodType = yearSettings?.period_type || 'trimestre';
    
    return { periods, pppEventsArr, periodType };
  }, [yearSettings]);

  // ALGORITMO DE DISTRIBUIÇÃO PROPORCIONAL
  const generatePlanning = useCallback(() => {
    if (!settings) return;
    const { periods, pppEventsArr, periodType } = getYearConfig();

    const rows: PlanningRow[] = [];
    
    // 1. Identificar todos os dias válidos para aula no ano inteiro
    const availableLessonDates: string[] = [];
    
    const start = new Date(periods[0].start + 'T00:00:00');
    // Pegar o fim do último período
    const end = new Date(periods[periods.length - 1].end + 'T23:59:59');
    let cursor = new Date(start);

    // Mapear dias fixos para evitar sobreposição
    const fixedEventsMap: Record<string, any> = {};
    pppEventsArr.forEach(v => {
      fixedEventsMap[v.date] = { chapter: v.chapter, topic: v.topic, learning: v.learning };
    });

    if (settings.planningMode === 'monthly') {
      const monthlyContent = settings.monthlyContent || {};
      cursor = new Date(start);
      
      // Group dates by month
      const monthGroups: Record<string, string[]> = {};
      const allDatesWithPPP: {ds: string, isPPP: boolean}[] = [];

      while (cursor <= end) {
        const ds = cursor.toISOString().split('T')[0];
        const isClassDay = settings.classDays.includes(cursor.getDay());
        const isDayOff = isHoliday(cursor, settings.holidays);
        const isFixedEvent = !!fixedEventsMap[ds];

        if (isFixedEvent) {
          allDatesWithPPP.push({ ds, isPPP: true });
        } else if (isClassDay && !isDayOff) {
          allDatesWithPPP.push({ ds, isPPP: false });
          const monthKey = ds.substring(0, 7); // YYYY-MM
          if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
          monthGroups[monthKey].push(ds);
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      // Create a map of monthly rows to insert them at the right time
      const monthlyRowsMap: Record<string, PlanningRow> = {};
      Object.keys(monthGroups).forEach(monthKey => {
        const dates = monthGroups[monthKey];
        const content = monthlyContent[monthKey] || '';
        const [year, monthNum] = monthKey.split('-');
        const monthInfo = MONTHS_BR.find(m => m.id === monthNum);
        const monthName = monthInfo?.name || monthNum;
        const formattedDates = dates.map(d => d.split('-')[2]).join(', ') + '/' + monthNum + '/' + year;

        monthlyRowsMap[monthKey] = {
          id: `monthly-${monthKey}`,
          dateScheduled: formattedDates,
          chapter: `CONTEÚDO DE ${monthName}`,
          topic: content,
          essentialLearning: '',
          status: 'Pendente'
        };
      });

      // Build final rows in order
      const tempRows: PlanningRow[] = [];
      const addedMonths = new Set<string>();

      allDatesWithPPP.forEach(({ds, isPPP}) => {
        const monthKey = ds.substring(0, 7);
        if (isPPP) {
          const fix = fixedEventsMap[ds];
          tempRows.push({ 
            id: `fixed-${ds}`, 
            dateScheduled: ds, 
            chapter: fix.chapter, 
            topic: fix.topic, 
            essentialLearning: fix.learning, 
            status: 'Concluído' 
          });
        } else if (!addedMonths.has(monthKey)) {
          if (monthlyRowsMap[monthKey]) {
            tempRows.push(monthlyRowsMap[monthKey]);
            addedMonths.add(monthKey);
          }
        }
      });

      // Add Headers based on periods (Trimester/Bimestre)
      const finalRows: PlanningRow[] = [];
      let currentPeriodNum = 0;
      
      tempRows.forEach(row => {
          let dateStr = '';
          if (row.id.startsWith('fixed-')) {
            dateStr = row.dateScheduled!;
          } else {
            // monthly-YYYY-MM
            const mKey = row.id.replace('monthly-', '');
            const firstDay = monthGroups[mKey][0].split('-')[2];
            dateStr = `${mKey}-${firstDay}`;
          }

          let periodNum = 1;
          for (const p of periods) {
            if (dateStr >= p.start && dateStr <= p.end) {
              periodNum = p.number;
              break;
            }
          }
          // fallback pra caso data seja posterior ao ultimo final (ex: final de ano)
          if (dateStr > periods[periods.length - 1].end) {
            periodNum = periods[periods.length - 1].number;
          }
          
          if (periodNum !== currentPeriodNum) {
              const labelName = periodType === 'trimestre' ? 'TRIMESTRE' : 'BIMESTRE';
              finalRows.push({
                  id: `period-header-${periodNum}`,
                  chapter: `${periodNum}º ${labelName}`,
                  topic: '',
                  essentialLearning: '',
                  status: 'Pendente',
                  dateScheduled: ''
              });
              currentPeriodNum = periodNum;
          }
          finalRows.push(row);
      });
      setPlanning(finalRows);

    } else {
      // MODO GRANULAR (EXISTENTE)
      while (cursor <= end) {
        const ds = cursor.toISOString().split('T')[0];
        const isClassDay = settings.classDays.includes(cursor.getDay());
        const isDayOff = isHoliday(cursor, settings.holidays);
        const isFixedEvent = !!fixedEventsMap[ds];

        if (isFixedEvent) {
            // Eventos fixos são adicionados diretamente depois, mas bloqueiam a data para aula normal
        } else if (isClassDay && !isDayOff) {
            availableLessonDates.push(ds);
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const totalSlots = availableLessonDates.length;
      const totalContentItems = curriculum.length;
      
      cursor = new Date(start);
      let usedSlotsCount = 0;

      while (cursor <= end) {
        const ds = cursor.toISOString().split('T')[0];
        const fix = fixedEventsMap[ds];

        if (fix) {
          rows.push({ 
              id: `fixed-${ds}`, 
              dateScheduled: ds, 
              chapter: fix.chapter, 
              topic: fix.topic, 
              essentialLearning: fix.learning, 
              status: 'Concluído' 
          });
        } else if (settings.classDays.includes(cursor.getDay()) && !isHoliday(cursor, settings.holidays)) {
          if (totalContentItems > 0) {
              const contentIndex = Math.floor((usedSlotsCount / totalSlots) * totalContentItems);
              const prevContentIndex = usedSlotsCount > 0 ? Math.floor(((usedSlotsCount - 1) / totalSlots) * totalContentItems) : -1;
              const isContinuation = contentIndex === prevContentIndex;

              if (contentIndex < totalContentItems) {
                  const item = curriculum[contentIndex];
                  rows.push({
                      ...item,
                      id: `row-${ds}`,
                      dateScheduled: ds,
                      topic: isContinuation ? `${item.topic} (Continuação / Fixação)` : item.topic,
                      status: 'Pendente'
                  });
                  usedSlotsCount++;
              }
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      setPlanning(rows);
    }
  }, [settings, curriculum]);

  useEffect(() => { 
    if (view === 'editor') {
      if (settings?.schoolId && settings?.year) {
        fetchYearSettings(settings.schoolId, settings.year);
      }
      generatePlanning(); 
    }
  }, [curriculum, generatePlanning, view, settings?.schoolId, settings?.year, fetchYearSettings]);

  const handleAdminUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setSyncing(true);
    const { error } = await (supabase.from('profiles') as any).update({
      full_name: editingTeacher.full_name,
      school_id: editingTeacher.school_id,
      disciplines: editingTeacher.disciplines,
      role: editingTeacher.role
    } as any).eq('id', editingTeacher.id);
    if (!error) {
      showNotify("Professor atualizado!", "success");
      setTeachers(prev => prev.map(t => t.id === editingTeacher.id ? editingTeacher : t));
      setEditingTeacher(null);
    } else { showNotify(error.message, "error"); }
    setSyncing(false);
  };

  const handleAdminDeleteTeacher = (id: string) => {
    setConfirmDialog({
      isOpen: true, title: "Excluir Professor", message: "Remover este professor e todos os seus planos permanentemente?",
      onConfirm: async () => {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (!error) {
           await supabase.from('user_plans').delete().eq('user_id', id);
           setTeachers(prev => prev.filter(t => t.id !== id));
           showNotify("Registro removido.", "success");
        } else { showNotify(error.message, "error"); }
        setConfirmDialog(null);
      }
    });
  };

  const handleAdminUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;
    setSyncing(true);
    const { error } = await (supabase.from('schools') as any).update(editingSchool as any).eq('id', editingSchool.id);
    if (!error) {
      showNotify("Escola atualizada!", "success");
      setSchools(prev => prev.map(s => s.id === editingSchool.id ? editingSchool : s));
      setEditingSchool(null);
    } else { showNotify(error.message, "error"); }
    setSyncing(false);
  };

  const exportToPDF = () => {
    if (!settings) return;
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = 10;
    
    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
        return true;
      }
      return false;
    };

    // Cabeçalho com Logo
    if (settings.logoUrl) { try { doc.addImage(settings.logoUrl, 'PNG', (pageWidth/2)-12.5, currentY, 25, 25); currentY += 30; } catch(e){ currentY+=5; } }
    doc.setFontSize(12).text("PLANEJAMENTO ANUAL " + settings.year, pageWidth/2, currentY+6, { align: 'center' }); currentY+=16;
    
    // Tabela de Informações Gerais
    (doc as any).autoTable({ 
      startY: currentY, 
      body: [
        ['Professor(a)', settings.teacherName], 
        ['Disciplina', settings.discipline], 
        ['Turma', `${settings.organization} (${settings.shift})`],
        ['Coordenador(a)', settings.pedagogicalCoordinator || '---'],
        ['Diretor(a)', settings.director || '---']
      ], 
      theme: 'grid',
      styles: { fontSize: 9 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Tabela de Cronograma
    const data = planning.map(r => {
      if (r.id.startsWith('trimester-header-')) {
        return [{ content: r.chapter, colSpan: 3, styles: { fillColor: [226, 232, 240], halign: 'center', fontStyle: 'bold' } }];
      }
      const isMonthly = r.id.startsWith('monthly-');
      const date = r.dateScheduled ? (isMonthly ? r.dateScheduled : formatDisplayDate(r.dateScheduled)) : '---';
      return [date, `${r.chapter}\n${r.topic}`, r.essentialLearning];
    });

    (doc as any).autoTable({ 
      startY: currentY, 
      head: [['Data', 'Conteúdo', 'Habilidades']], 
      body: data, 
      theme: 'grid', 
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Metodologia
    doc.setFontSize(10).setFont(undefined, 'bold').text("METODOLOGIA", margin, currentY);
    currentY += 6;
    doc.setFontSize(8).setFont(undefined, 'normal');
    const methodLines = doc.splitTextToSize(settings.methodology, contentWidth);
    checkPageBreak(methodLines.length * 4 + 10);
    doc.text(methodLines, margin, currentY);
    currentY += methodLines.length * 4 + 12;

    // Avaliação
    checkPageBreak(20);
    doc.setFontSize(10).setFont(undefined, 'bold').text("AVALIAÇÃO", margin, currentY);
    currentY += 6;
    doc.setFontSize(8).setFont(undefined, 'normal');
    const evalLines = doc.splitTextToSize(settings.evaluation, contentWidth);
    checkPageBreak(evalLines.length * 4 + 10);
    doc.text(evalLines, margin, currentY);
    currentY += evalLines.length * 4 + 25;

    // RESTAURADO: BLOCO DE ASSINATURAS
    checkPageBreak(50);
    const lineLength = 65;
    const centerX = pageWidth / 2;
    
    // 1. Assinatura Professor (Centralizada Superior)
    doc.line(centerX - (lineLength/2), currentY, centerX + (lineLength/2), currentY);
    doc.setFontSize(8).setFont(undefined, 'bold');
    doc.text(settings.teacherName, centerX, currentY + 5, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.text("Professor(a) Responsável", centerX, currentY + 9, { align: 'center' });
    
    currentY += 30;

    // 2. Assinaturas Coordenação e Direção (Lado a Lado Inferior)
    const leftColX = pageWidth / 4 + 10;
    const rightColX = (pageWidth / 4) * 3 - 10;

    // Coordenação
    doc.line(leftColX - (lineLength/2), currentY, leftColX + (lineLength/2), currentY);
    doc.setFont(undefined, 'bold');
    doc.text(settings.pedagogicalCoordinator || "Coordenação Pedagógica", leftColX, currentY + 5, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.text("Assinatura do Coordenador", leftColX, currentY + 9, { align: 'center' });

    // Direção
    doc.line(rightColX - (lineLength/2), currentY, rightColX + (lineLength/2), currentY);
    doc.setFont(undefined, 'bold');
    doc.text(settings.director || "Direção Escolar", rightColX, currentY + 5, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.text("Assinatura do Diretor", rightColX, currentY + 9, { align: 'center' });
    
    doc.save(`Planejamento_${settings.organization}_${settings.discipline}.pdf`);
  };

  const handleToggleDiscipline = (disc: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedDisciplines.includes(disc);
      if (isSelected) return { ...prev, selectedDisciplines: prev.selectedDisciplines.filter(d => d !== disc) };
      return { ...prev, selectedDisciplines: [...prev.selectedDisciplines, disc] };
    });
  };

  const handleDeletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: "Excluir Plano",
      message: "Tem certeza que deseja excluir este planejamento permanentemente?",
      onConfirm: async () => {
        const { error } = await supabase.from('user_plans').delete().eq('id', id);
        if (!error) {
          setPlans(prev => prev.filter(p => p.id !== id));
          showNotify("Plano removido com sucesso.", "success");
        } else {
          showNotify(error.message, "error");
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleToggleClassDay = (day: number) => {
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return null;
      const exists = prev.classDays.includes(day);
      const newDays = exists 
        ? prev.classDays.filter(d => d !== day) 
        : [...prev.classDays, day].sort();
      return { ...prev, classDays: newDays };
    });
  };

  const handleDuplicateClick = (e: React.MouseEvent, plan: PlanDocument) => {
    e.stopPropagation();
    setPlanToDuplicate(plan);
    setDuplicateData({
        organization: '',
        shift: plan.settings?.shift || '',
        classDays: plan.settings?.classDays || []
    });
    if (plan.settings?.schoolId) {
        fetchClassesForModal(plan.settings.schoolId);
    }
    setIsDuplicateModalOpen(true);
  };

  const handleDuplicateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !planToDuplicate) return;
    if (!duplicateData.organization) {
        showNotify("Selecione a nova turma.", "error");
        return;
    }
    
    setSyncing(true);
    try {
        const newSettings = {
            ...planToDuplicate.settings,
            organization: duplicateData.organization,
            shift: duplicateData.shift,
            classDays: duplicateData.classDays
        };

        const { data, error } = await (supabase.from('user_plans') as any).insert({
            user_id: user.id,
            settings: newSettings,
            curriculum: planToDuplicate.curriculum
        }).select().single();

        if (error) throw error;

        setPlans(prev => [data as unknown as PlanDocument, ...prev]);
        showNotify("Planejamento duplicado com sucesso!", "success");
        setIsDuplicateModalOpen(false);
        setPlanToDuplicate(null);
    } catch (err: any) {
        showNotify(err.message, "error");
    } finally {
        setSyncing(false);
    }
  };

  const handleAddContent = () => {
    if (!newContentData.chapter || !newContentData.topic || !newContentData.essentialLearning) {
      showNotify("Preencha todos os campos do conteúdo.", "error");
      return;
    }
    setCurriculum(prev => [...prev, { ...newContentData }]);
    setNewContentData({ chapter: '', topic: '', essentialLearning: '' });
  };

  const handleMoveContent = (index: number, direction: 'up' | 'down') => {
    const newCurriculum = [...curriculum];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCurriculum.length) return;
    [newCurriculum[index], newCurriculum[targetIndex]] = [newCurriculum[targetIndex], newCurriculum[index]];
    setCurriculum(newCurriculum);
  };

  const handleStartEditingContent = (index: number, item: CurriculumItem) => {
    setEditingContentIndex(index);
    setEditingContentData({ ...item });
  };

  const handleSaveContentEdit = () => {
    if (editingContentIndex === null || !editingContentData) return;
    setCurriculum(prev => {
      const newArr = [...prev];
      newArr[editingContentIndex] = editingContentData;
      return newArr;
    });
    setEditingContentIndex(null);
    setEditingContentData(null);
  };

  const handleProcessImport = async () => {
    if (!importText.trim()) {
      showNotify("Cole o texto do seu planejamento para importar.", "error");
      return;
    }

    setIsImporting(true);
    try {
      const ai = getAIClient();
      
      const prompt = `
        Aja como um Coordenador Pedagógico Especialista.
        Analise o seguinte texto que representa um planejamento escolar ANUAL.
        
        OBJETIVO:
        Extrair os conteúdos e quebrá-los em pequenas unidades de ensino (aulas) para preencher UM ANO LETIVO INTEIRO (Fevereiro a Novembro).
        NÃO agrupe muitos temas em um único item. Tente desmembrar tópicos grandes em subtópicos.
        
        Estruture o resultado EXATAMENTE no seguinte formato JSON Array:
        [
          {
            "chapter": "Nome da Unidade ou Bimestre/Trimestre",
            "topic": "Objeto de conhecimento Específico (Seja granular)",
            "essentialLearning": "Habilidade ou Código BNCC"
          }
        ]

        Exemplo de Granularidade:
        Em vez de "Present Simple", crie 3 itens:
        1. "Present Simple: Forma Afirmativa"
        2. "Present Simple: Forma Negativa"
        3. "Present Simple: Forma Interrogativa e Short Answers"

        Texto para análise:
        ${importText}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
           responseMimeType: "application/json"
        }
      });
      
      let text = response.text;

      if (!text) throw new Error("Não foi possível gerar o conteúdo.");
      
      // Limpeza básica de Markdown caso venha (embora responseMimeType ajude)
      if (text.startsWith('```json')) {
        text = text.replace(/```json/g, '').replace(/```/g, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/```/g, '');
      }

      const parsedData = JSON.parse(text);

      if (Array.isArray(parsedData) && parsedData.length > 0) {
        setCurriculum(prev => [...prev, ...parsedData]);
        showNotify(`${parsedData.length} itens importados com sucesso!`, "success");
        setIsImportModalOpen(false);
        setImportText('');
      } else {
        throw new Error("O formato retornado pela IA não é válido.");
      }

    } catch (error: any) {
      console.error(error);
      showNotify("Erro ao processar importação. Verifique o texto e tente novamente.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-indigo-600"></i></div>;
  
  if (!user) {
    if (showSalesPage) {
      return (
        <SalesPage 
          onLoginClick={() => {
            setAuthMode('login');
            setShowSalesPage(false);
          }} 
          onSignupClick={() => {
            setAuthMode('signup');
            setShowSalesPage(false);
          }} 
        />
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 relative">
        {/* Back Button */}
        <button
          onClick={() => setShowSalesPage(true)}
          className="absolute top-6 left-6 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
        >
          <i className="fa-solid fa-arrow-left"></i> Voltar para Home
        </button>

        <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-hidden mt-12">
          <div className="bg-indigo-600 -m-10 mb-10 p-10 text-white text-center rounded-t-[2.5rem]">
            <h1 className="text-2xl font-black uppercase tracking-tight">Portal Docente</h1>
            <p className="text-xs text-indigo-100 font-bold mt-1 uppercase tracking-wider">Acesse sua Conta Acadêmica</p>
          </div>
          
          {authMode === 'success' ? (
            <div className="text-center py-8">
              <h2 className="text-xl font-black text-slate-900 uppercase mb-2">Sucesso!</h2>
              <button onClick={() => setAuthMode('login')} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-xs uppercase shadow-lg">Ir para Login</button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <input required type="email" placeholder="E-mail profissional" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-bold text-slate-900 outline-none" />
              <input required type="password" placeholder="Senha" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-bold text-slate-900 outline-none" />
              {authMode === 'signup' && (
                <>
                  <input required placeholder="Nome Completo" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-bold text-slate-900 outline-none" />
                  <select required value={formData.schoolId || ''} onChange={e => setFormData({...formData, schoolId: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-bold text-slate-900 outline-none">
                    <option value="">Selecione sua escola...</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {DISCIPLINES.map(disc => (
                      <button key={disc} type="button" onClick={() => handleToggleDiscipline(disc)} className={`text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase border ${formData.selectedDisciplines.includes(disc) ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>{disc}</button>
                    ))}
                  </div>
                </>
              )}
              <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-xs uppercase shadow-lg">{authMode === 'login' ? 'Entrar' : 'Cadastrar'}</button>
              <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full text-[10px] font-black text-slate-400 text-center uppercase mt-4">{authMode === 'login' ? 'Criar nova conta' : 'Já tenho conta'}</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 font-sans text-slate-800 bg-[#FBFBFE] min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 pb-8 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg text-white"><i className="fa-solid fa-graduation-cap text-xl"></i></div>
          <div className="text-center md:text-left"><h1 className="text-xl font-black text-slate-900 uppercase">Gestor Acadêmico</h1><p className="text-[10px] font-black uppercase text-slate-400">{currentUserName} • {isMaster ? 'ADMINISTRADOR' : 'PROFESSOR'}</p></div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {isMaster && (
            <button onClick={() => setView('admin')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all ${view === 'admin' ? 'bg-amber-100 text-amber-700 shadow-md' : 'bg-white border border-amber-200 text-amber-600 hover:bg-amber-50'}`}>
              <i className="fa-solid fa-crown"></i> Painel Admin
            </button>
          )}
          {view !== 'lobby' && <button onClick={() => setView('lobby')} className="bg-white border text-slate-900 px-6 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-slate-50"><i className="fa-solid fa-house"></i> Início</button>}
          <button onClick={() => supabase.auth.signOut()} className="bg-rose-50 text-rose-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-rose-100"><i className="fa-solid fa-power-off"></i> Sair</button>
        </div>
      </header>

      {view === 'admin' && isMaster ? (
        <main className="space-y-8 animate-in fade-in">
           <div className="flex gap-4 border-b">
              {(['usuarios', 'professores', 'escolas', 'planos', 'estrutura', 'horarios', 'ano_letivo', 'db_setup'] as const).map(tab => (
                 <button key={tab} onClick={() => setAdminTab(tab as any)} className={`pb-4 px-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${adminTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    {tab === 'db_setup' ? 'CONFIG BD' : tab === 'estrutura' ? 'ESTRUTURA' : tab === 'horarios' ? 'HORÁRIOS' : tab === 'ano_letivo' ? 'ANO LETIVO' : tab}
                 </button>
              ))}
           </div>

           {adminTab === 'usuarios' && (
              <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead><tr className="bg-slate-50"><th className="p-4 text-[10px] font-black uppercase text-slate-400">Nome / Email</th><th className="p-4 text-[10px] font-black uppercase text-slate-400">Escola</th><th className="p-4 text-[10px] font-black uppercase text-slate-400">Disciplinas</th><th className="p-4 text-[10px] font-black uppercase text-slate-400 text-right">Ações</th></tr></thead>
                       <tbody className="divide-y">
                          {teachers.map(t => (
                             <tr key={t.id} className="hover:bg-slate-50">
                                <td className="p-4"><p className="text-xs font-black text-slate-900">{t.full_name}</p><p className="text-[10px] text-slate-400">{t.email}</p>{t.role === 'admin' && <span className="inline-block mt-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">Administrador</span>}</td>
                                <td className="p-4 text-xs font-bold text-slate-600">{schools.find(s => s.id === t.school_id)?.name || '---'}</td>
                                <td className="p-4 text-[10px] text-slate-500 italic max-w-xs truncate">{t.disciplines || 'N/A'}</td>
                                <td className="p-4 text-right">
                                   <div className="flex gap-2 justify-end">
                                      <button onClick={() => setEditingTeacher(t)} className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center"><i className="fa-solid fa-pen"></i></button>
                                      <button onClick={() => handleAdminDeleteTeacher(t.id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center"><i className="fa-solid fa-trash"></i></button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {adminTab === 'professores' && (
             <>
                <div className="mb-6 flex items-center gap-3">
                   <label className="text-xs font-black uppercase text-slate-400">Selecionar Escola:</label>
                   <select 
                      value={adminSelectedSchoolId || ''} 
                      onChange={(e) => setAdminSelectedSchoolId(e.target.value)} 
                      className="p-2 rounded-lg border text-xs font-bold text-slate-800"
                   >
                      <option value="">Selecione...</option>
                      {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
                {adminSelectedSchoolId ? (
                   <TeachersManager 
                      schoolId={adminSelectedSchoolId} 
                      supabase={supabase} 
                      onShowNotify={showNotify} 
                   />
                ) : (
                   <div className="p-10 text-center text-slate-400 font-bold uppercase text-xs">Selecione uma escola acima para gerenciar os professores.</div>
                )}
             </>
           )}

           {adminTab === 'escolas' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {schools.map(s => (
                    <div key={s.id} className="bg-white border p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
                       <div>
                          <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">{s.logo_url && <img src={s.logo_url} className="w-full h-full object-contain p-1" />}</div><h4 className="font-black text-slate-900 text-sm">{s.name}</h4></div>
                          <p className="text-[10px] text-slate-400 uppercase font-black">Direção: <span className="text-slate-600">{s.director || 'N/A'}</span></p>
                          <p className="text-[10px] text-slate-400 uppercase font-black">Coordenação: <span className="text-slate-600">{s.pedagogical_coordinator || 'N/A'}</span></p>
                       </div>
                       <button onClick={() => setEditingSchool(s)} className="mt-6 w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase hover:bg-indigo-50 hover:text-indigo-600">Editar Dados</button>
                    </div>
                 ))}
              </div>
           )}



           {adminTab === 'planos' && (
              <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
                 <table className="w-full text-left">
                    <thead><tr className="bg-slate-50"><th className="p-4 text-[10px] font-black uppercase text-slate-400">Professor</th><th className="p-4 text-[10px] font-black uppercase text-slate-400">Plano</th><th className="p-4 text-[10px] font-black uppercase text-slate-400">Última Atualização</th><th className="p-4 text-[10px] font-black uppercase text-slate-400 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y">
                       {allPlans.length === 0 && (
                          <tr><td colSpan={4} className="p-10 text-center text-slate-400 font-bold uppercase text-xs">Nenhum plano na base de dados.</td></tr>
                       )}
                       {allPlans.map(p => {
                          const prof = teachers.find(t => t.id === p.user_id);
                          return (
                             <tr key={p.id} className="hover:bg-slate-50">
                                <td className="p-4 text-xs font-black text-slate-700">{prof?.full_name || 'Usuário Não Encontrado'}</td>
                                <td className="p-4"><p className="text-xs font-bold text-slate-900">{p.settings?.organization}</p><p className="text-[10px] text-slate-400">{p.settings?.discipline}</p></td>
                                <td className="p-4 text-xs text-slate-500">{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '---'}</td>
                                <td className="p-4 text-right"><button onClick={() => openEditor(p)} className="text-indigo-600 text-[10px] font-black uppercase hover:underline">Ver Detalhes</button></td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           )}

           {/* NOVA ABA DE ESTRUTURA */}
           {adminTab === 'estrutura' && (
             <>
                <div className="mb-6 flex items-center gap-3">
                   <label className="text-xs font-black uppercase text-slate-400">Configurar Escola:</label>
                   <select 
                      value={adminSelectedSchoolId || ''} 
                      onChange={(e) => setAdminSelectedSchoolId(e.target.value)} 
                      className="p-2 rounded-lg border text-xs font-bold text-slate-800"
                   >
                      <option value="">Selecione...</option>
                      {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
                {adminSelectedSchoolId ? (
                   <SchoolStructureSetup 
                      schoolId={adminSelectedSchoolId} 
                      supabase={supabase} 
                      onShowNotify={showNotify} 
                   />
                ) : (
                   <div className="p-10 text-center text-slate-400 font-bold uppercase text-xs">Selecione uma escola acima para configurar a estrutura.</div>
                )}
             </>
           )}

           {adminTab === 'ano_letivo' && (
              <AdminAnoLetivo 
                 supabase={supabase} 
                 schools={schools} 
                 onShowNotify={showNotify} 
              />
           )}

           {adminTab === 'db_setup' && (
             <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border space-y-12">
               <div>
                 <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center"><i className="fa-solid fa-database text-xl"></i></div>
                   <div><h3 className="text-xl font-black text-slate-900">Configuração Inicial do Banco</h3><p className="text-xs text-slate-400">Copie o código abaixo e execute no Editor SQL do Supabase.</p></div>
                 </div>
                 <div className="relative">
                   <pre className="bg-slate-900 text-slate-50 p-6 rounded-2xl text-xs overflow-x-auto font-mono leading-relaxed">{SETUP_SQL_SCRIPT}</pre>
                   <button onClick={() => { navigator.clipboard.writeText(SETUP_SQL_SCRIPT); showNotify('Código copiado!', 'success'); }} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all">Copiar</button>
                 </div>
               </div>

               <div>
                 <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><i className="fa-solid fa-shield-halved text-xl"></i></div>
                   <div><h3 className="text-xl font-black text-slate-900">Permissão de Visibilidade para o Administrador (RLS)</h3><p className="text-xs text-slate-400">Execute este código no SQL Editor para permitir que Diretores/Coordenadores visualizem todos os planos e professores, mesmo com o RLS ativado.</p></div>
                 </div>
                 <div className="relative">
                   <pre className="bg-slate-900 text-slate-50 p-6 rounded-2xl text-xs overflow-x-auto font-mono leading-relaxed">{RLS_POLICY_SCRIPT}</pre>
                   <button onClick={() => { navigator.clipboard.writeText(RLS_POLICY_SCRIPT); showNotify('Código copiado!', 'success'); }} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all">Copiar</button>
                 </div>
               </div>

               <div>
                 <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center"><i className="fa-solid fa-unlock-keyhole text-xl"></i></div>
                   <div><h3 className="text-xl font-black text-slate-900">Desbloquear Tabelas de Estrutura (Correção de Dados Invisíveis)</h3><p className="text-xs text-slate-400">Se as suas turmas, turnos ou professores sumiram, o Supabase pode ter ativado o bloqueio de segurança. Rode o código abaixo para restaurar o acesso!</p></div>
                 </div>
                 <div className="relative">
                   <pre className="bg-slate-900 text-slate-50 p-6 rounded-2xl text-xs overflow-x-auto font-mono leading-relaxed">{`-- Restaura o acesso total para TODAS as tabelas
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_matrix DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;`}</pre>
                   <button onClick={() => { navigator.clipboard.writeText(`ALTER TABLE schools DISABLE ROW LEVEL SECURITY; ALTER TABLE school_shifts DISABLE ROW LEVEL SECURITY; ALTER TABLE school_classes DISABLE ROW LEVEL SECURITY; ALTER TABLE class_matrix DISABLE ROW LEVEL SECURITY; ALTER TABLE school_teachers DISABLE ROW LEVEL SECURITY; ALTER TABLE class_schedules DISABLE ROW LEVEL SECURITY; ALTER TABLE teacher_assignments DISABLE ROW LEVEL SECURITY; ALTER TABLE user_plans DISABLE ROW LEVEL SECURITY; ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;`); showNotify('Código copiado!', 'success'); }} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all">Copiar</button>
                 </div>
               </div>
             </div>
           )}

           {adminTab === 'horarios' && (
             <>
               <div className="mb-6 flex items-center gap-3">
                  <label className="text-xs font-black uppercase text-slate-400">Selecionar Escola:</label>
                  <select 
                     value={adminSelectedSchoolId || ''} 
                     onChange={(e) => setAdminSelectedSchoolId(e.target.value)} 
                     className="p-2 rounded-lg border text-xs font-bold text-slate-800"
                  >
                     <option value="">Selecione...</option>
                     {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>
               {adminSelectedSchoolId ? (
                  <ScheduleSimulator 
                     schoolId={adminSelectedSchoolId} 
                     supabase={supabase} 
                     onShowNotify={showNotify} 
                  />
               ) : (
                  <div className="p-10 text-center text-slate-400 font-bold uppercase text-xs">Selecione uma escola acima para gerenciar os horários.</div>
               )}
             </>
           )}
        </main>
      ) : view === 'lobby' ? (
        <main className="space-y-8 animate-in fade-in">
          <div className="flex gap-4 border-b">
            <button onClick={() => setLobbyTab('planos')} className={`pb-4 px-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${lobbyTab === 'planos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Meus Planos</button>
            <button onClick={() => setLobbyTab('disponibilidade')} className={`pb-4 px-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${lobbyTab === 'disponibilidade' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Disponibilidade</button>
            <button onClick={() => setLobbyTab('horario')} className={`pb-4 px-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${lobbyTab === 'horario' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Meu Horário</button>
          </div>

          {lobbyTab === 'planos' && (
            <>
              <div className="flex justify-between items-center">
                 <div><h2 className="text-3xl font-black text-slate-900">Seus Planejamentos</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ano Letivo 2026</p></div>
                 <button onClick={() => setIsNewPlanModalOpen(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 flex items-center gap-3 transition-all"><i className="fa-solid fa-plus"></i> Novo Plano</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map(p => (
                  <div key={p.id} onClick={() => openEditor(p)} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between min-h-[220px] relative">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => handleDuplicateClick(e, p)} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all" title="Duplicar para outra turma"><i className="fa-solid fa-copy"></i></button>
                        <button onClick={(e) => handleDeletePlan(p.id, e)} className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all" title="Excluir"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                    <div><span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">{p.settings?.shift}</span><h4 className="text-2xl font-black text-slate-900 mt-4 leading-none">{p.settings?.organization}</h4><p className="text-xs font-bold text-slate-400 uppercase mt-2">{p.settings?.discipline}</p></div>
                  </div>
                ))}
                {plans.length === 0 && !fetchingPlans && (
                  <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold uppercase text-xs">Nenhum plano criado ainda.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {lobbyTab === 'disponibilidade' && user.user_metadata?.school_id && (
            <TeacherAvailability 
              userId={user.id} 
              schoolId={user.user_metadata.school_id} 
              supabase={supabase} 
              onShowNotify={showNotify} 
            />
          )}

          {lobbyTab === 'horario' && user.user_metadata?.school_id && (
            <TeacherScheduleView 
              userId={user.id} 
              schoolId={user.user_metadata.school_id} 
              supabase={supabase} 
            />
          )}
        </main>
      ) : (
        <main className="animate-in slide-in-from-right-8">
           <div className="bg-[#1E293B] rounded-[2rem] p-8 text-white mb-8 shadow-xl flex flex-col lg:flex-row justify-between items-center gap-6">
              <div><h2 className="text-2xl font-black">Cronograma Anual</h2><p className="text-xs text-slate-400 uppercase">{settings?.discipline} • {settings?.organization}</p></div>
              <div className="flex flex-wrap justify-center gap-3">
                 <button onClick={() => setIsContentModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all"><i className="fa-solid fa-list-check"></i> Conteúdos</button>
                 <button onClick={() => setIsImportModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all"><i className="fa-solid fa-file-import"></i> Importar</button>
                 <button onClick={exportToPDF} className="bg-white text-slate-900 hover:bg-slate-100 px-5 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all"><i className="fa-solid fa-file-pdf"></i> PDF</button>
                 <button onClick={() => { setEditPlanData({ discipline: settings?.discipline || '', organization: settings?.organization || '', shift: settings?.shift || '' }); setIsEditSettingsModalOpen(true); }} className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-5 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all"><i className="fa-solid fa-pen"></i> Info</button>
              </div>
           </div>

           <div className="flex flex-col lg:flex-row gap-8">
              <div className="w-full lg:w-80 shrink-0 space-y-6">
                 <button onClick={performSave} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    {syncing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                    {syncing ? 'Salvando...' : 'Salvar Plano'}
                 </button>
                 
                 <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-6 shadow-sm overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <div>
                      <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3 block">Modo de Planejamento</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSettings(prev => prev ? {...prev, planningMode: 'granular'} : null)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${settings?.planningMode !== 'monthly' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}
                        >
                          Granular
                        </button>
                        <button 
                          onClick={() => setSettings(prev => prev ? {...prev, planningMode: 'monthly'} : null)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${settings?.planningMode === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}
                        >
                          Mensal
                        </button>
                      </div>
                    </div>

                    {settings?.planningMode === 'monthly' && (
                      <button onClick={() => setIsMonthlyModalOpen(true)} className="w-full bg-emerald-50 text-emerald-600 border border-emerald-100 p-4 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-100 transition-all flex items-center justify-center gap-2">
                        <i className="fa-solid fa-calendar-days"></i> Configurar Conteúdo Mensal
                      </button>
                    )}
                    <div>
                      <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3 block">Modo de Planejamento</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSettings(prev => prev ? {...prev, planningMode: 'granular'} : null)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${settings?.planningMode !== 'monthly' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}
                        >
                          Granular
                        </button>
                        <button 
                          onClick={() => setSettings(prev => prev ? {...prev, planningMode: 'monthly'} : null)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${settings?.planningMode === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}
                        >
                          Mensal
                        </button>
                      </div>
                    </div>

                    {settings?.planningMode === 'monthly' && (
                      <button onClick={() => setIsMonthlyModalOpen(true)} className="w-full bg-emerald-50 text-emerald-600 border border-emerald-100 p-4 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-100 transition-all flex items-center justify-center gap-2">
                        <i className="fa-solid fa-calendar-days"></i> Configurar Conteúdo Mensal
                      </button>
                    )}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Coordenador(a)</label>
                      <input value={settings?.pedagogicalCoordinator || ''} onChange={e => setSettings(prev => prev ? {...prev, pedagogicalCoordinator: e.target.value} : null)} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold text-slate-900 outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Diretor(a)</label>
                      <input value={settings?.director || ''} onChange={e => setSettings(prev => prev ? {...prev, director: e.target.value} : null)} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold text-slate-900 outline-none" />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3 block">Dias de Aula</h3>
                      <div className="flex gap-1 justify-between">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                          <button key={i} onClick={() => handleToggleClassDay(i)} className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${settings?.classDays.includes(i) ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-300'}`}>{d}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Metodologia</label>
                      <textarea 
                        value={settings?.methodology || ''} 
                        onChange={e => setSettings(prev => prev ? {...prev, methodology: e.target.value} : null)} 
                        className="w-full bg-slate-50 border p-3 rounded-xl text-[10px] font-bold text-slate-900 outline-none min-h-[120px] leading-relaxed" 
                        placeholder="Descreva as estratégias de ensino..."
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Avaliação</label>
                      <textarea 
                        value={settings?.evaluation || ''} 
                        onChange={e => setSettings(prev => prev ? {...prev, evaluation: e.target.value} : null)} 
                        className="w-full bg-slate-50 border p-3 rounded-xl text-[10px] font-bold text-slate-900 outline-none min-h-[120px] leading-relaxed" 
                        placeholder="Descreva os critérios e instrumentos de avaliação..."
                      />
                    </div>
                 </div>
              </div>

              <div className="flex-1 overflow-x-auto bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                 <table className="w-full text-left">
                    <thead><tr className="bg-slate-50"><th className="p-4 text-[10px] font-black uppercase text-slate-500 w-32 tracking-wider">Data</th><th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Conteúdo</th><th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Habilidades</th></tr></thead>
                    <tbody className="divide-y">
                       {planning.map(row => {
                          if (row.id.startsWith('trimester-header-')) {
                             return (
                                <tr key={row.id} className="bg-indigo-600 text-white">
                                   <td colSpan={3} className="p-4 text-sm font-black uppercase tracking-widest text-center">{row.chapter}</td>
                                </tr>
                             );
                          }
                          const isMonthly = row.id.startsWith('monthly-');
                          const isFixed = row.id.startsWith('fixed-');
                          return (
                             <tr key={row.id} className={`hover:bg-slate-50 transition-colors group ${isMonthly ? 'bg-emerald-50/30' : ''}`}>
                                <td className={`p-4 text-xs font-bold whitespace-nowrap ${isFixed ? 'text-indigo-600' : 'text-slate-600'}`}>
                                   {row.dateScheduled ? (isMonthly ? row.dateScheduled : formatDisplayDate(row.dateScheduled)) : '---'}
                                </td>
                                <td className="p-4">
                                   <p className={`text-xs font-black ${isFixed ? 'text-indigo-900' : 'text-slate-800'}`}>{row.chapter}</p>
                                   <p className="text-[11px] text-slate-500 whitespace-pre-wrap">{row.topic}</p>
                                </td>
                                <td className="p-4 text-[11px] text-slate-600 leading-relaxed">{row.essentialLearning}</td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        </main>
      )}

      {/* MODAL DISPONIBILIDADE PROFESSOR */}
      {isAvailabilityModalOpen && user && currentUserSchoolId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <TeacherAvailability 
             userId={user.id} 
             schoolId={currentUserSchoolId} 
             supabase={supabase} 
             onShowNotify={showNotify}
             onClose={() => setIsAvailabilityModalOpen(false)}
           />
        </div>
      )}

      {/* MODAL EDITAR PROFESSOR (ADMIN) */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase">Editar Professor</h3>
              <form onSubmit={handleAdminUpdateTeacher} className="space-y-4">
                 <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nome Completo</label><input required value={editingTeacher.full_name} onChange={setEditingTeacher ? e => setEditingTeacher({...editingTeacher, full_name: e.target.value}) : undefined} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold" /></div>
                 <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Escola</label><select value={editingTeacher.school_id || ''} onChange={e => setEditingTeacher({...editingTeacher, school_id: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold"><option value="">Selecione...</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                 <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Permissão</label><select value={editingTeacher.role || 'teacher'} onChange={e => setEditingTeacher({...editingTeacher, role: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold"><option value="teacher">Professor</option><option value="admin">Administrador (Acesso ao Painel Admin)</option></select></div>
                 <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Disciplinas (Separadas por vírgula)</label><textarea value={editingTeacher.disciplines || ''} onChange={e => setEditingTeacher({...editingTeacher, disciplines: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold h-24" /></div>
                 <div className="flex gap-3 pt-4"><button type="button" onClick={() => setEditingTeacher(null)} className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-black text-xs uppercase">Cancelar</button><button type="submit" className="flex-1 bg-indigo-600 text-white p-4 rounded-xl font-black text-xs uppercase">Salvar Alterações</button></div>
              </form>
           </div>
        </div>
      )}

      {/* MODAL EDITAR ESCOLA (ADMIN) */}
      {editingSchool && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase">Dados da Escola</h3>
              <form onSubmit={handleAdminUpdateSchool} className="space-y-4">
                 <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nome da Escola</label><input required value={editingSchool.name} onChange={e => setEditingSchool({...editingSchool, name: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold" /></div>
                 <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Direção</label><input value={editingSchool.director || ''} onChange={e => setEditingSchool({...editingSchool, director: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold" /></div>
                 <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Coordenação</label><input value={editingSchool.pedagogical_coordinator || ''} onChange={e => setEditingSchool({...editingSchool, pedagogical_coordinator: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold" /></div>
                 <div className="flex gap-3 pt-4"><button type="button" onClick={() => setEditingSchool(null)} className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-black text-xs uppercase">Cancelar</button><button type="submit" className="flex-1 bg-indigo-600 text-white p-4 rounded-xl font-black text-xs uppercase">Salvar</button></div>
              </form>
           </div>
        </div>
      )}

      {/* MODAL IMPORTAÇÃO MENSAL */}
      {isMonthlyModalOpen && settings && (() => {
        const { periods, pppEventsArr, periodType } = getYearConfig();
        const pppDates = new Set(pppEventsArr.map(p => p.date));

        return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-4xl p-8 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase">Planejamento Mensal</h3>
                   <p className="text-xs text-slate-400 font-bold">Distribua o conteúdo por meses e {periodType}s.</p>
                </div>
                <button onClick={() => setIsMonthlyModalOpen(false)} className="w-8 h-8 rounded-full bg-white border text-slate-400 hover:text-slate-900 flex items-center justify-center"><i className="fa-solid fa-times"></i></button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                {periods.map(period => {
                  const labelName = periodType === 'trimestre' ? 'Trimestre' : 'Bimestre';
                  
                  // Identificar os meses do periodo
                  const startD = new Date(period.start + 'T00:00:00');
                  const endD = new Date(period.end + 'T23:59:59');
                  const monthsInPeriod: { id: string; name: string; fullKey: string }[] = [];
                  const curMonth = new Date(startD);
                  curMonth.setDate(1); // Mover pro inicio do mes pra iterar livremente
                  while (curMonth <= endD || (curMonth.getMonth() === endD.getMonth() && curMonth.getFullYear() === endD.getFullYear())) {
                     const ds = curMonth.toISOString().split('T')[0];
                     const mId = ds.substring(5, 7);
                     const y = ds.substring(0, 4);
                     monthsInPeriod.push({
                       id: mId,
                       name: MONTHS_BR.find(m => m.id === mId)?.name || mId,
                       fullKey: `${y}-${mId}`
                     });
                     curMonth.setMonth(curMonth.getMonth() + 1);
                  }

                  return (
                    <div key={period.number} className="space-y-4">
                      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest">{period.number}º {labelName}</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {monthsInPeriod.map(month => {
                          const monthKey = month.fullKey;
                          
                          // Calcular datas de aula para este mês
                          const classDates: string[] = [];
                          const mStart = new Date(`${monthKey}-01T00:00:00`);
                          const mEnd = new Date(new Date(mStart).setMonth(mStart.getMonth() + 1) - 1);
                          let cursor = new Date(mStart);
                          while (cursor <= mEnd) {
                            const ds = cursor.toISOString().split('T')[0];
                            // Somente considerar se a data está de fato dentro de 'startD' e 'endD' ou apenas filtrar por conteudo?
                            // O ideal eh filtrar o que for true. Mas os params sao globais, deixamos o check de ppp:
                            if (settings.classDays.includes(cursor.getDay()) && !isHoliday(cursor, settings.holidays) && !pppDates.has(ds)) {
                              classDates.push(ds.split('-')[2]);
                            }
                            cursor.setDate(cursor.getDate() + 1);
                          }

                          return (
                            <div key={month.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                              <div className="flex justify-between items-center">
                                <h5 className="text-xs font-black text-slate-900 uppercase">{month.name}</h5>
                                <span className="text-[9px] font-bold text-slate-400 uppercase break-normal">Datas válidas: {classDates.length}</span>
                              </div>
                              <textarea 
                                value={settings.monthlyContent?.[monthKey] || ''} 
                                onChange={e => {
                                  const val = e.target.value;
                                  setSettings(prev => {
                                    if (!prev) return null;
                                    const newMonthly = { ...(prev.monthlyContent || {}), [monthKey]: val };
                                    return { ...prev, monthlyContent: newMonthly };
                                  });
                                }}
                                className="w-full bg-white border p-4 rounded-2xl text-[11px] font-bold text-slate-700 outline-none min-h-[120px] resize-none leading-relaxed" 
                                placeholder={`Cole o conteúdo de ${month.name} aqui...`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                 <button onClick={() => setIsMonthlyModalOpen(false)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase hover:bg-slate-800 shadow-lg">Concluir</button>
              </div>
           </div>
        </div>
        );
      })()}

      {/* MODAL IMPORTAÇÃO DE PLANEJAMENTO (IA) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-3xl p-8 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase">Importar Planejamento</h3>
                   <p className="text-xs text-slate-400 font-bold">Cole o texto do seu PDF ou Word abaixo e a IA irá organizar para você.</p>
                </div>
                <button onClick={() => setIsImportModalOpen(false)} className="w-8 h-8 rounded-full bg-white border text-slate-400 hover:text-slate-900 flex items-center justify-center"><i className="fa-solid fa-times"></i></button>
              </div>
              
              <textarea 
                value={importText} 
                onChange={e => setImportText(e.target.value)} 
                className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-bold text-slate-700 outline-none min-h-[300px] mb-6 resize-none" 
                placeholder="Exemplo: 
                Unidade 1: Present Simple
                - Uso do auxiliar Do/Does
                - Formas afirmativa, negativa e interrogativa
                
                Unidade 2: Family Members..."
              />

              <div className="flex justify-end gap-3">
                 <button onClick={() => setIsImportModalOpen(false)} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-slate-200">Cancelar</button>
                 <button 
                    onClick={handleProcessImport} 
                    disabled={isImporting || !importText.trim()}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-indigo-700 shadow-lg disabled:opacity-50 flex items-center gap-2"
                 >
                    {isImporting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                    Processar com IA
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL GESTÃO CONTEÚDOS (DOCENTE) */}
      {isContentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-[2rem]"><h3 className="text-xl font-black text-slate-900">Gerenciar Conteúdos</h3><button onClick={() => setIsContentModalOpen(false)} className="w-8 h-8 rounded-full bg-white border text-slate-400 hover:text-slate-900 flex items-center justify-center"><i className="fa-solid fa-times"></i></button></div>
              
              <div className="p-4 bg-slate-50 border-b flex flex-col md:flex-row gap-2 items-end">
                <input placeholder="Capítulo" value={newContentData.chapter} onChange={e => setNewContentData({...newContentData, chapter: e.target.value})} className="flex-1 bg-white border p-2 rounded-xl text-xs font-bold" />
                <input placeholder="Tópico" value={newContentData.topic} onChange={e => setNewContentData({...newContentData, topic: e.target.value})} className="flex-1 bg-white border p-2 rounded-xl text-xs font-bold" />
                <input placeholder="Habilidade" value={newContentData.essentialLearning} onChange={e => setNewContentData({...newContentData, essentialLearning: e.target.value})} className="flex-[2] bg-white border p-2 rounded-xl text-xs font-bold" />
                <button onClick={handleAddContent} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase"><i className="fa-solid fa-plus"></i></button>
              </div>

              <div className="flex-1 overflow-y-auto">
                 <table className="w-full text-left">
                   <tbody className="divide-y divide-slate-100">
                    {curriculum.map((item, idx) => (
                       <tr key={idx} className={`hover:bg-slate-50 ${editingContentIndex === idx ? 'bg-indigo-50' : ''}`}>
                          {editingContentIndex === idx ? (
                             <>
                                <td className="p-2"><input value={editingContentData?.chapter || ''} onChange={e => setEditingContentData(prev => prev ? {...prev, chapter: e.target.value} : null)} className="w-full border p-2 rounded-lg text-xs" /></td>
                                <td className="p-2"><input value={editingContentData?.topic || ''} onChange={e => setEditingContentData(prev => prev ? {...prev, topic: e.target.value} : null)} className="w-full border p-2 rounded-lg text-xs" /></td>
                                <td className="p-2"><textarea value={editingContentData?.essentialLearning || ''} onChange={e => setEditingContentData(prev => prev ? {...prev, essentialLearning: e.target.value} : null)} className="w-full border p-2 rounded-lg text-xs h-12" /></td>
                                <td className="p-2 text-right">
                                   <div className="flex gap-1 justify-end">
                                      <button onClick={handleSaveContentEdit} className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center"><i className="fa-solid fa-check"></i></button>
                                      <button onClick={() => setEditingContentIndex(null)} className="w-7 h-7 bg-slate-300 text-white rounded-lg flex items-center justify-center"><i className="fa-solid fa-times"></i></button>
                                   </div>
                                </td>
                             </>
                          ) : (
                             <>
                                <td className="p-4 text-xs font-bold text-slate-700">{item.chapter}</td>
                                <td className="p-4 text-xs text-slate-600">{item.topic}</td>
                                <td className="p-4 text-[10px] text-slate-500">{item.essentialLearning}</td>
                                <td className="p-4 text-right">
                                   <div className="flex gap-2 justify-end">
                                      <button onClick={() => handleMoveContent(idx, 'up')} className="text-slate-300 hover:text-indigo-500"><i className="fa-solid fa-arrow-up"></i></button>
                                      <button onClick={() => handleMoveContent(idx, 'down')} className="text-slate-300 hover:text-indigo-500"><i className="fa-solid fa-arrow-down"></i></button>
                                      <button onClick={() => handleStartEditingContent(idx, item)} className="text-indigo-400 hover:text-indigo-600"><i className="fa-solid fa-pen"></i></button>
                                      <button onClick={() => setCurriculum(prev => prev.filter((_, i) => i !== idx))} className="text-rose-300 hover:text-rose-600"><i className="fa-solid fa-trash"></i></button>
                                   </div>
                                </td>
                             </>
                          )}
                       </tr>
                    ))}
                 </tbody></table>
              </div>
              <div className="p-6 border-t bg-slate-50 rounded-b-[2rem] flex justify-end"><button onClick={() => setIsContentModalOpen(false)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase">Concluir</button></div>
           </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fa-solid fa-triangle-exclamation text-2xl"></i></div>
              <h3 className="text-lg font-black text-slate-900 mb-2">{confirmDialog.title}</h3><p className="text-xs text-slate-500 font-bold mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3"><button onClick={() => setConfirmDialog(null)} className="flex-1 bg-slate-100 text-slate-600 p-3 rounded-xl font-black text-[10px] uppercase">Cancelar</button><button onClick={confirmDialog.onConfirm} className="flex-1 bg-rose-500 text-white p-3 rounded-xl font-black text-[10px] uppercase">Confirmar</button></div>
           </div>
        </div>
      )}

      {notification && (
        <div className="fixed top-10 right-10 z-[30000] animate-in slide-in-from-right-4 max-w-[90vw]">
           <div className={`p-6 rounded-[2rem] shadow-2xl border flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}><span className="text-[10px] font-black uppercase tracking-widest">{notification.message}</span></div>
        </div>
      )}

      {isEditSettingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[20000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase">Editar Informações Base</h3>
            <form onSubmit={async (e) => {
               e.preventDefault();
               const newSettings = Object.assign({}, settings, { discipline: editPlanData.discipline, organization: editPlanData.organization, shift: editPlanData.shift });
               setSettings(newSettings);
               
               if (activePlanId) {
                  setSyncing(true);
                  const { error } = await (supabase.from('user_plans') as any).update({ 
                     settings: newSettings as any 
                  }).eq('id', activePlanId);
                  
                  if (!error) {
                     showNotify("Informações atualizadas no banco!", "success");
                     setPlans(prev => prev.map(p => p.id === activePlanId ? { ...p, settings: newSettings } : p));
                  } else {
                     showNotify("Erro ao salvar informações.", "error");
                  }
                  setSyncing(false);
               }
               setIsEditSettingsModalOpen(false);
            }} className="space-y-4">
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Disciplina / Componente</label>
                  <input required value={editPlanData.discipline} onChange={e => setEditPlanData({...editPlanData, discipline: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold" />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Turma / Organização</label>
                  <input required value={editPlanData.organization} onChange={e => setEditPlanData({...editPlanData, organization: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold" />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Turno</label>
                  <select required value={editPlanData.shift} onChange={e => setEditPlanData({...editPlanData, shift: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold">
                     <option value="Matutino">Matutino</option>
                     <option value="Vespertino">Vespertino</option>
                     <option value="Noturno">Noturno</option>
                     <option value="Integral">Integral</option>
                  </select>
               </div>
               <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsEditSettingsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200">Cancelar</button>
                 <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-indigo-700">Aplicar</button>
               </div>
               <p className="text-[10px] text-slate-400 text-center font-bold">Lembre-se de clicar em "Salvar Plano" depois para gravar as alterações no banco de dados.</p>
            </form>
          </div>
        </div>
      )}

      {isNewPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase">Novo Planejamento</h3>
            <form onSubmit={handleCreateNewPlan} className="space-y-4">
              
              {/* SELEÇÃO DE ESCOLA (HABILITADO APENAS PARA ADMIN) */}
              <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Escola</label>
                 <select 
                    required 
                    value={newPlanData.schoolId || ''} 
                    onChange={e => setNewPlanData({...newPlanData, schoolId: e.target.value})} 
                    disabled={!isMaster}
                    className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold disabled:opacity-50 disabled:bg-slate-100"
                 >
                    <option value="">Selecione a Escola...</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Disciplina</label>
                <select required value={newPlanData.discipline || ''} onChange={e => setNewPlanData({...newPlanData, discipline: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold">
                    <option value="">Selecione...</option>
                    {availableDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Turma</label>
                <select required value={newPlanData.organization || ''} onChange={e => setNewPlanData({...newPlanData, organization: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold">
                    <option value="">Selecione...</option>
                    {dbClasses.length > 0 ? (
                    dbClasses.map(t => <option key={t} value={t}>{t}</option>)
                    ) : (
                    <option value="">Nenhuma turma encontrada</option>
                    )}
                </select>
                {dbClasses.length === 0 && newPlanData.schoolId && (
                    <p className="text-[9px] text-rose-500 font-bold mt-1">
                        Esta escola não possui turmas cadastradas. 
                        {isMaster ? " Vá em Painel Admin > Estrutura para criar." : " Contate a direção."}
                    </p>
                )}
              </div>

              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsNewPlanModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-black text-xs uppercase">Cancelar</button><button type="submit" className="flex-1 bg-indigo-600 text-white p-4 rounded-xl font-black text-xs uppercase">Criar</button></div>
            </form>
          </div>
        </div>
      )}

      {isDuplicateModalOpen && planToDuplicate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase">Duplicar Planejamento</h3>
            <p className="text-xs text-slate-500 font-bold mb-6">Copiando de: <span className="text-indigo-600">{planToDuplicate.settings?.organization}</span></p>
            
            <form onSubmit={handleDuplicateSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nova Turma</label>
                <select required value={duplicateData.organization || ''} onChange={e => setDuplicateData({...duplicateData, organization: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold">
                    <option value="">Selecione a turma de destino...</option>
                    {dbClasses.filter(c => c !== planToDuplicate.settings?.organization).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Turno</label>
                <select required value={duplicateData.shift || ''} onChange={e => setDuplicateData({...duplicateData, shift: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold">
                    <option value="">Selecione...</option>
                    {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Dias de Aula (Nova Turma)</label>
                <div className="flex gap-1 justify-between">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <button 
                        key={i} 
                        type="button"
                        onClick={() => {
                            const exists = duplicateData.classDays.includes(i);
                            const newDays = exists ? duplicateData.classDays.filter(day => day !== i) : [...duplicateData.classDays, i].sort();
                            setDuplicateData({...duplicateData, classDays: newDays});
                        }} 
                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${duplicateData.classDays.includes(i) ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-300'}`}
                    >
                        {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsDuplicateModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-black text-xs uppercase">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white p-4 rounded-xl font-black text-xs uppercase hover:bg-emerald-700 shadow-lg">Duplicar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }`}</style>
    </div>
  );
};

export default App;