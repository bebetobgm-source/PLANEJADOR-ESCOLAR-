import React, { useState } from 'react';

interface SalesPageProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({ onLoginClick, onSignupClick }) => {
  const [activeTab, setActiveTab] = useState<'scheduler' | 'planner' | 'availability'>('scheduler');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Banner / Alert */}
      <div className="bg-gradient-to-r from-indigo-700 to-violet-800 text-white text-center py-2.5 px-4 text-xs font-semibold tracking-wide">
        🚀 <span className="underline">Novidade:</span> Planejamento automático integrado com a BNCC e Inteligência Artificial Gemini!
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <i className="fa-solid fa-graduation-cap text-white text-lg"></i>
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">Planejador<span className="text-indigo-600">Escolar</span></span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Inteligente</p>
            </div>
          </div>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-600">
            <a href="#solucoes" className="hover:text-indigo-600 transition-all">Soluções</a>
            <a href="#como-funciona" className="hover:text-indigo-600 transition-all">Como Funciona</a>
            <a href="#recursos" className="hover:text-indigo-600 transition-all">Recursos</a>
            <a href="#precos" className="hover:text-indigo-600 transition-all text-emerald-600 font-black">Preços</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              id="sales_nav_login_btn"
              onClick={onLoginClick}
              className="text-xs font-black uppercase text-indigo-600 hover:text-indigo-800 transition-all px-4 py-2"
            >
              Entrar
            </button>
            <button
              id="sales_nav_signup_btn"
              onClick={onSignupClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all"
            >
              Criar Conta Grátis
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 bg-white">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
          {/* Hero Content */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full text-indigo-600 text-xs font-extrabold uppercase tracking-wide leading-none">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              Feito para Diretores e Coordenadores
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              O fim do quebra-cabeça na criação de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">horários escolares</span> e planejamentos.
            </h1>
            
            <p className="text-base md:text-lg text-slate-500 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Economize semanas de trabalho estressante. Distribua as aulas dos professores sem nenhum conflito de horários e crie planejamentos pedagógicos alinhados com a BNCC em segundos usando Inteligência Artificial.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <button
                id="hero_signup_cta_btn"
                onClick={onSignupClick}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black uppercase tracking-wider px-8 py-4.5 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-3"
              >
                Começar Agora Grátis <i className="fa-solid fa-arrow-right"></i>
              </button>
              
              <a
                href="#precos"
                className="w-full sm:w-auto border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-black uppercase tracking-wider px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                Ver Planos de Assinatura
              </a>
            </div>

            {/* Social Proof Stats */}
            <div className="pt-8 border-t border-slate-100 grid grid-cols-3 gap-6 max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
              <div>
                <p className="text-2xl md:text-3xl font-black text-slate-900 leading-none">100%</p>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mt-1">Conformidade BNCC</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-black text-slate-900 leading-none">1 Click</p>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mt-1">Geração de Horários</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-black text-slate-900 leading-none">10x</p>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mt-1">Mais Rápido que Planilhas</p>
              </div>
            </div>
          </div>

          {/* Interactive Interface Preview */}
          <div className="lg:col-span-5 relative">
            <div className="absolute inset-0 bg-indigo-500 rounded-[2.5rem] rotate-3 scale-95 opacity-10 blur-xl"></div>
            <div className="relative bg-slate-900 rounded-[2.5rem] shadow-2xl border-4 border-slate-800 p-6 overflow-hidden">
              {/* Fake Window bar */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                </div>
                <div className="bg-slate-800 text-slate-400 text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Painel de Controle
                </div>
                <div className="w-6"></div>
              </div>

              {/* Interface Interactive Toggle */}
              <div className="flex bg-slate-800/80 p-1.5 rounded-xl mb-6">
                <button
                  onClick={() => setActiveTab('scheduler')}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'scheduler' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <i className="fa-solid fa-calendar-days mr-1.5"></i> Horários
                </button>
                <button
                  onClick={() => setActiveTab('planner')}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'planner' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <i className="fa-solid fa-wand-magic-sparkles mr-1.5"></i> Planejamento IA
                </button>
                <button
                  onClick={() => setActiveTab('availability')}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'availability' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <i className="fa-solid fa-user-clock mr-1.5"></i> Docentes
                </button>
              </div>

              {/* View Output Preview */}
              <div className="bg-slate-950 rounded-2xl p-4 min-h-[220px] font-mono text-xs text-slate-300">
                {activeTab === 'scheduler' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-2">
                      <span>Gerador Inteligente</span>
                      <span className="text-emerald-400 font-bold"><i className="fa-solid fa-circle-check mr-1"></i> Pronto</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-indigo-950/50 border border-indigo-900/50 p-2.5 rounded-lg text-center">
                        <p className="text-[9px] text-indigo-400 uppercase font-bold">Segunda</p>
                        <p className="font-bold text-white mt-1 text-[11px]">6º Ano A</p>
                        <p className="text-[10px] text-slate-400">Matemática</p>
                      </div>
                      <div className="bg-indigo-950/50 border border-indigo-900/50 p-2.5 rounded-lg text-center">
                        <p className="text-[9px] text-indigo-400 uppercase font-bold">Terça</p>
                        <p className="font-bold text-white mt-1 text-[11px]">7º Ano B</p>
                        <p className="text-[10px] text-slate-400">Ciências</p>
                      </div>
                      <div className="bg-indigo-950/50 border border-indigo-900/50 p-2.5 rounded-lg text-center">
                        <p className="text-[9px] text-indigo-400 uppercase font-bold">Quarta</p>
                        <p className="font-bold text-white mt-1 text-[11px]">8º Ano A</p>
                        <p className="text-[10px] text-slate-400">História</p>
                      </div>
                    </div>
                    <div className="bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 p-2.5 rounded-xl text-[10px] flex items-center gap-2.5">
                      <i className="fa-solid fa-bolt text-indigo-400 text-sm"></i>
                      <span><strong>Algoritmo Concluído:</strong> 120 slots preenchidos, 0 conflitos de professores.</span>
                    </div>
                  </div>
                )}

                {activeTab === 'planner' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-2">
                      <span>IA Gemini • Quebra Pedagógica</span>
                      <span className="text-violet-400 font-bold"><i className="fa-solid fa-sparkles mr-1"></i> Ativa</span>
                    </div>
                    <div className="space-y-2 text-[11px]">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <p className="text-slate-500 font-bold">BNCC EF06MA01</p>
                        <p className="text-white font-bold mt-0.5">Frações e suas Representações</p>
                        <p className="text-[10px] text-indigo-400 mt-1">✓ Desmembrado em 3 aulas didáticas</p>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <p className="text-slate-500 font-bold">BNCC EF06MA02</p>
                        <p className="text-white font-bold mt-0.5">Operações de Adição e Subtração</p>
                        <p className="text-[10px] text-indigo-400 mt-1">✓ Planejamento trimestral estruturado</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'availability' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-2">
                      <span>Restrições e Preferências</span>
                      <span className="text-emerald-400 font-bold"><i className="fa-solid fa-users mr-1"></i> Docentes</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg text-[11px] border border-slate-800">
                        <span className="text-white font-bold">Prof. Carlos Silva (Matemática)</span>
                        <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold">Apenas Matutino</span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg text-[11px] border border-slate-800">
                        <span className="text-white font-bold">Profa. Ana Costa (História)</span>
                        <span className="bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded text-[9px] font-bold">Terça a Sexta</span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg text-[11px] border border-slate-800">
                        <span className="text-white font-bold">Prof. Marcos Lima (Física)</span>
                        <span className="bg-rose-950 text-rose-400 px-2 py-0.5 rounded text-[9px] font-bold">Folga na Segunda</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Pain Points Section */}
      <section id="solucoes" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-600">O Problema Real</h2>
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Por que a criação de horários escolares ainda é tão cansativa?
            </h3>
            <p className="text-slate-500 text-sm md:text-base leading-relaxed">
              Planilhas travam, professores têm indisponibilidades complexas e o coordenador pedagógico perde noites de sono tentando encaixar tudo perfeitamente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Pain Card 1 */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-lg">
                <i className="fa-solid fa-puzzle-piece"></i>
              </div>
              <h4 className="text-lg font-black text-slate-900">Quebra-cabeças dos professores</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Professores dão aula em múltiplas escolas, exigindo janelas específicas de folga. Resolver isso manualmente gera dezenas de conflitos e retrabalho.
              </p>
            </div>

            {/* Pain Card 2 */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg">
                <i className="fa-solid fa-clock"></i>
              </div>
              <h4 className="text-lg font-black text-slate-900">Horas perdidas em planilhas</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                As planilhas do Excel não avisam se você colocou o mesmo professor no mesmo horário em salas diferentes. O estresse é constante até a primeira semana de aula começar.
              </p>
            </div>

            {/* Pain Card 3 */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-lg">
                <i className="fa-solid fa-dollar-sign"></i>
              </div>
              <h4 className="text-lg font-black text-slate-900">Sistemas caros e inacessíveis</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Os poucos softwares que resolvem isso cobram fortunas por número de turmas ou alunos, inviabilizando o uso para escolas de pequeno e médio porte.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="como-funciona" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-600">Como Funciona</h2>
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Apenas 3 passos simples para ter a escola organizada
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Deixamos para trás as fórmulas complexas. Um sistema visual pensado de forma intuitiva para o seu dia a dia escolar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="space-y-4 relative text-center md:text-left">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-100 mx-auto md:mx-0">
                1
              </div>
              <h4 className="text-xl font-black text-slate-900">Os Professores Inserem as Preferências</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cada professor tem seu login próprio. Eles marcam em um calendário interativo os turnos e dias da semana em que estão disponíveis.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4 relative text-center md:text-left">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-100 mx-auto md:mx-0">
                2
              </div>
              <h4 className="text-xl font-black text-slate-900">Simule a Grade Completa</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                O coordenador clica em "Simular Horários". Nosso algoritmo resolve os cruzamentos em segundos e gera uma grade 100% livre de sobreposições.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4 relative text-center md:text-left">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-100 mx-auto md:mx-0">
                3
              </div>
              <h4 className="text-xl font-black text-slate-900">Crie o Planejamento de Aulas</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Insira o tema geral da disciplina e nossa inteligência artificial distribui os conteúdos pelas semanas letivas, respeitando feriados nacionais e calendário escolar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid (Bento Grid Style) */}
      <section id="recursos" className="py-20 bg-slate-50 border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-600">Recursos Integrados</h2>
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Tudo o que sua escola precisa, por uma fração do preço
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Esqueça integrações complexas. Nosso sistema unifica os horários semanais com o plano de aula individual de cada docente.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-8">
            {/* Main Feature Card - 8 columns */}
            <div className="md:col-span-8 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase px-3 py-1 rounded-full">Exclusivo</span>
                <h4 className="text-2xl font-black text-slate-900">Inteligência Artificial Gemini Integrada</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Não perca horas quebrando a cabeça sobre como dividir o plano de ensino anual do colégio em aulas granulares que batam com o cronograma. Nossa Inteligência Artificial faz a quebra inteligente, gerando objetivos, conteúdos e habilidades BNCC de forma totalmente automatizada.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs font-bold text-slate-600">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500"></i> Alinhamento com a BNCC
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500"></i> Geração de PDF pronto para imprimir
                </div>
              </div>
            </div>

            {/* Side Feature Card - 4 columns */}
            <div className="md:col-span-4 bg-slate-900 text-white p-8 md:p-10 rounded-[2.5rem] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase px-3 py-1 rounded-full">Praticidade</span>
                <h4 className="text-xl font-black tracking-tight leading-tight">Painel Docente de Fácil Acesso</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Chega de ficar cobrando professores via e-mail ou WhatsApp. Eles fazem login, informam seus horários disponíveis e visualizam sua grade de aulas consolidada em tempo real.
                </p>
              </div>
              <div className="bg-indigo-600 text-center py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-indigo-500 cursor-pointer transition-all" onClick={onLoginClick}>
                Ir para o Portal <i className="fa-solid fa-arrow-right ml-1"></i>
              </div>
            </div>

            {/* Row of 3 card grids */}
            <div className="md:col-span-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                <i className="fa-solid fa-file-pdf"></i>
              </div>
              <h5 className="text-base font-black text-slate-900">Exportação em PDF</h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gere e baixe relatórios pedagógicos completos de planejamentos e de horários consolidados em arquivos PDF formatados para impressão física e arquivo.
              </p>
            </div>

            <div className="md:col-span-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                <i className="fa-solid fa-calendar-check"></i>
              </div>
              <h5 className="text-base font-black text-slate-900">Calendário Flexível</h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                Configure feriados nacionais, eventos da escola, recesso e datas pedagógicas (como o PPP) para que o cronograma de aulas mude automaticamente.
              </p>
            </div>

            <div className="md:col-span-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <h5 className="text-base font-black text-slate-900">Backup e Nuvem Segura</h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hospedado no banco de dados do Supabase. Todos os seus dados pedagógicos estão criptografados e salvos em nuvem automática. Sem risco de perda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Fair Pricing targeting affordability */}
      <section id="precos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600">Investimento Justo</h2>
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Preço acessível de verdade para escolas de todos os portes
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Sem limite de turmas ou de professores. Transparência total para ajudar na gestão e planejamento pedagógico.
            </p>
          </div>

          <div className="max-w-lg mx-auto bg-slate-900 rounded-[2.5rem] text-white p-8 md:p-12 relative shadow-2xl border-4 border-indigo-500/20">
            {/* Pop of highlight */}
            <div className="absolute top-0 right-10 transform -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
              Melhor Opção
            </div>

            <div className="text-center space-y-3 pb-8 border-b border-slate-800">
              <h4 className="text-xl font-black uppercase tracking-widest text-indigo-400">Plano Escola Completa</h4>
              <p className="text-xs text-slate-400">Tudo incluso para simplificar a coordenação da sua escola.</p>
              
              <div className="pt-4 flex items-center justify-center gap-2">
                <span className="text-sm font-bold text-slate-400">R$</span>
                <span className="text-5xl font-black text-white tracking-tight">89,90</span>
                <span className="text-sm font-semibold text-slate-400">/ mês</span>
              </div>
              <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider"><i className="fa-solid fa-sparkles mr-1"></i> Inteligência Artificial Gemini inclusa!</p>
            </div>

            <ul className="py-8 space-y-4 text-xs font-medium text-slate-300">
              <li className="flex items-center gap-3">
                <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
                Professores ILIMITADOS
              </li>
              <li className="flex items-center gap-3">
                <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
                Turmas, Períodos e Shifts ILIMITADOS
              </li>
              <li className="flex items-center gap-3">
                <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
                Gerador de Horários de 1 clique
              </li>
              <li className="flex items-center gap-3">
                <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
                Assistente de Planejamento de IA (BNCC)
              </li>
              <li className="flex items-center gap-3">
                <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
                Portal com logins individuais para os Docentes
              </li>
              <li className="flex items-center gap-3">
                <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
                Suporte prioritário via e-mail e WhatsApp
              </li>
            </ul>

            <button
              id="pricing_signup_btn"
              onClick={onSignupClick}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              Criar Conta & Testar Grátis <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-4">Cancele quando quiser, sem taxas de adesão ou multa contratual.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-600">Dúvidas Frequentes</h2>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Perguntas Comuns</h3>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-900 mb-2">Como funciona o período de teste grátis?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Você pode criar sua conta de coordenador ou escola grátis. Você terá acesso aos simuladores e painel de controle para testar como o sistema funciona antes de decidir realizar o pagamento de assinatura mensal.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-900 mb-2">Quantos professores eu posso cadastrar no portal?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Não há limites de professores ou de turmas! Cobramos uma assinatura de valor único mensal por colégio, permitindo que toda a equipe de docentes tenha logins individuais sem custos adicionais.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-900 mb-2">O planejamento de aulas está mesmo de acordo com as regras da BNCC?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sim. Nosso assistente de Inteligência Artificial Gemini (do Google) analisa os tópicos gerais e cruza com a Base Nacional Comum Curricular (BNCC), inserindo as habilidades (códigos oficiais) e desmembrando em aulas de forma estruturada.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-900 mb-2">Posso usar o sistema para escolas públicas ou filantrópicas?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Com certeza! Focamos em oferecer uma alternativa de baixo custo justamente para que escolas municipais, estaduais e projetos sociais tenham acesso ao que há de mais inovador na gestão pedagógica sem comprometer o orçamento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action - Final push */}
      <section className="py-20 bg-indigo-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-800 to-violet-900 opacity-90"></div>
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-indigo-600/30 blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center space-y-8">
          <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Pronto para revolucionar a rotina do seu colégio?
          </h3>
          <p className="text-base text-indigo-200 max-w-xl mx-auto leading-relaxed">
            Junte-se a dezenas de coordenadores que trocaram as planilhas estressantes por um sistema moderno, automatizado e com inteligência artificial.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="final_cta_signup_btn"
              onClick={onSignupClick}
              className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-slate-50 text-sm font-black uppercase tracking-wider px-8 py-4.5 rounded-2xl shadow-xl transition-all"
            >
              Começar Teste Grátis
            </button>
            <button
              id="final_cta_support_btn"
              onClick={() => window.open('https://wa.me/5541999999999?text=Gostaria%20de%20saber%20mais%20sobre%20o%20Planejador%20Escolar', '_blank')}
              className="w-full sm:w-auto bg-indigo-800 text-white hover:bg-indigo-750 text-sm font-black uppercase tracking-wider px-8 py-4 rounded-2xl transition-all border border-indigo-700/50 flex items-center justify-center gap-2"
            >
              <i className="fa-brands fa-whatsapp text-lg text-emerald-400 animate-pulse"></i> Falar com Especialista
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <i className="fa-solid fa-graduation-cap text-white text-sm"></i>
            </div>
            <span className="text-sm font-black text-white uppercase tracking-wider">Planejador Escolar Inteligente</span>
          </div>
          <p className="text-xs">&copy; 2026 Planejador Escolar Inteligente. Todos os direitos reservados. Gestão escolar acessível de verdade.</p>
        </div>
      </footer>
    </div>
  );
};
