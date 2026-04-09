import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import {
  Search, Plus, X, Heart, Trash2, Edit2,
  Flower2, Camera, CheckCircle, GraduationCap,
  MapPin, Gift, Star, Award, UserCircle,
  Trophy, FileText, Upload, Eye, Activity,
  ShieldAlert, MapPinned, UserPlus, RefreshCcw, Bookmark,
  ChevronRight, Info, CalendarDays, LayoutGrid, Loader2, AlertCircle, Folder, ChevronDown, ChevronUp, Link, MailCheck
} from 'lucide-react';
import useSWR from 'swr';
import { AuthContext } from '../App';
import { draftService } from '../services/draftService';
import { sendDataToSheet } from '../services/googleSheetsService';
import { loadDisciplesList, loadDiscipleFull, saveRecord, deleteRecord, loadData, saveAttendanceBatch, searchDisciplesByName, loadLinhagem } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { supabaseService } from '../services/supabaseService';
import { Disciple, BaptismStatus, CDLevel, Leader } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import imageCompression from 'browser-image-compression';

const Disciples: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'folder' | 'tree'>('folder');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteType, setInviteType] = useState<'novo' | 'atualizacao'>('novo');
  const [generatedLink, setGeneratedLink] = useState('');

  // Search state for Invites
  const [inviteSearchTerm, setInviteSearchTerm] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState<any[]>([]);
  const [inviteSelectedDisciple, setInviteSelectedDisciple] = useState<any | null>(null);
  const [inviteSearchLoading, setInviteSearchLoading] = useState(false);

  // Attendance Check-in State
  const [pendingAttendance, setPendingAttendance] = useState<Record<string, boolean>>({});
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  const [showPendingModal, setShowPendingModal] = useState(false);

  // Pagination & Server Search
  const [page, setPage] = useState(0);
  const [serverSearchTerm, setServerSearchTerm] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setServerSearchTerm(searchTerm);
      setPage(0); // Reset page on new search
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: disciples = [], isLoading, mutate } = useSWR(['/api/disciples', page, serverSearchTerm, viewMode], async () => {
    console.time('fetch-cadastros');
    const data = await loadDisciplesList(page, 20, serverSearchTerm, viewMode === 'folder');
    console.timeEnd('fetch-cadastros');
    return data as Disciple[];
  }, { revalidateOnFocus: true });

  const { data: totalCount = 0, mutate: mutateCount } = useSWR('/api/disciples/count', async () => {
    try {
      const { supabaseService } = await import('../services/supabaseService');
      return await supabaseService.getCount('peregrinas');
    } catch (e) { return 0; }
  }, { revalidateOnFocus: true });

  const { data: treeData = [], isLoading: isLoadingTree } = useSWR(viewMode === 'tree' ? '/api/linhagem' : null, async () => {
    return await loadLinhagem();
  });

  // Global fetch for leaders (all pages) to populate selects
  const { data: allLeadersData = [] } = useSWR('/api/leaders/global', async () => {
    const { supabaseService } = await import('../services/supabaseService');
    const data = await supabaseService.getLeaders();
    return data;
  }, { revalidateOnFocus: true });

  const allLeaderNames = useMemo(() => {
    return Array.from(new Set(allLeadersData.map((l: any) => l.nome)))
      .filter(Boolean)
      .sort((a: any, b: any) => a.localeCompare(b));
  }, [allLeadersData]);

  const { data: pendingRequests = [], mutate: mutatePending } = useSWR('/api/pendingRegistrations', async () => {
    try {
      const data = await loadData<any>('pendingRegistrations');
      // Only show requests for this leader
      return data.filter((p: any) => p.liderId_generator === user?.id && p.status === 'pending');
    } catch (e) { return []; }
  }, { revalidateOnFocus: true });

  const toggleFolder = (leader: string) => {
    setExpandedFolders(prev => ({ ...prev, [leader]: !prev[leader] }));
  };

  const photoInputRef = useRef<HTMLInputElement>(null);
  const uvFileRef = useRef<HTMLInputElement>(null);
  const cdFileRef = useRef<HTMLInputElement>(null);

  const initialDisciple: Partial<Disciple> = {
    nome: '', profissao: '', whatsapp: '', dataAniversario: '',
    statusRelacionamento: 'Solteira', coresPreferidas: '', presentesPreferidos: '',
    livrosPreferidos: '', contatoEmergenciaNome: '', contatoEmergenciaFone: '',
    endereco: '', bairro: '', cidade: '', lider12: '', liderDireta: '',
    batizada: BaptismStatus.NAO_BATIZADA, dataBatismo: '',
    fezUV: false, dataInscricaoUV: '', dataConclusaoUV: '', temCertificadoUV: false,
    fezEncontro: false, dataConclusaoEncontro: '', fezCD: false,
    dataInscricaoCD1: '', dataInscricaoCD2: '', dataInscricaoCD3: '',
    cdStatus: CDLevel.NAO_INICIOU, dataConclusaoCD: '', temCertificadoCD: false,
    fezReencontro: false, dataReencontro: '',
    fezFormatura: false, dataFormatura: '',
    ministerio: '', observacao: '', status: 'Ativa', foto: '',
    certificateUVFile: '', certificateCDFile: '',
    isLeader: false, fazMaisDeUmaCelula: false,
    celula1: { ativa: true, perfil: 'Kingdom', dia: 'Segunda', horario: '20:00', modalidade: 'Presencial', endereco: '', bairro: '' },
    celula2: { ativa: false, perfil: '', dia: '', horario: '', modalidade: '', endereco: '', bairro: '' }
  };

  const [newDisciple, setNewDisciple] = useState<Partial<Disciple>>(initialDisciple);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'maturity' | 'interests' | 'leadership'>('personal');
  const [activeCellTab, setActiveCellTab] = useState<'cel1' | 'cel2'>('cel1');

  // Load draft on mount for new registrations
  useEffect(() => {
    if (!editId) {
      const draft = draftService.getDraft('disciples');
      if (draft && Object.keys(draft).length > 0) {
        setNewDisciple(draft);
      }
    }
  }, [editId]);

  // Save to draft when typing
  useEffect(() => {
    if (!editId && newDisciple.nome !== undefined && newDisciple.nome.trim() !== '') {
      draftService.saveDraft('disciples', newDisciple);
    }
  }, [newDisciple, editId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof Disciple) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Show loading state if needed on the UI
      let finalFile = file;
      let bucketName = 'certificados'; // Default bucket for non-images

      // Only compress if it's an image
      if (file.type.startsWith('image/')) {
        bucketName = 'avatars'; // Override bucket for images
        // Compression Options (Max 800px, under 100KB)
        const options = {
          maxSizeMB: 0.1, // 100 KB
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: 'image/jpeg'
        };
        finalFile = await imageCompression(file, options);
      } else if (file.size > 1048576) {
        // Limit non-images (like certificates PDFs) to 1MB still
        alert("Arquivo muito pesado (limite 1MB).");
        if (e.target) e.target.value = '';
        return;
      }

      // Generate unique path for storage
      const fileExt = file.name.split('.').pop() || (bucketName === 'avatars' ? 'jpg' : 'pdf');
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${newDisciple.id || 'temp'}/${fileName}`;

      // Upload to Supabase Storage in the designated bucket
      const publicUrl = await supabaseService.uploadImage(finalFile, filePath, bucketName);

      // Save public URL to state
      setNewDisciple(prev => ({ ...prev, [field]: publicUrl }));

    } catch (error) {
      console.error("Erro no upload do arquivo:", error);
      alert("Falha ao fazer upload do arquivo.");
    } finally {
      // Clear the input value to allow selecting the same file again and free up memory
      if (e.target) e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!newDisciple.nome) return alert("O Nome é obrigatório!");

    const d: Disciple = {
      ...(newDisciple as Disciple),
      id: editId || Math.random().toString(36).substr(2, 9),
      dataCadastro: editId ? (disciples.find(x => x.id === editId)?.dataCadastro || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      idade: newDisciple.dataAniversario ? calculateAge(newDisciple.dataAniversario) : 0
    };

    const updated = editId ? disciples.map(i => i.id === editId ? d : i) : [d, ...disciples];
    mutate(updated, false); // Optimistic Update

    setIsSaving(true);

    try {
      await saveRecord('disciples', d);
      draftService.clearDraft('disciples');

      await mutate(); // Revalidate with server and wait
      setShowModal(false);
      setEditId(null);
      setNewDisciple(initialDisciple);
      setActiveTab('personal');
    } catch (err) {
      console.error("Erro ao salvar", err);
      draftService.saveDraft('disciples', newDisciple);
      alert("Falha de conexão: Ocorreu um erro ao salvar na nuvem. Verifique sua internet. (Seu rascunho foi salvo no aparelho)");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateAge = (dateString: string) => {
    if (!dateString) return 0;
    const today = new Date();
    const birthDate = new Date(dateString + 'T00:00:00');
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const filtered = useMemo(() => {
    return disciples.filter(d => d && (filterStatus === 'all' || d.status === filterStatus));
  }, [disciples, filterStatus]);

  const groupedByLeader = useMemo(() => {
    const groups: { [key: string]: Disciple[] } = {};
    filtered.forEach(d => {
      if (!d) return;
      const leader = d.liderDireta || 'Sem Líder Direta';
      if (!groups[leader]) groups[leader] = [];
      groups[leader].push(d);
    });
    return groups;
  }, [filtered]);

  const leaderNames = useMemo(() => {
    const fromDisciples = disciples.filter(d => d && d.isLeader).map(d => d.nome);
    return Array.from(new Set([...fromDisciples])).sort();
  }, [disciples]);

  const normalize = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split(/\r?\n/);
      if (rows.length < 2) return;

      const rawHeader = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const normalizedHeader = rawHeader.map(normalize);

      const findCol = (synonyms: string[]) =>
        normalizedHeader.findIndex(h => synonyms.some(s => h === normalize(s) || h.includes(normalize(s))));

      const m = {
        nome: findCol(['nome completo', 'nome']),
        whatsapp: findCol(['whatsapp', 'telefone', 'celular']),
        dataAniversario: findCol(['data do aniversario', 'data de nasc.', 'nascimento', 'data aniversario', 'data de nascimento']),
        idade: findCol(['idade']),
        statusRelacionamento: findCol(['status de relacionamento', 'status relacionamento', 'estado civil']),
        profissao: findCol(['profissao', 'ocupacao']),
        endereco: findCol(['endereco', 'rua']),
        bairro: findCol(['bairro']),
        cidade: findCol(['cidade']),
        liderDireta: findCol(['lider direta', 'discipuladora', 'lider']),
        lider12: findCol(['lider de 12', 'lider 12']),
        batizada: findCol(['batizada?', 'batizada', 'batismo']),
        dataBatismo: findCol(['data de batismo', 'data batismo']),
        fezUV: findCol(['fez a uv?', 'fez uv', 'fez uv?', 'universidade da vida']),
        dataInscricaoUV: findCol(['data inscricao uv', 'inicio uv']),
        dataConclusaoUV: findCol(['data conclusao uv', 'fim uv']),
        fezEncontro: findCol(['fez encontro?', 'fez encontro', 'encontro com deus']),
        dataConclusaoEncontro: findCol(['data conclusao encontro', 'data encontro']),
        fezCD: findCol(['fez a cd?', 'fez cd', 'fez cd?', 'caminho do discipulado']),
        cdStatus: findCol(['nivel cd?', 'status cd', 'nivel cd']),
        coresPreferidas: findCol(['cores preferida?', 'cores preferidas', 'cor preferida']),
        presentesPreferidos: findCol(['quais tipo de presentes prefere?', 'presentes preferidos', 'presente preferido']),
        livrosPreferidos: findCol(['quais tipos de livros prefere?', 'livros preferidos', 'livro preferido']),
        ministerio: findCol(['serve em qual ministerio?', 'ministerio', 'qual ministerio?']),
        observacao: findCol(['observacoes', 'obs', 'observacao'])
      };

      if (m.nome === -1) {
        alert("Coluna de NOME não encontrada no CSV!");
        return;
      }

      const existingNames = new Set(disciples.map(d => normalize(d.nome)));

      const imported: Disciple[] = [];
      let skipped = 0;

      const convertDate = (val: string) => {
        if (!val) return '';
        const clean = val.trim();
        if (clean.includes('/')) {
          const parts = clean.split('/');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return `${year}-${month}-${day}`;
          }
        }
        return clean;
      };

      rows.slice(1).forEach(row => {
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ''));
        if (cols.length < 2 || !cols[m.nome] || cols[m.nome].trim() === "") return;

        const nomeVal = cols[m.nome];

        // Softened dupe check
        if (existingNames.has(normalize(nomeVal))) {
          skipped++;
          return;
        }

        const isSim = (val: string) => {
          const v = val.toLowerCase();
          return v === 'sim' || v === 'true' || v === 'batizada' || v.includes('concluido') || v.includes('cursando');
        };

        const batizadaBoolean = m.batizada !== -1 ? isSim(cols[m.batizada]) : false;

        const d: Disciple = {
          id: `DSC_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          nome: nomeVal,
          whatsapp: m.whatsapp !== -1 ? cols[m.whatsapp] : '',
          idade: 0, // Will be calculated below
          dataAniversario: m.dataAniversario !== -1 ? convertDate(cols[m.dataAniversario]) : '',
          statusRelacionamento: m.statusRelacionamento !== -1 ? cols[m.statusRelacionamento] : 'Solteira',
          profissao: m.profissao !== -1 ? cols[m.profissao] : '',
          endereco: m.endereco !== -1 ? cols[m.endereco] : '',
          bairro: m.bairro !== -1 ? cols[m.bairro] : '',
          cidade: m.cidade !== -1 ? cols[m.cidade] : '',
          liderDireta: m.liderDireta !== -1 ? cols[m.liderDireta] : '',
          lider12: m.lider12 !== -1 ? cols[m.lider12] : '',
          batizada: batizadaBoolean ? BaptismStatus.BATIZADA : BaptismStatus.NAO_BATIZADA,
          dataBatismo: m.dataBatismo !== -1 ? convertDate(cols[m.dataBatismo]) : '',
          fezUV: m.fezUV !== -1 ? isSim(cols[m.fezUV]) : false,
          dataInscricaoUV: m.dataInscricaoUV !== -1 ? convertDate(cols[m.dataInscricaoUV]) : '',
          dataConclusaoUV: m.dataConclusaoUV !== -1 ? convertDate(cols[m.dataConclusaoUV]) : '',
          fezEncontro: m.fezEncontro !== -1 ? isSim(cols[m.fezEncontro]) : false,
          dataConclusaoEncontro: m.dataConclusaoEncontro !== -1 ? convertDate(cols[m.dataConclusaoEncontro]) : '',
          fezCD: m.fezCD !== -1 ? isSim(cols[m.fezCD]) : false,
          cdStatus: m.cdStatus !== -1 ? (cols[m.cdStatus] as CDLevel) : CDLevel.NAO_INICIOU,
          coresPreferidas: m.coresPreferidas !== -1 ? cols[m.coresPreferidas] : '',
          presentesPreferidos: m.presentesPreferidos !== -1 ? cols[m.presentesPreferidos] : '',
          livrosPreferidos: m.livrosPreferidos !== -1 ? cols[m.livrosPreferidos] : '',
          ministerio: m.ministerio !== -1 ? cols[m.ministerio] : '',
          observacao: m.observacao !== -1 ? cols[m.observacao] : '',
          status: 'Ativa',
          isLeader: false
        };

        // Calculate Age if birth date exists
        if (d.dataAniversario) {
          d.idade = calculateAge(d.dataAniversario);
        }

        imported.push(d);
        existingNames.add(normalize(nomeVal));
      });

      if (imported.length > 0) {
        mutate([...imported, ...disciples], false);
        await Promise.all(imported.map(d => saveRecord('disciples', d))).catch(console.error);
        mutate();
        alert(`${imported.length} peregrinas importadas com sucesso!\n${skipped} registros ignorados (já existiam).`);
      } else {
        alert(`Nenhum registro novo importado.\n${skipped} registros ignorados (já existiam).`);
      }

      if (e.target) e.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleToggleAttendance = (id: string) => {
    setPendingAttendance(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const submitAttendance = async () => {
    if (!user) return alert("Usuário não identificado.");
    const presentIds = Object.keys(pendingAttendance).filter(id => pendingAttendance[id]);

    if (presentIds.length === 0) {
      return alert("Nenhuma discípula marcada como presente.");
    }

    if (!confirm(`Confirmar a presença de ${presentIds.length} discípulas no relatório de hoje?`)) return;

    setIsSubmittingAttendance(true);
    try {
      const todayString = new Date().toISOString().split('T')[0];
      const records = presentIds.map(id => ({
        id_discipula: id,
        id_lider: user.id || 'desconhecido',
        data_presenca: todayString
      }));

      await saveAttendanceBatch(records);
      alert('Relatório de Frequência finalizado com sucesso!');
      setPendingAttendance({});
    } catch (err) {
      alert("Erro ao enviar o relatório.");
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Economic Search implementation for Invites
  useEffect(() => {
    const searchDebounce = setTimeout(async () => {
      if (inviteSearchTerm.length >= 3) {
        setInviteSearchLoading(true);
        try {
          // Direct Supabase call just to get names and IDs avoiding memory/egress payload
          const data = await searchDisciplesByName(inviteSearchTerm);
          setInviteSearchResults(data);
        } catch (err) {
          console.error("Erro na busca de discípulas", err);
        } finally {
          setInviteSearchLoading(false);
        }
      } else {
        setInviteSearchResults([]);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(searchDebounce);
  }, [inviteSearchTerm]);

  const handleGenerateLink = () => {
    if (!user) return;
    if (inviteType === 'atualizacao' && !inviteSelectedDisciple) {
      alert("Por favor, selecione a discípula que deseja atualizar.");
      return;
    }

    const baseUrl = window.location.origin + window.location.pathname;
    let link = `${baseUrl}#/auto-cadastro?tipo=${inviteType}&liderId=${user.id}`;

    if (inviteType === 'atualizacao' && inviteSelectedDisciple) {
      link += `&discipleId=${inviteSelectedDisciple.id}`;
    }

    setGeneratedLink(link);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Link copiado para a área de transferência!');
  };

  const approveRequest = async (pendingObj: any) => {
    try {
      if (pendingObj.tipo_solicitacao === 'atualizacao') {
        // Find existing by email
        const existing = disciples.find(d => d.email === pendingObj.email);
        if (existing) {
          const updated = { ...existing, ...pendingObj, id: existing.id, status: 'Ativa' };
          delete updated.liderId_generator;
          delete updated.tipo_solicitacao;
          delete updated.requestedAt;
          await saveRecord('disciples', updated);
        } else {
          alert("Nenhuma discípula encontrada com este e-mail para atualizar. Tratando como novo cadastro.");
          const newD = { ...pendingObj, status: 'Ativa' };
          delete newD.liderId_generator;
          delete newD.tipo_solicitacao;
          delete newD.requestedAt;
          await saveRecord('disciples', newD);
        }
      } else {
        // Novo
        const newD = { ...pendingObj, status: 'Ativa' };
        delete newD.liderId_generator;
        delete newD.tipo_solicitacao;
        delete newD.requestedAt;
        await saveRecord('disciples', newD);
      }

      await saveRecord('pendingRegistrations', { ...pendingObj, status: 'approved' });
      mutate();
      mutatePending();
      alert("Cadastro provado com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao aprovar.");
    }
  };

  const rejectRequest = async (pendingObj: any) => {
    if (confirm("Tem certeza que deseja recusar este cadastro?")) {
      await saveRecord('pendingRegistrations', { ...pendingObj, status: 'rejected' });
      mutatePending();
    }
  };

  const handleExportExcel = async () => {
    if (user?.role !== 'Master') {
      return alert("Esse download só é permitido para o usuário master.");
    }
    try {
      // Re-fetch everything for export to bypass pagination limits
      const { supabaseService } = await import('../services/supabaseService');
      const allData = await supabaseService.getAll('peregrinas');

      const data = allData.map(d => ({
        'Nome': d.nome || '',
        'WhatsApp': d.whatsapp || '',
        'Aniversário': d.dataAniversario || '',
        'Idade': d.idade || '',
        'Status': d.status || '',
        'Bairro': d.bairro || '',
        'Cidade': d.cidade || '',
        'Líder de 12': d.lider12 || '',
        'Líder Direta': d.liderDireta || '',
        'Ministério': d.ministerio || ''
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Peregrinas");
      XLSX.writeFile(workbook, `peregrinas_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Erro ao buscar dados completos para exportação.");
    }
  };

  const handleExportPDF = async () => {
    if (user?.role !== 'Master') {
      return alert("Esse download só é permitido para o usuário master.");
    }
    try {
      const { supabaseService } = await import('../services/supabaseService');
      const allData = await supabaseService.getAll('peregrinas');

      const doc = new jsPDF();
      doc.text("Relatório de Peregrinas", 14, 15);
      const tableData = allData.map(d => [d.nome || '', d.whatsapp || '', d.status || '', d.liderDireta || '', d.bairro || '']);
      (doc as any).autoTable({
        head: [['Nome', 'WhatsApp', 'Status', 'Líder Direta', 'Bairro']],
        body: tableData,
        startY: 20,
      });
      doc.save(`peregrinas_relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PDF.");
    }
  };

  return (
    <div className="space-y-4 animate-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div className="text-left">
          <h1 className="text-2xl md:text-3xl font-black uppercase text-gray-900 leading-tight flex items-center gap-4">
            Peregrinas
            <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-lg text-[10px] font-black tabular-nums">
              Total: {totalCount}
            </span>
          </h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">
            Gestão de Rebanho • {viewMode === 'folder' ? 'Visão Geral (Agrupado)' : `Página ${page + 1} de ${Math.ceil(totalCount / 20) || 1}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <label className="flex-1 md:flex-none cursor-pointer bg-blue-50 text-blue-600 px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-sm border border-blue-100 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2">
            <Upload size={14} /> Importar CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
          <button onClick={handleExportExcel} className="flex-1 md:flex-none bg-lime-50 text-lime-600 px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-sm border border-lime-100 hover:bg-lime-peregrinas hover:text-black transition-all">Excel</button>
          <button onClick={handleExportPDF} className="flex-1 md:flex-none bg-red-50 text-red-600 px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-sm border border-red-100 hover:bg-red-500 hover:text-white transition-all">PDF</button>

          <button onClick={() => setShowInviteModal(true)} className="flex-1 md:flex-none bg-purple-50 text-purple-600 px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-sm border border-purple-100 hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2">
            <Link size={14} /> GERAR CONVITE
          </button>

          <button onClick={() => setShowPendingModal(true)} className="flex-1 md:flex-none relative bg-amber-50 text-amber-600 px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-sm border border-amber-100 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-2">
            <MailCheck size={14} /> PENDENTES
            {pendingRequests.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm animate-pulse">{pendingRequests.length}</span>
            )}
          </button>

          <button onClick={() => { setEditId(null); setNewDisciple(initialDisciple); setShowModal(true); }} className="flex-1 md:flex-none bg-black text-white px-6 py-4 rounded-xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
            <UserPlus size={18} /> Novo
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm mx-1 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input type="text" placeholder="Nome, bairro ou cidade..." className="w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-xl font-bold outline-none border-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3.5 rounded-xl border transition-all ${viewMode === 'grid' ? 'bg-black text-white' : 'bg-gray-50 text-gray-400'}`}
              title="Visualização em Grade"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('folder')}
              className={`p-3.5 rounded-xl border transition-all ${viewMode === 'folder' ? 'bg-black text-white' : 'bg-gray-50 text-gray-400'}`}
              title="Visualização em Pastas"
            >
              <Bookmark size={20} />
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`p-3.5 rounded-xl border transition-all ${viewMode === 'tree' ? 'bg-black text-white' : 'bg-gray-50 text-gray-400'}`}
              title="Árvore G12"
            >
              <Activity size={20} />
            </button>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="p-3.5 bg-gray-50 border rounded-xl font-bold text-xs uppercase tracking-widest outline-none"
            >
              <option value="all">TODAS</option>
              <option value="Ativa">ATIVAS</option>
              <option value="Inativa">INATIVAS</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 px-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border shadow-sm animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
                  <div className="h-3 bg-gray-50 rounded-lg w-1/2" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-2 bg-gray-50 rounded-full" />
                <div className="h-1.5 bg-gray-100 rounded-full" />
              </div>
              <div className="flex justify-between items-center border-t pt-4">
                <div className="space-y-1">
                  <div className="h-2 bg-gray-50 rounded w-16" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
                <div className="flex gap-2">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg" />
                  <div className="w-10 h-10 bg-gray-50 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="space-y-4">
          <div className="flex justify-start px-2">
            {Object.values(pendingAttendance).some(v => v) && (
              <button
                onClick={submitAttendance}
                disabled={isSubmittingAttendance}
                className="bg-lime-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md flex items-center gap-2 hover:bg-lime-600 transition-all z-10"
              >
                {isSubmittingAttendance ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Finalizar Relatório de Frequência
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 px-1">
            {filtered.map(d => (
              <div key={d.id} className="relative">
                <DiscipleCard
                  d={d}
                  user={user}
                  onEdit={async () => {
                    const btn = document.getElementById(`btn-edit-${d.id}`);
                    if (btn) btn.innerHTML = '<span class="animate-spin text-gray-500 max-w-[16px] max-h-[16px]">⏳</span>';
                    const fullD = await loadDiscipleFull(d.id);
                    setEditId(d.id);
                    setNewDisciple(fullD || d);
                    setShowModal(true);
                    if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>';
                  }}
                  onDelete={async () => {
                    if (user?.email !== 'carina.massena@gmail.com' && user?.role !== 'Master') {
                      return alert("Apenas a Usuária Master pode excluir fichas.");
                    }
                    if (confirm("Deseja realmente excluir esta ficha permanentemente?")) {
                      mutate(disciples.filter(x => x.id !== d.id), false);
                      await deleteRecord('disciples', d.id);
                      mutate();
                    }
                  }}
                />
                {/* Check-in Toggle Widget */}
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={() => handleToggleAttendance(d.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm transition-all border ${pendingAttendance[d.id]
                      ? 'bg-lime-500 border-lime-600 text-white shadow-lime-200'
                      : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                      }`}
                  >
                    <CheckCircle size={12} className={pendingAttendance[d.id] ? "text-white" : "text-gray-300"} />
                    {pendingAttendance[d.id] ? 'Presente' : 'Faltou'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between px-4 py-4 mt-4 bg-gray-50 rounded-2xl border">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="px-4 py-2 bg-white text-black text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 transition-all shadow-sm"
            >
              Anterior
            </button>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Página {page + 1}</span>
            <button
              disabled={disciples.length < 20 || (page + 1) * 20 >= totalCount}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 transition-all shadow-md"
            >
              Próximo
            </button>
          </div>
        </div>
      ) : viewMode === 'folder' ? (
        <div className="space-y-4 px-1 text-left">
          {Object.keys(groupedByLeader).sort().map(leader => {
            const isExpanded = expandedFolders[leader] === true; // false por padrão
            return (
              <div key={leader} className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 transition-all">
                <button
                  onClick={() => toggleFolder(leader)}
                  className="w-full flex items-center justify-between text-left focus:outline-none hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-lime-50 p-2.5 rounded-2xl">
                      <Folder className="text-lime-600" size={24} fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-lime-600 tracking-widest mb-0.5">Lider Direta</p>
                      <h2 className="text-sm font-black uppercase text-gray-900 tracking-tighter">
                        {leader}
                      </h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{groupedByLeader[leader].length} Ovelha(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Botão de Finalizar Relatório aparece se houver pendências nesta pasta (ou globalmente) */}
                    {Object.values(pendingAttendance).some(v => v) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); submitAttendance(); }}
                        disabled={isSubmittingAttendance}
                        className="bg-lime-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-md flex items-center gap-1 hover:bg-lime-600 transition-all z-10 mr-2"
                      >
                        {isSubmittingAttendance ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Finalizar Relatório
                      </button>
                    )}
                    <div className="bg-gray-50 p-2 rounded-full text-gray-400">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pt-5 border-t border-gray-50 mt-4 animate-in fade-in duration-300">
                    {groupedByLeader[leader].map(d => (
                      <div key={d.id} className="relative">
                        <DiscipleCard
                          d={d}
                          user={user}
                          onEdit={async () => {
                            const btn = document.getElementById(`btn-edit-${d.id}`);
                            if (btn) btn.innerHTML = '<span class="animate-spin text-gray-500 max-w-[16px] max-h-[16px]">⏳</span>';
                            const fullD = await loadDiscipleFull(d.id);
                            setEditId(d.id);
                            setNewDisciple(fullD || d);
                            setShowModal(true);
                            if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>';
                          }}
                          onDelete={async () => {
                            if (user?.email !== 'carina.massena@gmail.com' && user?.role !== 'Master') {
                              return alert("Apenas a Usuária Master pode excluir fichas.");
                            }
                            if (confirm("Deseja realmente excluir esta ficha permanentemente?")) {
                              mutate(disciples.filter(x => x.id !== d.id), false);
                              await deleteRecord('disciples', d.id);
                              mutate();
                            }
                          }}
                        />
                        {/* Check-in Toggle Widget */}
                        <div className="absolute top-4 right-4 z-10">
                          <button
                            onClick={() => handleToggleAttendance(d.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm transition-all border ${pendingAttendance[d.id]
                              ? 'bg-lime-500 border-lime-600 text-white shadow-lime-200'
                              : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                              }`}
                          >
                            <CheckCircle size={12} className={pendingAttendance[d.id] ? "text-white" : "text-gray-300"} />
                            {pendingAttendance[d.id] ? 'Presente' : 'Faltou'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Paginação */}
          <div className="flex items-center justify-between px-4 py-4 mt-4 bg-gray-50 rounded-2xl border">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="px-4 py-2 bg-white text-black text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 transition-all shadow-sm"
            >
              Anterior
            </button>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Página {page + 1}</span>
            <button
              disabled={disciples.length < 20 || (page + 1) * 20 >= totalCount}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 transition-all shadow-md"
            >
              Próximo
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border shadow-sm mx-1 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-lime-100 text-lime-600 rounded-2xl shadow-sm">
              <Activity size={24} />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-black uppercase text-gray-900 tracking-tighter">Linhagem G12</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Hierarquia Recursiva • Baixo Egress</p>
            </div>
          </div>

          {isLoadingTree ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="w-8 h-8 text-lime-500 animate-spin" />
              <p className="text-gray-300 font-bold uppercase tracking-widest text-[10px]">Construindo Árvore...</p>
            </div>
          ) : treeData.length === 0 ? (
            <div className="text-center py-10 text-gray-300 font-bold uppercase text-xs">Nenhum dado de linhagem encontrado.</div>
          ) : (
            <div className="space-y-2">
              {treeData.filter((m: any) => m.nivel === 1).map((root: any) => (
                <RecursiveTreeItem key={root.id} member={root} allMembers={treeData} level={1} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL PRINCIPAL DE FICHA (Criação/Edição) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl md:rounded-[2rem] h-[98vh] md:h-auto md:max-h-[95vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-2 duration-300 overflow-hidden">

            {/* Header Modal Compacto */}
            <div className="px-5 py-3 md:px-8 md:py-4 border-b flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3 text-left min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-lime-peregrinas rounded-lg flex items-center justify-center shadow-sm shrink-0">
                  <Flower2 size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm md:text-lg font-black uppercase truncate">{newDisciple.nome || 'Nova Ficha'}</h2>
                  <p className="text-[8px] font-black uppercase text-lime-600 tracking-tighter">Peregrina da Geração</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-all shrink-0"><X size={18} /></button>
            </div>

            {/* Tabs Nav Compactas */}
            <div className="px-2 py-1 bg-gray-50 border-b flex overflow-x-auto no-scrollbar gap-1 shrink-0">
              <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} icon={UserCircle} label="Dados" />
              <TabButton active={activeTab === 'maturity'} onClick={() => setActiveTab('maturity')} icon={Award} label="Maturidade" />
              <TabButton active={activeTab === 'interests'} onClick={() => setActiveTab('interests')} icon={Heart} label="Perfil" />
              <TabButton active={activeTab === 'leadership'} onClick={() => setActiveTab('leadership')} icon={ShieldAlert} label="Liderança" />
            </div>

            {/* Conteúdo Modal Otimizado */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar text-left bg-white">

              {activeTab === 'personal' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-1">
                  <div className="lg:col-span-1 space-y-4 flex flex-col items-center">
                    <div
                      onClick={() => photoInputRef.current?.click()}
                      className="w-32 h-32 md:w-44 md:h-44 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-lime-300 transition-all overflow-hidden relative shadow-inner group"
                    >
                      {newDisciple.foto ? (
                        <>
                          <img src={newDisciple.foto} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><RefreshCcw className="text-white" size={24} /></div>
                        </>
                      ) : (
                        <>
                          <Camera size={28} className="text-gray-300" />
                          <span className="text-[8px] font-black uppercase text-gray-400">Foto</span>
                        </>
                      )}
                    </div>
                    <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'foto')} />

                    <div className="w-full grid grid-cols-1 gap-2">
                      <SelectField label="Atividade" options={['Ativa', 'Inativa']} value={newDisciple.status} onChange={(v: any) => setNewDisciple({ ...newDisciple, status: v })} />
                      <InputField label="Ministério" value={newDisciple.ministerio} onChange={(v: any) => setNewDisciple({ ...newDisciple, ministerio: v })} placeholder="Ex: Kids" />
                    </div>
                  </div>

                  <div className="lg:col-span-3 space-y-4">
                    <SectionTitle label="Identificação" icon={UserCircle} color="blue" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <InputField label="Nome Completo" value={newDisciple.nome} onChange={(v: any) => setNewDisciple({ ...newDisciple, nome: v })} />
                      <InputField label="WhatsApp" type="tel" value={newDisciple.whatsapp} onChange={(v: any) => setNewDisciple({ ...newDisciple, whatsapp: v })} />
                      <InputField label="Aniversário" type="date" value={newDisciple.dataAniversario} onChange={(v: any) => setNewDisciple({ ...newDisciple, dataAniversario: v })} />
                      <SelectField label="Estado Civil" options={['Solteira', 'Casada', 'Noiva', 'Divorciada', 'Viúva']} value={newDisciple.statusRelacionamento} onChange={(v: any) => setNewDisciple({ ...newDisciple, statusRelacionamento: v })} />
                    </div>

                    <SectionTitle label="Localização e Liderança" icon={MapPinned} color="purple" />
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Cidade" value={newDisciple.cidade} onChange={(v: any) => setNewDisciple({ ...newDisciple, cidade: v })} placeholder="Ex: Salvador" />
                        <InputField label="Bairro" value={newDisciple.bairro} onChange={(v: any) => setNewDisciple({ ...newDisciple, bairro: v })} placeholder="Ex: Pituba" />
                      </div>

                      <InputField label="Endereço Completo" value={newDisciple.endereco} onChange={(v: any) => setNewDisciple({ ...newDisciple, endereco: v })} placeholder="Rua, Número, Comp." />

                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <SelectField label="Líder de 12" options={allLeaderNames} value={newDisciple.lider12} onChange={(v: any) => setNewDisciple({ ...newDisciple, lider12: v })} />
                          <SelectField label="Líder Direta" options={allLeaderNames} value={newDisciple.liderDireta} onChange={(v: any) => setNewDisciple({ ...newDisciple, liderDireta: v })} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'maturity' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in slide-in-from-top-1">
                  <div className="space-y-4">
                    <MaturityCard icon={CheckCircle} title="BATISMO" color="lime">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                        <SelectField label="Status" options={['Batizada', 'Não Batizada']} value={newDisciple.batizada} onChange={(v: any) => setNewDisciple({ ...newDisciple, batizada: v })} />
                        {newDisciple.batizada === BaptismStatus.BATIZADA && (
                          <InputField label="Data" type="date" value={newDisciple.dataBatismo} onChange={(v: any) => setNewDisciple({ ...newDisciple, dataBatismo: v })} />
                        )}
                      </div>
                    </MaturityCard>

                    <MaturityCard icon={GraduationCap} title="UV (UNIVERSIDADE DA VIDA)" color="blue">
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1"><SwitchField label="Concluído?" checked={newDisciple.fezUV} onChange={v => setNewDisciple({ ...newDisciple, fezUV: v })} /></div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <InputField label="Início" type="date" value={newDisciple.dataInscricaoUV} onChange={(v: any) => setNewDisciple({ ...newDisciple, dataInscricaoUV: v })} />
                          <InputField label="Fim" type="date" value={newDisciple.dataConclusaoUV} onChange={(v: any) => setNewDisciple({ ...newDisciple, dataConclusaoUV: v })} />
                        </div>
                      </div>
                      <AttachmentField label="Certificado" file={newDisciple.certificateUVFile} onUpload={e => handleFileUpload(e, 'certificateUVFile')} onRemove={() => setNewDisciple({ ...newDisciple, certificateUVFile: '' })} inputRef={uvFileRef} />
                    </MaturityCard>

                    <MaturityCard icon={Star} title="ENCONTRO" color="orange">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                        <SwitchField label="Participou?" checked={newDisciple.fezEncontro} onChange={v => setNewDisciple({ ...newDisciple, fezEncontro: v })} />
                        {newDisciple.fezEncontro && <InputField label="Conclusão" type="date" value={newDisciple.dataConclusaoEncontro} onChange={(v: any) => setNewDisciple({ ...newDisciple, dataConclusaoEncontro: v })} />}
                      </div>
                    </MaturityCard>
                  </div>

                  <div className="space-y-4">
                    <MaturityCard icon={Trophy} title="CD (CAPACITAÇÃO DESTINO)" color="purple">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <SelectField label="Nível Atual" options={['Não Iniciou', 'Nível 1', 'Nível 2', 'Nível 3', 'Concluído']} value={newDisciple.cdStatus} onChange={(v: any) => setNewDisciple({ ...newDisciple, cdStatus: v })} />
                        <InputField label="Formatura" type="date" value={newDisciple.dataConclusaoCD} onChange={(v: any) => setNewDisciple({ ...newDisciple, dataConclusaoCD: v })} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <InputField label="N1" type="date" value={newDisciple.dataInscricaoCD1} onChange={(v: any) => setNewDisciple({ ...newDisciple, dataInscricaoCD1: v })} />
                        <InputField label="N2" type="date" value={newDisciple.dataInscricaoCD2} onChange={(v: any) => setNewDisciple({ ...newDisciple, dataInscricaoCD2: v })} />
                        <InputField label="N3" type="date" value={newDisciple.dataInscricaoCD3} onChange={(v: any) => setNewDisciple({ ...newDisciple, dataInscricaoCD3: v })} />
                      </div>
                      <AttachmentField label="Diploma CD" file={newDisciple.certificateCDFile} onUpload={e => handleFileUpload(e, 'certificateCDFile')} onRemove={() => setNewDisciple({ ...newDisciple, certificateCDFile: '' })} inputRef={cdFileRef} />
                    </MaturityCard>

                    <MaturityCard icon={Activity} title="PASSOS EXTRAS" color="pink">
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-pink-50 shadow-sm transition-all">
                          <SwitchField label="REENCONTRO" checked={newDisciple.fezReencontro} onChange={v => setNewDisciple({ ...newDisciple, fezReencontro: v })} />
                          {newDisciple.fezReencontro && (
                            <div className="animate-in slide-in-from-top-1">
                              <InputField label="Data da Realização" type="date" value={newDisciple.dataReencontro} onChange={(v: any) => setNewDisciple({ ...newDisciple, dataReencontro: v })} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-pink-50 shadow-sm transition-all">
                          <SwitchField label="FORMATURA" checked={newDisciple.fezFormatura} onChange={v => setNewDisciple({ ...newDisciple, fezFormatura: v })} />
                          {newDisciple.fezFormatura && (
                            <div className="animate-in slide-in-from-top-1">
                              <InputField label="Data do Evento" type="date" value={newDisciple.dataFormatura} onChange={(v: any) => setNewDisciple({ ...newDisciple, dataFormatura: v })} />
                            </div>
                          )}
                        </div>
                      </div>
                    </MaturityCard>
                  </div>
                </div>
              )}

              {activeTab === 'interests' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-1">
                  <div className="space-y-4">
                    <SectionTitle label="Perfil Pessoal" icon={Gift} color="pink" />
                    <div className="grid grid-cols-2 gap-3">
                      <InputField label="Cores Favoritas" value={newDisciple.coresPreferidas} onChange={(v: any) => setNewDisciple({ ...newDisciple, coresPreferidas: v })} />
                      <InputField label="Livros Favoritos" value={newDisciple.livrosPreferidos} onChange={(v: any) => setNewDisciple({ ...newDisciple, livrosPreferidos: v })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400">Preferências de Presentes</label>
                      <textarea className="w-full p-3 bg-gray-50 rounded-xl font-bold h-20 text-xs outline-none focus:ring-2 focus:ring-pink-100" value={newDisciple.presentesPreferidos} onChange={e => setNewDisciple({ ...newDisciple, presentesPreferidos: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SectionTitle label="Contato de Emergência" icon={ShieldAlert} color="red" />
                    <div className="bg-red-50/20 p-3 rounded-2xl border border-red-100 grid grid-cols-2 gap-3">
                      <InputField label="Nome do Contato" value={newDisciple.contatoEmergenciaNome} onChange={(v: any) => setNewDisciple({ ...newDisciple, contatoEmergenciaNome: v })} />
                      <InputField label="Telefone" value={newDisciple.contatoEmergenciaFone} onChange={(v: any) => setNewDisciple({ ...newDisciple, contatoEmergenciaFone: v })} />
                    </div>
                    <div className="space-y-4">
                      <SectionTitle label="Configurações de Acesso" icon={ShieldAlert} color="blue" />
                      <SwitchField label="É uma Líder de Célula?" checked={newDisciple.isLeader} onChange={v => setNewDisciple({ ...newDisciple, isLeader: v })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400">Observações Gerais</label>
                      <textarea className="w-full p-3 bg-gray-50 rounded-xl font-bold h-20 text-xs outline-none focus:ring-2 focus:ring-red-100" value={newDisciple.observacao} onChange={e => setNewDisciple({ ...newDisciple, observacao: e.target.value })} placeholder="Pedidos de oração, notas pastorais..." />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'leadership' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top-1">
                  {!newDisciple.isLeader ? (
                    <div className="lg:col-span-2 flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                      <ShieldAlert size={48} className="text-gray-300 mb-4" />
                      <p className="font-black uppercase text-gray-400 text-xs tracking-widest text-center">Habilite "É uma Líder" na aba "Perfil" para configurar as células.</p>
                      <button onClick={() => { setNewDisciple({ ...newDisciple, isLeader: true }); }} className="mt-4 px-6 py-3 bg-black text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl">HABILITAR LIDERANÇA AGORA</button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        <SectionTitle label="Estado de Liderança" icon={ShieldAlert} color="purple" />
                        <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all cursor-pointer" onClick={() => setNewDisciple({ ...newDisciple, fazMaisDeUmaCelula: !newDisciple.fazMaisDeUmaCelula })}>
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest cursor-pointer">+ de uma célula</label>
                          <div className={`w-12 h-6 rounded-full p-1 transition-all ${newDisciple.fazMaisDeUmaCelula ? 'bg-lime-peregrinas' : 'bg-gray-300'}`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${newDisciple.fazMaisDeUmaCelula ? 'translate-x-6' : 'translate-x-0'}`} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><LayoutGrid size={16} /> Configurações de Célula</h3>
                          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                            <button onClick={() => setActiveCellTab('cel1')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeCellTab === 'cel1' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>Célula 1</button>
                            {newDisciple.fazMaisDeUmaCelula && <button onClick={() => setActiveCellTab('cel2')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeCellTab === 'cel2' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>Célula 2</button>}
                          </div>
                        </div>

                        <CellForm
                          data={activeCellTab === 'cel1' ? newDisciple.celula1 : (newDisciple.celula2 || { ativa: false, perfil: '', dia: '', horario: '', modalidade: '', endereco: '', bairro: '' })}
                          onChange={(v: any) => {
                            if (activeCellTab === 'cel1') setNewDisciple({ ...newDisciple, celula1: { ...newDisciple.celula1!, ...v } });
                            else setNewDisciple({ ...newDisciple, celula2: { ...(newDisciple.celula2 || { ativa: false, perfil: '', dia: '', horario: '', modalidade: '', endereco: '', bairro: '' })!, ...v } });
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer Modal Compacto */}
            <div className="px-5 py-4 border-t bg-gray-50 flex gap-3 shrink-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 font-black text-gray-400 uppercase text-[9px] tracking-widest hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200">CANCELAR</button>
              <button disabled={isSaving} onClick={handleSave} className="flex-[2] py-3 bg-black text-white font-black rounded-xl shadow-md uppercase text-[9px] tracking-widest active:scale-95 transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center">
                {isSaving ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> SALVANDO...</span> : "SALVAR REGISTRO"}
              </button>
            </div>
          </div>
        </div>
      )
      }

      {/* MODAL: GERAR CONVITE */}
      {
        showInviteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-lg uppercase flex items-center gap-2"><Link size={20} className="text-purple-500" /> GERAR CONVITE</h3>
                <button onClick={() => { setShowInviteModal(false); setGeneratedLink(''); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={16} /></button>
              </div>

              <div className="space-y-4 text-left">
                <p className="text-sm text-gray-500 font-medium">Escolha o tipo de formulário que a discípula irá preencher:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setInviteType('novo'); setGeneratedLink(''); setInviteSelectedDisciple(null); setInviteSearchTerm(''); }}
                    className={`py-3 rounded-xl font-black uppercase text-[10px] transition-all border-2 ${inviteType === 'novo' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 bg-white text-gray-400'}`}
                  >
                    Novo Cadastro
                  </button>
                  <button
                    onClick={() => { setInviteType('atualizacao'); setGeneratedLink(''); }}
                    className={`py-3 rounded-xl font-black uppercase text-[10px] transition-all border-2 ${inviteType === 'atualizacao' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-100 bg-white text-gray-400'}`}
                  >
                    Atualização
                  </button>
                </div>

                {inviteType === 'atualizacao' && !generatedLink && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 pt-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Buscar Discípula para Atualizar</label>
                    {!inviteSelectedDisciple ? (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                        <input
                          type="text"
                          placeholder="Digite 3 ou mais letras do nome..."
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-amber-200 border border-gray-100 transition-all text-gray-700"
                          value={inviteSearchTerm}
                          onChange={(e) => setInviteSearchTerm(e.target.value)}
                        />
                        {inviteSearchLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 size={16} className="text-amber-500 animate-spin" />
                          </div>
                        )}

                        {inviteSearchResults.length > 0 && (
                          <div className="absolute z-[120] w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-48 overflow-y-auto">
                            {inviteSearchResults.map(res => (
                              <button
                                key={res.id}
                                onClick={() => {
                                  setInviteSelectedDisciple(res);
                                  setInviteSearchTerm('');
                                  setInviteSearchResults([]);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-gray-50 last:border-0 transition-colors"
                              >
                                <span className="text-xs font-black text-gray-700 uppercase">{res.nome}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded-xl animate-in zoom-in-95">
                        <div className="flex items-center gap-2">
                          <UserCircle size={18} className="text-amber-600" />
                          <span className="text-xs font-black text-amber-800 uppercase">{inviteSelectedDisciple.nome}</span>
                        </div>
                        <button onClick={() => setInviteSelectedDisciple(null)} className="text-amber-500 hover:text-amber-700 p-1">
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!generatedLink ? (
                  <button onClick={handleGenerateLink} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all mt-4">
                    Gerar Link Mágico
                  </button>
                ) : (
                  <div className="space-y-3 animate-in fade-in pt-4 border-t">
                    <input type="text" readOnly value={generatedLink} className="w-full p-3 bg-gray-50 rounded-xl text-xs font-medium text-gray-600 border border-gray-200" />
                    <button onClick={copyLink} className="w-full py-3 bg-lime-peregrinas text-black rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:scale-[1.02] transition-all">
                      Copiar Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* MODAL: SOLICITAÇÕES PENDENTES */}
      {showPendingModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center shrink-0 border-b pb-4">
              <h3 className="font-black text-lg uppercase flex items-center gap-2"><MailCheck size={20} className="text-amber-500" /> Cadastros Pendentes</h3>
              <button onClick={() => setShowPendingModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 text-left">
              {pendingRequests.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <CheckCircle size={48} className="mb-4 opacity-50" />
                  <p className="font-bold uppercase tracking-widest text-xs">Nenhum cadastro pendente</p>
                </div>
              ) : (
                pendingRequests.map((req: any) => (
                  <div key={req.id} className="bg-gray-50 p-4 rounded-2xl border flex flex-col md:flex-row gap-4 justify-between md:items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${req.tipo_solicitacao === 'atualizacao' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                          {req.tipo_solicitacao}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">{new Date(req.requestedAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-black text-sm uppercase text-gray-900 leading-tight">{req.nome}</h4>
                      <p className="text-[10px] text-gray-500 font-medium">{req.email} • {req.whatsapp}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => rejectRequest(req)} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Recusar</button>
                      <button onClick={() => approveRequest(req)} className="px-4 py-2 bg-lime-500 text-white rounded-xl text-[10px] font-black uppercase shadow-md hover:scale-105 transition-all">Aprovar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// COMPONENTES AUXILIARES COMPACTADOS
const CellForm = ({ data, onChange }: any) => {
  const [isGeocoding, setIsGeocoding] = useState(false);

  const formatDisplayValue = (val: string) => {
    if (!val) return '';
    const strVal = String(val);
    if (strVal.includes('Date(')) {
      const match = strVal.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
      if (match) {
        if (match[4] !== undefined) {
          const h = match[4].padStart(2, '0');
          const m = match[5].padStart(2, '0');
          return `${h}:${m}`;
        }
        const d = match[3].padStart(2, '0');
        const m = (parseInt(match[2]) + 1).toString().padStart(2, '0');
        return `${d}/${m}/${match[1]}`;
      }
    }
    return strVal;
  };

  const lookupCoordinates = async () => {
    if (!data.endereco || !data.bairro) return alert("Preencha endereço e bairro antes de buscar!");
    setIsGeocoding(true);
    try {
      const query = `${data.endereco}, ${data.bairro}, Salvador, Bahia, Brasil`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const results = await response.json();
      if (results && results.length > 0) {
        onChange({ localizacao: { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) } });
      } else {
        alert("Localização não encontrada. Verifique se o endereço está escrito corretamente.");
      }
    } catch (e) {
      alert("Erro ao buscar localização.");
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Ativa?" options={['Sim', 'Não']} value={data.ativa ? 'Sim' : 'Não'} onChange={(v: any) => onChange({ ativa: v === 'Sim' })} />
        <SelectField label="Perfil" options={['Kingdom', 'DTX', 'Mulheres', 'Homens', 'Kids', 'Casais']} value={data.perfil} onChange={(v: any) => onChange({ perfil: v })} />
      </div>

      <div className={`grid ${!data.ativa ? 'grid-cols-2' : 'grid-cols-1'} gap-4 animate-in fade-in duration-300`}>
        <InputField label="Data de Abertura" type="date" value={formatDisplayValue(data.dataAbertura)} onChange={(v: any) => onChange({ dataAbertura: v })} />
        {!data.ativa && (
          <InputField label="Data de Fechamento" type="date" value={formatDisplayValue(data.dataFechamento)} onChange={(v: any) => onChange({ dataFechamento: v })} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Dia" options={['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']} value={data.dia} onChange={(v: any) => onChange({ dia: v })} />
        <InputField label="Horário" type="time" value={formatDisplayValue(data.horario)} onChange={(v: any) => onChange({ horario: v })} />
      </div>

      <InputField label="Bairro" value={data.bairro} onChange={(v: any) => onChange({ bairro: v })} />

      <div className="relative">
        <InputField label="Endereço" value={data.endereco} onChange={(v: any) => onChange({ endereco: v })} />
        <button onClick={lookupCoordinates} disabled={isGeocoding} className="absolute right-2 bottom-2 bg-black text-white p-2.5 rounded-xl flex items-center gap-2 text-[8px] font-black uppercase hover:bg-lime-peregrinas hover:text-black transition-all disabled:opacity-50 shadow-sm">
          {isGeocoding ? <Loader2 size={12} className="animate-spin" /> : <MapPinned size={14} />}
          {isGeocoding ? 'Buscando...' : 'Obter GPS'}
        </button>
      </div>

      {!data.localizacao?.lat && data.endereco && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 text-[9px] font-bold text-blue-600 uppercase">
          <AlertCircle size={14} /> Clique em "Obter GPS" para localizar no mapa.
        </div>
      )}
    </div>
  );
};
const MaturityCard = ({ icon: Icon, title, color, children }: any) => {
  const themes: any = {
    lime: 'bg-lime-50/10 border-lime-100 text-lime-600',
    blue: 'bg-blue-50/10 border-blue-100 text-blue-600',
    orange: 'bg-orange-50/10 border-orange-100 text-orange-600',
    purple: 'bg-purple-50/10 border-purple-100 text-purple-600',
    pink: 'bg-pink-50/10 border-pink-100 text-pink-600',
    gray: 'bg-gray-50/60 border-gray-200 text-gray-500'
  };

  return (
    <div className={`p-4 md:p-5 rounded-2xl border shadow-sm ${themes[color].split(' text-')[0]} space-y-4 transition-all hover:shadow-md`}>
      <div className="flex items-center gap-3 border-b border-white/50 pb-3">
        <div className={`p-2 rounded-lg bg-white shadow-xs ${themes[color].split(' ')[2]}`}><Icon size={18} /></div>
        <h4 className="text-xs font-black uppercase tracking-tight text-gray-800">{title}</h4>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
};

const SectionTitle = ({ label, icon: Icon, color }: any) => {
  const colors: any = {
    lime: 'border-lime-peregrinas text-lime-600',
    blue: 'border-blue-400 text-blue-400',
    purple: 'border-purple-400 text-purple-400',
    pink: 'border-pink-400 text-pink-400',
    red: 'border-red-400 text-red-400'
  };
  return (
    <div className={`flex items-center gap-2 border-l-2 ${colors[color]} pl-3 py-1 w-full`}>
      <Icon size={16} className="opacity-40 shrink-0" />
      <h3 className="text-xs md:text-sm font-black uppercase text-gray-900 tracking-wider">{label}</h3>
    </div>
  );
};

const DiscipleCard = ({ d, user, onEdit, onDelete }: any) => {
  let progress = 0;
  if (d.batizada === BaptismStatus.BATIZADA) progress += 25;
  if (d.fezUV) progress += 25;
  if (d.fezEncontro) progress += 25;
  if (d.cdStatus === CDLevel.CONCLUIDO) progress += 25;

  return (
    <div className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all flex flex-col group relative overflow-hidden">
      <div className="flex items-center gap-4 mb-4 text-left">
        <div className="w-14 h-14 rounded-xl bg-gray-50 border flex items-center justify-center font-black text-xl text-gray-300 uppercase shrink-0 overflow-hidden shadow-inner">
          {d.foto ? <img src={d.foto} className="w-full h-full object-cover" /> : d.nome.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-gray-900 leading-tight truncate uppercase text-sm">{d.nome}</h3>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1">
                <MapPin size={10} className="text-lime-600" /> {d.cidade ? `${d.cidade} - ` : ''}{d.bairro || '---'}
              </p>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${d.status === 'Ativa' ? 'bg-lime-50 text-lime-600' : 'bg-red-50 text-red-500'}`}>{d.status}</span>
            </div>
            {d.idade ? (
              <p className="text-[10px] font-black text-gray-400 uppercase">Idade: <span className="text-pink-600">{d.idade} anos</span></p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
          <span>Maturidade</span>
          <span className="text-lime-600">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-lime-peregrinas transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="flex justify-between items-center border-t pt-4 mt-auto">
        <div className="text-left space-y-1 w-full max-w-[150px]">
          <div>
            <p className="text-[8px] font-black text-gray-300 uppercase leading-none">Líder Direta</p>
            <p className="text-[10px] font-black text-gray-700 uppercase truncate" title={d.liderDireta}>{d.liderDireta || '---'}</p>
          </div>
          <div>
            <p className="text-[8px] font-black text-gray-300 uppercase leading-none">Líder de 12</p>
            <p className="text-[10px] font-black text-gray-500 uppercase truncate" title={d.lider12}>{d.lider12 || '---'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {d.whatsapp && (
            <a
              href={`https://wa.me/${d.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="p-3 bg-lime-50 rounded-lg text-lime-600 hover:bg-lime-peregrinas hover:text-black transition-all"
              title="Mandar WhatsApp"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            </a>
          )}
          <button id={`btn-edit-${d.id}`} onClick={onEdit} className="p-3 bg-gray-50 rounded-lg text-gray-400 hover:text-black transition-colors"><Edit2 size={16} /></button>
          {(user?.role === 'Master' || user?.email === 'carina.massena@gmail.com') && (
            <button onClick={onDelete} className="p-3 bg-red-50 rounded-lg text-red-200 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${active ? 'bg-white text-black shadow-xs z-10 border' : 'text-gray-400 hover:text-gray-600'}`}>
    <Icon size={16} className={active ? 'text-lime-600' : ''} /> <span>{label}</span>
  </button>
);

const AttachmentField = ({ label, file, onUpload, onRemove, inputRef }: any) => (
  <div className="space-y-1 mt-1">
    <div className="flex gap-2">
      {file ? (
        <div className="flex-1 flex items-center justify-between p-2 bg-white rounded-xl border border-lime-100 shadow-xs overflow-hidden">
          <div className="flex items-center gap-1.5 truncate pr-1">
            <FileText size={12} className="text-lime-600 shrink-0" />
            <span className="text-[7px] font-black text-gray-500 uppercase truncate">Doc Anexo</span>
          </div>
          <div className="flex gap-1 shrink-0">
            <a href={file} target="_blank" rel="noreferrer" className="p-1 text-blue-500 hover:bg-blue-50 rounded-md"><Eye size={10} /></a>
            <button onClick={onRemove} className="p-1 text-red-400 hover:bg-red-50 rounded-md"><Trash2 size={10} /></button>
          </div>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-gray-50 border border-dashed rounded-xl text-[7px] font-black text-gray-400 uppercase hover:bg-gray-100 transition-all">
          <Upload size={10} /> Anexar
        </button>
      )}
    </div>
    <input type="file" className="hidden" ref={inputRef} onChange={onUpload} />
  </div>
);

const InputField = ({ label, type = "text", value, onChange, placeholder }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[11px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <input type={type} value={value || ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none text-sm focus:ring-2 focus:ring-lime-100/50 transition-all text-gray-900 shadow-xs" />
  </div>
);

const SelectField = ({ label, options, value, onChange }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[11px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none text-sm cursor-pointer focus:ring-2 focus:ring-lime-100/50 transition-all text-gray-900 appearance-none shadow-xs">
      <option value="">...</option>
      {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const SwitchField = ({ label, checked, onChange }: any) => (
  <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-50 h-full cursor-pointer hover:bg-gray-50 transition-all shadow-xs" onClick={() => onChange(!checked)}>
    <label className="text-[11px] font-black uppercase text-gray-700 cursor-pointer flex items-center gap-2">
      {checked ? <CheckCircle size={16} className="text-lime-600" /> : <X size={16} className="text-gray-300" />}
      {label}
    </label>
    <div className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 flex items-center ${checked ? 'bg-lime-peregrinas' : 'bg-gray-200'}`}>
      <div className={`bg-white w-4 h-4 rounded-full shadow-xs transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </div>
);

// --- RECURSIVE TREE ITEM COMPONENT ---
const RecursiveTreeItem = ({ member, allMembers, level }: { member: any, allMembers: any[], level: number }) => {
  const children = allMembers.filter(m => m.lider_direta === member.nome);
  const [isExpanded, setIsExpanded] = useState(level < 2);

  return (
    <div className={`text-left ${level > 1 ? 'ml-4 md:ml-8 border-l-2 border-lime-50/50 pl-4 py-1' : 'mb-4'}`}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer group ${level === 1 ? 'bg-gray-50 border border-gray-100 hover:bg-gray-100' : 'hover:bg-lime-50'
          }`}
      >
        <div className="relative shrink-0">
          {member.foto ? (
            <img src={member.foto} className="w-10 h-10 rounded-xl object-cover shadow-sm border-2 border-white" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-300 shadow-sm">
              <UserCircle size={20} />
            </div>
          )}
          {member.is_leader && (
            <div className="absolute -top-1 -right-1 bg-lime-500 text-white w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-white">
              <Star size={8} fill="currentColor" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-black uppercase tracking-tight truncate ${level === 1 ? 'text-sm text-gray-900' : 'text-xs text-gray-700'}`}>
              {member.nome}
            </h4>
            {member.status === 'Inativa' && (
              <span className="bg-red-50 text-red-500 px-1.5 py-0.5 rounded-lg text-[7px] font-black uppercase">Inativa</span>
            )}
          </div>
          <p className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-2">
            <span>Nível {level}</span>
            {member.whatsapp && (
              <>
                <span className="w-1 h-1 bg-gray-200 rounded-full" />
                <span>{member.whatsapp}</span>
              </>
            )}
            {children.length > 0 && (
              <>
                <span className="w-1 h-1 bg-gray-200 rounded-full" />
                <span className="text-lime-600">{children.length} descendentes</span>
              </>
            )}
          </p>
        </div>

        {children.length > 0 && (
          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-gray-300 group-hover:text-lime-500`}>
            <ChevronDown size={18} />
          </div>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div className="mt-1 space-y-1 animate-in slide-in-from-top-1">
          {children.map(child => (
            <RecursiveTreeItem key={child.id} member={child} allMembers={allMembers} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Disciples;
