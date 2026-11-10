import React, { useState, useMemo } from 'react';
import {
  ClientCompany,
  ClientStatus,
  ClientPlan,
  PaymentStatus,
  PLAN_CONFIGS,
  Workspace,
  User,
  Project,
  Task,
  WorkspaceRole,
} from '../types/index.ts';
import {
  Building2,
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Eye,
  Headphones,
  Pause,
  Play,
  Settings,
  Copy,
  Check,
  ExternalLink,
  Activity,
  Layers,
  Calendar,
  Phone,
  Mail,
  X,
  ChevronRight,
  Clock,
  Sparkles,
  ChefHat,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Building,
  HelpCircle,
  CreditCard,
} from 'lucide-react';
import { StorageService } from '../services/storage.ts';
import { generateUserAccessMessage, OFFICIAL_APP_ACCESS_URL } from '../utils/userAccessMessage.ts';
import { getProductionAppUrl } from '../utils/appUrl.ts';

interface MasterClientsTabProps {
  clients: ClientCompany[];
  workspaces: Workspace[];
  users: User[];
  projects: Project[];
  tasks: Task[];
  currentUser: User;
  onUpdateClients: (clients: ClientCompany[]) => void;
  onUpdateWorkspaces: (workspaces: Workspace[]) => void;
  onUpdateUsers: (users: User[]) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onEnterSupportMode: (client: ClientCompany) => void;
  onShowToast: (params: { type: 'success' | 'info' | 'error'; message: string }) => void;
}

