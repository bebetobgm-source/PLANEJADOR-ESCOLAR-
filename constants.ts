
import { CurriculumItem } from './types';

export const TURMAS_OPTIONS = [
  "6º ANO A", "6º ANO B",
  "7º ANO A", "7º ANO B",
  "8º ANO A", "8º ANO B",
  "9º ANO A", "9º ANO B",
  "1ª SÉRIE EM A", "1ª SÉRIE EM B",
  "2ª SÉRIE EM A", "2ª SÉRIE EM B",
  "3ª SÉRIE EM A", "3ª SÉRIE EM B"
];

export const SHIFT_OPTIONS = ["MATUTINO", "VESPERTINO"];

export const WEEKDAYS = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"
];

export const DISCIPLINES = [
  // Base Nacional Comum & Diversificada Padrão
  "Língua Portuguesa",
  "Matemática",
  "Ciências",
  "História",
  "Geografia",
  "Arte",
  "Educação Física",
  "Língua Inglesa",
  "Língua Espanhola",
  "Ensino Religioso",
  "LIBRAS",
  
  // Ensino Médio Específico
  "Física",
  "Química",
  "Biologia",
  "Filosofia",
  "Sociologia",
  "Literatura",
  
  // Novas Disciplinas PR 2026 / Tecnologias
  "Educação Digital e Computação",
  "Pensamento Computacional",
  "Robótica",
  "Educação Financeira",
  "Empreendedorismo",
  "Redação e Leitura",
  
  // Itinerários Formativos (PIs)
  "PI Ciências da Natureza Tecnol",
  "PI Ciências Humanas e Sociais",
  "PI Linguagens Tecnol",
  "PI Matemática Tecnologi",
  "Projeto de Vida"
];

// Deixamos vazio para evitar erros de string corrompida.
// O usuário fará o upload via interface.
export const SCHOOL_LOGO_BASE64 = "";
