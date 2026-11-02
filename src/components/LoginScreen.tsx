import React, { useState } from 'react';
import { User } from '../types/index.ts';
import { Mail, Lock, Eye, EyeOff, ArrowRight, HelpCircle, CheckCircle2, X, Sun, Moon } from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  onLoginSuccess,
  theme = 'light',
  onToggleTheme,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modais auxiliares
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [showAdminHelpModal, setShowAdminHelpModal] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanIdent = email.trim().toLowerCase();
    if (!cleanIdent) {
      setErrorMessage('Por favor, informe seu e-mail ou nome de usuário.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Por favor, digite sua senha.');
      return;
    }

    const isMasterTarget =
      cleanIdent === 'alanvitordasilva@gmail.com.br' ||
      cleanIdent === 'alanvitordasilva@gmail.com' ||
      cleanIdent === 'alan';

    if (isMasterTarget && password !== '273021') {
      setErrorMessage('Senha incorreta para a conta master. Verifique e tente novamente.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Localiza usuário cadastrado por email ou nome
      const existingUser = users.find((u) => {
        const uEmail = u.email.toLowerCase();
        const uName = u.name.toLowerCase();
        return (
          uEmail === cleanIdent ||
          uName === cleanIdent ||
          uEmail.split('@')[0] === cleanIdent ||
          (cleanIdent.includes('@') && uEmail === cleanIdent)
        );
      });

      if (isMasterTarget) {
        setIsLoading(false);
        const targetUser: User = existingUser
          ? {
              ...existingUser,
              systemRole: 'master',
              isSuperAdmin: true,
              title: 'Super Administrador / Master',
            }
          : {
              id: 'user-master-alan',
              name: 'Alan Silva (Master)',
              email: 'alanvitordasilva@gmail.com.br',
              avatarColor: '#173653',
              title: 'Super Administrador / Master',
              systemRole: 'master',
              isSuperAdmin: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              bio: 'Conta Master com acesso total a todas as configurações e workspaces do OperaTask.',
            };
        onLoginSuccess(targetUser);
        return;
      }

      // Se o usuário não foi cadastrado pelo Dono/Admin
      if (!existingUser) {
        setIsLoading(false);
        setErrorMessage(
          'Usuário não cadastrado. O cadastro de novos usuários é realizado exclusivamente pelo Dono ou Administrador do OperaTask.'
        );
        return;
      }

      // Validação de senha cadastrada
      if (existingUser.password && existingUser.password !== password) {
        setIsLoading(false);
        setErrorMessage('Senha incorreta. Verifique suas credenciais e tente novamente.');
        return;
      }

      setIsLoading(false);
      onLoginSuccess(existingUser);
    }, 400);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-[#34B1AC]/20 selection:text-[#173653] transition-colors duration-200">
      {/* 1. Cabeçalho Superior */}
      <header className="bg-[#173653] dark:bg-slate-900 text-white px-4 sm:px-8 py-3.5 shadow-md border-b border-[#11273c] dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white shadow-xs p-1 flex items-center justify-center shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="OperaTask Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white inline-block">
                Opera<span className="text-[#34B1AC]">Task</span>
              </span>
              <span className="text-xs font-normal text-slate-300 opacity-90 hidden sm:inline">
                – Login
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-300">
              <span>Plataforma de Gestão de Tarefas & Quadros</span>
              <div className="w-2 h-2 rounded-full bg-[#34B1AC] animate-pulse" />
            </div>

            {/* Alternador de Tema na Tela de Login */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-1.5 px-2.5 rounded-xl border border-white/20 hover:border-white/40 bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-[11px]">Tema Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-200" />
                    <span className="text-[11px]">Tema Escuro</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Conteúdo Central com Card Branco / Dark Limpo */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Card Principal */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-900/5 dark:shadow-black/50 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-9 transition-all">
            {/* Ícone e Título Principal */}
            <div className="text-center mb-7">
              <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2 shadow-xs flex items-center justify-center">
                <img
                  src="/pwa-192x192.png"
                  alt="OperaTask Icon"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-2xl font-extrabold text-[#173653] dark:text-white tracking-tight">
                Bem-vindo(a)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Acesse sua conta no <strong>OperaTask</strong>
              </p>
            </div>

            {/* Mensagem de Erro */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Formulário de Login */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Campo E-mail ou Usuário */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail ou Nome de Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Digite seu e-mail ou nome de usuário..."
                    required
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:border-[#34B1AC] dark:focus:border-[#34B1AC] focus:ring-3 focus:ring-[#34B1AC]/15 outline-hidden text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-slate-50/50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Digite sua senha..."
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-2.5 sm:py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:border-[#34B1AC] dark:focus:border-[#34B1AC] focus:ring-3 focus:ring-[#34B1AC]/15 outline-hidden text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-slate-50/50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Opção Lembrar de mim */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#34B1AC] border-slate-300 dark:border-slate-600 focus:ring-[#34B1AC] focus:ring-offset-0 transition-colors"
                  />
                  <span>Lembrar de mim</span>
                </label>
              </div>

              {/* Botão Principal: Login */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-[#34B1AC] hover:bg-[#289e99] active:scale-[0.99] shadow-lg shadow-[#34B1AC]/25 hover:shadow-[#34B1AC]/35 transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Entrando...</span>
                    </div>
                  ) : (
                    <>
                      <span>Login</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* 3. Links e Textos Auxiliares */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3 text-center">
              {/* Esqueceu a senha */}
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotSent(false);
                  setShowForgotPasswordModal(true);
                }}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors hover:underline cursor-pointer"
              >
                Esqueceu a senha?
              </button>

              {/* Não tem conta? Fale com o administrador */}
              <button
                type="button"
                onClick={() => setShowAdminHelpModal(true)}
                className="text-xs font-semibold text-[#34B1AC] hover:text-[#289e99] transition-colors hover:underline cursor-pointer"
              >
                Não tem conta? Fale com o administrador do seu estabelecimento
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé Discreto */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>OperaTask © {new Date().getFullYear()} – Gestão Inteligente de Projetos e Tarefas</p>
      </footer>

      {/* Modal: Esqueceu a Senha */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-[#173653] dark:text-white">Recuperar Senha</h3>
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotSent ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 dark:bg-teal-950/40 text-[#34B1AC] flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-sm text-[#173653] dark:text-white">E-mail Enviado!</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  As instruções de redefinição foram enviadas para <strong>{forgotEmail}</strong>. Verifique sua caixa de entrada e spam.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#34B1AC] hover:bg-[#289e99] text-white font-bold text-xs cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Informe o seu e-mail cadastrado. Enviaremos um link de recuperação para definir uma nova senha.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seuemail@empresa.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-[#34B1AC] focus:ring-2 focus:ring-[#34B1AC]/20 outline-hidden"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#34B1AC] hover:bg-[#289e99] text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    Enviar Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Administrador do Estabelecimento */}
      {showAdminHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#173653] dark:text-white">
                <HelpCircle className="w-5 h-5 text-[#34B1AC]" />
                <h3 className="font-bold text-base">Criação de Novas Contas</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminHelpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                O <strong>OperaTask</strong> é um sistema corporativo seguro onde o acesso é gerenciado diretamente pela administração da sua equipe ou estabelecimento.
              </p>
              <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-750 space-y-1.5">
                <div className="font-semibold text-slate-800 dark:text-slate-200">Como obter seu acesso:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Solicite o cadastro ao <strong>Dono</strong> ou <strong>Administrador</strong> do seu workspace.</li>
                  <li>O administrador adicionará seu e-mail e definirá seu papel (Admin, Membro ou Visualizador).</li>
                  <li>Você receberá a confirmação e poderá acessar imediatamente com seu e-mail corporativo.</li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdminHelpModal(false)}
              className="w-full mt-5 py-2.5 px-4 rounded-xl bg-[#34B1AC] hover:bg-[#289e99] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Compreendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


