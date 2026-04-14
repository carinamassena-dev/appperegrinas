
export enum BaptismStatus {
  BATIZADA = 'Batizada',
  NAO_BATIZADA = 'Não Batizada'
}

export enum TransactionType {
  ENTRADA = 'Entrada',
  SAIDA = 'Saída'
}

export enum CDLevel {
  NIVEL_1 = 'Nível 1',
  NIVEL_2 = 'Nível 2',
  NIVEL_3 = 'Nível 3',
  CONCLUIDO = 'Concluído',
  NAO_INICIOU = 'Não Iniciou'
}

export type PermissionLevel = 'view' | 'edit' | 'delete' | 'none';

export interface UserPermissions {
  dashboard: PermissionLevel;
  disciples: PermissionLevel;
  leaders: PermissionLevel;
  finance: PermissionLevel;
  events: PermissionLevel;
  harvest: PermissionLevel;
  tickets: PermissionLevel;
  mural: PermissionLevel;
  agenda: PermissionLevel;
  feed: PermissionLevel;
  reports: PermissionLevel;
  academy: PermissionLevel;
  atas: PermissionLevel;
  mapa: PermissionLevel;
  one_on_one: PermissionLevel;
  amigo_secreto: PermissionLevel;
  master: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  nome: string;
  email?: string;
  whatsapp?: string;
  role: 'Master' | 'Líder' | 'Operador';
  permissions: UserPermissions;
  sessionToken?: string;
  status?: 'active' | 'pending';
  requestedAt?: string;
  organization_id?: string;
}

export interface AppSettings {
  googleSheetUrl: string;
  spreadsheetId: string;
  tabNames: {
    disciples: string;
    leaders: string;
    finance: string;
    harvest: string;
  };
  syncInterval: number;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  useSupabase?: boolean;
}

export type EventCategory = 'Congresso' | 'Encontro' | 'Treinamento' | 'Social' | 'Outros';
export type EventStatus = 'Ativo' | 'Encerrado' | 'Cancelado';
export type EventType = 'Presencial' | 'Online' | 'Híbrido';
export type ParticipantStatus = 'Confirmada' | 'Pendente' | 'Cancelada';
export type ParticipationType = 'Participante' | 'Voluntário' | 'Palestrante' | 'Equipe';

export interface Participant {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  valorInscricao: number;
  formaIdentificacao: string;
  tipoParticipacao: string;
  status: string;
  dataInscricao: string;
  isGuest?: boolean;
}

export interface Event {
  id: string;
  nome: string;
  status: string;
  categoria: string;
  participantes: Participant[];
  capacidadeMax: number;
  dataInicio: string;
  local: string;
  descricao: string;
  dataTermino: string;
  horario: string;
  tipo: string;
  valorPadrao: number;
  observacoes?: string;
  organization_id?: string;
}

export interface CellInfo {
  ativa: boolean;
  dataAbertura?: string;
  dataFechamento?: string;
  perfil: string;
  dia: string;
  horario: string;
  modalidade: string;
  endereco: string;
  bairro: string;
  localizacao?: { lat: number, lng: number };
}

export interface Disciple {
  id: string;
  foto?: string;
  nome: string;
  profissao?: string;
  whatsapp: string;
  email?: string;
  dataAniversario: string;
  dataCadastro?: string;
  idade: number;
  statusRelacionamento: string;
  bairro?: string;
  cidade?: string;
  lider12?: string;
  liderDireta: string;
  batizada: BaptismStatus;
  dataBatismo?: string;

  // Maturidade Completa
  fezUV: boolean;
  dataInscricaoUV?: string;
  dataConclusaoUV?: string;
  temCertificadoUV?: boolean;
  certificateUVFile?: string;

  fezEncontro: boolean;
  dataConclusaoEncontro?: string;

  fezCD: boolean;
  dataInscricaoCD1?: string;
  dataInscricaoCD2?: string;
  dataInscricaoCD3?: string;
  cdStatus: CDLevel;
  dataConclusaoCD?: string;
  temCertificadoCD?: boolean;
  certificateCDFile?: string;

  fezReencontro?: boolean;
  dataReencontro?: string;
  fezFormatura?: boolean;
  dataFormatura?: string;

  // Perfil e Interesses
  coresPreferidas?: string;
  presentesPreferidos?: string;
  livrosPreferidos?: string;
  ministerio?: string;

  // Contatos e Localização
  contatoEmergenciaNome?: string;
  contatoEmergenciaFone?: string;
  endereco?: string;
  status: 'Ativa' | 'Inativa';
  observacao?: string;

  // Liderança Unificada
  isLeader?: boolean;
  fazMaisDeUmaCelula?: boolean;
  celula1?: CellInfo;
  celula2?: CellInfo;
  organization_id?: string;
}

export interface Leader extends Disciple {
  isLeader: true;
  celula1: CellInfo;
}

export interface FinanceRecord {
  id: string;
  data: string;
  tipo: TransactionType;
  valor: number;
  responsavel: string;
  descricao: string;
  categoria?: string;
  observacao?: string;
}

export interface Harvest {
  id: string;
  nome: string;
  whatsapp: string;
  contatoFeito: boolean;
  bairro?: string;
  dataAbordagem: string;
  idade: number;
  quemContactou?: string;
  dataContato?: string;
  observacao?: string;
}

export interface FeedItem {
  id: string;
  titulo: string;
  autor: string;
  conteudo: string;
  data: string;
  documento?: string; // Base64
  documentoNome?: string;
  organization_id?: string;
}

export interface CellMeetingReport {
  id: string;
  leaderId: string;
  data: string;
  tema: string;
  qtdMembros: number;
  qtdVisitantes: number;
  ofertaArrecadada?: number;
  numConversoes?: number;
  pedidosOracao: string;
  observacoes: string;
}

export type TicketStatus = 'Aberto' | 'Em Andamento' | 'Respondido' | 'Concluído';
export type TicketType = 'Oração' | 'Agendamento' | 'Dúvida' | 'Suporte' | 'Atualização Cadastral' | 'Outros';

export interface TicketMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  creatorId: string;
  creatorName: string;
  assignedLeaderId?: string;
  assignedLeaderName?: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  requestedChanges?: {
    field: string;
    label: string;
    newValue: string;
  }[];
}