export const MasterClientsTab: React.FC<MasterClientsTabProps> = ({
  clients,
  workspaces,
  users,
  projects,
  tasks,
  currentUser,
  onUpdateClients,
  onUpdateWorkspaces,
  onUpdateUsers,
  onSelectWorkspace,
  onEnterSupportMode,
  onShowToast,
}) => {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClientStatus>('all');
  const [planFilter, setPlanFilter] = useState<'all' | ClientPlan>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all');

  // Modais
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [selectedDetailClient, setSelectedDetailClient] = useState<ClientCompany | null>(null);
  const [editingClient, setEditingClient] = useState<ClientCompany | null>(null);
  const [suspendingClient, setSuspendingClient] = useState<ClientCompany | null>(null);

  // Formulário de Novo Cliente
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newLegalName, setNewLegalName] = useState('');
  const [newPlan, setNewPlan] = useState<ClientPlan>('profissional');
  const [newStatus, setNewStatus] = useState<ClientStatus>('active');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState('123456');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newMaxUsers, setNewMaxUsers] = useState<number>(30);
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingNewClient, setIsSubmittingNewClient] = useState(false);

  // Resultado de Compartilhamento
  const [shareResult, setShareResult] = useState<{
    client: ClientCompany;
    workspace: Workspace;
    ownerUser: User;
    rawPassword: string;
  } | null>(null);
  const [copiedShareText, setCopiedShareText] = useState(false);

  // Edição de Plano / Status
  const [editStatus, setEditStatus] = useState<ClientStatus>('active');
  const [editPlan, setEditPlan] = useState<ClientPlan>('profissional');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('paid');
  const [editMaxUsers, setEditMaxUsers] = useState<number>(30);
  const [editNotes, setEditNotes] = useState('');

  // Sincroniza campos quando abrir edição
  const handleOpenEdit = (client: ClientCompany) => {
    setEditingClient(client);
    setEditStatus(client.status);
    setEditPlan(client.plan);
    setEditPaymentStatus(client.paymentStatus || 'paid');
    setEditMaxUsers(client.maxUsers || 30);
    setEditNotes(client.notes || '');
  };

  // ==========================================================================
  // DASHBOARD MACRO: MÉTRICAS AGREGADAS
  // ==========================================================================
  const macroMetrics = useMemo(() => {
    const totalClients = clients.length;
    const activeClients = clients.filter((c) => c.status === 'active').length;
    const trialClients = clients.filter((c) => c.status === 'trial').length;
    const suspendedClients = clients.filter((c) => c.status === 'suspended').length;

    // Métricas de Pagamento
    const paidClients = clients.filter((c) => c.paymentStatus === 'paid').length;
    const pastDueClients = clients.filter((c) => c.paymentStatus === 'past_due').length;
    const trialingClients = clients.filter((c) => c.paymentStatus === 'trialing').length;

    const planBreakdown = {
      trial: clients.filter((c) => c.plan === 'trial').length,
      basico: clients.filter((c) => c.plan === 'basico' || c.plan === 'starter').length,
      starter: clients.filter((c) => c.plan === 'starter' || c.plan === 'basico').length,
      profissional: clients.filter((c) => c.plan === 'profissional' || c.plan === 'pro').length,
      pro: clients.filter((c) => c.plan === 'pro' || c.plan === 'profissional').length,
      enterprise: clients.filter((c) => c.plan === 'enterprise').length,
    };

    const totalUsers = users.length;
    const avgUsers = totalClients > 0 ? (totalUsers / totalClients).toFixed(1) : '0';

    // Volume de uso da plataforma
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.isCompleted).length;

    // Fichas técnicas (globais + nos cards)
    const savedFichas = StorageService.getFichasTecnicas();
    const taskFichasCount = tasks.filter((t) => t.fichaTecnica).length;
    const totalFichas = Math.max(savedFichas.length, taskFichasCount);

    // Registros de produção
    const totalProductions = tasks.reduce(
      (acc, t) => acc + (Array.isArray(t.productionRecords) ? t.productionRecords.length : 0),
      0
    );

    return {
      totalClients,
      activeClients,
      trialClients,
      suspendedClients,
      paidClients,
      pastDueClients,
      trialingClients,
      planBreakdown,
      totalUsers,
      avgUsers,
      totalTasks,
      completedTasks,
      totalFichas,
      totalProductions,
    };
  }, [clients, users, tasks]);

  // ==========================================================================
  // FILTRAGEM DE CLIENTES
  // ==========================================================================
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Filtro de status da empresa
      if (statusFilter !== 'all' && client.status !== statusFilter) {
        return false;
      }
      // Filtro de status de pagamento / cobrança
      if (paymentFilter !== 'all') {
        const clientPayStatus = client.paymentStatus || 'paid';
        if (clientPayStatus !== paymentFilter) return false;
      }
      // Filtro de plano
      if (planFilter !== 'all') {
        const pA = client.plan === 'pro' ? 'profissional' : client.plan === 'starter' ? 'basico' : client.plan;
        const pB = planFilter === 'pro' ? 'profissional' : planFilter === 'starter' ? 'basico' : planFilter;
        if (pA !== pB) return false;
      }
      // Busca por texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = client.name.toLowerCase().includes(q);
        const matchesLegal = client.legalName?.toLowerCase().includes(q);
        const matchesOwner = client.ownerName.toLowerCase().includes(q);
        const matchesEmail = client.ownerEmail.toLowerCase().includes(q);
        if (!matchesName && !matchesLegal && !matchesOwner && !matchesEmail) {
          return false;
        }
      }
      return true;
    });
  }, [clients, statusFilter, paymentFilter, planFilter, searchTerm]);

  // Estatísticas específicas de um cliente
  const getClientStats = (client: ClientCompany) => {
    const wsIds = client.workspaceIds || [client.primaryWorkspaceId];
    const clientWorkspaces = workspaces.filter((w) => wsIds.includes(w.id));
    const clientProjects = projects.filter((p) => wsIds.includes(p.workspaceId));
    const clientTasks = tasks.filter((t) => wsIds.includes(t.workspaceId));
    const clientCompletedTasks = clientTasks.filter((t) => t.isCompleted);

    // Usuários vinculados aos workspaces do cliente
    const clientMemberUserIds = new Set<string>();
    clientWorkspaces.forEach((w) => {
      w.members?.forEach((m) => clientMemberUserIds.add(m.userId));
      if (w.ownerId) clientMemberUserIds.add(w.ownerId);
    });
    if (client.ownerId) clientMemberUserIds.add(client.ownerId);

    const clientUsers = users.filter((u) => clientMemberUserIds.has(u.id));

    // Produções e Fichas
    const clientFichas = clientTasks.filter((t) => t.fichaTecnica).length;
    const clientProductions = clientTasks.reduce(
      (acc, t) => acc + (Array.isArray(t.productionRecords) ? t.productionRecords.length : 0),
      0
    );

    return {
      workspacesCount: clientWorkspaces.length,
      projectsCount: clientProjects.length,
      tasksCount: clientTasks.length,
      completedTasksCount: clientCompletedTasks.length,
      usersCount: clientUsers.length,
      clientUsers,
      fichasCount: clientFichas,
      productionsCount: clientProductions,
    };
  };

  // ==========================================================================
  // AÇÕES
  // ==========================================================================

  // Criar Novo Cliente
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      onShowToast({ type: 'error', message: 'Preencha o nome da empresa cliente.' });
      return;
    }
    if (!newOwnerName.trim()) {
      onShowToast({ type: 'error', message: 'Preencha o nome do responsável/dono.' });
      return;
    }
    if (!newOwnerEmail.trim().includes('@')) {
      onShowToast({ type: 'error', message: 'O login/e-mail deve conter obrigatoriamente o caractere @.' });
      return;
    }
    if (!newOwnerPassword.trim() || newOwnerPassword.trim().length < 4) {
      onShowToast({ type: 'error', message: 'A senha inicial deve ter pelo menos 4 caracteres.' });
      return;
    }

    setIsSubmittingNewClient(true);
    try {
      const res = await StorageService.createClientCompany({
        name: newCompanyName.trim(),
        legalName: newLegalName.trim(),
        plan: newPlan,
        status: newStatus,
        ownerName: newOwnerName.trim(),
        ownerEmail: newOwnerEmail.trim().toLowerCase(),
        ownerPassword: newOwnerPassword.trim(),
        ownerPhone: newOwnerPhone.trim(),
        workspaceName: newWorkspaceName.trim() || newCompanyName.trim(),
        maxUsers: newMaxUsers,
        notes: newNotes.trim(),
      });

      if (!res.success || !res.client || !res.workspace || !res.ownerUser) {
        setIsSubmittingNewClient(false);
        onShowToast({ type: 'error', message: res.error || 'Erro ao criar empresa/cliente.' });
        return;
      }

      // Atualiza listas do App
      const freshClients = StorageService.getClients();
      const freshWorkspaces = StorageService.getWorkspaces();
      const freshUsers = StorageService.getUsers();

      onUpdateClients(freshClients);
      onUpdateWorkspaces(freshWorkspaces);
      onUpdateUsers(freshUsers);

      setIsSubmittingNewClient(false);
      setIsNewClientModalOpen(false);

      // Abre resultado para compartilhamento imediato
      setShareResult({
        client: res.client,
        workspace: res.workspace,
        ownerUser: res.ownerUser,
        rawPassword: res.rawPassword || newOwnerPassword.trim(),
      });

      onShowToast({
        type: 'success',
        message: `Cliente "${res.client.name}" e Workspace inicial criados com sucesso!`,
      });

      // Limpa formulário
      setNewCompanyName('');
      setNewLegalName('');
      setNewOwnerName('');
      setNewOwnerEmail('');
      setNewOwnerPassword('123456');
      setNewOwnerPhone('');
      setNewWorkspaceName('');
      setNewNotes('');
    } catch (err: any) {
      setIsSubmittingNewClient(false);
      onShowToast({ type: 'error', message: err.message || 'Erro inesperado ao criar cliente.' });
    }
  };

  // Suspender ou Reativar Cliente
  const handleToggleSuspend = (client: ClientCompany) => {
    if (client.id === 'client-matriz') {
      onShowToast({ type: 'error', message: 'A empresa Matriz do OperaTask não pode ser suspensa.' });
      return;
    }

    const nextStatus: ClientStatus = client.status === 'suspended' ? 'active' : 'suspended';
    const updated = StorageService.updateClientStatus(client.id, nextStatus);

    if (updated) {
      const freshClients = StorageService.getClients();
      const freshWorkspaces = StorageService.getWorkspaces();
      onUpdateClients(freshClients);
      onUpdateWorkspaces(freshWorkspaces);

      if (selectedDetailClient?.id === client.id) {
        setSelectedDetailClient(updated);
      }

      onShowToast({
        type: nextStatus === 'suspended' ? 'info' : 'success',
        message:
          nextStatus === 'suspended'
            ? `Empresa "${client.name}" suspensa com sucesso. Usuários não conseguirão acessar.`
            : `Empresa "${client.name}" reativada com sucesso! Acesso normalizado.`,
      });
    }
    setSuspendingClient(null);
  };

  // Salvar Edição de Plano / Status
  const handleSaveEditClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    if (editStatus !== editingClient.status) {
      StorageService.updateClientStatus(editingClient.id, editStatus);
    }

    if (editPaymentStatus !== editingClient.paymentStatus) {
      StorageService.updateClientPaymentStatus(editingClient.id, editPaymentStatus);
    }

    StorageService.updateClientPlan(editingClient.id, editPlan, editMaxUsers, editNotes);

    const freshClients = StorageService.getClients();
    const freshWorkspaces = StorageService.getWorkspaces();
    onUpdateClients(freshClients);
    onUpdateWorkspaces(freshWorkspaces);

    const updated = freshClients.find((c) => c.id === editingClient.id);
    if (updated && selectedDetailClient?.id === editingClient.id) {
      setSelectedDetailClient(updated);
    }

    onShowToast({
      type: 'success',
      message: `Dados da empresa "${editingClient.name}" atualizados com sucesso!`,
    });
    setEditingClient(null);
  };

  // Mensagem Oficial de Compartilhamento
  const getShareText = () => {
    if (!shareResult) return '';
    return generateUserAccessMessage({
      name: shareResult.ownerUser.name,
      login: shareResult.ownerUser.username || shareResult.ownerUser.email,
      password: shareResult.rawPassword,
      workspaceName: shareResult.workspace.name,
      role: 'Dono',
      customLink: getProductionAppUrl(),
    });
  };

  const handleCopyShare = () => {
    const text = getShareText();
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedShareText(true);
      setTimeout(() => setCopiedShareText(false), 2500);
      onShowToast({ type: 'success', message: 'Credenciais e link copiados com sucesso!' });
    }
  };

  const handleWhatsAppShare = () => {
    const text = getShareText();
    if (!text) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Cores de Badge para Planos
  const planBadge = (plan: ClientPlan) => {
    switch (plan) {
      case 'enterprise':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 uppercase tracking-wide">
            Enterprise (R$ 597)
          </span>
        );
      case 'profissional':
      case 'pro':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 uppercase tracking-wide">
            Profissional (R$ 247)
          </span>
        );
      case 'basico':
      case 'starter':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 uppercase tracking-wide">
            Básico (R$ 97)
          </span>
        );
      case 'trial':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 uppercase tracking-wide">
            Trial 14d
          </span>
        );
    }
  };

  // Cores de Badge para Pagamento & Cobrança (Stripe)
  const paymentBadge = (paymentStatus?: PaymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Pago
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
            <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            Em Teste
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Em Atraso
          </span>
        );
      case 'unpaid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            Não Pago
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Pago
          </span>
        );
    }
  };

  // Cores de Badge para Status
  const statusBadge = (status: ClientStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ativo
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 text-amber-500" />
            Em Teste
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Suspenso
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* SEÇÃO 1: DASHBOARD MACRO (VISÃO GERAL) */}
      {/* ==================================================================== */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#34B1AC]" />
                <span>Visão Geral & Métricas Macro da Plataforma</span>
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#173653] text-[#34B1AC] border border-[#34B1AC]/30">
                SaaS Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Consolidação de todas as empresas clientes, status de assinaturas e volume total de uso
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsNewClientModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-linear-to-r from-[#173653] to-[#34B1AC] hover:from-[#1d4367] hover:to-[#2da09c] transition-all shadow-md hover:shadow-lg cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente (Empresa)</span>
          </button>
        </div>

        {/* 4 Cards de Métricas Macro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total de Clientes */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total de Clientes
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {macroMetrics.totalClients}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Empresas cadastradas
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {macroMetrics.planBreakdown.enterprise} Enterprise
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {macroMetrics.planBreakdown.pro} Pro
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {macroMetrics.planBreakdown.starter} Starter
              </span>
            </div>
          </div>

          {/* Card 2: Status dos Clientes */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Status da Base
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {macroMetrics.activeClients}
                  </h4>
                  <span className="text-xs font-bold text-slate-500">ativos</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Operando normalmente
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3" />
                {macroMetrics.trialClients} em trial
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-3 h-3" />
                {macroMetrics.suspendedClients} suspensos
              </span>
            </div>
          </div>

          {/* Card 3: Total de Usuários */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total de Usuários
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {macroMetrics.totalUsers}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Média de ~{macroMetrics.avgUsers} por empresa
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                Super Administrador (Master) + Donos + Equipes
              </span>
            </div>
          </div>

          {/* Card 4: Volume de Uso Global */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Volume de Uso
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {macroMetrics.totalTasks}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Cards em quadros ({macroMetrics.completedTasks} concluídos)
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <ChefHat className="w-3.5 h-3.5 text-teal-600" />
                {macroMetrics.totalFichas} fichas
              </span>
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {macroMetrics.totalProductions} produções
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SEÇÃO 2: FILTROS E BUSCA DE CLIENTES */}
      {/* ==================================================================== */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Busca */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome da empresa, responsável ou login/e-mail..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-[#34B1AC]"
            />
          </div>

          {/* Filtros de Status */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-[#173653] text-[#34B1AC] dark:bg-[#34B1AC] dark:text-[#173653]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Todos ({clients.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Ativos ({macroMetrics.activeClients})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('trial')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'trial'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Em Teste ({macroMetrics.trialClients})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'suspended'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Suspensos ({macroMetrics.suspendedClients})
            </button>
          </div>

          {/* Filtro de Plano */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as any)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-[#34B1AC]"
            >
              <option value="all">Todos os Planos</option>
              <option value="trial">Plano Trial (14d)</option>
              <option value="basico">Plano Básico (R$ 97)</option>
              <option value="profissional">Plano Profissional (R$ 247)</option>
              <option value="enterprise">Plano Enterprise (R$ 597)</option>
            </select>
          </div>

          {/* Filtro de Pagamento / Cobrança */}
          <div className="flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-[#34B1AC]"
            >
              <option value="all">Todas as Cobranças</option>
              <option value="paid">Pagos (Ativos)</option>
              <option value="trialing">Em Teste (Trial)</option>
              <option value="past_due">Em Atraso (Past Due)</option>
              <option value="unpaid">Não Pagos</option>
              <option value="canceled">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SEÇÃO 3: LISTA DE CLIENTES (TABELA CORPORATIVA) */}
      {/* ==================================================================== */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Empresa / Cliente</th>
                <th className="py-3 px-4">Status & Cobrança</th>
                <th className="py-3 px-4">Responsável (Dono)</th>
                <th className="py-3 px-4">Usuários</th>
                <th className="py-3 px-4">Volume de Uso</th>
                <th className="py-3 px-4">Cadastro / Último Acesso</th>
                <th className="py-3 px-4 text-right">Ações de Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">Nenhuma empresa encontrada com os filtros selecionados.</p>
                    <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca ou cadastrar um novo cliente.</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const stats = getClientStats(client);
                  const isMatriz = client.id === 'client-matriz';

                  return (
                    <tr
                      key={client.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        client.status === 'suspended' ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Empresa */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs shrink-0"
                            style={{
                              backgroundColor: isMatriz ? '#173653' : client.status === 'suspended' ? '#94a3b8' : '#34B1AC',
                            }}
                          >
                            {client.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {client.name}
                              </span>
                              {isMatriz && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                                  Matriz
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono">
                              ID: {client.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status & Plano & Cobrança */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {statusBadge(client.status)}
                            {paymentBadge(client.paymentStatus)}
                          </div>
                          <div>{planBadge(client.plan)}</div>
                        </div>
                      </td>

                      {/* Responsável */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {client.ownerName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {client.ownerEmail}
                          </p>
                          {client.ownerPhone && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {client.ownerPhone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Usuários */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                            <Users className="w-3.5 h-3.5 text-teal-600" />
                            <span>
                              {stats.usersCount} / {client.maxUsers || 15}
                            </span>
                          </div>
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#34B1AC] rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (stats.usersCount / (client.maxUsers || 15)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Volume de Uso */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] space-y-0.5">
                          <p className="text-slate-700 dark:text-slate-300 font-medium">
                            <strong>{stats.tasksCount}</strong> cards ({stats.completedTasksCount} ok)
                          </p>
                          <p className="text-slate-500">
                            {stats.fichasCount} fichas · {stats.productionsCount} produções
                          </p>
                        </div>
                      </td>

                      {/* Cadastro / Último Acesso */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] space-y-0.5 text-slate-500">
                          <p className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Acesso: {client.lastAccessAt ? new Date(client.lastAccessAt).toLocaleDateString('pt-BR') : 'Hoje'}
                          </p>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1. Ver Detalhes */}
                          <button
                            type="button"
                            onClick={() => setSelectedDetailClient(client)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ver detalhes completos da empresa"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 2. Entrar como Suporte */}
                          <button
                            type="button"
                            onClick={() => onEnterSupportMode(client)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition-all cursor-pointer"
                            title="Acessar o Workspace desta empresa em Modo Suporte (sem misturar dados)"
                          >
                            <Headphones className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="hidden sm:inline">Suporte</span>
                          </button>

                          {/* 3. Suspender / Reativar */}
                          {!isMatriz && (
                            <button
                              type="button"
                              onClick={() => {
                                if (client.status === 'suspended') {
                                  handleToggleSuspend(client);
                                } else {
                                  setSuspendingClient(client);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                client.status === 'suspended'
                                  ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                  : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              }`}
                              title={client.status === 'suspended' ? 'Reativar Empresa' : 'Suspender Acesso da Empresa'}
                            >
                              {client.status === 'suspended' ? (
                                <Play className="w-4 h-4" />
                              ) : (
                                <Pause className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* 4. Alternar Pagamento Rápido (Master / Teste de Cobrança) */}
                          {!isMatriz && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextPay: PaymentStatus = client.paymentStatus === 'paid' ? 'past_due' : 'paid';
                                StorageService.updateClientPaymentStatus(client.id, nextPay);
                                const fresh = StorageService.getClients();
                                onUpdateClients(fresh);
                                onShowToast({
                                  type: nextPay === 'paid' ? 'success' : 'error',
                                  message: `Cobrança de "${client.name}" alterada para ${
                                    nextPay === 'paid' ? 'PAGO (Ativo)' : 'EM ATRASO (Past Due)'
                                  }.`,
                                });
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                client.paymentStatus === 'past_due'
                                  ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                              title={
                                client.paymentStatus === 'paid'
                                  ? 'Marcar como Em Atraso (Testar Bloqueio de Cobrança)'
                                  : 'Marcar como Pago (Regularizar Assinatura)'
                              }
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {/* 5. Editar Plano / Status */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(client)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Alterar Plano ou Status da Empresa"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: CADASTRAR NOVO CLIENTE (EMPRESA + WORKSPACE INICIAL) */}
      {/* ==================================================================== */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-[#173653] to-[#204970] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/10 text-[#34B1AC]">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Cadastrar Novo Cliente (Empresa)</h3>
                  <p className="text-xs text-slate-300">
                    Crie a empresa, o workspace inicial e o usuário Dono com acesso pronto para entrega
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com Scroll */}
            <form onSubmit={handleCreateClient} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome da Empresa */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Empresa / Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCompanyName}
                    onChange={(e) => {
                      setNewCompanyName(e.target.value);
                      if (!newWorkspaceName || newWorkspaceName === newCompanyName) {
                        setNewWorkspaceName(e.target.value);
                      }
                    }}
                    placeholder="Ex: Padaria Bela Vista, Restaurante Mar Azul..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-[#34B1AC]"
                  />
                </div>

                {/* Razão Social / CNPJ */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Razão Social ou CNPJ (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newLegalName}
                    onChange={(e) => setNewLegalName(e.target.value)}
                    placeholder="Ex: 12.345.678/0001-90 ou Razão Social"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                  />
                </div>
              </div>

              {/* Plano e Status Inicial */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Plano de Assinatura
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => {
                      const p = e.target.value as ClientPlan;
                      setNewPlan(p);
                      if (p === 'starter') setNewMaxUsers(5);
                      if (p === 'pro') setNewMaxUsers(25);
                      if (p === 'enterprise') setNewMaxUsers(999);
                      if (p === 'trial') setNewMaxUsers(10);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[#34B1AC]"
                  >
                    <option value="trial">Trial (14 dias gratuitos)</option>
                    <option value="starter">Plano Starter (até 5 usuários)</option>
                    <option value="pro">Plano Pro (até 25 usuários)</option>
                    <option value="enterprise">Plano Enterprise (Ilimitado)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ClientStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[#34B1AC]"
                  >
                    <option value="active">Ativo (Produção Imediata)</option>
                    <option value="trial">Em Teste (Período Trial)</option>
                    <option value="suspended">Suspenso (Acesso Bloqueado)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Limite de Usuários
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={newMaxUsers}
                    onChange={(e) => setNewMaxUsers(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[#34B1AC]"
                  />
                </div>
              </div>

              {/* Dados do Dono / Responsável */}
              <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Dados de Acesso do Responsável (Perfil Dono)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome do Responsável / Dono *
                    </label>
                    <input
                      type="text"
                      required
                      value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo Silva"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Login de Acesso (com @) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newOwnerEmail}
                      onChange={(e) => setNewOwnerEmail(e.target.value)}
                      placeholder="Ex: carlos@belavista.com.br"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-[#34B1AC]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Senha Inicial *
                    </label>
                    <input
                      type="text"
                      required
                      value={newOwnerPassword}
                      onChange={(e) => setNewOwnerPassword(e.target.value)}
                      placeholder="Mínimo 4 dígitos"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold focus:ring-2 focus:ring-[#34B1AC]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Telefone / WhatsApp (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newOwnerPhone}
                      onChange={(e) => setNewOwnerPhone(e.target.value)}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                    />
                  </div>
                </div>
              </div>

              {/* Workspace Inicial */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Workspace Inicial da Empresa
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Ex: Meu Workspace ou Nome da Empresa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                />
              </div>

              {/* Notas do Contrato */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações Internas / Detalhes do Contrato
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Contrato assinado em 08/11/2026. Fechou pacote Pro anual..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmittingNewClient}
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewClient}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-linear-to-r from-[#173653] to-[#34B1AC] hover:from-[#1d4367] hover:to-[#2da09c] transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingNewClient ? (
                    <span>Criando Empresa & Workspace...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar e Gerar Acesso</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: MENSAGEM OFICIAL DE COMPARTILHAMENTO DE ACESSO */}
      {/* ==================================================================== */}
      {shareResult && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <h4 className="text-sm font-bold">Empresa Cadastrada com Sucesso!</h4>
                  <p className="text-xs text-emerald-100">
                    Envie a mensagem oficial de acesso ao responsável
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareResult(null)}
                className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono whitespace-pre-line text-slate-800 dark:text-slate-200 select-all leading-relaxed">
                {getShareText()}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyShare}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {copiedShareText ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Mensagem</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                >
                  <span>Enviar no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShareResult(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-white bg-[#173653] hover:bg-[#204970] transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: VER DETALHES COMPLETOS DO CLIENTE */}
      {/* ==================================================================== */}
      {selectedDetailClient && (() => {
        const stats = getClientStats(selectedDetailClient);
        const isMatriz = selectedDetailClient.id === 'client-matriz';

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div
              className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Detalhe */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#173653] text-[#34B1AC] flex items-center justify-center font-black text-sm">
                    {selectedDetailClient.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {selectedDetailClient.name}
                      </h3>
                      {statusBadge(selectedDetailClient.status)}
                      {planBadge(selectedDetailClient.plan)}
                    </div>
                    <p className="text-xs text-slate-500">
                      ID: {selectedDetailClient.id} · Cadastrada em {new Date(selectedDetailClient.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDetailClient(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo com Scroll */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs">
                {/* 4 Cards de Métricas do Cliente */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Usuários</p>
                    <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {stats.usersCount} / {selectedDetailClient.maxUsers || 15}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Cards / Tarefas</p>
                    <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {stats.tasksCount} <span className="text-xs font-normal text-slate-500">({stats.completedTasksCount} ok)</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Fichas Técnicas</p>
                    <p className="text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5">
                      {stats.fichasCount}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Produções</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                      {stats.productionsCount}
                    </p>
                  </div>
                </div>

                {/* Dados de Contato e Contrato */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-teal-600" />
                    <span>Informações da Empresa e Responsável</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <p className="text-slate-500">Dono / Responsável:</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedDetailClient.ownerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Login / E-mail:</p>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {selectedDetailClient.ownerEmail}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Telefone:</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedDetailClient.ownerPhone || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Workspace Principal:</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {workspaces.find((w) => w.id === selectedDetailClient.primaryWorkspaceId)?.name ||
                          selectedDetailClient.primaryWorkspaceId}
                      </p>
                    </div>
                  </div>
                  {selectedDetailClient.notes && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                      <strong>Notas do Contrato:</strong> {selectedDetailClient.notes}
                    </div>
                  )}
                </div>

                {/* Lista de Usuários da Empresa */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-teal-600" />
                    <span>Usuários Cadastrados nesta Empresa ({stats.clientUsers.length})</span>
                  </h4>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3">Nome do Usuário</th>
                          <th className="py-2.5 px-3">Login / E-mail</th>
                          <th className="py-2.5 px-3">Função / Título</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {stats.clientUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                              {u.name}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500">
                              {u.username || u.email}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {u.title || (u.id === selectedDetailClient.ownerId ? 'Dono' : 'Membro')}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-emerald-600 font-bold">Ativo</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Rodapé de Ações do Detalhe */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onEnterSupportMode(selectedDetailClient);
                      setSelectedDetailClient(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition-all cursor-pointer"
                  >
                    <Headphones className="w-4 h-4 text-amber-600" />
                    <span>Acessar Workspace em Modo Suporte</span>
                  </button>

                  {!isMatriz && (
                    <button
                      type="button"
                      onClick={() => handleToggleSuspend(selectedDetailClient)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedDetailClient.status === 'suspended'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100'
                      }`}
                    >
                      {selectedDetailClient.status === 'suspended' ? (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Reativar Empresa</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Suspender Empresa</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenEdit(selectedDetailClient);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Alterar Plano / Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDetailClient(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#173653] hover:bg-[#204970] transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* MODAL 4: EDITAR PLANO E STATUS */}
      {/* ==================================================================== */}
      {editingClient && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Gerenciar Plano & Status: {editingClient.name}
              </h4>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditClient} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status de Operação
                </label>
                <select
                  value={editStatus}
                  disabled={editingClient.id === 'client-matriz'}
                  onChange={(e) => setEditStatus(e.target.value as ClientStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                >
                  <option value="active">Ativo (Acesso Liberado)</option>
                  <option value="trial">Em Teste (Período Trial)</option>
                  <option value="suspended">Suspenso (Bloquear Acesso)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status de Pagamento (Stripe / Cobrança)
                </label>
                <select
                  value={editPaymentStatus}
                  disabled={editingClient.id === 'client-matriz'}
                  onChange={(e) => setEditPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                >
                  <option value="paid">Pago (Assinatura Ativa & Em Dia)</option>
                  <option value="trialing">Em Teste (Período Trial)</option>
                  <option value="past_due">Em Atraso (Past Due - Fatura Pendente)</option>
                  <option value="unpaid">Não Pago (Cobrança Falhou)</option>
                  <option value="canceled">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Plano da Empresa
                </label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value as ClientPlan)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                >
                  <option value="trial">Trial Gratuito (14 dias / 5 usuários)</option>
                  <option value="basico">Básico (Até 10 usuários / R$ 97)</option>
                  <option value="profissional">Profissional (Até 30 usuários / R$ 247)</option>
                  <option value="enterprise">Enterprise (Ilimitado / R$ 597)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Limite Máximo de Usuários
                </label>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={editMaxUsers}
                  onChange={(e) => setEditMaxUsers(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notas / Observações
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: CONFIRMAÇÃO DE SUSPENSÃO */}
      {/* ==================================================================== */}
      {suspendingClient && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden p-6 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Suspender Empresa "{suspendingClient.name}"?
              </h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Ao suspender, todos os usuários desta empresa terão o acesso temporariamente bloqueado com mensagem informativa. A conta Master continuará com acesso irrestrito para reativação a qualquer momento.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendingClient(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleToggleSuspend(suspendingClient)}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Confirmar Suspensão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
