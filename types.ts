

export interface SchoolYearSettings {
  id: string;
  school_id: string;
  year: number;
  period_type: 'trimestre' | 'bimestre';
  periods: { number: number; start: string; end: string }[];
  ppp_events: { date: string; chapter: string; topic: string; learning: string }[];
  created_at?: string;
}

export interface School {
  id: string;
  name: string;
  logo_url: string;
  pedagogical_coordinator?: string;
  director?: string;
  created_at?: string;
}

export interface CurriculumItem {
  chapter: string;
  topic: string;
  essentialLearning: string;
  amplification?: string;
  trimester?: 1 | 2 | 3;
}

export interface PlanningRow extends CurriculumItem {
  id: string;
  dateScheduled?: string;
  status: 'Pendente' | 'Concluído' | 'Atrasado' | 'Sem programação';
}

export type HolidayCategory = 'feriado' | 'recesso' | 'planejamento' | 'conselho' | 'inicio_fim';

export interface Holiday {
  date: string;
  description: string;
  category: HolidayCategory;
}

export interface SchoolSettings {
  schoolId?: string; 
  schoolName: string;
  cnpj: string;
  address: string;
  phone: string; 
  teacherPhone?: string; 
  logoUrl?: string;
  personalApiKey?: string; 
  year: number;
  startDate: string;
  endDate: string;
  classDays: number[];
  holidays: Holiday[];
  
  // Identificação
  teacherName: string;
  course: string;
  discipline: string;
  organization: string; 
  shift: string; 

  // Administrativo (Puxado da Escola ou editado no plano)
  pedagogicalCoordinator?: string;
  director?: string;

  // Seções Adicionais
  methodology: string;
  evaluation: string;

  // Novo: Modo de Planejamento
  planningMode?: 'granular' | 'monthly';
  monthlyContent?: Record<string, string>;
}

// --- NOVAS TIPAGENS PARA O GERADOR DE HORÁRIOS ---

export interface SchoolShift {
  id: string;
  school_id: string;
  name: string; // 'Matutino', 'Vespertino'
  start_time: string; // '07:00'
  lesson_duration_min: number; // 50
  lessons_per_day: number; // 5
  // Novos campos para intervalo
  break_after_lesson?: number; // ex: 4 (após a 4ª aula)
  break_duration_min?: number; // ex: 20 (minutos)
  created_at?: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  name: string; // "6º ANO C"
  shift_id: string; // FK para SchoolShift
  created_at?: string;
}

export interface ClassMatrixItem {
  id: string;
  school_id: string;
  class_name: string; // '6º ANO A'
  subject: string; // 'Matemática'
  lessons_per_week: number; // 5
  created_at?: string;
}

export interface TeacherAvailability {
  id: string;
  user_id: string;
  school_id: string;
  // Objeto JSON onde a chave é o dia da semana (1-5) e o valor é array de booleanos
  // Ex: { "1": [true, true, false, true, true] }
  availability_data: Record<string, boolean[]>; 
  created_at?: string;
}

export interface ScheduleEntry {
  id: string;
  school_id: string;
  class_name: string;
  day_of_week: number; // 1 = Segunda
  period_index: number; // 0 = 1ª Aula
  subject: string;
  teacher_id?: string;
  created_at?: string;
}

export interface TeacherAssignment {
  id: string;
  school_id: string;
  class_name: string;
  subject: string;
  teacher_id: string;
  created_at?: string;
}

export interface SchoolTeacher {
  id: string;
  school_id: string;
  name: string;
  email?: string;
  disciplines: string[];
  availability: Record<string, boolean[]>; // { "1": [true, false...], "2": ... }
  auth_id?: string;
  created_at?: string;
}

export interface TeacherAssignment {
  id: string;
  school_id: string;
  class_name: string;
  subject: string;
  teacher_id: string;
  created_at?: string;
}

export interface PlanDocument {
  id: string;
  user_id: string;
  settings: SchoolSettings;
  curriculum: CurriculumItem[];
  updated_at?: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      school_year_settings: {
        Row: SchoolYearSettings
        Insert: Omit<SchoolYearSettings, 'id' | 'created_at'>
        Update: Partial<SchoolYearSettings>
      }
      schools: {
        Row: School
        Insert: Partial<School>
        Update: Partial<School>
      }
      school_shifts: {
        Row: SchoolShift
        Insert: Omit<SchoolShift, 'id' | 'created_at'>
        Update: Partial<SchoolShift>
      }
      school_classes: {
        Row: SchoolClass
        Insert: Omit<SchoolClass, 'id' | 'created_at'>
        Update: Partial<SchoolClass>
      }
      class_matrix: {
        Row: ClassMatrixItem
        Insert: Omit<ClassMatrixItem, 'id' | 'created_at'>
        Update: Partial<ClassMatrixItem>
      }
      teacher_availability: {
        Row: TeacherAvailability
        Insert: Omit<TeacherAvailability, 'id' | 'created_at'>
        Update: Partial<TeacherAvailability>
      }
      class_schedules: {
        Row: ScheduleEntry
        Insert: Omit<ScheduleEntry, 'id' | 'created_at'>
        Update: Partial<ScheduleEntry>
      }
      teacher_assignments: {
        Row: TeacherAssignment
        Insert: Omit<TeacherAssignment, 'id' | 'created_at'>
        Update: Partial<TeacherAssignment>
      }
      school_teachers: {
        Row: SchoolTeacher
        Insert: Omit<SchoolTeacher, 'id' | 'created_at'>
        Update: Partial<SchoolTeacher>
      }
      user_plans: {
        Row: {
            id: string;
            user_id: string;
            settings: Json;
            curriculum: Json;
            updated_at?: string;
            created_at?: string;
        }
        Insert: {
            id?: string;
            user_id: string;
            settings: Json;
            curriculum: Json;
            updated_at?: string;
            created_at?: string;
        }
        Update: {
            id?: string;
            user_id?: string;
            settings?: Json;
            curriculum?: Json;
            updated_at?: string;
            created_at?: string;
        }
      }
      profiles: {
        Row: {
            id: string;
            full_name: string;
            email?: string;
            school_id?: string;
            disciplines?: string;
            role?: string;
        }
        Insert: {
            id: string;
            full_name: string;
            email?: string;
            school_id?: string;
            disciplines?: string;
            role?: string;
        }
        Update: {
            id?: string;
            full_name?: string;
            email?: string;
            school_id?: string;
            disciplines?: string;
            role?: string;
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
