import { supabase } from '../lib/supabaseClient';
import { GeneratedContent } from '../types';

export const dbService = {
  /**
   * Salva um conteúdo gerado pela IA no banco de dados.
   */
  async saveGeneratedContent(userId: string, content: GeneratedContent) {
    // Remove campos que não precisam ir pro JSONB ou ajusta formatos
    const contentToSave = {
      ...content,
      // Se houver imagem base64 muito grande, idealmente faríamos upload pro Storage, 
      // mas para MVP vamos tentar salvar direto ou omitir se for muito pesado.
      // Para este exemplo, salvaremos tudo.
    };

    const { error } = await supabase.from('generated_contents').insert({
      user_id: userId,
      type: content.type,
      content: contentToSave
    });

    if (error) {
      console.error('Erro ao salvar conteúdo:', error);
      throw error;
    }
  },

  /**
   * Busca a contagem de conteúdos gerados pelo usuário no período (ex: este mês).
   * Usado para verificar limites do plano.
   */
  async getGenerationCount(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('generated_contents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      console.error('Erro ao contar gerações:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Busca o histórico de conteúdos gerados.
   */
  async getGeneratedHistory(userId: string, limit = 20): Promise<GeneratedContent[]> {
    const { data, error } = await supabase
      .from('generated_contents')
      .select('content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }

    return data.map((row: any) => ({
      ...row.content,
      created_at: row.created_at
    }));
  },

  /**
   * Registra um evento de Analytics (Visita ou Clique).
   * Pode ser chamado publicamente (sem auth) para visitas de clientes.
   */
  async trackEvent(profileId: string, eventType: 'VIEW' | 'CLICK_WHATSAPP') {
    // Tenta salvar. Se falhar (ex: bloqueador de ad), não quebra a aplicação.
    try {
       await supabase.from('analytics_events').insert({
         profile_id: profileId,
         event_type: eventType
       });
    } catch (err) {
      console.warn('Analytics failed to push:', err);
    }
  },

  /**
   * Busca estatísticas para o Dashboard (últimos 7 dias).
   */
  async getAnalyticsStats(profileId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Buscar Visitas
    const { count: visits } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('event_type', 'VIEW')
      .gte('created_at', sevenDaysAgo.toISOString());

    // Buscar Cliques
    const { count: clicks } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('event_type', 'CLICK_WHATSAPP')
      .gte('created_at', sevenDaysAgo.toISOString());

    return {
      visits: visits || 0,
      clicks: clicks || 0
    };
  }
};